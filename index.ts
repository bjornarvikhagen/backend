import { Elysia } from "elysia";
import bearer from "@elysiajs/bearer";
import { DatabaseManager } from "./src/db";
import { AuthManager } from "./src/auth";
import { ConfigManager, type Environment } from "./src/config";

const dbManager = new DatabaseManager();
const db = dbManager.getDatabase();
const authManager = new AuthManager(db);
const configManager = new ConfigManager(db);

/**
 * Validates the authentication token provided in the request.
 *
 * @param bearer - The bearer token string.
 * @returns The authenticated User object.
 * @throws Error if the token is missing, invalid, or expired.
 */
const requireAuth = (bearer: string | undefined) => {
  if (!bearer) {
    throw new Error("Missing authorization token");
  }

  const user = authManager.validateToken(bearer);
  if (!user) {
    throw new Error("Invalid or expired token");
  }

  return user;
};

const app = new Elysia()
  .use(bearer())
  /**
   * -------------------------------------------------------------------------
   * Authentication Routes
   * -------------------------------------------------------------------------
   * Endpoints for user registration, login, and logout.
   */
  .post("/auth/register", ({ body, set }) => {
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      set.status = 400;
      return { error: "Username and password required" };
    }

    if (password.length < 8) {
      set.status = 400;
      return { error: "Password must be at least 8 characters" };
    }

    try {
      const userId = authManager.createUser(username, password);
      return { id: userId, username };
    } catch (error) {
      set.status = 400;
      return {
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  })
  .post("/auth/login", ({ body, set }) => {
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      set.status = 400;
      return { error: "Username and password required" };
    }

    const token = authManager.authenticate(username, password);
    if (!token) {
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    return { token };
  })
  .post("/auth/logout", ({ bearer }) => {
    if (bearer) {
      authManager.revokeToken(bearer);
    }
    return { message: "Logged out" };
  })

  /**
   * -------------------------------------------------------------------------
   * Configuration Routes
   * -------------------------------------------------------------------------
   * Endpoints for managing configuration entries.
   * Reading config is public, writing requires authentication.
   */
  .get("/config", async ({ query }) => {
    const env = (query?.environment as Environment | undefined) || "production";
    const entries = configManager.getAll(env);
    return { environment: env, config: entries };
  })
  .get("/config/:key", async ({ params, query, set }) => {
    const env = (query?.environment as Environment | undefined) || "production";
    const value = configManager.get(params.key, env);

    if (value === null) {
      set.status = 404;
      return { error: "Config key not found" };
    }

    return { key: params.key, value, environment: env };
  })
  .post("/config", async ({ body, bearer, set }) => {
    requireAuth(bearer);

    const { key, value, environment } = body as {
      key?: string;
      value?: string;
      environment?: Environment;
    };

    if (!key || value === undefined) {
      set.status = 400;
      return { error: "Key and value required" };
    }

    const entry = configManager.set(key, value, environment);
    return entry;
  })
  .put("/config/:key", async ({ params, body, bearer, set }) => {
    requireAuth(bearer);

    const { value, environment } = body as {
      value?: string;
      environment?: Environment;
    };

    if (value === undefined) {
      set.status = 400;
      return { error: "Value required" };
    }

    const entry = configManager.set(params.key, value, environment);
    return entry;
  })
  .delete("/config/:key", async ({ params, query, bearer, set }) => {
    requireAuth(bearer);

    const env = (query?.environment as Environment | undefined) || "production";
    const deleted = configManager.delete(params.key, env);

    if (!deleted) {
      set.status = 404;
      return { error: "Config key not found" };
    }

    return { message: "Config deleted", key: params.key, environment: env };
  })
  .get("/config/search/:pattern", async ({ params, query }) => {
    const env = (query?.environment as Environment | undefined) || "production";
    const entries = configManager.getByPattern(params.pattern, env);
    return { pattern: params.pattern, environment: env, config: entries };
  })
  .onError(({ error, code, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;
      return { error: "Invalid request" };
    }
    const message =
      error instanceof Error ? error.message : "Internal server error";

    /**
     * Map specific error messages to appropriate HTTP status codes.
     * Auth errors -> 401 Unauthorized
     * Others -> 500 Internal Server Error
     */
    if (
      message.includes("Missing authorization token") ||
      message.includes("Invalid or expired token")
    ) {
      set.status = 401;
    } else {
      set.status = 500;
    }

    return { error: message };
  })
  .listen(3000);

console.log(`🚀 Server running at http://localhost:${app.server?.port}`);
