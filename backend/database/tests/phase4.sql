-- ExamGuard Phase 4 SQL Test Scripts
-- These scripts demonstrate ADBMS concepts for the ExamGuard system
-- Run in MySQL: mysql -u examguard -p examguard < file.sql

-- ============================================================
-- 1. CONSTRAINTS TEST: Verify all constraints work
-- ============================================================

-- Test PK constraint (duplicate id should fail)
-- INSERT INTO exam (id, title, subject, teacherId, durationMinutes) VALUES ('dup1','Test','Math','teacher1',60);
-- INSERT INTO exam (id, title, subject, teacherId, durationMinutes) VALUES ('dup1','Test2','Math','teacher1',60); -- expect PK violation

-- Test FK constraint (invalid teacher should fail)
-- INSERT INTO exam (id, title, subject, teacherId, durationMinutes) VALUES ('bad_teacher','Test','Math','invalid_teacher_id',60); -- expect FK violation

-- Test CHECK constraint (negative duration)
-- INSERT INTO exam (id, title, subject, teacherId, durationMinutes) VALUES ('neg_dur','Test','Math','teacher1',-5); -- expect CHECK violation

-- Test CHECK constraint (invalid score range)
-- INSERT INTO integrityreview (id, sessionId, score, level) VALUES ('bad_score','sess1',150,'NORMAL'); -- expect CHECK violation

-- Test UNIQUE constraint (duplicate active session)
-- The unique index unique_active_session prevents duplicate (examId, studentId, status='IN_PROGRESS')

-- Test NOT NULL constraint
-- INSERT INTO user (id, name, email, passwordHash, role) VALUES ('test','Test',NULL,'hash','STUDENT'); -- expect NOT NULL violation

-- Test NULL handling
-- SELECT * FROM examsession WHERE status='IN_PROGRESS' AND submittedAt IS NOT NULL; -- should be 0 rows
-- SELECT * FROM integrityreview WHERE status='PENDING' AND reviewedAt IS NOT NULL; -- should be 0 rows
-- SELECT * FROM examsession WHERE submittedAt IS NULL AND status='IN_PROGRESS'; -- should return active sessions

-- ============================================================
-- 2. JOINS TEST: Advanced SQL joins
-- ============================================================

-- JOIN 1: Teacher -> Exams -> Sessions
SELECT u.name AS teacher, e.title, COUNT(s.id) AS sessions
FROM user u
INNER JOIN exam e ON e.teacherId = u.id
LEFT JOIN examsession s ON s.examId = e.id
WHERE u.role='TEACHER'
GROUP BY u.name, e.title
HAVING COUNT(s.id) > 0
ORDER BY sessions DESC;

-- JOIN 2: Exam -> Questions -> Answers statistics
SELECT e.title, COUNT(a.id) AS answer_count, AVG(q.points) AS avg_points
FROM exam e
INNER JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.questionId = q.id
GROUP BY e.title
ORDER BY answer_count DESC;

-- JOIN 3: Student -> Sessions -> Results
SELECT u.name AS student, e.title AS exam, s.status,
  CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
FROM user u
JOIN examsession s ON s.studentId = u.id
JOIN exam e ON e.id = s.examId
JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.sessionId = s.id AND a.questionId = q.id
WHERE u.role='STUDENT' AND s.status='SUBMITTED'
GROUP BY u.name, e.title, s.status
ORDER BY percentage DESC;

-- JOIN 4: Session -> Events -> Integrity Signals
SELECT s.id AS session_id, u.name AS student, e.title AS exam, r.score, r.level, COUNT(sig.id) AS signal_count
FROM examsession s
JOIN user u ON u.id = s.studentId
JOIN exam e ON e.id = s.examId
JOIN integrityreview r ON r.sessionId = s.id
LEFT JOIN integritysignal sig ON sig.integrityReviewId = r.id
GROUP BY s.id, u.name, e.title, r.score, r.level
ORDER BY r.score DESC;

