-- ExamGuard MySQL Triggers — use only where integrity value is clear
-- Keep simple, avoid hidden business logic. Documented.

DELIMITER //

-- Trigger: prevent invalid passingMarks > totalMarks on Exam insert/update
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

-- Trigger: enforce question points >=0 and order >0
DROP TRIGGER IF EXISTS trg_question_check //
CREATE TRIGGER trg_question_check BEFORE INSERT ON question
FOR EACH ROW
BEGIN
  IF NEW.points < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Question points must be >=0';
  END IF;
  IF NEW.`order` <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Question order must be >0';
  END IF;
END //

-- Trigger: integrity score between 0 and 100
DROP TRIGGER IF EXISTS trg_review_score_check //
CREATE TRIGGER trg_review_score_check BEFORE INSERT ON integrityreview
FOR EACH ROW
BEGIN
  IF NEW.score < 0 OR NEW.score > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integrity score must be between 0 and 100';
  END IF;
END //

DROP TRIGGER IF EXISTS trg_review_score_check_upd //
CREATE TRIGGER trg_review_score_check_upd BEFORE UPDATE ON integrityreview
FOR EACH ROW
BEGIN
  IF NEW.score < 0 OR NEW.score > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Integrity score must be between 0 and 100';
  END IF;
END //

-- Audit trigger example: when exam status changes to PUBLISHED, auto-log (if app forgets)
-- However we keep app-level audit as source of truth; this trigger is idempotent guard.
-- Commented out to avoid duplication; enable only if needed.
-- DROP TRIGGER IF EXISTS trg_exam_audit_publish //
-- CREATE TRIGGER trg_exam_audit_publish AFTER UPDATE ON exam
-- FOR EACH ROW
-- BEGIN
--   IF NEW.status = 'PUBLISHED' AND OLD.status <> 'PUBLISHED' THEN
--     INSERT INTO auditlog (id, actorId, actorRole, action, entityType, entityId, metadata, createdAt)
--     VALUES (CONCAT('audit_', REPLACE(UUID(),'-','')), NEW.teacherId, 'TEACHER', 'EXAM_PUBLISHED', 'Exam', NEW.id, JSON_OBJECT('trigger','auto'), NOW(3));
--   END IF;
-- END //

DELIMITER ;
