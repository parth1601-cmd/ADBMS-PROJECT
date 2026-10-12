-- concurrency.sql — test concurrent session start, submission, answer near deadline

-- Test setup: need PIDs to simulate concurrency
-- Use two mysql clients simultaneously

-- SCENARIO 1: Two simultaneous START requests for same student+exam
-- Client A & B both run at same time:
-- START TRANSACTION;
-- SELECT * FROM examsession WHERE examId='exam1' AND studentId='stu1' AND status='IN_PROGRESS' FOR UPDATE;
-- -- both see 0 rows, then both try INSERT -> one succeeds, one hits duplicate key on unique_active_session
-- -- Application handles via retry + SELECT FOR UPDATE + unique constraint prevents duplicate active sessions
-- -- Expected: only one row with status IN_PROGRESS exists
-- SELECT COUNT(*) AS active_count FROM examsession WHERE examId='exam1' AND studentId='stu1' AND status='IN_PROGRESS'; -- should be 1

-- SCENARIO 2: Two simultaneous SUBMIT requests
-- START TRANSACTION;
-- SELECT * FROM examsession WHERE id='sess1' FOR UPDATE;
-- -- check status = IN_PROGRESS, then update to SUBMITTED
-- -- Second transaction will see status already SUBMITTED and return idempotent Already submitted
-- -- Expected: exactly one integrityreview, one audit log for submission

-- SCENARIO 3: Answer save and expiration occurring together
-- Near deadline, one client saves answer, another detects expiration
-- SELECT deadlineAt FROM examsession WHERE id='sess1' FOR UPDATE;
-- -- Server time authoritative: if NOW() > deadline, mark EXPIRED and reject answer
-- -- Expected: consistent state, answer not saved after expiration

-- To test deadlock handling:
-- The application retries up to 3 times with backoff on error 1213/1205

-- Manual deadlock simulation (optional):
-- Connection 1: START TRANSACTION; SELECT * FROM exam WHERE id='e1' FOR UPDATE;
-- Connection 2: START TRANSACTION; SELECT * FROM exam WHERE id='e2' FOR UPDATE;
-- Connection 1: SELECT * FROM exam WHERE id='e2' FOR UPDATE; -- waits
-- Connection 2: SELECT * FROM exam WHERE id='e1' FOR UPDATE; -- deadlock, one rolls back

SELECT 'concurrency tests documented' AS result;
