import React from 'react';
import styles from './Grid.module.css';
import { COLS, pos, idx } from './gameLogic';

export default function Grid({
  gridData,
  shots,
  ships,
  isEnemy,
  phase,
  turn,
  selectedShip,
  orientation,
  previewCells,
  previewValid,
  onCellClick,
  onCellEnter,
  onCellLeave,
}) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.colHeaders}>
        <div className={styles.corner} />
        {COLS.map(l => <div key={l} className={styles.colH}>{l}</div>)}
      </div>
      <div className={styles.rows}>
        {Array.from({ length: 10 }, (_, r) => (
          <div key={r} className={styles.row}>
            <div className={styles.rowLabel}>{r + 1}</div>
            {Array.from({ length: 10 }, (_, c) => {
              const i = idx(r, c);
              const shot = shots[i];
              const ship = ships.find(s => s.cells.includes(i));
              const hasShip = !!gridData[i];
              const isPrev = previewCells && previewCells.includes(i);

              let cellClass = styles.cell;

              if (isEnemy) {
                if (phase === 'play' && turn === 'player') cellClass += ` ${styles.clickable}`;
                if (shot === 'hit') {
                  cellClass += ship && ship.sunk ? ` ${styles.sunk}` : ` ${styles.hit}`;
                } else if (shot === 'miss') {
                  cellClass += ` ${styles.miss}`;
                } else if (isPrev && phase === 'play') {
                  cellClass += ` ${styles.aimPreview}`;
                }
              } else {
                if (hasShip) {
                  cellClass += ship && ship.sunk ? ` ${styles.sunk}` : ` ${styles.ship}`;
                }
                if (shot === 'hit')  cellClass += ` ${styles.hit}`;
                if (shot === 'miss') cellClass += ` ${styles.miss}`;
                if (isPrev) cellClass += previewValid ? ` ${styles.preview}` : ` ${styles.previewInvalid}`;
              }

              let content = '';
              if (shot === 'miss') content = '·';
              if (shot === 'hit')  content = ship && ship.sunk ? '✕' : '●';

              return (
                <div
                  key={i}
                  className={cellClass}
                  onClick={() => onCellClick(i)}
                  onMouseEnter={() => onCellEnter(i)}
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
