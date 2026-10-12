# Stored Procedures

Located in `backend/database/procedures.sql`. Use `START TRANSACTION` / `COMMIT` / `ROLLBACK` + `FOR UPDATE` locking.

## CreateExamSession(student_id, exam_id)
- Validates exam exists, status, window, attempts, duplicate active.
- Locks exam row FOR UPDATE.
- Creates session, inserts SESSION_STARTED event, audit log atomically.

## RecordExamEvent(session_id, event_type, question_id, metadata)
- Locks session FOR UPDATE, checks IN_PROGRESS, inserts event, bumps version.

## FinalizeExamSession(session_id)
- Locks session, checks status, computes obtained/total/percentage, updates to SUBMITTED, inserts SESSION_ENDED, audit log, returns summary.
- Idempotent handling for ALREADY_SUBMITTED.

## GenerateExamSummary(exam_id)
- GROUP BY + HAVING demo for analytics.

## UpdateReviewStatus(review_id, new_status, reviewer_id)
- Locks review FOR UPDATE, validates existence, updates status/version, inserts audit, returns from/to.

All procedures handle SQLEXCEPTION with ROLLBACK + RESIGNAL.

Test scripts: `backend/database/tests/procedures.sql`
