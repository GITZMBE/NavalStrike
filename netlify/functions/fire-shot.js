// netlify/functions/fire-shot.js
// POST { code, playerId, cellIndex } — fires a shot, updates state, returns result

const { getSQL, initSchema } = require('./_db');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

function checkSunk(shots, ships) {
  return ships.map(s => ({
    ...s,
    sunk: s.cells.every(c => shots[c] === 'hit'),
  }));
}

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
    const { code, playerId, cellIndex } = JSON.parse(event.body || '{}');

    if (!code || !playerId || cellIndex === undefined) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const rows = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()} FOR UPDATE`;
    if (rows.length === 0) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ error: 'Room not found' }) };
    }

    const room  = rows[0];
    const isHost  = room.host_id  === playerId;
    const isGuest = room.guest_id === playerId;

    if (!isHost && !isGuest) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Not a member of this room' }) };
    }

    const role  = isHost ? 'host' : 'guest';
    const state = { ...room.state };

    if (state.phase !== 'play') {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Game is not in play phase' }) };
    }
    if (state.turn !== role) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Not your turn' }) };
    }

    // Determine target grid and shots array
    const myShots     = role === 'host' ? [...state.hostShots]  : [...state.guestShots];
    const targetGrid  = role === 'host' ? state.guestGrid       : state.hostGrid;
    const targetShips = role === 'host' ? [...state.guestShips] : [...state.hostShips];

    if (myShots[cellIndex] !== null) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Cell already shot' }) };
    }

    const hit     = targetGrid[cellIndex] !== null;
    const hitName = hit ? targetGrid[cellIndex] : null;
    myShots[cellIndex] = hit ? 'hit' : 'miss';

    const updatedShips = checkSunk(myShots, targetShips);
    const sunkShip     = updatedShips.find(s => s.sunk && s.cells.includes(cellIndex));
    const allSunk      = updatedShips.every(s => s.sunk);
    const opponentRole = role === 'host' ? 'guest' : 'host';

    // Build event message
    let lastEvent;
    if (allSunk) {
      lastEvent = `🏆 ${role === 'host' ? 'Host' : 'Guest'} wins! All enemy ships sunk!`;
    } else if (sunkShip) {
      lastEvent = `💥 ${role === 'host' ? 'Host' : 'Guest'} sunk the ${sunkShip.name}! ${opponentRole === 'host' ? 'Host' : 'Guest'}'s turn.`;
    } else if (hit) {
      lastEvent = `🎯 ${role === 'host' ? 'Host' : 'Guest'} hit the ${hitName}! ${opponentRole === 'host' ? 'Host' : 'Guest'}'s turn.`;
    } else {
      lastEvent = `💧 ${role === 'host' ? 'Host' : 'Guest'} missed. ${opponentRole === 'host' ? 'Host' : 'Guest'}'s turn.`;
    }

    // Update state
    if (role === 'host') {
      state.hostShots  = myShots;
      state.guestShips = updatedShips;
    } else {
      state.guestShots = myShots;
      state.hostShips  = updatedShips;
    }

    state.lastEvent = lastEvent;
    state.turn      = allSunk ? null : opponentRole;
    state.phase     = allSunk ? 'over' : 'play';
    state.winner    = allSunk ? role  : null;

    await sql`
      UPDATE rooms
      SET state = ${JSON.stringify(state)}, updated_at = NOW()
      WHERE code = ${code.toUpperCase()}
    `;

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        ok: true,
        hit,
        hitName,
        sunk:      sunkShip ? sunkShip.name : null,
        allSunk,
        winner:    state.winner,
        nextTurn:  state.turn,
        lastEvent,
      }),
    };
  } catch (err) {
    console.error('fire-shot error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
