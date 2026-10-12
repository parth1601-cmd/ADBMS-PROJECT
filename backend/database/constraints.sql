-- ExamGuard Phase 4 Database DDL Scripts
-- MySQL 8.0+ required
-- Run: mysql -u examguard -p examguard < constraints.sql
-- Then: mysql -u examguard -p examguard < indexes.sql
-- Then: mysql -u examguard - p examguard < views.sql
-- Then: mysql -u examguard -p examguard < functions.sql
-- Then: mysql -u examguard -p examguard < procedures.sql
-- Then: mysql -u examguard -p examguard < triggers.sql

-- ============================================================
-- CONSTRAINTS: CHECK constraints for data integrity
-- ============================================================

-- CHECK: durationMinutes > 0
ALTER TABLE exam ADD CONSTRAINT chk_exam_duration CHECK (durationMinutes > 0);

-- CHECK: passingMarks >= 0
ALTER TABLE exam ADD CONSTRAINT chk_exam_passing_min CHECK (passingMarks >= 0);

-- CHECK: passingMarks <= totalMarks (when totalMarks > 0)
ALTER TABLE exam ADD CONSTRAINT chk_exam_passing_max CHECK (totalMarks = 0 OR passingMarks <= totalMarks);

-- CHECK: question points >= 0
ALTER TABLE question ADD CONSTRAINT chk_question_points CHECK (points >= 0);

-- CHECK: question order > 0
ALTER TABLE question ADD CONSTRAINT chk_question_order CHECK (`order` > 0);

-- CHECK: integrity review score BETWEEN 0 AND 100
ALTER TABLE integrityreview ADD CONSTRAINT chk_review_score CHECK (score BETWEEN 0 AND 100);

-- CHECK: answer marksAwarded >= 0
ALTER TABLE answer ADD CONSTRAINT chk_answer_marks CHECK (marksAwarded >= 0);

-- Verify constraints
SELECT 'CHECK constraints created' AS result;

-- ============================================================
-- ADDITIONAL INDEXES for query optimization
-- ============================================================

-- Composite index for exam listing by teacher and status
CREATE INDEX idx_exam_teacher_status_created ON exam(teacherId, status, createdAt);

-- Composite index for session lookup by student and exam
CREATE INDEX idx_session_student_exam_status ON examSession(studentId, examId, status);

-- Composite index for integrity review by exam and status and score
CREATE INDEX idx_review_exam_status_score ON integrityReview(examId, status, score);

-- Composite index for audit by action and entity
CREATE INDEX idx_audit_action_entity ON auditLog(action, entityType, entityId);

-- Composite index for notification by user and read status
CREATE INDEX idx_notification_user_read_created ON notification(userId, read, createdAt);

-- Composite index for answer lookup by session and question
CREATE INDEX idx_answer_session_question_created ON answer(sessionId, questionId, createdAt);

-- Composite index for event by session and type and time
CREATE INDEX idx_event_session_type_time ON examEvent(sessionId, eventType, timestamp);

-- Composite index for review by student and score
CREATE INDEX idx_review_student_score ON integrityReview(studentId, score);

-- Covering index for teacher exam dashboard
CREATE INDEX idx_exam_teacher_status_dates ON exam(teacherId, status, startAt, endAt);

-- Verify indexes
SELECT 'Indexes created' AS result;

-- ============================================================
-- TRIGGERS for data integrity enforcement
-- ============================================================

DELIMITER //

-- Trigger: prevent invalid passingMarks on Exam insert
DROP TRIGGER IF EXISTS trg_exam_check_marks_insert //
CREATE TRIGGER trg_exam_check_marks_insert BEFORE INSERT ON exam
FOR EACH ROW
BEGIN
  IF NEW.passingMarks > NEW.totalMarks AND NEW.totalMarks > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'passingMarks cannot exceed totalMarks';
  END IF;
  IF NEW.durationMinutes <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'durationMinutes must be >0';
  END IF;
  IF NEW.startAt IS NOT NULL AND NEW.endAt IS NOT NULL AND NEW.startAt >= NEW.endAt THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'startAt must be before endAt';
  END IF;
