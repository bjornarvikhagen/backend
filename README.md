# Config Manager - a small backend example

This project is a lightweight backend service built to demonstrate a clean, pragmatic approach to internal application development. It uses the Bun runtime, Elysia, and SQLite to deliver a fast, simple system with minimal operational overhead and clear separation of concerns.

The service provides two core capabilities: authentication and configuration management.

Authentication is implemented with explicit user registration and login flows, secure password hashing, and bearer-token–based access control. Tokens are issued with defined lifetimes and can be invalidated, keeping session management predictable and easy to reason about. The goal is correctness and clarity rather than framework-driven abstraction.

The configuration component functions as a small internal config / feature flag service. It allows reading and writing configuration values scoped by environment (development, staging, production), all persisted in a relational database. This enables feature toggling and environment-specific behavior without code changes. A simple pattern-based query API (e.g. prefix matching such as feature.\*) supports managing related configuration groups efficiently.

The codebase is intentionally structured with a class-based, modular design, isolating database access, authentication logic, and configuration behavior into clearly defined units. This keeps responsibilities explicit and the system easy to extend or modify. The project favors straightforward implementations, explicit data models, and readable control flow over heavy frameworks or unnecessary architectural layers.

Overall, this project is intended as a practical template for building small, secure, and maintainable backend services using a modern JavaScript toolchain.

## Testing

The project includes a comprehensive suite of unit and integration tests powered by `bun test`. These tests cover:

- **Database Layer**: Verifies schema creation, migration execution, and connection management.
- **Authentication Logic**: Tests user registration, password hashing, token generation/validation, and secure credential handling.
- **Configuration Management**: Validates CRUD operations, environment scoping, pattern matching, and data integrity.
- **API Endpoints**: Integration tests ensure that HTTP routes correctly handle requests, enforce authentication, and return appropriate status codes.

All tests are currently passing, ensuring the stability and correctness of the core system components.
