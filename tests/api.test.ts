import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, unlinkSync } from "fs";

const BASE_URL = "http://localhost:3000";

describe("API Integration Tests", () => {
  let authToken: string;
  const uniqueId = Date.now().toString();

  beforeAll(async () => {
    /* Wait for server to be ready (assumes server is running) */
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it("should register a new user", async () => {
    const username = `testuser_${uniqueId}`;
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "password123" }),
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as { id?: number; username?: string };
    expect(data.id).toBeDefined();
    expect(data.username).toBe(username);
  });

  it("should reject registration with short password", async () => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testuser2", password: "short" }),
    });

    expect(response.ok).toBe(false);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toContain("8 characters");
  });

  it("should login and get token", async () => {
    const username = `testuser_${uniqueId}`;
    /* Register first to ensure the user exists */
    await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "password123" }),
    });

    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "password123" }),
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as { token?: string };
    expect(data.token).toBeDefined();
    authToken = data.token!;
  });

  it("should reject invalid credentials", async () => {
    const username = `testuser_${uniqueId}`;
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password: "wrongpassword" }),
    });

    expect(response.ok).toBe(false);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toBe("Invalid credentials");
  });

  it("should get all config entries", async () => {
    const response = await fetch(`${BASE_URL}/config`);
    expect(response.ok).toBe(true);
    const data = (await response.json()) as {
      environment?: string;
      config?: unknown[];
    };
    expect(data.environment).toBe("production");
    expect(Array.isArray(data.config)).toBe(true);
  });

  it("should create config entry with auth", async () => {
    const response = await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ key: "test.feature", value: "true" }),
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as { key?: string; value?: string };
    expect(data.key).toBe("test.feature");
    expect(data.value).toBe("true");
  });

  it("should reject config creation without auth", async () => {
    const response = await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "test.feature2", value: "true" }),
    });

    expect(response.ok).toBe(false);
  });

  it("should get config entry by key", async () => {
    const response = await fetch(`${BASE_URL}/config/test.feature`);
    expect(response.ok).toBe(true);
    const data = (await response.json()) as { key?: string; value?: string };
    expect(data.key).toBe("test.feature");
    expect(data.value).toBe("true");
  });

  it("should update config entry", async () => {
    const response = await fetch(`${BASE_URL}/config/test.feature`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ value: "false" }),
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as { value?: string };
    expect(data.value).toBe("false");
  });

  it("should delete config entry", async () => {
    const response = await fetch(`${BASE_URL}/config/test.feature`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok).toBe(true);
    const data = (await response.json()) as { message?: string };
    expect(data.message).toBe("Config deleted");
  });

  it("should search config by pattern", async () => {
    /* Create some test configs to search for */
    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ key: "feature.flag1", value: "true" }),
    });

    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ key: "feature.flag2", value: "false" }),
    });

    const response = await fetch(`${BASE_URL}/config/search/feature`);
    expect(response.ok).toBe(true);
    const data = (await response.json()) as { config?: unknown[] };
    expect(data.config?.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle environment scoping", async () => {
    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        key: "env.test",
        value: "prod",
        environment: "production",
      }),
    });

    await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        key: "env.test",
        value: "dev",
        environment: "development",
      }),
    });

    const prodResponse = await fetch(
      `${BASE_URL}/config/env.test?environment=production`
    );
    const prodData = (await prodResponse.json()) as { value?: string };
    expect(prodData.value).toBe("prod");

    const devResponse = await fetch(
      `${BASE_URL}/config/env.test?environment=development`
    );
    const devData = (await devResponse.json()) as { value?: string };
    expect(devData.value).toBe("dev");
  });

  it("should logout and invalidate token", async () => {
    const response = await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.ok).toBe(true);

    /* Token should now be invalid, so subsequent requests should fail */
    const configResponse = await fetch(`${BASE_URL}/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ key: "test.key", value: "test" }),
    });

    expect(configResponse.ok).toBe(false);
  });
});
