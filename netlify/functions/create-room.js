// netlify/functions/create-room.js
// POST — creates a new game room, returns { code, playerId, role: 'host' }

const { getSQL, initSchema } = require('./_db');

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function randomId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    await initSchema();
    const sql = getSQL();

    const playerId = randomId();
    let code;
    let attempts = 0;

    // Find a unique room code
    while (attempts < 10) {
      code = randomCode();
      const existing = await sql`SELECT code FROM rooms WHERE code = ${code}`;
      if (existing.length === 0) break;
      attempts++;
    }

    const initialState = {
      phase: 'waiting',        // waiting | setup | play | over
      turn: null,              // 'host' | 'guest'
      winner: null,            // 'host' | 'guest' | null
      hostReady: false,        // host finished placing ships
      guestReady: false,       // guest finished placing ships
      // Each side stores ships as array of { name, cells, sunk }
      // and a flat 100-cell grid where non-null = ship name
      hostGrid: Array(100).fill(null),
      guestGrid: Array(100).fill(null),
      hostShips: [],
      guestShips: [],
      // Shots fired BY host (targeting guest), shots fired BY guest (targeting host)
      hostShots: Array(100).fill(null),
      guestShots: Array(100).fill(null),
      lastEvent: null,         // last game event string for status bar
    };

    await sql`
      INSERT INTO rooms (code, host_id, state)
      VALUES (${code}, ${playerId}, ${JSON.stringify(initialState)})
    `;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ code, playerId, role: 'host' }),
    };
  } catch (err) {
    console.error('create-room error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
