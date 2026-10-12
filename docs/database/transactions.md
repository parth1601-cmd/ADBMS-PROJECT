# Transactions, Isolation & Concurrency

## ACID

- **Atomicity**: All critical multi-table ops use `prisma.$transaction`. If any step fails, rollback. Examples: startExam (session + event + audit), submission (session update + event + review + signals + audit + notification).
- **Consistency**: FKs, CHECKs, triggers, and status machines keep data valid after commit. Health checker verifies no orphan/dup/etc.
- **Isolation**: `ReadCommitted` default; `RepeatableRead` for startExam, `Serializable` for submission to prevent phantom reads on concurrent submits.
- **Durability**: InnoDB redo log; after COMMIT, data persists (not localStorage). `hard shutdown` test ensures commit survives.

## Transaction Wrappers
`src/utils/transaction.ts` provides `withTransaction(fn, {isolationLevel, maxRetries, timeout})`. All repos accept `tx` client; never create separate client inside tx.

## Row Locking
`SELECT ... FOR UPDATE` via `$queryRawUnsafe` inside tx for:
- Exam row before publish/start
- ExamSession row before answer save / submit / expiration
- IntegrityReview row before status change/assign

MySQL locks row until COMMIT, preventing duplicate active sessions.

## Savepoints
Demonstrated in `backend/database/tests/transactions.sql` and (optionally) in answer save (SAVEPOINT answer_saved). If event insertion fails, rollback to savepoint keeps answer. Documented fallback because MySQL prepared statement does not support SAVEPOINT via Prisma raw, so logic is in SQL file.

## Idempotency
- Start: if active session exists and not expired, return existing (200) not duplicate.
- Submit: if already SUBMITTED, return `Already submitted` with existing review, not duplicate.
- Both use unique constraint `unique_active_session` + status check + transaction lock.

## Auto-submission
Server time authoritative. On every getSession/save/submit, `checkDeadline` compares `deadlineAt` vs `NOW()`. If expired, mark EXPIRED and reject new writes. No client timestamp trusted.

## Deadlock Handling
Retry up to 3 times with exponential backoff (`50ms * 2^attempt + attempt*10` deterministic) on MySQL errors 1213/1205 or Prisma P2034. Never retry indefinitely.

## Status Machines
- Exam: DRAFT → PUBLISHED → UNPUBLISHED → ARCHIVED (also maps SCHEDULED/LIVE/COMPLETED for legacy). Invalid transition → 400.
- Session: IN_PROGRESS → SUBMITTED / EXPIRED (no resubmit).
- Review: PENDING → IN_REVIEW → REVIEWED / REQUIRES_FOLLOW_UP / DISMISSED, with optimistic concurrency version check → 409 on stale.

## Isolation Levels
- `ReadCommitted` for most (balance performance).
- `RepeatableRead` for session allocation (prevent phantom).
- `Serializable` for submission (critical, prevents concurrent double submit). Documented trade-off: higher lock contention but correctness for high-stakes operation.

## Observability
Each transaction logs requestId, userId, operation, duration, success/failure via structured logs (not logging answer content).

## Demos
See `backend/database/tests/transactions.sql` for START TRANSACTION / SAVEPOINT / COMMIT / ROLLBACK demos and `backend/database/tests/concurrency.sql` for concurrent start/submit simulations.
