-- joins.sql — demonstrate INNER JOIN, LEFT JOIN, GROUP BY, HAVING, ORDER BY for ExamGuard

-- QUERY 1: Teacher → exams → sessions (INNER JOIN)
SELECT u.name AS teacher, e.title, COUNT(s.id) AS sessions
FROM user u
INNER JOIN exam e ON e.teacherId = u.id
LEFT JOIN examsession s ON s.examId = e.id
WHERE u.role='TEACHER'
GROUP BY u.name, e.title
HAVING COUNT(s.id) > 0
ORDER BY sessions DESC;

-- QUERY 2: Exam → questions → answers statistics (INNER + LEFT)
SELECT e.title, q.text, COUNT(a.id) AS attempts, AVG(q.points) AS avg_points
FROM exam e
INNER JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.questionId = q.id
GROUP BY e.title, q.text
HAVING attempts >= 0
ORDER BY attempts DESC;

-- QUERY 3: Student → sessions → results with percentage (JOIN + GROUP BY)
SELECT u.name AS student, e.title AS exam, s.status, s.submittedAt,
  CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
FROM user u
JOIN examsession s ON s.studentId = u.id
JOIN exam e ON e.id = s.examId
JOIN question q ON q.examId = e.id AND q.deletedAt IS NULL
LEFT JOIN answer a ON a.sessionId = s.id AND a.questionId = q.id
WHERE u.role='STUDENT' AND s.status='SUBMITTED'
GROUP BY u.name, e.title, s.status, s.submittedAt
ORDER BY percentage DESC;

-- QUERY 4: Session → events → integrity signals (JOIN chain)
SELECT s.id AS session_id, u.name AS student, e.title AS exam, r.score, r.level, COUNT(sig.id) AS signal_count
FROM examsession s
JOIN user u ON u.id = s.studentId
JOIN exam e ON e.id = s.examId
JOIN integrityreview r ON r.sessionId = s.id
LEFT JOIN integritysignal sig ON sig.integrityReviewId = r.id
GROUP BY s.id, u.name, e.title, r.score, r.level
ORDER BY r.score DESC;

-- Advanced JOIN: STUDENT JOIN EXAM_SESSION JOIN EXAM JOIN RESULT (per spec #79)
SELECT
  u.name AS student_name,
  u.email AS student_id,
  e.title AS exam,
  e.subject AS subject,
  pct.obtained AS score,
  pct.total AS total_marks,
  ROUND(pct.obtained / NULLIF(pct.total,0) *100,1) AS percentage,
  s.status AS status,
  s.submittedAt AS submitted_time
FROM user u
JOIN examsession s ON s.studentId = u.id AND s.status='SUBMITTED'
JOIN exam e ON e.id = s.examId
JOIN (
  SELECT s.id AS sid, SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END) AS obtained, SUM(q.points) AS total
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  GROUP BY s.id
) pct ON pct.sid = s.id
ORDER BY percentage DESC;

-- INTEGRITY JOIN per spec #80
SELECT
  u.name AS student,
  e.title AS exam,
  r.score AS review_score,
  r.level AS category,
  COUNT(sig.id) AS signal_count,
  r.status AS review_status
FROM user u
JOIN examsession s ON s.studentId = u.id
JOIN integrityreview r ON r.sessionId = s.id
JOIN exam e ON e.id = s.examId
LEFT JOIN integritysignal sig ON sig.integrityReviewId = r.id
GROUP BY u.name, e.title, r.score, r.level, r.status
ORDER BY r.score DESC;