END //

-- Trigger: prevent invalid passingMarks on Exam update
DROP TRIGGER IF EXISTS trg_exam_check_marks_update //
CREATE TRIGGER trg_exam_check_marks_update BEFORE UPDATE ON exam
FOR EACH ROW
BEGIN
  IF NEW.passingMarks > NEW.totalMarks AND NEW.totalMarks > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'passingMarks cannot exceed totalMarks';
  END IF;
  IF NEW.durationMinutes <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'durationMinutes must be >0';
  END IF;
  IF NEW.startAt IS NOT NULL AND NEW.endAt IS NOT NULL AND NEW.startAt >= NEW.endAt THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'startAt must be before endAt';
  END IF;
END //

-- Trigger: prevent negative question points
DROP TRIGGER IF EXISTS trg_question_check_insert //
CREATE TRIGGER trg_question_check_insert BEFORE INSERT ON question
FOR EACH ROW
BEGIN
  IF NEW.points < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Question points must be >=0';
  END IF;
  IF NEW.`order` <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Question order must be >0';
  END IF;
END //

-- Trigger: prevent invalid integrity score
DROP TRIGGER IF EXISTS trg_review_score_check_insert //
CREATE TRIGGER trg_review_score_check_insert BEFORE INSERT ON integrityreview
FOR EACH ROW
BEGIN
  IF NEW.score < 0 OR NEW.score > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integrity score must be between 0 and 100';
  END IF;
END //

DROP TRIGGER IF EXISTS trg_review_score_check_update //
CREATE TRIGGER trg_review_score_check_update BEFORE UPDATE ON integrityreview
FOR EACH ROW
BEGIN
  IF NEW.score < 0 OR NEW.score > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integrity score must be between 0 and 100';
  END IF;
END //

-- Trigger: auto-set updatedAt on review update
DROP TRIGGER IF EXISTS trg_review_updated_at //
CREATE TRIGGER trg_review_updated_at BEFORE UPDATE ON integrityreview
FOR EACH ROW
BEGIN
  SET NEW.updatedAt = NOW(3);
END //

DELIMITER ;

SELECT 'Triggers created' AS result;

-- ============================================================
-- VIEWS: Reusable summary views
-- ============================================================

-- Student_Exam_Summary: student + exam + score summary
DROP VIEW IF EXISTS Student_Exam_Summary;
CREATE VIEW Student_Exam_Summary AS
SELECT
  u.id AS student_id,
  u.name AS student_name,
  u.email AS student_email,
  e.id AS exam_id,
  e.title AS exam_title,
  e.subject AS exam_subject,
  s.id AS session_id,
  s.status AS session_status,
  s.startedAt AS started_at,
  s.submittedAt AS submitted_at,
  COALESCE(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer = q.correctAnswer) THEN q.points ELSE 0 END),0) AS obtained_marks,
  COALESCE(SUM(q.points),0) AS total_marks,
  CASE WHEN COALESCE(SUM(q.points),0) > 0 THEN ROUND(COALESCE(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer = q.correctAnswer) THEN q.points ELSE 0 END),0) / SUM(q.points) *100,1) ELSE 0 END AS percentage
FROM user u
JOIN examsession s ON s.studentId = u.id AND s.status IN ('SUBMITTED','EXPIRED')
JOIN exam e ON e.id = s.examId
JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.sessionId = s.id AND a.questionId = q.id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.name, u.email, e.id, e.title, e.subject, s.id, s.status, s.startedAt, s.submittedAt;

