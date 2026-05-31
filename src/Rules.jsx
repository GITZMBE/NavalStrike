import React from 'react';
import styles from './Rules.module.css';

const SHIP_DATA = [
  { name: 'Carrier',    size: 5, symbol: '█████' },
  { name: 'Battleship', size: 4, symbol: '████'  },
  { name: 'Cruiser',    size: 3, symbol: '███'   },
  { name: 'Submarine',  size: 3, symbol: '███'   },
  { name: 'Destroyer',  size: 2, symbol: '██'    },
];

export default function Rules({ onBack }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.inner}>
        <button className={styles.backBtn} onClick={onBack}>← Back to menu</button>

        <h2 className={styles.heading}>How to Play Naval Strike</h2>
        <p className={styles.sub}>Based on the official Battleship rules by Hasbro</p>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Objective</h3>
          <p className={styles.text}>
            Be the first to sink all five of your opponent's ships by correctly
            calling out their grid coordinates. The player who sinks every enemy
            ship first wins.
          </p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>The Fleet</h3>
          <p className={styles.text}>Each player commands five ships of different lengths:</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ship</th>
                <th>Size</th>
                <th>Grid spaces</th>
              </tr>
            </thead>
            <tbody>
              {SHIP_DATA.map(s => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>{s.size}</td>
                  <td className={styles.shipBlocks}>
                    {Array.from({ length: s.size }, (_, i) => (
                      <span key={i} className={styles.block} />
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Setup</h3>
          <ul className={styles.list}>
            <li>Place all five ships on your 10×10 ocean grid before battle begins.</li>
            <li>Ships may be placed <strong>horizontally</strong> or <strong>vertically</strong> — never diagonally.</li>
            <li>Ships must stay within the grid boundaries and <strong>cannot overlap</strong>.</li>
            <li>Ships may touch each other but cannot share a square.</li>
            <li>Once the battle starts, ships <strong>cannot be moved</strong>.</li>
            <li>Your opponent cannot see where you placed your ships.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Taking a Turn</h3>
          <ul className={styles.list}>
            <li>On your turn, call out one coordinate (e.g. B7) on the enemy grid.</li>
            <li>Your opponent must truthfully announce <strong>"Hit"</strong> or <strong>"Miss"</strong>.</li>
            <li>On a hit, your opponent also announces <strong>which ship</strong> was hit (e.g. "You hit my Cruiser").</li>
            <li>Mark your targeting grid: <span className={styles.redDot}>●</span> red for a hit, <span className={styles.whiteDot}>·</span> white for a miss.</li>
            <li>Turns <strong>always alternate</strong> — one shot per turn, whether it's a hit or a miss.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Sinking a Ship</h3>
          <ul className={styles.list}>
            <li>A ship is sunk when every one of its grid squares has been hit.</li>
            <li>When a ship is sunk, the owner must announce: <em>"You sank my [Ship Name]!"</em></li>
            <li>Sunk ships are shown with a strike-through in the fleet panel below the board.</li>
            <li>A ship that has been hit but not yet sunk is shown in amber — keep firing!</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Winning</h3>
          <p className={styles.text}>
            The first player to sink all five of the opponent's ships wins the battle.
            There are no draws — keep firing until one fleet is completely destroyed.
          </p>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Difficulty Modes</h3>
          <div className={styles.diffRow}>
            <div className={styles.diffBlock}>
              <span className={styles.diffEmoji}>🌊</span>
              <strong>Easy</strong>
              <p>The enemy fires at completely random coordinates each turn.</p>
            </div>
            <div className={styles.diffBlock}>
              <span className={styles.diffEmoji}>🎯</span>
              <strong>Hard</strong>
              <p>
                The enemy uses a <em>Hunt &amp; Target</em> strategy: it patrols
                on a checkerboard pattern to maximise coverage, then once it scores
                a hit it targets adjacent squares, locks onto the ship's axis, and
                fires along it until the ship sinks.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Legend</h3>
          <div className={styles.legendGrid}>
            <div className={styles.legendItem}>
              <span className={styles.legendCell + ' ' + styles.lgShip} />
              <span>Your ship (intact)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendCell + ' ' + styles.lgHit} />
              <span>Hit (not yet sunk)</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendCell + ' ' + styles.lgSunk} />
              <span>Sunk ship</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendCell + ' ' + styles.lgMiss} />
              <span>Miss</span>
            </div>
          </div>
        </section>

        <button className={styles.backBtnBottom} onClick={onBack}>← Back to menu</button>
      </div>
    </div>
  );
}
