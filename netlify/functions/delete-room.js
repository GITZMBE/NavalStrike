// netlify/functions/delete-room.js
// POST { code, playerId } — deletes the room (either player can trigger)
// Also called by a scheduled cleanup for rooms older than 2 hours

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
    const { code, playerId } = JSON.parse(event.body || '{}');

    if (!code || !playerId) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'code and playerId required' }) };
    }

    const rows = await sql`SELECT host_id, guest_id FROM rooms WHERE code = ${code.toUpperCase()}`;
    if (rows.length === 0) {
      // Already gone — that's fine
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
    }

    const room = rows[0];
    const isMember = room.host_id === playerId || room.guest_id === playerId;
    if (!isMember) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Not a member of this room' }) };
    }

    await sql`DELETE FROM rooms WHERE code = ${code.toUpperCase()}`;

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('delete-room error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