-- Exam_Performance_Summary: per exam aggregates
DROP VIEW IF EXISTS Exam_Performance_Summary;
CREATE VIEW Exam_Performance_Summary AS
SELECT
  e.id AS exam_id,
  e.title AS exam_title,
  e.subject AS exam_subject,
  e.status AS exam_status,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT CASE WHEN s.status='SUBMITTED' THEN s.id END) AS submitted_count,
  COUNT(DISTINCT CASE WHEN s.status='EXPIRED' THEN s.id END) AS expired_count,
  COUNT(DISTINCT CASE WHEN s.status='IN_PROGRESS' THEN s.id END) AS in_progress_count,
  COALESCE(AVG(CASE WHEN s.status='SUBMITTED' THEN r.score END),0) AS avg_integrity_score,
  COALESCE(MAX(r.score),0) AS max_integrity_score,
  COALESCE(MIN(r.score),0) AS min_integrity_score,
  COUNT(r.id) AS review_count
FROM exam e
LEFT JOIN examsession s ON s.examId = e.id
LEFT JOIN integrityreview r ON r.sessionId = s.id
GROUP BY e.id, e.title, e.subject, e.status;

-- Integrity_Review_Summary: review with signal count
DROP VIEW IF EXISTS Integrity_Review_Summary;
CREATE VIEW Integrity_Review_Summary AS
SELECT
  r.id AS review_id,
  r.sessionId AS session_id,
  u.id AS student_id,
  u.name AS student_name,
  e.id AS exam_id,
  e.title AS exam_title,
  r.score AS integrity_score,
  r.level AS category,
  r.status AS review_status,
  COUNT(sig.id) AS signal_count,
  r.generatedAt AS created_at,
  r.reviewedAt AS reviewed_at
FROM integrityreview r
JOIN examsession s ON s.id = r.sessionId
JOIN user u ON u.id = s.studentId
JOIN exam e ON e.id = s.examId
LEFT JOIN integritysignal sig ON sig.integrityReviewId = r.id
GROUP BY r.id, r.sessionId, u.id, u.name, e.id, e.title, r.score, r.level, r.status, r.generatedAt, r.reviewedAt;

-- Teacher_Exam_Dashboard_View: teacher-centric aggregates
DROP VIEW IF EXISTS Teacher_Exam_Dashboard_View;
CREATE VIEW Teacher_Exam_Dashboard_View AS
SELECT
  e.id AS exam_id,
  e.teacherId AS teacher_id,
  e.title AS exam_title,
  e.subject AS exam_subject,
  e.status AS exam_status,
  COUNT(DISTINCT q.id) AS total_questions,
  COUNT(DISTINCT s.id) AS total_students,
  COUNT(DISTINCT CASE WHEN s.status IN ('SUBMITTED','EXPIRED','IN_PROGRESS') THEN s.id END) AS started_count,
  COUNT(DISTINCT CASE WHEN s.status='SUBMITTED' THEN s.id END) AS submitted_count,
  COALESCE(AVG(pct.pct),0) AS average_score,
  SUM(CASE WHEN pct.pct >= 40 THEN 1 ELSE 0 END) AS pass_count,
  COUNT(DISTINCT r.id) AS review_count,
  SUM(CASE WHEN r.level='HIGH_PRIORITY_REVIEW' THEN 1 ELSE 0 END) AS high_priority_review_count
FROM exam e
LEFT JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN examsession s ON s.examId = e.id
LEFT JOIN (
  SELECT s.id, s.examId,
    CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS pct
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.examId
) pct ON pct.examId = e.id
LEFT JOIN integrityreview r ON r.sessionId = s.id
GROUP BY e.id, e.teacherId, e.title, e.subject, e.status;

-- Student_Performance_Summary: per student aggregates
DROP VIEW IF EXISTS Student_Performance_Summary;
CREATE VIEW Student_Performance_Summary AS
SELECT
  u.id AS student_id,
  u.name AS student_name,
  COUNT(DISTINCT s.id) AS exam_count,
  COUNT(DISTINCT CASE WHEN s.status='SUBMITTED' THEN s.id END) AS completed_count,
  COALESCE(AVG(pct.pct),0) AS average_score,
  COALESCE(MAX(pct.pct),0) AS highest_score,
  COALESCE(MIN(pct.pct),0) AS lowest_score,
  SUM(CASE WHEN pct.pct >= 40 THEN 1 ELSE 0 END) AS pass_count,
  COUNT(DISTINCT r.id) AS reviews_count
