import React, { useState, useEffect, useRef, useCallback } from 'react';
import Grid from './Grid';
import { api } from './api';
import { SHIPS, shipCells, canPlace, placeShipOnGrid } from './gameLogic';
import styles from './App.module.css';
import mpStyles from './MultiplayerGame.module.css';

function shipStatus(ship, shots) {
  if (ship.sunk) return 'sunk';
  if (ship.cells && ship.cells.some(c => shots[c] === 'hit')) return 'hit';
  return 'intact';
}

export default function MultiplayerGame({ code, playerId, role, onLeave }) {
  const [room, setRoom]         = useState(null);
  const [error, setError]       = useState('');
  const [hoverIdx, setHoverIdx] = useState(null);
  const [firing, setFiring]     = useState(false);

  // Local ship placement state (before submitting)
  const [localGrid, setLocalGrid]       = useState(Array(100).fill(null));
  const [localShips, setLocalShips]     = useState([]);
  const [selectedShip, setSelectedShip] = useState(SHIPS[0].name);
  const [orientation, setOrientation]   = useState('H');
  const [submitting, setSubmitting]     = useState(false);

  const pollRef = useRef(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await api.getRoom(code, playerId);
      setRoom(data);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [code, playerId]);

  // Poll every 1.5 s
  useEffect(() => {
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, 1500);
    return () => clearInterval(pollRef.current);
  }, [fetchRoom]);

  async function handleLeave() {
    clearInterval(pollRef.current);
    try { await api.deleteRoom(code, playerId); } catch (_) {}
    onLeave();
  }

  // ── local ship placement ─────────────────────────────────────────────
  function handlePlaceCellClick(i) {
    if (!selectedShip) return;
    const ship  = SHIPS.find(s => s.name === selectedShip);
    const cells = shipCells(i, ship.size, orientation);
    if (!cells || !canPlace(localGrid, cells)) return;

    const newGrid  = placeShipOnGrid(localGrid, cells, ship.name);
    const newShips = [...localShips, { name: ship.name, cells, sunk: false }];
    const nextShip = SHIPS.find(s => !newShips.find(p => p.name === s.name));
    setLocalGrid(newGrid);
    setLocalShips(newShips);
    setSelectedShip(nextShip ? nextShip.name : null);
  }

  function undoLast() {
    if (!localShips.length) return;
    const newShips = [...localShips];
    const last     = newShips.pop();
    const newGrid  = [...localGrid];
    last.cells.forEach(i => (newGrid[i] = null));
    setLocalGrid(newGrid);
    setLocalShips(newShips);
    setSelectedShip(last.name);
  }

  async function submitShips() {
    if (localShips.length !== SHIPS.length) return;
    setSubmitting(true);
    try {
      await api.placeShips(code, playerId, localGrid, localShips);
      await fetchRoom();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── firing ───────────────────────────────────────────────────────────
  async function handleFireShot(cellIndex) {
    if (!room || room.phase !== 'play') return;
    if (room.turn !== role) return;
    if (room.myShots[cellIndex] !== null) return;
    if (firing) return;

    setFiring(true);
    try {
      await api.fireShot(code, playerId, cellIndex);
      await fetchRoom();
    } catch (e) {
      setError(e.message);
    } finally {
      setFiring(false);
    }
  }

  // ── derived — isReady MUST come before previewCells ──────────────────
  const isMyTurn  = room && room.phase === 'play' && room.turn === role;
  const allPlaced = localShips.length === SHIPS.length;
  const isReady   = room && (role === 'host' ? room.hostReady : room.guestReady);

  const previewCells = (() => {
    if (room && room.phase === 'setup' && !isReady && selectedShip && hoverIdx !== null) {
      const ship = SHIPS.find(s => s.name === selectedShip);
      return shipCells(hoverIdx, ship.size, orientation);
    }
    if (room && room.phase === 'play' && isMyTurn && hoverIdx !== null) return [hoverIdx];
    return null;
  })();

  const previewValid = previewCells && room && room.phase === 'setup'
    ? canPlace(localGrid, previewCells) : true;

  // ── status text ──────────────────────────────────────────────────────
  function statusText() {
    if (!room) return 'Connecting…';
    if (room.phase === 'waiting') return `Room code: ${code} — waiting for opponent to join…`;
    if (room.phase === 'setup') {
      if (!isReady) return 'Place your ships on your grid below.';
      return 'Ships placed! Waiting for opponent…';
    }
    if (room.phase === 'play') {
      if (room.lastEvent) return room.lastEvent;
      return isMyTurn ? 'Your turn — click the enemy grid to fire!' : "Opponent's turn — wait…";
    }
    if (room.phase === 'over') {
      return room.winner === role ? '🏆 You win!' : '💀 You lose!';
    }
    return '';
  }

  // ── waiting for guest to join ─────────────────────────────────────────
  if (!room || room.phase === 'waiting') {
    return (
      <div className={styles.app}>
        <div className={mpStyles.waitingWrap}>
          <div className={mpStyles.roomCodeLabel}>Room code</div>
          <div className={mpStyles.roomCode}>{code}</div>
          <div className={mpStyles.waitingText}>
            Share this code with your opponent.<br />Waiting for them to join…
          </div>
          <div className={mpStyles.spinner} />
          <button className={mpStyles.leaveBtn} onClick={handleLeave}>Leave room</button>
        </div>
      </div>
    );
  }

  // ── setup: placing ships ──────────────────────────────────────────────
  if (room.phase === 'setup' && !isReady) {
    return (
      <div className={styles.app}>
        <div className={styles.header}>
          <h1 className={styles.title}>Naval Strike</h1>
          <span className={mpStyles.roleBadge}>{role === 'host' ? '⚓ Host' : '🚢 Guest'}</span>
          <span className={mpStyles.codePill}>{code}</span>
        </div>
        <div className={styles.statusBar}>Place your ships — opponent is also placing theirs.</div>

        <div className={styles.setupControls}>
          <div className={styles.shipQueue}>
            {SHIPS.map(s => {
              const placed   = localShips.find(p => p.name === s.name);
              const selected = selectedShip === s.name;
              return (
                <button
                  key={s.name}
                  className={`${styles.shipPill}${selected ? ` ${styles.pillSelected}` : ''}${placed ? ` ${styles.pillPlaced}` : ''}`}
                  onClick={() => !placed && setSelectedShip(s.name)}
                >
                  {s.name} ({s.size})
                </button>
              );
            })}
          </div>
          <div className={styles.orientRow}>
            <button className={`${styles.orientBtn}${orientation === 'H' ? ` ${styles.orientActive}` : ''}`} onClick={() => setOrientation('H')}>Horizontal</button>
            <button className={`${styles.orientBtn}${orientation === 'V' ? ` ${styles.orientActive}` : ''}`} onClick={() => setOrientation('V')}>Vertical</button>
            {localShips.length > 0 && <button className={styles.undoBtn} onClick={undoLast}>Undo</button>}
          </div>
        </div>

        <div className={styles.boards}>
          <div className={styles.boardWrap}>
            <div className={styles.boardLabel}>Your fleet</div>
            <Grid
              gridData={localGrid}
              shots={Array(100).fill(null)}
              ships={localShips}
              isEnemy={false}
              phase="setup"
              turn={null}
              previewCells={previewCells}
              previewValid={previewValid}
              onCellClick={handlePlaceCellClick}
              onCellEnter={i => setHoverIdx(i)}
              onCellLeave={() => setHoverIdx(null)}
            />
          </div>
        </div>

        <div className={styles.actions}>
          {allPlaced && (
            <button className={styles.primaryBtn} onClick={submitShips} disabled={submitting}>
              {submitting ? 'Confirming…' : 'Confirm fleet →'}
            </button>
          )}
          <button className={mpStyles.leaveBtn} onClick={handleLeave}>Leave room</button>
        </div>
        {error && <div className={mpStyles.errorBar}>{error}</div>}
      </div>
    );
  }

  // ── waiting for opponent to finish placing ────────────────────────────
  if (room.phase === 'setup' && isReady) {
    return (
      <div className={styles.app}>
        <div className={mpStyles.waitingWrap}>
          <div className={mpStyles.waitingText}>
            ✅ Your fleet is ready!<br />Waiting for opponent to place their ships…
          </div>
          <div className={mpStyles.spinner} />
          <button className={mpStyles.leaveBtn} onClick={handleLeave}>Leave room</button>
        </div>
      </div>
    );
  }

  // ── battle / game over ────────────────────────────────────────────────
  const myShips        = room.myShips        || [];
  const opponentShips  = room.opponentShips  || [];
  const myShots        = room.myShots        || Array(100).fill(null);
  const opponentShots  = room.opponentShots  || Array(100).fill(null);

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h1 className={styles.title}>Naval Strike</h1>
        <span className={mpStyles.roleBadge}>{role === 'host' ? '⚓ Host' : '🚢 Guest'}</span>
        <span className={mpStyles.codePill}>{code}</span>
      </div>

      <div className={`${styles.statusBar} ${isMyTurn ? mpStyles.myTurnBar : ''}`}>
        {statusText()}
      </div>

      <div className={styles.boards}>
        <div className={styles.boardWrap}>
          <div className={styles.boardLabel}>Your waters</div>
          <Grid
            gridData={room.myGrid || Array(100).fill(null)}
            shots={opponentShots}
            ships={myShips}
            isEnemy={false}
            phase={room.phase}
            turn={room.turn}
            previewCells={null}
            previewValid={true}
            onCellClick={() => {}}
            onCellEnter={() => {}}
            onCellLeave={() => {}}
          />
          <div className={styles.fleetInfo}>
            {myShips.map(s => {
              const st = shipStatus(s, opponentShots);
              return (
                <span key={s.name} className={`${styles.shipTag} ${styles['shipTag_' + st]}`}>
                  {s.name}{st === 'sunk' ? ' ✕' : st === 'hit' ? ' ●' : ''}
                </span>
              );
            })}
          </div>
        </div>

        <div className={styles.boardWrap}>
          <div className={styles.boardLabel}>Enemy waters</div>
          <Grid
            gridData={room.opponentGrid || Array(100).fill(null)}
            shots={myShots}
            ships={opponentShips}
            isEnemy={true}
            phase={room.phase}
            turn={isMyTurn ? role : 'other'}
            previewCells={previewCells}
            previewValid={true}
            onCellClick={handleFireShot}
            onCellEnter={i => isMyTurn && setHoverIdx(i)}
            onCellLeave={() => setHoverIdx(null)}
          />
          <div className={styles.fleetInfo}>
            {opponentShips.map(s => {
              const st = shipStatus(s, myShots);
              return (
                <span key={s.name} className={`${styles.shipTag} ${styles['shipTag_' + st]}`}>
                  {s.name}{st === 'sunk' ? ' ✕' : st === 'hit' ? ' ●' : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {error && <div className={mpStyles.errorBar}>{error}</div>}

      <div className={styles.actions}>
        <button className={styles.resetBtn} onClick={handleLeave}>
          {room.phase === 'over' ? 'New game' : 'Leave game'}
        </button>
      </div>
    </div>
  );
}
