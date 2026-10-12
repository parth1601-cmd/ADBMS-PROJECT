-- ExamGuard Views — MySQL 8
-- All views use lowercase table names as per Prisma MySQL mapping
-- Run: mysql -u examguard -p examguard < views.sql

-- 1. Student_Exam_Summary: student + exam + score (uses scoring logic for objective questions)
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
  CASE WHEN COALESCE(SUM(q.points),0) >0 THEN ROUND(COALESCE(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer = q.correctAnswer) THEN q.points ELSE 0 END),0) / SUM(q.points) *100,1) ELSE 0 END AS percentage
FROM user u
JOIN examsession s ON s.studentId = u.id AND s.status IN ('SUBMITTED','EXPIRED')
JOIN exam e ON e.id = s.examId
JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.sessionId = s.id AND a.questionId = q.id
WHERE u.role = 'STUDENT'
GROUP BY u.id, u.name, u.email, e.id, e.title, e.subject, s.id, s.status, s.startedAt, s.submittedAt;

-- 2. Exam_Performance_Summary: per exam aggregates
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
  COALESCE(MIN(r.score),0) AS min_integrity_score
FROM exam e
LEFT JOIN examsession s ON s.examId = e.id
LEFT JOIN integrityreview r ON r.sessionId = s.id
GROUP BY e.id, e.title, e.subject, e.status;

-- Alternative detailed exam performance with score avg (requires derived obtained)
DROP VIEW IF EXISTS Exam_Score_Summary;
CREATE VIEW Exam_Score_Summary AS
SELECT
  e.id AS exam_id,
  e.title AS exam_title,
  COUNT(DISTINCT pct.id) AS submissions,
  COALESCE(AVG(pct.percentage),0) AS average_percentage,
  COALESCE(MAX(pct.percentage),0) AS highest_percentage,
  COALESCE(MIN(pct.percentage),0) AS lowest_percentage,
  SUM(CASE WHEN pct.percentage >= 40 THEN 1 ELSE 0 END) AS pass_count,
  SUM(CASE WHEN pct.percentage < 40 THEN 1 ELSE 0 END) AS fail_count
FROM exam e
LEFT JOIN (
  SELECT s.id, s.examId,
    CASE WHEN SUM(q.points) >0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer = q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
  FROM examsession s
  JOIN question q ON q.examId = s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId = s.id AND a.questionId = q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.examId
) pct ON pct.examId = e.id
GROUP BY e.id, e.title;

-- 3. Integrity_Review_Summary: review with signal count
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
  r.reviewedAt AS reviewed_at,
  r.assignedReviewerId AS assigned_reviewer_id
FROM integrityreview r
JOIN examsession s ON s.id = r.sessionId
JOIN user u ON u.id = s.studentId
JOIN exam e ON e.id = s.examId
LEFT JOIN integritysignal sig ON sig.integrityReviewId = r.id
GROUP BY r.id, r.sessionId, u.id, u.name, e.id, e.title, r.score, r.level, r.status, r.generatedAt, r.reviewedAt, r.assignedReviewerId;

-- 4. Teacher_Exam_Dashboard_View: teacher-centric aggregates for dashboard
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
  COALESCE(AVG(pct.percentage),0) AS average_score,
  SUM(CASE WHEN pct.percentage >=40 THEN 1 ELSE 0 END) AS pass_count,
  COUNT(DISTINCT r.id) AS review_count,
  SUM(CASE WHEN r.level='HIGH_PRIORITY_REVIEW' THEN 1 ELSE 0 END) AS high_priority_review_count
FROM exam e
LEFT JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN examsession s ON s.examId = e.id
LEFT JOIN (
  SELECT s.id, s.examId,
    CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.examId
) pct ON pct.id = s.id
LEFT JOIN integrityreview r ON r.sessionId = s.id
GROUP BY e.id, e.teacherId, e.title, e.subject, e.status;

-- 5. Student_Performance_Summary: per student aggregates
DROP VIEW IF EXISTS Student_Performance_Summary;
CREATE VIEW Student_Performance_Summary AS
SELECT
  u.id AS student_id,
  u.name AS student_name,
  u.email AS student_email,
  COUNT(DISTINCT s.id) AS exam_count,
  COUNT(DISTINCT CASE WHEN s.status='SUBMITTED' THEN s.id END) AS completed_count,
  COALESCE(AVG(pct.percentage),0) AS average_score,
  COALESCE(MAX(pct.percentage),0) AS highest_score,
  COALESCE(MIN(pct.percentage),0) AS lowest_score,
  SUM(CASE WHEN pct.percentage >=40 THEN 1 ELSE 0 END) AS pass_count,
  COUNT(DISTINCT r.id) AS reviews_count
FROM user u
LEFT JOIN examsession s ON s.studentId = u.id
LEFT JOIN (
  SELECT s.id, s.studentId,
    CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.studentId
) pct ON pct.id = s.id
LEFT JOIN integrityreview r ON r.sessionId = s.id
WHERE u.role='STUDENT'
GROUP BY u.id, u.name, u.email;