FROM user u
LEFT JOIN examsession s ON s.studentId = u.id
LEFT JOIN (
  SELECT s.id, s.studentId,
    CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS pct
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.studentId
) pct ON pct.id = s.id
LEFT JOIN integrityreview r ON r.sessionId = s.id
WHERE u.role='STUDENT'
GROUP BY u.id, u.name;

SELECT 'Views created' AS result;

-- ============================================================
-- FUNCTIONS: Database-level computation
-- ============================================================

DELIMITER //

-- GetStudentAverageScore(student_id) => average percentage across completed exams
DROP FUNCTION IF EXISTS GetStudentAverageScore //
CREATE FUNCTION GetStudentAverageScore(p_student_id VARCHAR(30))
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE avg_score DECIMAL(5,2);
  SELECT COALESCE(AVG(pct.percentage),0) INTO avg_score
  FROM (
    SELECT s.id,
      CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,2) ELSE 0 END AS percentage
    FROM examsession s
    JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
    LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
    WHERE s.studentId = p_student_id AND s.status='SUBMITTED'
    GROUP BY s.id
  ) pct;
  RETURN avg_score;
END //

-- GetStudentExamCount(student_id) => number of completed exams
DROP FUNCTION IF EXISTS GetStudentExamCount //
CREATE FUNCTION GetStudentExamCount(p_student_id VARCHAR(30))
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE cnt INT;
  SELECT COUNT(*) INTO cnt FROM examsession WHERE studentId = p_student_id AND status='SUBMITTED';
  RETURN cnt;
END //

-- GetExamPassRate(exam_id) => percentage, handles zero submissions
DROP FUNCTION IF EXISTS GetExamPassRate //
CREATE FUNCTION GetExamPassRate(p_exam_id VARCHAR(30))
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE total INT;
  DECLARE passed INT;
  DECLARE rate DECIMAL(5,2);
  SELECT COUNT(*) INTO total FROM examsession WHERE examId = p_exam_id AND status='SUBMITTED';
  IF total = 0 THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO passed FROM (
    SELECT s.id,
      CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,2) ELSE 0 END AS percentage
    FROM examsession s
    JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
    LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
    WHERE s.examId = p_exam_id AND s.status='SUBMITTED'
    GROUP BY s.id
    HAVING percentage >= 40
  ) t;
  SET rate = ROUND(passed / total * 100,2);
  RETURN rate;
END //

-- GetExamAverageScore(exam_id) => average percentage
DROP FUNCTION IF EXISTS GetExamAverageScore //
CREATE FUNCTION GetExamAverageScore(p_exam_id VARCHAR(30))
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
  DECLARE avg_score DECIMAL(5,2);
  SELECT COALESCE(AVG(pct.percentage),0) INTO avg_score FROM (
    SELECT s.id,
      CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,2) ELSE 0 END AS percentage
    FROM examsession s
    JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
    LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
    WHERE s.examId = p_exam_id AND s.status='SUBMITTED'
    GROUP BY s.id
  ) pct;
  RETURN avg_score;
END //

DELIMITER ;

SELECT 'Functions created' AS result;

-- ============================================================
-- PROCEDURES: Transactional stored procedures
-- ============================================================

DELIMITER //

