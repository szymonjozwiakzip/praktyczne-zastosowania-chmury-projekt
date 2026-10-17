import { Pool } from "pg";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function sslFor(connectionString: string) {
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("sslmode=disable");

  if (isLocal) {
    return undefined;
  }

  return { rejectUnauthorized: false };
}

export function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Brak zmiennej środowiskowej DATABASE_URL.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: sslFor(connectionString),
    });
  }

  return pool;
}

async function ensureSchema() {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      workshop TEXT NOT NULL,
      attachment_name TEXT,
      attachment_mime TEXT,
      attachment_size INTEGER,
      attachment_data BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export function readyDatabase() {
  if (!schemaReady) {
    schemaReady = ensureSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }

  return schemaReady;
}
