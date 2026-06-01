// netlify/functions/join-room.js
// POST { code } — joins a room as guest, returns { code, playerId, role: 'guest' }

const { getSQL, initSchema } = require('./_db');

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
    const { code } = JSON.parse(event.body || '{}');

    if (!code) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Room code required' }) };
    }

    const rows = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
    if (rows.length === 0) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Room not found' }) };
    }

    const room = rows[0];
    if (room.guest_id) {
      return { statusCode: 409, headers: HEADERS, body: JSON.stringify({ error: 'Room is full' }) };
    }

    const playerId = randomId();
    const newState = { ...room.state, phase: 'setup', lastEvent: 'Guest joined — both players place your ships!' };

    await sql`
      UPDATE rooms
      SET guest_id = ${playerId}, state = ${JSON.stringify(newState)}, updated_at = NOW()
      WHERE code = ${code.toUpperCase()}
    `;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ code: code.toUpperCase(), playerId, role: 'guest' }),
    };
  } catch (err) {
    console.error('join-room error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
