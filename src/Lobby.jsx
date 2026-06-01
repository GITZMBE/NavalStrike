import React, { useState } from 'react';
import { api } from './api';
import styles from './Lobby.module.css';

export default function Lobby({ onJoined, onBack }) {
  const [tab, setTab]         = useState('create'); // 'create' | 'join'
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const { code, playerId, role } = await api.createRoom();
      onJoined({ code, playerId, role });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (joinCode.trim().length < 4) { setError('Enter a valid room code'); return; }
    setLoading(true);
    setError('');
    try {
      const { code, playerId, role } = await api.joinRoom(joinCode.trim().toUpperCase());
      onJoined({ code, playerId, role });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <button className={styles.backBtn} onClick={onBack}>← Back</button>
      <h2 className={styles.heading}>Multiplayer</h2>
      <p className={styles.sub}>Play against a friend on any device</p>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab}${tab === 'create' ? ` ${styles.tabActive}` : ''}`}
          onClick={() => setTab('create')}
        >Create room</button>
        <button
          className={`${styles.tab}${tab === 'join' ? ` ${styles.tabActive}` : ''}`}
          onClick={() => setTab('join')}
        >Join room</button>
      </div>

      {tab === 'create' ? (
        <div className={styles.panel}>
          <p className={styles.panelText}>
            Create a new private room and share the code with your opponent.
            You'll go first once both players have placed their ships.
          </p>
          <button className={styles.primaryBtn} onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating…' : 'Create room'}
          </button>
        </div>
      ) : (
        <div className={styles.panel}>
          <p className={styles.panelText}>Enter the 6-character room code your opponent shared with you.</p>
          <div className={styles.codeRow}>
            <input
              className={styles.codeInput}
              type="text"
              maxLength={6}
              placeholder="ABCD12"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              spellCheck={false}
              autoComplete="off"
            />
            <button className={styles.primaryBtn} onClick={handleJoin} disabled={loading}>
              {loading ? 'Joining…' : 'Join'}
            </button>
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.howWorks}>
        <div className={styles.hwTitle}>How it works</div>
        <ol className={styles.hwList}>
          <li>Player 1 creates a room and shares the code</li>
          <li>Player 2 joins with the code on any device</li>
          <li>Both players place their ships</li>
          <li>Battle begins — turns alternate in real time</li>
        </ol>
      </div>
    </div>
  );
}
