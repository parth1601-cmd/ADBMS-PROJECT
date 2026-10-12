-- indexes.sql — EXPLAIN analysis for important queries

-- Teacher review queue (filtered by status, ordered by score)
EXPLAIN SELECT * FROM integrityreview WHERE status='PENDING' ORDER BY score DESC LIMIT 20;
-- Expected: uses index (status, score) or status_single

-- Student dashboard: available exams
EXPLAIN SELECT * FROM exam WHERE status IN ('LIVE','SCHEDULED') AND startAt <= NOW() AND endAt >= NOW();
-- Should use index on status, startAt, endAt

-- Session loading by student+exam+status (active session check)
EXPLAIN SELECT * FROM examsession WHERE studentId='x' AND examId='y' AND status='IN_PROGRESS';
-- Should use unique_active_session or (studentId,examId,status) composite

-- Answer loading per session
EXPLAIN SELECT * FROM answer WHERE sessionId='x';
-- Should use index on sessionId

-- Timeline paginated events
EXPLAIN SELECT * FROM examevent WHERE sessionId='x' ORDER BY createdAt DESC LIMIT 20 OFFSET 0;
-- Should use (sessionId, createdAt)

-- Analytics: exam performance aggregation
EXPLAIN SELECT examId, COUNT(*) FROM examsession WHERE examId='x' GROUP BY examId;
-- Should use index on examId

-- Integrity timeline
EXPLAIN SELECT * FROM integrityreview WHERE examId='x' AND status='PENDING' ORDER BY score DESC;
-- Should use (examId,status) or (status,score)

-- After index creation, re-run EXPLAIN and note: type should be ref/range, not ALL; rows should decrease; Extra should not show Using filesort if covered