-- CreateExamSession(student_id, exam_id) — safely creates session with checks
DROP PROCEDURE IF EXISTS CreateExamSession //
CREATE PROCEDURE CreateExamSession(
  IN p_student_id VARCHAR(30),
  IN p_exam_id VARCHAR(30)
)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_start DATETIME(3);
  DECLARE v_end DATETIME(3);
  DECLARE v_duration INT;
  DECLARE v_attempts INT;
  DECLARE v_current_count INT;
  DECLARE v_existing VARCHAR(30);
  DECLARE v_deadline DATETIME(3);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
    SELECT status, startAt, endAt, durationMinutes, attemptsAllowed INTO v_status, v_start, v_end, v_duration, v_attempts
    FROM exam WHERE id = p_exam_id FOR UPDATE;

    IF v_status IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exam not found';
    END IF;
    IF v_status NOT IN ('LIVE','PUBLISHED','SCHEDULED') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exam not available';
    END IF;
    IF v_start IS NOT NULL AND NOW(3) < v_start THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exam not started';
    END IF;
    IF v_end IS NOT NULL AND NOW(3) > v_end THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Exam window closed';
    END IF;

    SELECT id INTO v_existing FROM examsession WHERE examId = p_exam_id AND studentId = p_student_id AND status='IN_PROGRESS' LIMIT 1 FOR UPDATE;
    IF v_existing IS NOT NULL THEN
      SELECT v_existing AS sessionId, 'EXISTS' AS result;
      COMMIT;
    ELSE
      SELECT COUNT(*) INTO v_current_count FROM examsession WHERE examId=p_exam_id AND studentId=p_student_id AND status IN ('SUBMITTED','EXPIRED','IN_PROGRESS');
      IF v_current_count >= v_attempts THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attempts exhausted';
      END IF;
      SET v_deadline = DATE_ADD(NOW(3), INTERVAL v_duration MINUTE);
      INSERT INTO examsession (id, examId, studentId, startedAt, deadlineAt, status, lastActivityAt, createdAt, updatedAt, version)
      VALUES (CONCAT('sess_', REPLACE(UUID(),'-','')), p_exam_id, p_student_id, NOW(3), v_deadline, 'IN_PROGRESS', NOW(3), NOW(3), NOW(3), 1);
      SET v_existing = (SELECT id FROM examsession WHERE examId=p_exam_id AND studentId=p_student_id AND status='IN_PROGRESS' ORDER BY createdAt DESC LIMIT 1);
      INSERT INTO examevent (id, sessionId, eventType, timestamp, createdAt) VALUES (CONCAT('evt_', REPLACE(UUID(),'-','')), v_existing, 'SESSION_STARTED', NOW(3), NOW(3));
      INSERT INTO auditlog (id, actorId, actorRole, action, entityType, entityId, createdAt) VALUES (CONCAT('audit_', REPLACE(UUID(),'-','')), p_student_id, 'STUDENT', 'EXAM_STARTED', 'ExamSession', v_existing, NOW(3));
      SELECT v_existing AS sessionId, 'CREATED' AS result;
      COMMIT;
    END IF;
END //

-- RecordExamEvent(session_id, event_type, question_id, metadata)
DROP PROCEDURE IF EXISTS RecordExamEvent //
CREATE PROCEDURE RecordExamEvent(
  IN p_session_id VARCHAR(30),
  IN p_event_type VARCHAR(30),
  IN p_question_id VARCHAR(30),
  IN p_metadata TEXT
)
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  START TRANSACTION;
    SELECT status INTO v_status FROM examsession WHERE id=p_session_id FOR UPDATE;
    IF v_status IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Session not found';
    END IF;
    IF v_status <> 'IN_PROGRESS' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Session not active';
    END IF;
    INSERT INTO examevent (id, sessionId, questionId, eventType, timestamp, metadata, createdAt)
    VALUES (CONCAT('evt_', REPLACE(UUID(),'-','')), p_session_id, p_question_id, p_event_type, NOW(3), p_metadata, NOW(3));
    UPDATE examsession SET lastActivityAt = NOW(3), version = version +1 WHERE id = p_session_id;
  COMMIT;
END //

