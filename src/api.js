// src/api.js — thin wrapper around Netlify Functions

const BASE = '/api';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function get(path, params = {}) {
  const qs  = new URLSearchParams(params).toString();
  const url = qs ? `${BASE}${path}?${qs}` : `${BASE}${path}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  createRoom:  ()                                    => post('/create-room', {}),
  joinRoom:    (code)                                => post('/join-room', { code }),
  getRoom:     (code, playerId)                      => get('/get-room', { code, playerId }),
  placeShips:  (code, playerId, grid, ships)         => post('/place-ships', { code, playerId, grid, ships }),
  fireShot:    (code, playerId, cellIndex)           => post('/fire-shot', { code, playerId, cellIndex }),
  deleteRoom:  (code, playerId)                      => post('/delete-room', { code, playerId }),
};
