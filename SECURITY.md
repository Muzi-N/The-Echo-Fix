# Security Model

This document describes the security posture of the ECHO API as of milestone one.

## Authentication

Passwords are hashed with argon2id, the current OWASP-recommended algorithm, using its default memory and time parameters. The hash column is never selected by default queries, so it cannot be returned by accident. Plaintext passwords exist only transiently in memory during hashing and verification.

Access is granted via short-lived JWT access tokens, default fifteen minutes. Refresh tokens are opaque 48-byte random strings, not JWTs. Only their SHA-256 hash is persisted, one row per device session, so a database read cannot reconstruct a usable token. On every refresh the presented token is revoked and a new pair issued; this rotation means a stolen refresh token is usable at most once before the legitimate client's next refresh invalidates it. A password reset revokes all of a user's refresh tokens.

## Authorization

A JWT auth guard is registered globally, so every route is authenticated unless it explicitly opts out with the `@Public()` decorator. This fails closed: forgetting to annotate a new route leaves it protected rather than open. Conversation and message operations additionally verify that the caller is a participant of the conversation before any read or write.

## WebSocket security

The Socket.IO connection authenticates during the handshake by validating the JWT passed in the auth payload. Invalid or missing tokens are rejected and the socket is disconnected before it can join any room or emit any event. Each authenticated socket joins only its own per-user room, so events are addressable to specific users rather than broadcast.

## Input validation

A global validation pipe strips unknown properties, rejects requests carrying unexpected fields, and coerces types. DTOs declare per-field constraints (length, format, enum membership), including E.164 phone validation and username character restrictions.

## Transport and platform hardening

Helmet sets standard security headers. A global rate limit caps requests per client. CORS origins are configurable and default to a permissive setting that should be narrowed for production. In production the database connection uses TLS.

## Data integrity

Messages are soft-deleted: the row is retained for receipt and ordering integrity while its content is cleared. Foreign keys cascade on user deletion so account deletion removes the user's tokens, contacts, participations, and messages.

## Known limitations and deferred work

End-to-end encryption is not implemented in milestone one; messages are protected in transit by TLS and at rest by the database, but the server can read message content. E2E with per-device key management is a planned later milestone. OTP delivery currently uses a console driver for development; a real provider must be configured before production use. The default CORS and rate-limit values should be tightened for a production deployment.
