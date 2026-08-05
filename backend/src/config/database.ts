import { Pool } from "pg";
import "dotenv/config";

const requiredEnvironmentVariables = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
] as const;

for (const variableName of requiredEnvironmentVariables) {
  if (!process.env[variableName]) {
    throw new Error("Missing required environment variable: " + variableName);
  }
}

const databaseport = Number(process.env.DB_PORT) || 5432;
const poolMax = Number(process.env.DB_POOL_MAX) || 10;

if (!Number.isInteger(poolMax) || poolMax <= 0) {
  throw new Error(
    "Invalid value for DB_POOL_MAX. It must be a positive integer.",
  );
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: databaseport,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  max: poolMax,
  idleTimeoutMillis: 30000, // 30 seconds
  connectionTimeoutMillis: 5_000, // 5 seconds
});

pool.on("error", (error: Error) => {
  console.error("Unexpected error on idle client", error);
});

export async function testDatabaseConnection(): Promise<void> {
  const result = await pool.query<{
    database_name: string;
    database_time: Date;
  }>(`
    SELECT
      current_database() AS database_name,
      NOW() AS database_time
  `);

  const database = result.rows[0];

  console.log(
    `PostgreSQL connected: ${database.database_name} at ` +
      `${database.database_time.toISOString()}`,
  );
}

export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
  console.log("PostgreSQL pool closed.");
}
