// netlify/functions/place-ships.js
// POST { code, playerId, grid, ships } — saves ship placement and marks player ready

const { getSQL, initSchema } = require('./_db');

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
    const { code, playerId, grid, ships } = JSON.parse(event.body || '{}');

    if (!code || !playerId || !grid || !ships) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const rows = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()} FOR UPDATE`;
    if (rows.length === 0) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Room not found' }) };
    }

    const room = rows[0];
    const isHost  = room.host_id  === playerId;
    const isGuest = room.guest_id === playerId;

    if (!isHost && !isGuest) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Not a member of this room' }) };
    }

    const state = { ...room.state };

    if (isHost) {
      state.hostGrid  = grid;
      state.hostShips = ships;
      state.hostReady = true;
    } else {
      state.guestGrid  = grid;
      state.guestShips = ships;
      state.guestReady = true;
    }

    // If both players are ready, start the battle — host goes first
    if (state.hostReady && state.guestReady) {
      state.phase     = 'play';
      state.turn      = 'host';
      state.lastEvent = "All ships placed — battle begins! Host fires first.";
    } else {
      const waitingFor = isHost ? 'guest' : 'host';
      state.lastEvent  = `You're ready! Waiting for ${waitingFor} to place their ships…`;
    }

    await sql`
      UPDATE rooms
      SET state = ${JSON.stringify(state)}, updated_at = NOW()
      WHERE code = ${code.toUpperCase()}
    `;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: true, phase: state.phase, turn: state.turn }),
    };
  } catch (err) {
    console.error('place-ships error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
