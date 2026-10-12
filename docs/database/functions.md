# Stored Functions

Located in `backend/database/functions.sql`. Deterministic, no random.

## GetStudentAverageScore(student_id) → DECIMAL(5,2)
- Average percentage across SUBMITTED sessions. Returns 0 if none.
- Uses derived percentage per session (same logic as scoringService).

## GetStudentExamCount(student_id) → INT
- COUNT where status SUBMITTED.

## GetExamPassRate(exam_id) → DECIMAL(5,2)
- Handles zero submissions without division-by-zero (IF total=0 RETURN 0).
- Pass threshold 40.

## GetExamAverageScore(exam_id) → DECIMAL(5,2)
- AVG percentage for exam.

Tests: valid student, zero exams, invalid id → 0 (no error). See `backend/database/tests/functions.sql`.
