# Config Manager - a small backend example

This project is a lightweight backend service built to demonstrate a clean, pragmatic approach to internal application development. It uses the Bun runtime, Elysia, and SQLite to deliver a fast, simple system with minimal operational overhead and clear separation of concerns.

The service provides two core capabilities: authentication and configuration management.

Authentication is implemented with explicit user registration and login flows, secure password hashing, and bearer-token–based access control. Tokens are issued with defined lifetimes and can be invalidated, keeping session management predictable and easy to reason about. The goal is correctness and clarity rather than framework-driven abstraction.

The configuration component functions as a small internal config / feature flag service. It allows reading and writing configuration values scoped by environment (development, staging, production), all persisted in a relational database. This enables feature toggling and environment-specific behavior without code changes. A simple pattern-based query API (e.g. prefix matching such as feature.\*) supports managing related configuration groups efficiently.

The codebase is intentionally structured with a class-based, modular design, isolating database access, authentication logic, and configuration behavior into clearly defined units. This keeps responsibilities explicit and the system easy to extend or modify. The project favors straightforward implementations, explicit data models, and readable control flow over heavy frameworks or unnecessary architectural layers.

Overall, this project is intended as a practical template for building small, secure, and maintainable backend services using a modern JavaScript toolchain.

## Usage

To run the project, you need to have [Bun](https://bun.sh) installed.

1.  **Install dependencies**:

    ```bash
    bun install
    ```

2.  **Start the server**:

    ```bash
    bun run index.ts
    ```

    The server will start at `http://localhost:3000`.

3.  **Run tests**:
    ```bash
    bun test
    ```

## Testing

The project includes a comprehensive suite of unit and integration tests powered by `bun test`. All 40 tests are currently passing.

### Test Coverage

| Test Suite          | Test Case                                            | Status |
| ------------------- | ---------------------------------------------------- | ------ |
| **DatabaseManager** | should create database and tables                    | ✓      |
|                     | should create indexes                                | ✓      |
|                     | should handle multiple migrations safely             | ✓      |
| **AuthManager**     | should create a user                                 | ✓      |
|                     | should reject duplicate usernames                    | ✓      |
|                     | should authenticate valid credentials                | ✓      |
|                     | should reject invalid username                       | ✓      |
|                     | should reject invalid password                       | ✓      |
|                     | should validate valid token                          | ✓      |
|                     | should reject invalid token                          | ✓      |
|                     | should revoke token                                  | ✓      |
|                     | should get user by id                                | ✓      |
|                     | should return null for non-existent user id          | ✓      |
|                     | should generate unique tokens                        | ✓      |
| **ConfigManager**   | should set and get config value                      | ✓      |
|                     | should return null for non-existent key              | ✓      |
|                     | should update existing config value                  | ✓      |
|                     | should scope config by environment                   | ✓      |
|                     | should use default environment when not specified    | ✓      |
|                     | should get all config entries for environment        | ✓      |
|                     | should delete config entry                           | ✓      |
|                     | should return false when deleting non-existent key   | ✓      |
|                     | should check if config exists                        | ✓      |
|                     | should search config by pattern                      | ✓      |
|                     | should maintain created_at and updated_at timestamps | ✓      |
|                     | should handle empty string values                    | ✓      |
|                     | should handle special characters in keys and values  | ✓      |
| **API Integration** | should register a new user                           | ✓      |
|                     | should reject registration with short password       | ✓      |
|                     | should login and get token                           | ✓      |
|                     | should reject invalid credentials                    | ✓      |
|                     | should get all config entries                        | ✓      |
|                     | should create config entry with auth                 | ✓      |
|                     | should reject config creation without auth           | ✓      |
|                     | should get config entry by key                       | ✓      |
|                     | should update config entry                           | ✓      |
|                     | should delete config entry                           | ✓      |
|                     | should search config by pattern                      | ✓      |
|                     | should handle environment scoping                    | ✓      |
|                     | should logout and invalidate token                   | ✓      |

### Test Categories

- **Database Layer**: Verifies schema creation, migration execution, and connection management.
- **Authentication Logic**: Tests user registration, password hashing, token generation/validation, and secure credential handling.
- **Configuration Management**: Validates CRUD operations, environment scoping, pattern matching, and data integrity.
- **API Endpoints**: Integration tests ensure that HTTP routes correctly handle requests, enforce authentication, and return appropriate status codes.
