// netlify/functions/cleanup-rooms.js
// Scheduled function — runs every hour via netlify.toml cron
// Deletes:
//   - Rooms in 'waiting' phase older than 30 minutes (host left without playing)
//   - Rooms in 'setup'/'play' phase older than 3 hours (abandoned mid-game)
//   - Rooms in 'over' phase older than 30 minutes (game finished)

const { getSQL, initSchema } = require('./_db');

exports.handler = async (event) => {
  try {
    await initSchema();
    const sql = getSQL();

    const result = await sql`
      DELETE FROM rooms
      WHERE
        (state->>'phase' = 'waiting' AND updated_at < NOW() - INTERVAL '30 minutes')
        OR
        (state->>'phase' IN ('setup', 'play') AND updated_at < NOW() - INTERVAL '3 hours')
        OR
        (state->>'phase' = 'over' AND updated_at < NOW() - INTERVAL '30 minutes')
      RETURNING code
    `;

    const deleted = result.length;
    console.log(`cleanup-rooms: deleted ${deleted} stale room(s)`);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, deleted }),
    };
  } catch (err) {
    console.error('cleanup-rooms error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
