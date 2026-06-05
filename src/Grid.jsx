import React from 'react';
import styles from './Grid.module.css';
import { COLS, pos, idx } from './gameLogic';

export default function Grid({
  gridData,
  shots,
  ships,
  isEnemy,
  phase,
  turn,        // for vs-AI: 'player'|'enemy'. for multiplayer: role string|'other'
  myRole,      // multiplayer only: 'host'|'guest' — used to decide "is it my turn"
  previewCells,
  previewValid,
  onCellClick,
  onCellEnter,
  onCellLeave,
  disabled,    // true when it's not the player's turn (shows overlay + dimming)
}) {
  const isMyTurn = !disabled;

  return (
    <div className={`${styles.wrapper}${disabled ? ` ${styles.wrapperDisabled}` : ''}`}>
      {/* "Waiting" overlay on enemy grid when it's not your turn */}
      {isEnemy && disabled && phase === 'play' && (
        <div className={styles.waitOverlay}>
          <div className={styles.waitOverlayInner}>
            <div className={styles.waitDots}>
              <span /><span /><span />
            </div>
            <span className={styles.waitLabel}>Opponent's turn</span>
          </div>
        </div>
      )}

      <div className={styles.colHeaders}>
        <div className={styles.corner} />
        {COLS.map(l => <div key={l} className={styles.colH}>{l}</div>)}
      </div>
      <div className={styles.rows}>
        {Array.from({ length: 10 }, (_, r) => (
          <div key={r} className={styles.row}>
            <div className={styles.rowLabel}>{r + 1}</div>
            {Array.from({ length: 10 }, (_, c) => {
              const i      = idx(r, c);
              const shot   = shots[i];
              const ship   = ships.find(s => s.cells && s.cells.includes(i));
              const hasShip = !!gridData[i];
              const isPrev  = previewCells && previewCells.includes(i);
              const isSunk  = ship && ship.sunk;

              let cellClass = styles.cell;

              if (isEnemy) {
                // Only clickable when it's player's turn and cell not yet shot
                if (!disabled && phase === 'play') cellClass += ` ${styles.clickable}`;
                if (shot === 'hit') {
                  cellClass += isSunk ? ` ${styles.sunk}` : ` ${styles.hit}`;
                } else if (shot === 'miss') {
                  cellClass += ` ${styles.miss}`;
                } else if (isPrev && phase === 'play' && !disabled) {
                  cellClass += ` ${styles.aimPreview}`;
                }
              } else {
                // Own grid
                if (hasShip) {
                  cellClass += isSunk ? ` ${styles.sunk}` : ` ${styles.ship}`;
                }
                if (shot === 'hit')  cellClass += ` ${styles.hit}`;
                if (shot === 'miss') cellClass += ` ${styles.miss}`;
                if (isPrev) cellClass += previewValid ? ` ${styles.preview}` : ` ${styles.previewInvalid}`;
              }

              // Cell content: show ✕ for any sunk-ship cell (hit or not yet individually marked),
              // ● for a non-sunk hit, · for miss, empty otherwise
              let content = '';
              if (isSunk) {
                // All cells of a sunk ship show ✕ regardless of individual shot status
                content = '✕';
              } else if (shot === 'hit') {
                content = '●';
              } else if (shot === 'miss') {
                content = '·';
              }

              return (
                <div
                  key={i}
                  className={cellClass}
                  onClick={() => !disabled && onCellClick(i)}
                  onMouseEnter={() => !disabled && onCellEnter(i)}
                  onMouseLeave={() => onCellLeave()}
                >
                  {content}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
