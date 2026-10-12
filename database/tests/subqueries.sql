-- subqueries.sql — meaningful subqueries for analytics (not demo-only)

-- Students whose average score is above the overall average
SELECT u.id, u.name, AVG(pct.percentage) AS avg_score
FROM user u
JOIN (
  SELECT s.studentId, s.id, CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
  FROM examsession s JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.studentId, s.id
) pct ON pct.studentId = u.id
GROUP BY u.id, u.name
HAVING AVG(pct.percentage) > (SELECT AVG(percentage) FROM (SELECT CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage FROM examsession s JOIN question q ON q.examId=s.examId LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.id) t);

-- Exams whose completion rate is above overall average completion rate
SELECT e.id, e.title, (COUNT(CASE WHEN s.status='SUBMITTED' THEN 1 END)/ NULLIF(COUNT(s.id),0)*100) AS completion_rate
FROM exam e LEFT JOIN examsession s ON s.examId=e.id
GROUP BY e.id, e.title
HAVING completion_rate > (SELECT AVG(comp) FROM (SELECT COUNT(CASE WHEN s.status='SUBMITTED' THEN 1 END)/NULLIF(COUNT(s.id),0)*100 AS comp FROM exam e LEFT JOIN examsession s ON s.examId=e.id GROUP BY e.id) t);

-- Students with more completed exams than average student
SELECT u.id, u.name, COUNT(s.id) AS completed_count
FROM user u JOIN examsession s ON s.studentId=u.id AND s.status='SUBMITTED'
GROUP BY u.id, u.name
HAVING COUNT(s.id) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM examsession WHERE status='SUBMITTED' GROUP BY studentId) t);

-- Students with integrity scores above overall average
SELECT u.id, u.name, AVG(r.score) AS avg_integrity
FROM user u JOIN examsession s ON s.studentId=u.id JOIN integrityreview r ON r.sessionId=s.id
GROUP BY u.id, u.name
HAVING AVG(r.score) > (SELECT AVG(score) FROM integrityreview);

-- Questions whose incorrect-answer rate is above exam average
SELECT q.id, q.text, q.examId, 
  (SUM(CASE WHEN a.answer <> q.correctAnswer THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0)*100) AS incorrect_rate
FROM question q LEFT JOIN answer a ON a.questionId=q.id
GROUP BY q.id, q.text, q.examId
HAVING incorrect_rate > (SELECT AVG(incorrect_rate) FROM (SELECT (SUM(CASE WHEN a.answer <> q.correctAnswer THEN 1 ELSE 0 END)/NULLIF(COUNT(a.id),0)*100) AS incorrect_rate FROM question q LEFT JOIN answer a ON a.questionId=q.id GROUP BY q.id) t);