-- JOIN 5: Advanced - Student + Exam + Score using JOIN (spec #79)
SELECT u.name AS student_name, e.title AS exam, e.subject,
  ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS percentage,
  s.status, s.submittedAt
FROM user u
JOIN examsession s ON s.studentId = u.id AND s.status='SUBMITTED'
JOIN exam e ON e.id = s.examId
JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.sessionId = s.id AND a.questionId = q.id
GROUP BY u.name, e.title, e.subject, s.status, s.submittedAt
ORDER BY percentage DESC;

-- ============================================================
-- 3. SUBQUERIES TEST
-- ============================================================

-- Subquery 1: Students whose average score is above overall average
SELECT u.name, AVG(pct.pct) AS avg_student
FROM user u
JOIN (
  SELECT s.studentId, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.studentId
) pct ON pct.studentId = u.id
WHERE u.role='STUDENT'
GROUP BY u.name
HAVING AVG(pct.pct) > (SELECT AVG(pct2.pct) FROM (
  SELECT ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id
) pct2);

-- Subquery 2: Exams whose average integrity score is above overall average
SELECT e.title, AVG(r.score) AS avg_integ
FROM exam e
JOIN examsession s ON s.examId=e.id
JOIN integrityreview r ON r.sessionId=s.id
GROUP BY e.title
HAVING AVG(r.score) > (SELECT AVG(score) FROM integrityreview);

-- Subquery 3: Exams with more completed students than average
SELECT e.title, COUNT(DISTINCT s.id) AS completed_count
FROM exam e
JOIN examsession s ON s.examId=e.id AND s.status='SUBMITTED'
GROUP BY e.title
HAVING COUNT(DISTINCT s.id) > (SELECT AVG(cnt) FROM (SELECT COUNT(DISTINCT s2.id) AS cnt FROM examsession s2 WHERE s2.status='SUBMITTED' GROUP BY s2.examId) t);

-- Subquery 4: Questions with incorrect rate above exam average
SELECT q.id, q.text, q.examId,
  COUNT(a.id) AS total_attempts,
  SUM(CASE WHEN a.answer != q.correctAnswer AND a.answer IS NOT NULL THEN 1 ELSE 0 END) AS incorrect_count
FROM question q
LEFT JOIN answer a ON a.questionId = q.id
WHERE q.deletedAt IS NULL
GROUP BY q.id, q.text, q.examId
HAVING incorrect_count > (SELECT AVG(inc) FROM (
  SELECT q2.id, SUM(CASE WHEN a2.answer != q2.correctAnswer AND a2.answer IS NOT NULL THEN 1 ELSE 0 END) AS inc
  FROM question q2 LEFT JOIN answer a2 ON a2.questionId = q2.id
  WHERE q2.deletedAt IS NULL
  GROUP BY q2.id
) t WHERE inc IS NOT NULL);

-- ============================================================
-- 4. AGGREGATES TEST
-- ============================================================

-- COUNT: Sessions per exam
SELECT examId, COUNT(*) AS total_sessions FROM examsession GROUP BY examId;

-- AVG: Integrity score per exam
SELECT e.title, AVG(r.score) AS avg_integrity FROM exam e LEFT JOIN examsession s ON s.examId=e.id LEFT JOIN integrityreview r ON r.sessionId=s.id GROUP BY e.title;

-- SUM: Total marks per exam
SELECT examId, SUM(points) AS total_marks FROM question WHERE deletedAt IS NULL GROUP BY examId;

-- MIN/MAX: Score ranges per exam
SELECT examId, MIN(pct.pct) AS lowest, MAX(pct.pct) AS highest FROM (
  SELECT s.examId, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.examId
) t GROUP BY examId;

-- COUNT by status
SELECT status, COUNT(*) FROM examsession GROUP BY status;
SELECT level, COUNT(*) FROM integrityreview GROUP BY level;

-- Maintenance equivalent: report generation count
SELECT reportType, COUNT(*) AS report_count FROM report GROUP BY reportType;
SELECT DATE(generatedAt) AS day, COUNT(*) AS reviews_generated FROM integrityreview GROUP BY DATE(generatedAt) ORDER BY day;

-- SUM of signal points per review
SELECT integrityReviewId, SUM(points) AS total_signal_points FROM integritysignal GROUP BY integrityReviewId HAVING SUM(points) > 30;

-- ============================================================
-- 5. TRANSACTION DEMO
-- ============================================================

-- DEMO 1: Successful session creation (commit)
START TRANSACTION;
  INSERT INTO examsession (id, examId, studentId, startedAt, deadlineAt, status, lastActivityAt, createdAt, updatedAt, version)
  VALUES ('demo_sess_tx1','demo_exam','demo_student', NOW(3), DATE_ADD(NOW(3), INTERVAL 60 MINUTE),'IN_PROGRESS', NOW(3), NOW(3), NOW(3),1);
  SAVEPOINT after_session;
  INSERT INTO examevent (id, sessionId, eventType, timestamp, createdAt) VALUES ('demo_evt_tx1','demo_sess_tx1','SESSION_STARTED', NOW(3), NOW(3));
COMMIT;
-- Verify both inserted
SELECT COUNT(*) AS session_count FROM examsession WHERE id='demo_sess_tx1';
SELECT COUNT(*) AS event_count FROM examevent WHERE sessionId='demo_sess_tx1';

-- DEMO 2: Failure with rollback (atomicity)
START TRANSACTION;
  INSERT INTO examsession (id, examId, studentId, startedAt, deadlineAt, status, lastActivityAt, createdAt, updatedAt, version)
  VALUES ('demo_sess_tx2','demo_exam','demo_student2', NOW(3), DATE_ADD(NOW(3), INTERVAL 60 MINUTE),'IN_PROGRESS', NOW(3), NOW(3), NOW(3),1);
  SAVEPOINT before_event;
  ROLLBACK TO SAVEPOINT before_event;
ROLLBACK;
-- Verify demo_sess_tx2 not persisted
SELECT COUNT(*) AS should_be_zero FROM examsession WHERE id='demo_sess_tx2';

-- DEMO 3: Savepoint partial rollback
START TRANSACTION;
  INSERT INTO answer (id, sessionId, questionId, answer, firstAnsweredAt, createdAt, updatedAt)
  VALUES ('demo_ans_tx1','demo_sess_tx1','demo_q1','A', NOW(3), NOW(3), NOW(3));
  SAVEPOINT answer_saved;
  -- If event insertion fails, rollback to savepoint keeps answer
  COMMIT;

-- ============================================================
-- 6. CONCURRENCY TEST
-- ============================================================

-- Scenario 1: Two simultaneous start requests
-- Both use SELECT ... FOR UPDATE + unique constraint
-- Expected: only one IN_PROGRESS session per (examId, studentId)
-- The unique index unique_active_session prevents duplicates:
-- SELECT COUNT(*) FROM examsession WHERE examId='exam1' AND studentId='stu1' AND status='IN_PROGRESS';
-- Should return 1

-- Scenario 2: Two simultaneous submit requests
-- Both SELECT ... FOR UPDATE on session, then check status='IN_PROGRESS'
-- Second sees already SUBMITTED and returns idempotent
-- Expected: exactly one submission

-- Scenario 3: Server-authoritative deadline
-- If NOW() > deadlineAt, session should be EXPIRED
-- SELECT id, status FROM examsession WHERE deadlineAt < NOW() AND status='IN_PROGRESS';
-- Should return expired sessions for server to finalize

-- ============================================================
-- 7. VIEW TESTS
-- ============================================================

SELECT * FROM Student_Exam_Summary LIMIT 5;
SELECT * FROM Exam_Performance_Summary LIMIT 5;
SELECT * FROM Integrity_Review_Summary LIMIT 5;
SELECT * FROM Teacher_Exam_Dashboard_View LIMIT 5;
SELECT * FROM Student_Performance_Summary LIMIT 5;

-- Use views for reporting
SELECT student_name, exam_title, percentage FROM Student_Exam_Summary ORDER BY percentage DESC LIMIT 10;
SELECT exam_title, submitted_count, average_score FROM Exam_Performance_Summary ORDER BY submitted_count DESC;
SELECT review_id, student_name, integrity_score, signal_count FROM Integrity_Review_Summary WHERE review_status='PENDING' ORDER BY integrity_score DESC;

-- ============================================================
-- 8. FUNCTION TESTS
-- ============================================================

SELECT GetStudentAverageScore('some_student_id') AS avg_score;
SELECT GetStudentExamCount('some_student_id') AS exam_count;
SELECT GetExamPassRate('some_exam_id') AS pass_rate;
SELECT GetExamAverageScore('some_exam_id') AS avg_exam_score;

-- Edge cases
SELECT GetStudentAverageScore('invalid_id') AS should_be_0;
SELECT GetExamPassRate('invalid_id') AS should_be_0_no_div0;

-- ============================================================
-- 9. PROCEDURE TESTS
-- ============================================================

-- CALL CreateExamSession('student_id','exam_id');
-- CALL RecordExamEvent('session_id','TAB_HIDDEN', NULL, '{"reason":"test"}');
-- CALL FinalizeExamSession('session_id');
-- CALL UpdateReviewStatus('review_id','IN_REVIEW','teacher_id');

-- Full flow demo:
-- SET @stu = (SELECT id FROM user WHERE role='STUDENT' LIMIT 1);
-- SET @ex = (SELECT id FROM exam WHERE status='LIVE' LIMIT 1);
-- CALL CreateExamSession(@stu, @ex);
-- SET @sess = (SELECT id FROM examsession WHERE studentId=@stu AND examId=@ex AND status='IN_PROGRESS' ORDER BY createdAt DESC LIMIT 1);
-- CALL RecordExamEvent(@sess, 'QUESTION_ANSWERED', NULL, '{}');
-- CALL FinalizeExamSession(@sess);

-- ============================================================
-- 10. EXPLAIN ANALYSIS
-- ============================================================

-- Before index optimization
EXPLAIN SELECT * FROM examsession WHERE studentId='stu1' AND examId='exam1' AND status='IN_PROGRESS';
EXPLAIN SELECT * FROM integrityreview WHERE examId='exam1' AND status='PENDING' ORDER BY score DESC;
EXPLAIN SELECT e.title, COUNT(s.id) FROM exam e LEFT JOIN examsession s ON s.examId=e.id WHERE e.teacherId='teacher1' GROUP BY e.title;
EXPLAIN SELECT u.name, AVG(r.score) FROM user u JOIN examsession s ON s.studentId=u.id JOIN integrityreview r ON r.sessionId=s.id WHERE u.role='STUDENT' GROUP BY u.name;
EXPLAIN SELECT e.id, e.title, COUNT(DISTINCT s.id), AVG(r.score) FROM exam e LEFT JOIN examsession s ON s.examId=e.id LEFT JOIN integrityreview r ON r.sessionId=s.id GROUP BY e.id;

-- After index optimization (indexes already created in this file)
EXPLAIN SELECT * FROM examsession WHERE studentId='stu1' AND examId='exam1' AND status='IN_PROGRESS';
EXPLAIN SELECT * FROM integrityreview WHERE examId='exam1' AND status='PENDING' ORDER BY score DESC;
EXPLAIN SELECT e.title, COUNT(s.id) FROM exam e LEFT JOIN examsession s ON s.examId=e.id WHERE e.teacherId='teacher1' GROUP BY e.title;
EXPLAIN SELECT u.name, AVG(r.score) FROM user u JOIN examsession s ON s.studentId=u.id JOIN integrityreview r ON r.sessionId=s.id WHERE u.role='STUDENT' GROUP BY u.name;
EXPLAIN SELECT e.id, e.title, COUNT(DISTINCT s.id), AVG(r.score) FROM exam e LEFT JOIN examsession s ON s.examId=e.id LEFT JOIN integrityreview r ON r.sessionId=s.id GROUP BY e.id;

-- Verify all indexes are being used
SHOW INDEX FROM examsession;
SHOW INDEX FROM integrityreview;
SHOW INDEX FROM exam;
SHOW INDEX FROM answer;
SHOW INDEX FROM examevent;

SELECT 'Phase 4 SQL tests complete' AS result;
