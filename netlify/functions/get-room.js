// netlify/functions/get-room.js
const { getSQL, initSchema } = require('./_db');

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...HEADERS, 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    await initSchema();
    const sql = getSQL();
    const { code, playerId } = event.queryStringParameters || {};

    if (!code || !playerId) {
      return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'code and playerId required' }) };
    }

    const rows = await sql`SELECT * FROM rooms WHERE code = ${code.toUpperCase()}`;
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
    const state = room.state;

    const myGrid        = role === 'host' ? state.hostGrid  : state.guestGrid;
    const myShips       = role === 'host' ? state.hostShips : state.guestShips;
    const myShots       = role === 'host' ? state.hostShots  : state.guestShots;
    const opponentShots = role === 'host' ? state.guestShots : state.hostShots;
    const opponentShips = role === 'host' ? state.guestShips : state.hostShips;

    // Mask opponent grid — only reveal cells where I scored a hit, or game is over
    const opGrid = role === 'host' ? state.guestGrid : state.hostGrid;
    const maskedOpponentGrid = opGrid.map((cell, i) => {
      if (state.phase === 'over' || myShots[i] === 'hit') return cell;
      return null;
    });

    // Send opponent ship list with sunk status but WITHOUT cells (don't leak positions).
    // Exception: game over — reveal everything.
    const maskedOpponentShips = opponentShips.map(s => ({
      name: s.name,
      sunk: s.sunk,
      // Only send cells after game over so the Grid can show full ship outlines
      cells: state.phase === 'over' ? s.cells : [],
    }));

    // Build a sunk-cells lookup from MY shots + opponent ships so the client
    // can mark every cell of a sunk ship without knowing all cells up-front.
    // For each sunk ship, include its cells so the grid can colour them fully.
    const revealedSunkCells = opponentShips
      .filter(s => s.sunk)
      .map(s => ({ name: s.name, cells: s.cells, sunk: true }));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        code,
        role,
        phase:       state.phase,
        turn:        state.turn,
        winner:      state.winner,
        lastEvent:   state.lastEvent,
        hostReady:   state.hostReady,
        guestReady:  state.guestReady,
        guestJoined: !!room.guest_id,
        myGrid,
        myShips,
        myShots,
        opponentGrid:  maskedOpponentGrid,
        // Full data for sunk ships (safe to reveal — they're already sunk),
        // masked data (no cells) for unsunk ships
        opponentShips: opponentShips.map(s => ({
          name:  s.name,
          sunk:  s.sunk,
          cells: s.sunk || state.phase === 'over' ? s.cells : [],
        })),
        opponentShots,
      }),
    };
  } catch (err) {
    console.error('get-room error:', err);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: err.message }) };
  }
};
