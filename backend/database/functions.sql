-- ExamGuard MySQL Stored Functions
-- Deliverables per Phase 4 spec: examples demonstrating database-level computation

DELIMITER //

-- GetStudentAverageScore(student_id) => average percentage across completed exams (0 if none)
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

-- GetExamPassRate(exam_id) => percentage 0-100, handles zero submissions without division-by-zero
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