-- FinalizeExamSession(session_id) — idempotent finalize
DROP PROCEDURE IF EXISTS FinalizeExamSession //
CREATE PROCEDURE FinalizeExamSession(
  IN p_session_id VARCHAR(30)
)
BEGIN
  DECLARE v_student VARCHAR(30);
  DECLARE v_exam VARCHAR(30);
  DECLARE v_status VARCHAR(20);
  DECLARE v_obtained INT DEFAULT 0;
  DECLARE v_total INT DEFAULT 0;
  DECLARE v_pct DECIMAL(5,2) DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  START TRANSACTION;
    SELECT studentId, examId, status INTO v_student, v_exam, v_status FROM examsession WHERE id=p_session_id FOR UPDATE;
    IF v_status IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Session not found';
    END IF;
    IF v_status = 'SUBMITTED' THEN
      SELECT 'ALREADY_SUBMITTED' AS result, p_session_id AS sessionId;
      COMMIT;
    ELSEIF v_status <> 'IN_PROGRESS' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid status';
    ELSE
      SELECT COALESCE(SUM(q.points),0) INTO v_total FROM question q WHERE q.examId = v_exam AND q.deletedAt IS NULL;
      SELECT COALESCE(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer = q.correctAnswer) THEN q.points ELSE 0 END),0) INTO v_obtained
      FROM question q LEFT JOIN answer a ON a.sessionId=p_session_id AND a.questionId=q.id
      WHERE q.examId = v_exam AND q.deletedAt IS NULL;
      IF v_total >0 THEN SET v_pct = ROUND(v_obtained / v_total *100,1); ELSE SET v_pct=0; END IF;

      UPDATE examsession SET status='SUBMITTED', submittedAt=NOW(3), lastActivityAt=NOW(3), version=version+1 WHERE id=p_session_id;
      INSERT INTO examevent (id, sessionId, eventType, timestamp, createdAt) VALUES (CONCAT('evt_', REPLACE(UUID(),'-','')), p_session_id, 'SESSION_ENDED', NOW(3), NOW(3));
      INSERT INTO auditlog (id, actorId, actorRole, action, entityType, entityId, metadata, createdAt)
      VALUES (CONCAT('audit_', REPLACE(UUID(),'-','')), v_student, 'STUDENT', 'EXAM_SUBMITTED', 'ExamSession', p_session_id, JSON_OBJECT('obtained', v_obtained, 'total', v_total, 'pct', v_pct), NOW(3));

      SELECT p_session_id AS sessionId, v_obtained AS obtained, v_total AS totalMarks, v_pct AS percentage, 'SUBMITTED' AS result;
      COMMIT;
    END IF;
END //

-- UpdateReviewStatus(review_id, new_status, reviewer_id)
DROP PROCEDURE IF EXISTS UpdateReviewStatus //
CREATE PROCEDURE UpdateReviewStatus(
  IN p_review_id VARCHAR(30),
  IN p_new_status VARCHAR(30),
  IN p_reviewer_id VARCHAR(30)
)
BEGIN
  DECLARE v_current VARCHAR(30);
  DECLARE v_exam_teacher VARCHAR(30);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;
  START TRANSACTION;
    SELECT status INTO v_current FROM integrityreview WHERE id=p_review_id FOR UPDATE;
    IF v_current IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Review not found';
    END IF;
    UPDATE integrityreview SET status = p_new_status, reviewedAt = CASE WHEN p_new_status='REVIEWED' THEN NOW(3) ELSE reviewedAt END, reviewedBy = CASE WHEN p_new_status='REVIEWED' THEN p_reviewer_id ELSE reviewedBy END, version = version+1, updatedAt = NOW(3) WHERE id=p_review_id;
    INSERT INTO auditlog (id, actorId, actorRole, action, entityType, entityId, metadata, createdAt)
    VALUES (CONCAT('audit_', REPLACE(UUID(),'-','')), p_reviewer_id, 'TEACHER', 'REVIEW_STATUS_CHANGED', 'IntegrityReview', p_review_id, JSON_OBJECT('from', v_current, 'to', p_new_status), NOW(3));
  COMMIT;
  SELECT p_review_id AS reviewId, v_current AS fromStatus, p_new_status AS toStatus;
END //

DELIMITER ;

SELECT 'Procedures created' AS result;
