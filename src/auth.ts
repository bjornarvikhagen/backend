import { Database } from "bun:sqlite";
import { randomBytes, createHash, timingSafeEqual } from "crypto";

/**
 * Represents a registered user in the system.
 */
export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

/**
 * Represents an authentication token session.
 */
export interface Token {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

/**
 * Manages user authentication, registration, and token sessions.
 * Handles password hashing, token generation, and secure comparison.
 */
export class AuthManager {
  private db: Database;
  #tokenExpiryHours: number = 24;

  /**
   * Initializes the AuthManager.
   *
   * @param db - The database connection instance.
   * @param tokenExpiryHours - Duration in hours before a token expires. Defaults to 24.
   */
  constructor(db: Database, tokenExpiryHours: number = 24) {
    this.db = db;
    this.#tokenExpiryHours = tokenExpiryHours;
  }

  /**
   * Hashes a password using SHA-256.
   * Note: For production, consider using a slower hashing algorithm like Argon2 or bcrypt.
   *
   * @param password - The plain text password to hash.
   * @returns The hexadecimal string representation of the hash.
   */
  #hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex");
  }

  /**
   * Generates a cryptographically strong random token.
   *
   * @returns A 32-byte hex string token.
   */
  #generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Creates a new user account.
   * Hashes the password before storage.
   *
   * @param username - The desired username.
   * @param password - The user's password.
   * @returns The ID of the newly created user.
   * @throws Error if the username already exists.
   */
  createUser(username: string, password: string): number {
    const passwordHash = this.#hashPassword(password);

    try {
      const stmt = this.db.prepare(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)"
      );
      const result = stmt.run(username, passwordHash);
      return result.lastInsertRowid as number;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("UNIQUE constraint") ||
          error.message.includes("UNIQUE"))
      ) {
        throw new Error("Username already exists");
      }
      throw error;
    }
  }

  /**
   * Authenticates a user by verifying their credentials.
   * If successful, generates and returns a new session token.
   * Uses timing-safe comparison to prevent timing attacks.
   *
   * @param username - The user's username.
   * @param password - The user's password.
   * @returns A valid session token if authentication succeeds, null otherwise.
   */
  authenticate(username: string, password: string): string | null {
    const passwordHash = this.#hashPassword(password);
    const stmt = this.db.prepare("SELECT * FROM users WHERE username = ?");
    const user = stmt.get(username) as User | undefined;

    if (!user) {
      return null;
    }

    const storedHash = Buffer.from(user.password_hash, "hex");
    const providedHash = Buffer.from(passwordHash, "hex");

    if (storedHash.length !== providedHash.length) {
      return null;
    }

    try {
      if (!timingSafeEqual(storedHash, providedHash)) {
        return null;
      }
    } catch {
      return null;
    }

    const token = this.#generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.#tokenExpiryHours);

    const insertStmt = this.db.prepare(
      "INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)"
    );
    insertStmt.run(user.id, token, expiresAt.toISOString());

    return token;
  }

  /**
   * Validates a session token.
   * Checks if the token exists and has not expired.
   *
   * @param token - The session token to validate.
   * @returns The associated User object if valid, null otherwise.
   */
  validateToken(token: string): User | null {
    const stmt = this.db.prepare(
      'SELECT t.*, u.* FROM tokens t JOIN users u ON t.user_id = u.id WHERE t.token = ? AND t.expires_at > datetime("now")'
    );
    const tokenRecord = stmt.get(token) as (Token & User) | undefined;

    if (!tokenRecord) {
      return null;
    }

    return {
      id: tokenRecord.id,
      username: tokenRecord.username,
      password_hash: tokenRecord.password_hash,
      created_at: tokenRecord.created_at,
    };
  }

  /**
   * Revokes a session token, effectively logging the user out.
   *
   * @param token - The token to revoke.
   */
  revokeToken(token: string): void {
    const stmt = this.db.prepare("DELETE FROM tokens WHERE token = ?");
    stmt.run(token);
  }

  /**
   * Retrieves a user by their ID.
   *
   * @param id - The unique ID of the user.
   * @returns The User object if found, null otherwise.
   */
  getUserById(id: number): User | null {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id = ?");
    const user = stmt.get(id) as User | undefined;
    return user || null;
  }
}
