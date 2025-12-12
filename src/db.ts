import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

/**
 * Manages the SQLite database connection and schema migrations.
 * Handles automatic directory creation and WAL mode configuration.
 */
export class DatabaseManager {
  private db: Database;

  /**
   * Initializes the database connection.
   * Creates the data directory if it doesn't exist (unless using in-memory DB).
   * Enables WAL mode for better concurrency.
   * Runs migrations to ensure schema is up to date.
   *
   * @param path - Path to the SQLite database file. Defaults to "./data/config.db".
   */
  constructor(path: string = "./data/config.db") {
    if (path !== ":memory:") {
      const dir = dirname(path);
      try {
        mkdirSync(dir, { recursive: true });
      } catch {
        /**
         * Directory might already exist, which is fine.
         * We ignore this error to allow idempotent directory creation.
         */
      }
    }
    this.db = new Database(path);
    if (path !== ":memory:") {
      this.db.run("PRAGMA journal_mode = WAL");
    }
    this.#migrate();
  }

  /**
   * Executes database migrations to set up the schema.
   * Creates tables for users, tokens, and config if they don't exist.
   * Also creates necessary indexes for performance.
   */
  #migrate(): void {
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        environment TEXT NOT NULL DEFAULT 'production',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(key, environment)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_config_env ON config(environment)`,
      `CREATE INDEX IF NOT EXISTS idx_config_key_env ON config(key, environment)`,
    ];

    for (const sql of statements) {
      this.db.run(sql);
    }
  }

  /**
   * Returns the underlying Bun SQLite Database instance.
   *
   * @returns The active database connection.
   */
  getDatabase(): Database {
    return this.db;
  }

  /**
   * Closes the database connection.
   * Should be called when the application is shutting down.
   */
  close(): void {
    this.db.close();
  }
}
