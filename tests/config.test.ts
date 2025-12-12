import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { DatabaseManager } from "../src/db";
import { ConfigManager } from "../src/config";
import { existsSync, unlinkSync } from "fs";

describe("ConfigManager", () => {
  const testDbPath = ":memory:";
  let dbManager: DatabaseManager;
  let configManager: ConfigManager;

  beforeEach(() => {
    dbManager = new DatabaseManager(testDbPath);
    configManager = new ConfigManager(dbManager.getDatabase());
  });

  afterEach(() => {
    dbManager.close();
  });

  it("should set and get config value", () => {
    configManager.set("test.key", "test-value");
    const value = configManager.get("test.key");
    expect(value).toBe("test-value");
  });

  it("should return null for non-existent key", () => {
    const value = configManager.get("nonexistent.key");
    expect(value).toBeNull();
  });

  it("should update existing config value", () => {
    configManager.set("test.key", "value1");
    configManager.set("test.key", "value2");
    const value = configManager.get("test.key");
    expect(value).toBe("value2");
  });

  it("should scope config by environment", () => {
    configManager.set("test.key", "prod-value", "production");
    configManager.set("test.key", "dev-value", "development");

    expect(configManager.get("test.key", "production")).toBe("prod-value");
    expect(configManager.get("test.key", "development")).toBe("dev-value");
  });

  it("should use default environment when not specified", () => {
    configManager.set("test.key", "default-value");
    expect(configManager.get("test.key")).toBe("default-value");
    expect(configManager.get("test.key", "production")).toBe("default-value");
  });

  it("should get all config entries for environment", () => {
    configManager.set("key1", "value1", "production");
    configManager.set("key2", "value2", "production");
    configManager.set("key1", "dev-value1", "development");

    const prodEntries = configManager.getAll("production");
    expect(prodEntries.length).toBe(2);
    expect(prodEntries.map((e) => e.key)).toContain("key1");
    expect(prodEntries.map((e) => e.key)).toContain("key2");

    const devEntries = configManager.getAll("development");
    expect(devEntries.length).toBe(1);
    expect(devEntries[0]?.key).toBe("key1");
  });

  it("should delete config entry", () => {
    configManager.set("test.key", "value");
    expect(configManager.exists("test.key")).toBe(true);

    const deleted = configManager.delete("test.key");
    expect(deleted).toBe(true);
    expect(configManager.exists("test.key")).toBe(false);
  });

  it("should return false when deleting non-existent key", () => {
    const deleted = configManager.delete("nonexistent.key");
    expect(deleted).toBe(false);
  });

  it("should check if config exists", () => {
    expect(configManager.exists("test.key")).toBe(false);
    configManager.set("test.key", "value");
    expect(configManager.exists("test.key")).toBe(true);
  });

  it("should search config by pattern", () => {
    configManager.set("feature.flag1", "true", "production");
    configManager.set("feature.flag2", "false", "production");
    configManager.set("app.name", "MyApp", "production");

    const featureFlags = configManager.getByPattern("feature", "production");
    expect(featureFlags.length).toBe(2);
    expect(featureFlags.map((e) => e.key)).toContain("feature.flag1");
    expect(featureFlags.map((e) => e.key)).toContain("feature.flag2");

    const appConfigs = configManager.getByPattern("app", "production");
    expect(appConfigs.length).toBe(1);
    expect(appConfigs[0]?.key).toBe("app.name");
  });

  it("should maintain created_at and updated_at timestamps", () => {
    const entry1 = configManager.set("test.key", "value1");
    expect(entry1.created_at).toBeDefined();
    expect(entry1.updated_at).toBeDefined();

    // Small delay to ensure timestamp difference
    Bun.sleepSync(10);

    const entry2 = configManager.set("test.key", "value2");
    expect(entry2.id).toBe(entry1.id);
    expect(entry2.created_at).toBe(entry1.created_at);
    expect(new Date(entry2.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(entry1.updated_at).getTime()
    );
  });

  it("should handle empty string values", () => {
    configManager.set("empty.key", "");
    const value = configManager.get("empty.key");
    expect(value).toBe("");
  });

  it("should handle special characters in keys and values", () => {
    configManager.set("key.with.dots", "value with spaces");
    configManager.set("key-with-dashes", "value-with-dashes");
    configManager.set("key_with_underscores", "value_with_underscores");

    expect(configManager.get("key.with.dots")).toBe("value with spaces");
    expect(configManager.get("key-with-dashes")).toBe("value-with-dashes");
    expect(configManager.get("key_with_underscores")).toBe(
      "value_with_underscores"
    );
  });
});
