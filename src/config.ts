import { Database } from "bun:sqlite";

/**
 * Represents the deployment environment for configuration values.
 */
export type Environment = "development" | "staging" | "production";

/**
 * Represents a configuration entry in the database.
 */
export interface ConfigEntry {
  id: number;
  key: string;
  value: string;
  environment: Environment;
  created_at: string;
  updated_at: string;
}

/**
 * Manages application configuration values backed by SQLite.
 * Supports CRUD operations, environment scoping, and pattern-based searching.
 */
export class ConfigManager {
  private db: Database;
  private defaultEnvironment: Environment = "production";

  /**
   * Initializes the ConfigManager.
   *
   * @param db - The database connection instance.
   * @param defaultEnvironment - The default environment to use if none is specified. Defaults to "production".
   */
  constructor(db: Database, defaultEnvironment: Environment = "production") {
    this.db = db;
    this.defaultEnvironment = defaultEnvironment;
  }

  /**
   * Sets a configuration value.
   * If the key exists for the given environment, it updates the value.
   * Otherwise, it creates a new entry.
   *
   * @param key - The configuration key (e.g., "feature.flag").
   * @param value - The value to store.
   * @param environment - The environment scope. Defaults to the manager's default environment.
   * @returns The created or updated ConfigEntry.
   */
  set(key: string, value: string, environment?: Environment): ConfigEntry {
    const env = environment || this.defaultEnvironment;
    const now = new Date().toISOString();

    const selectStmt = this.db.prepare(
      "SELECT * FROM config WHERE key = ? AND environment = ?"
    );
    const existing = selectStmt.get(key, env) as ConfigEntry | undefined;

    if (existing) {
      const updateStmt = this.db.prepare(
        "UPDATE config SET value = ?, updated_at = ? WHERE id = ?"
      );
      updateStmt.run(value, now, existing.id);
      return { ...existing, value, updated_at: now };
    }

    const insertStmt = this.db.prepare(
      "INSERT INTO config (key, value, environment, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    );
    const result = insertStmt.run(key, value, env, now, now);

    return {
      id: result.lastInsertRowid as number,
      key,
      value,
      environment: env,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Retrieves a configuration value by key and environment.
   *
   * @param key - The configuration key.
   * @param environment - The environment scope. Defaults to the manager's default environment.
   * @returns The configuration value if found, null otherwise.
   */
  get(key: string, environment?: Environment): string | null {
    const env = environment || this.defaultEnvironment;
    const stmt = this.db.prepare(
      "SELECT value FROM config WHERE key = ? AND environment = ?"
    );
    const entry = stmt.get(key, env) as { value: string } | null | undefined;

    if (!entry) {
      return null;
    }
    return entry.value;
  }

  /**
   * Retrieves all configuration entries for a specific environment.
   *
   * @param environment - The environment scope. Defaults to the manager's default environment.
   * @returns An array of ConfigEntry objects sorted by key.
   */
  getAll(environment?: Environment): ConfigEntry[] {
    const env = environment || this.defaultEnvironment;
    const stmt = this.db.prepare(
      "SELECT * FROM config WHERE environment = ? ORDER BY key"
    );
    return stmt.all(env) as ConfigEntry[];
  }

  /**
   * Deletes a configuration entry.
   *
   * @param key - The configuration key to delete.
   * @param environment - The environment scope. Defaults to the manager's default environment.
   * @returns True if an entry was deleted, false if the key was not found.
   */
  delete(key: string, environment?: Environment): boolean {
    const env = environment || this.defaultEnvironment;
    const stmt = this.db.prepare(
      "DELETE FROM config WHERE key = ? AND environment = ?"
    );
    const result = stmt.run(key, env);
    return result.changes > 0;
  }

  /**
   * Checks if a configuration key exists.
   *
   * @param key - The configuration key.
   * @param environment - The environment scope. Defaults to the manager's default environment.
   * @returns True if the key exists, false otherwise.
   */
  exists(key: string, environment?: Environment): boolean {
    const env = environment || this.defaultEnvironment;
    const stmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM config WHERE key = ? AND environment = ?"
    );
    const count = stmt.get(key, env) as { count: number };

    return count.count > 0;
  }

  /**
   * Searches for configuration entries matching a pattern.
   * Uses SQL LIKE operator for pattern matching.
   *
   * @param pattern - The search pattern (e.g., "feature.%").
   * @param environment - The environment scope. Defaults to the manager's default environment.
   * @returns An array of matching ConfigEntry objects sorted by key.
   */
  getByPattern(pattern: string, environment?: Environment): ConfigEntry[] {
    const env = environment || this.defaultEnvironment;
    const stmt = this.db.prepare(
      "SELECT * FROM config WHERE key LIKE ? AND environment = ? ORDER BY key"
    );
    return stmt.all(`%${pattern}%`, env) as ConfigEntry[];
  }
}
