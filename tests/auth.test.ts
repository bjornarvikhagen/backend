import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseManager } from "../src/db";
import { AuthManager } from "../src/auth";
import { existsSync, unlinkSync } from "fs";

describe("AuthManager", () => {
  const testDbPath = ":memory:";
  let dbManager: DatabaseManager;
  let authManager: AuthManager;

  beforeEach(() => {
    dbManager = new DatabaseManager(testDbPath);
    authManager = new AuthManager(dbManager.getDatabase());
  });

  afterEach(() => {
    dbManager.close();
  });

  it("should create a user", () => {
    const userId = authManager.createUser("testuser", "password123");
    expect(userId).toBeGreaterThan(0);
  });

  it("should reject duplicate usernames", () => {
    authManager.createUser("testuser", "password123");
    expect(() => authManager.createUser("testuser", "password456")).toThrow(
      "Username already exists"
    );
  });

  it("should authenticate valid credentials", () => {
    authManager.createUser("testuser", "password123");
    const token = authManager.authenticate("testuser", "password123");
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token!.length).toBeGreaterThan(0);
  });

  it("should reject invalid username", () => {
    const token = authManager.authenticate("nonexistent", "password123");
    expect(token).toBeNull();
  });

  it("should reject invalid password", () => {
    authManager.createUser("testuser", "password123");
    const token = authManager.authenticate("testuser", "wrongpassword");
    expect(token).toBeNull();
  });

  it("should validate valid token", () => {
    authManager.createUser("testuser", "password123");
    const token = authManager.authenticate("testuser", "password123");
    expect(token).toBeTruthy();

    const user = authManager.validateToken(token!);
    expect(user).toBeTruthy();
    expect(user!.username).toBe("testuser");
  });

  it("should reject invalid token", () => {
    const user = authManager.validateToken("invalid-token");
    expect(user).toBeNull();
  });

  it("should revoke token", () => {
    authManager.createUser("testuser", "password123");
    const token = authManager.authenticate("testuser", "password123");
    expect(token).toBeTruthy();

    authManager.revokeToken(token!);
    const user = authManager.validateToken(token!);
    expect(user).toBeNull();
  });

  it("should get user by id", () => {
    const userId = authManager.createUser("testuser", "password123");
    const user = authManager.getUserById(userId);

    expect(user).toBeTruthy();
    expect(user!.id).toBe(userId);
    expect(user!.username).toBe("testuser");
  });

  it("should return null for non-existent user id", () => {
    const user = authManager.getUserById(99999);
    expect(user).toBeNull();
  });

  it("should generate unique tokens", () => {
    authManager.createUser("testuser", "password123");
    const token1 = authManager.authenticate("testuser", "password123");
    const token2 = authManager.authenticate("testuser", "password123");

    expect(token1).not.toBe(token2);
  });
});
