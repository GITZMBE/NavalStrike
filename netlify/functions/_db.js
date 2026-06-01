// netlify/functions/_db.js
// Shared Neon Postgres client + schema bootstrap

const { neon } = require('@neondatabase/serverless');

let _sql = null;

function getSQL() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

async function initSchema() {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      code        TEXT PRIMARY KEY,
      host_id     TEXT NOT NULL,
      guest_id    TEXT,
      state       JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

module.exports = { getSQL, initSchema };
