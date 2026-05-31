import React, { useState } from 'react';
import Grid from './Grid';
import Rules from './Rules';
import styles from './App.module.css';
import {
  SHIPS,
  shipCells,
  canPlace,
  placeShipOnGrid,
  checkSunk,
  placeEnemyShips,
  makeInitialState,
  pickEasyShot,
  pickHardShot,
} from './gameLogic';

// Derive per-ship status: 'intact' | 'hit' | 'sunk'
function shipStatus(ship, shots) {
  if (ship.sunk) return 'sunk';
  const anyHit = ship.cells.some(c => shots[c] === 'hit');
  return anyHit ? 'hit' : 'intact';
}

export default function App() {
  const [game, setGame]         = useState(() => makeInitialState('easy'));
  const [hoverIdx, setHoverIdx] = useState(null);
  const [chosenDiff, setChosenDiff] = useState('easy');
  const [screen, setScreen]     = useState('welcome'); // 'welcome' | 'rules' | 'game'

  // ── welcome ──────────────────────────────────────────────────────────
  function beginSetup() {
    setGame(makeInitialState(chosenDiff));
    setScreen('game');
  }

  // ── setup: place ship ────────────────────────────────────────────────
  function handlePlayerCellClick(i) {
    if (game.phase !== 'setup' || !game.selectedShip) return;
    const ship  = SHIPS.find(s => s.name === game.selectedShip);
    const cells = shipCells(i, ship.size, game.orientation);
    if (!cells || !canPlace(game.playerGrid, cells)) return;

    const newGrid  = placeShipOnGrid(game.playerGrid, cells, ship.name);
    const newShips = [...game.placedShips, { name: ship.name, cells, sunk: false }];
    const nextShip = SHIPS.find(s => !newShips.find(p => p.name === s.name));

    setGame(g => ({
      ...g,
      playerGrid:   newGrid,
      placedShips:  newShips,
      selectedShip: nextShip ? nextShip.name : null,
    }));
  }

  // ── battle: player shoots ────────────────────────────────────────────
  // Official rule: turns ALWAYS alternate — one shot per turn, hit or miss.
  function handleEnemyCellClick(i) {
    if (game.phase !== 'play' || game.turn !== 'player') return;
    if (game.playerShots[i] !== null) return;

    const hit       = game.enemyGrid[i] !== null;
    const hitName   = hit ? game.enemyGrid[i] : null; // ship name stored in grid
    const newShots  = [...game.playerShots];
    newShots[i]     = hit ? 'hit' : 'miss';
    const newEShips = checkSunk(newShots, game.enemyShips);
    const allSunk   = newEShips.every(s => s.sunk);
    const sunkNow   = newEShips.find(s => s.sunk && s.cells.includes(i));

    // Per official rules: announce hit + ship name, or "You sank my X!" on sink
    let status;
    if (!hit) {
      status = '💧 Miss. Enemy is firing back…';
    } else if (sunkNow) {
      status = `💥 You sank the enemy ${sunkNow.name}!`;
    } else {
      status = `🎯 Hit on the enemy ${hitName}! Enemy is firing back…`;
    }

    if (allSunk) {
      setGame(g => ({ ...g, playerShots: newShots, enemyShips: newEShips,
        phase: 'over', winner: 'player', status: '🏆 You sunk all enemy ships! You win!' }));
      return;
    }

    // Always pass turn to enemy after player fires (hit OR miss)
    setGame(g => ({ ...g, playerShots: newShots, enemyShips: newEShips, turn: 'enemy', status }));
    setTimeout(enemyFire, 850);
  }

  function enemyFire() {
    setGame(g => {
      const pick = g.difficulty === 'hard'
        ? pickHardShot(g.enemyShots, g.placedShips)
        : pickEasyShot(g.enemyShots);

      if (pick === undefined || pick === null) return g;

      const hit      = g.playerGrid[pick] !== null;
      const hitName  = hit ? g.playerGrid[pick] : null;
      const newShots = [...g.enemyShots];
      newShots[pick] = hit ? 'hit' : 'miss';

      const newPShips = checkSunk(newShots, g.placedShips);
      const allSunk   = newPShips.every(s => s.sunk);
      const sunkNow   = newPShips.find(s => s.sunk && s.cells.includes(pick));

      let status;
      if (allSunk) {
        status = '💀 All your ships were sunk. You lose!';
      } else if (!hit) {
        status = '💧 Enemy missed. Your turn!';
      } else if (sunkNow) {
        status = `💥 Enemy sunk your ${sunkNow.name}! Your turn.`;
      } else {
        status = `🎯 Enemy hit your ${hitName}! Your turn.`;
      }

      return {
        ...g,
        enemyShots:  newShots,
        placedShips: newPShips,
        phase:       allSunk ? 'over' : 'play',
        winner:      allSunk ? 'enemy' : null,
        // Always return turn to player after enemy fires
        turn:        'player',
        status,
      };
    });
  }

  function startGame() {
    const { grid, ships } = placeEnemyShips();
    setGame(g => ({
      ...g,
      enemyGrid:  grid,
      enemyShips: ships,
      phase:      'play',
      turn:       'player',
      status:     'Your turn — click the enemy waters to fire!',
    }));
  }

  function resetGame() {
    setScreen('welcome');
    setHoverIdx(null);
  }

  function undoLast() {
    setGame(g => {
      if (!g.placedShips.length) return g;
      const newShips = [...g.placedShips];
      const last     = newShips.pop();
      const newGrid  = [...g.playerGrid];
      last.cells.forEach(i => (newGrid[i] = null));
      return { ...g, placedShips: newShips, playerGrid: newGrid, selectedShip: last.name };
    });
  }

  // ── preview helpers ──────────────────────────────────────────────────
  const previewCells = (() => {
    if (game.phase === 'setup' && game.selectedShip && hoverIdx !== null) {
      const ship = SHIPS.find(s => s.name === game.selectedShip);
      return shipCells(hoverIdx, ship.size, game.orientation);
    }
    if (game.phase === 'play' && game.turn === 'player' && hoverIdx !== null) return [hoverIdx];
    return null;
  })();

  const previewValid = previewCells && game.phase === 'setup'
    ? canPlace(game.playerGrid, previewCells) : true;

  const allPlaced = game.placedShips.length === SHIPS.length;

  // ── rules screen ─────────────────────────────────────────────────────
  if (screen === 'rules') {
    return (
      <div className={styles.app}>
        <Rules onBack={() => setScreen('welcome')} />
      </div>
    );
  }

  // ── welcome screen ───────────────────────────────────────────────────
  if (screen === 'welcome') {
    return (
      <div className={styles.app}>
        <div className={styles.welcomeWrap}>
          <div className={styles.logoAnchor}>
            <svg viewBox="0 0 80 60" className={styles.logoSvg}>
              <rect x="10" y="34" width="60" height="10" rx="3" fill="#1e4d8c"/>
              <path d="M16 34 L64 34 L60 44 L20 44 Z" fill="#2a6496"/>
              <rect x="24" y="22" width="32" height="14" rx="2" fill="#1e4d8c"/>
              <rect x="32" y="13" width="16" height="11" rx="2" fill="#163a6a"/>
              <rect x="38" y="6" width="4" height="9" rx="1" fill="#c8d8f0"/>
              <circle cx="66" cy="12" r="10" fill="none" stroke="#e24b4a" strokeWidth="2.5"/>
              <line x1="66" y1="2"  x2="66" y2="22" stroke="#e24b4a" strokeWidth="2"/>
              <line x1="56" y1="12" x2="76" y2="12" stroke="#e24b4a" strokeWidth="2"/>
            </svg>
          </div>
          <h1 className={styles.bigTitle}>Naval Strike</h1>
          <p className={styles.tagline}>A game of hidden fleets and precise fire</p>

          <div className={styles.diffSection}>
            <div className={styles.diffLabel}>Select difficulty</div>
            <div className={styles.diffCards}>
              <button
                className={`${styles.diffCard}${chosenDiff === 'easy' ? ` ${styles.diffSelected}` : ''}`}
                onClick={() => setChosenDiff('easy')}
              >
                <span className={styles.diffIcon}>🌊</span>
                <span className={styles.diffName}>Easy</span>
                <span className={styles.diffDesc}>Enemy fires randomly</span>
              </button>
              <button
                className={`${styles.diffCard}${chosenDiff === 'hard' ? ` ${styles.diffSelected}` : ''}`}
                onClick={() => setChosenDiff('hard')}
              >
                <span className={styles.diffIcon}>🎯</span>
                <span className={styles.diffName}>Hard</span>
                <span className={styles.diffDesc}>Enemy hunts your ships</span>
              </button>
            </div>
          </div>

          <div className={styles.welcomeActions}>
            <button className={styles.primaryBtn} onClick={beginSetup}>
              Deploy fleet →
            </button>
            <button className={styles.rulesBtn} onClick={() => setScreen('rules')}>
              How to play
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── main game ────────────────────────────────────────────────────────
  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>Naval Strike</h1>
        <span className={`${styles.diffBadge} ${game.difficulty === 'hard' ? styles.diffBadgeHard : styles.diffBadgeEasy}`}>
          {game.difficulty === 'hard' ? '🎯 Hard' : '🌊 Easy'}
        </span>
      </div>

      <div className={styles.statusBar}>{game.status}</div>

      {game.phase === 'setup' && (
        <div className={styles.setupControls}>
          <div className={styles.shipQueue}>
            {SHIPS.map(s => {
              const placed   = game.placedShips.find(p => p.name === s.name);
              const selected = game.selectedShip === s.name;
              return (
                <button
                  key={s.name}
                  className={`${styles.shipPill}${selected ? ` ${styles.pillSelected}` : ''}${placed ? ` ${styles.pillPlaced}` : ''}`}
                  onClick={() => !placed && setGame(g => ({ ...g, selectedShip: s.name }))}
                >
                  {s.name} ({s.size})
                </button>
              );
            })}
          </div>
          <div className={styles.orientRow}>
            <button
              className={`${styles.orientBtn}${game.orientation === 'H' ? ` ${styles.orientActive}` : ''}`}
              onClick={() => setGame(g => ({ ...g, orientation: 'H' }))}
            >Horizontal</button>
            <button
              className={`${styles.orientBtn}${game.orientation === 'V' ? ` ${styles.orientActive}` : ''}`}
              onClick={() => setGame(g => ({ ...g, orientation: 'V' }))}
            >Vertical</button>
            {game.placedShips.length > 0 && (
              <button className={styles.undoBtn} onClick={undoLast}>Undo</button>
            )}
          </div>
        </div>
      )}

      <div className={styles.boards}>
        {/* Player board */}
        <div className={styles.boardWrap}>
          <div className={styles.boardLabel}>
            {game.phase === 'setup' ? 'Your fleet' : 'Your waters'}
          </div>
          <Grid
            gridData={game.playerGrid}
            shots={game.enemyShots}
            ships={game.placedShips}
            isEnemy={false}
            phase={game.phase}
            turn={game.turn}
            previewCells={game.phase === 'setup' ? previewCells : null}
            previewValid={previewValid}
            onCellClick={handlePlayerCellClick}
            onCellEnter={i => game.phase === 'setup' && setHoverIdx(i)}
            onCellLeave={() => game.phase === 'setup' && setHoverIdx(null)}
          />
          {game.phase !== 'setup' && (
            <div className={styles.fleetInfo}>
              {game.placedShips.map(s => {
                const st = shipStatus(s, game.enemyShots);
                return (
                  <span key={s.name} className={`${styles.shipTag} ${styles['shipTag_' + st]}`}>
                    {s.name}{st === 'sunk' ? ' ✕' : st === 'hit' ? ' ●' : ''}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Enemy board */}
        {game.phase !== 'setup' && (
          <div className={styles.boardWrap}>
            <div className={styles.boardLabel}>Enemy waters</div>
            <Grid
              gridData={game.enemyGrid}
              shots={game.playerShots}
              ships={game.enemyShips}
              isEnemy={true}
              phase={game.phase}
              turn={game.turn}
              previewCells={game.phase === 'play' ? previewCells : null}
              previewValid={true}
              onCellClick={handleEnemyCellClick}
              onCellEnter={i => setHoverIdx(i)}
              onCellLeave={() => setHoverIdx(null)}
            />
            <div className={styles.fleetInfo}>
              {game.enemyShips.map(s => {
                const st = shipStatus(s, game.playerShots);
                return (
                  <span key={s.name} className={`${styles.shipTag} ${styles['shipTag_' + st]}`}>
                    {s.name}{st === 'sunk' ? ' ✕' : st === 'hit' ? ' ●' : ''}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {game.phase === 'setup' && allPlaced && (
          <button className={styles.primaryBtn} onClick={startGame}>
            Start battle →
          </button>
        )}
        {(game.phase === 'play' || game.phase === 'over') && (
          <button className={styles.resetBtn} onClick={resetGame}>New game</button>
        )}
      </div>
    </div>
  );
}
