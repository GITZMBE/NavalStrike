// netlify/functions/get-room.js
// GET ?code=XXXX&playerId=yyy — returns the room state visible to this player

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

    const room = rows[0];
    const isHost  = room.host_id  === playerId;
    const isGuest = room.guest_id === playerId;

    if (!isHost && !isGuest) {
      return { statusCode: 403, headers: HEADERS, body: JSON.stringify({ error: 'Not a member of this room' }) };
    }

    const role  = isHost ? 'host' : 'guest';
    const state = room.state;

    // Build a view of the state for this player:
    // - Own grid is revealed (ships visible)
    // - Opponent's grid is masked (ships hidden, only shots visible)
    const myGrid       = role === 'host' ? state.hostGrid       : state.guestGrid;
    const myShips      = role === 'host' ? state.hostShips      : state.guestShips;
    const myShots      = role === 'host' ? state.hostShots      : state.guestShots;  // shots I fired
    const opponentShots = role === 'host' ? state.guestShots    : state.hostShots;   // shots fired at me
    const opponentShips = role === 'host' ? state.guestShips    : state.hostShips;   // revealed only after game over

    // Mask opponent grid — only show cells that have been hit by me
    const maskedOpponentGrid = Array(100).fill(null).map((_, i) => {
      const opGrid = role === 'host' ? state.guestGrid : state.hostGrid;
      // Only reveal if I've fired a hit there, or game is over
      if (state.phase === 'over' || myShots[i] === 'hit') return opGrid[i];
      return null;
    });

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        code,
        role,
        phase: state.phase,
        turn:  state.turn,
        winner: state.winner,
        lastEvent: state.lastEvent,
        hostReady:  state.hostReady,
        guestReady: state.guestReady,
        guestJoined: !!room.guest_id,
        // My side
        myGrid,
        myShips,
        myShots,         // shots I fired at opponent
        // Opponent side
        opponentGrid:  maskedOpponentGrid,
        opponentShips: state.phase === 'over' ? opponentShips : opponentShips.map(s => ({ ...s, cells: [] })),
        opponentShots, // shots fired at me (so I can show hits on my board)
      }),
    };
  } catch (err) {
    console.error('get-room error:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
