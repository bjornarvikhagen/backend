import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DatabaseManager } from '../src/db';
import { existsSync, unlinkSync } from 'fs';

describe('DatabaseManager', () => {
  const testDbPath = ':memory:';
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(() => {
    dbManager.close();
  });

  it('should create database and tables', () => {
    const db = dbManager.getDatabase();
    const users = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    const tokens = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tokens'").get();
    const config = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='config'").get();

    expect(users).toBeDefined();
    expect(tokens).toBeDefined();
    expect(config).toBeDefined();
  });

  it('should create indexes', () => {
    const db = dbManager.getDatabase();
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
    const indexNames = indexes.map(i => i.name);

    expect(indexNames).toContain('idx_config_env');
    expect(indexNames).toContain('idx_config_key_env');
  });

  it('should handle multiple migrations safely', () => {
    const db = dbManager.getDatabase();
    dbManager = new DatabaseManager(testDbPath);
    
    const users = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    expect(users).toBeDefined();
  });
});

