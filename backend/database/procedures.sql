-- ExamGuard MySQL Stored Procedures
-- Phase 4: demonstrate transactional procedures

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
    -- Lock exam row
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

    -- Check existing active
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

-- FinalizeExamSession(session_id) — safely finalizes, sets submittedAt, returns summary
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
      -- Calculate marks (objective only)
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

-- GenerateExamSummary(exam_id) — aggregates for analytics; demonstration of GROUP BY + HAVING
DROP PROCEDURE IF EXISTS GenerateExamSummary //
CREATE PROCEDURE GenerateExamSummary(
  IN p_exam_id VARCHAR(30)
)
BEGIN
  SELECT
    e.id AS exam_id,
    e.title AS exam_title,
    COUNT(DISTINCT s.id) AS started,
    COUNT(DISTINCT CASE WHEN s.status='SUBMITTED' THEN s.id END) AS submitted,
    COALESCE(AVG(CASE WHEN s.status='SUBMITTED' THEN r.score END),0) AS avg_integrity,
    GROUP_CONCAT(DISTINCT s.status) AS statuses
  FROM exam e
  LEFT JOIN examsession s ON s.examId = e.id
  LEFT JOIN integrityreview r ON r.sessionId = s.id
  WHERE e.id = p_exam_id
  GROUP BY e.id, e.title;
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
    -- Validate transition (simple)
    UPDATE integrityreview SET status = p_new_status, reviewedAt = CASE WHEN p_new_status='REVIEWED' THEN NOW(3) ELSE reviewedAt END, reviewedBy = CASE WHEN p_new_status='REVIEWED' THEN p_reviewer_id ELSE reviewedBy END, version = version+1, updatedAt = NOW(3) WHERE id=p_review_id;
    INSERT INTO auditlog (id, actorId, actorRole, action, entityType, entityId, metadata, createdAt)
    VALUES (CONCAT('audit_', REPLACE(UUID(),'-','')), p_reviewer_id, 'TEACHER', 'REVIEW_STATUS_CHANGED', 'IntegrityReview', p_review_id, JSON_OBJECT('from', v_current, 'to', p_new_status), NOW(3));
  COMMIT;
  SELECT p_review_id AS reviewId, v_current AS fromStatus, p_new_status AS toStatus;
END //

DELIMITER ;
