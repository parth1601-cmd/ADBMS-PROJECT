-- demo_queries.sql — 10 Sample Analytical Queries per Phase 4 spec #78

-- QUERY 1: List all published exams
SELECT id, title, subject, status, startAt, endAt FROM exam WHERE status IN ('PUBLISHED','LIVE','SCHEDULED') ORDER BY startAt;

-- QUERY 2: List students who completed an exam
SELECT DISTINCT u.id, u.name, e.title FROM user u JOIN examsession s ON s.studentId=u.id JOIN exam e ON e.id=s.examId WHERE s.status='SUBMITTED';

-- QUERY 3: Show exam scores ordered highest to lowest
SELECT u.name, e.title, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct
FROM user u JOIN examsession s ON s.studentId=u.id JOIN exam e ON e.id=s.examId JOIN question q ON q.examId=e.id LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY u.name,e.title ORDER BY pct DESC;

-- QUERY 4: Calculate average score per exam
SELECT e.title, AVG(pct.pct) AS avg_score FROM exam e LEFT JOIN (SELECT s.examId, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct FROM examsession s JOIN question q ON q.examId=s.examId LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.id, s.examId) pct ON pct.examId=e.id GROUP BY e.title;

-- QUERY 5: Calculate total submissions per exam
SELECT e.title, COUNT(s.id) AS submissions FROM exam e LEFT JOIN examsession s ON s.examId=e.id AND s.status='SUBMITTED' GROUP BY e.title;

-- QUERY 6: Calculate pass rate (percentage >=40)
SELECT e.title, ROUND(AVG(CASE WHEN pct.pct >=40 THEN 100 ELSE 0 END),1) AS pass_rate FROM exam e LEFT JOIN (SELECT s.examId, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct FROM examsession s JOIN question q ON q.examId=s.examId LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.id, s.examId) pct ON pct.examId=e.id GROUP BY e.title;

-- QUERY 7: Find students whose average score is above overall average
SELECT u.name, AVG(pct.pct) AS avg_student FROM user u JOIN (SELECT s.studentId, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct FROM examsession s JOIN question q ON q.examId=s.examId LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.id, s.studentId) pct ON pct.studentId=u.id GROUP BY u.name HAVING AVG(pct.pct) > (SELECT AVG(pct2.pct) FROM (SELECT ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS pct FROM examsession s JOIN question q ON q.examId=s.examId LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.id) pct2 );

-- QUERY 8: Find exams whose average integrity score is above overall average
SELECT e.title, AVG(r.score) AS avg_integ FROM exam e JOIN examsession s ON s.examId=e.id JOIN integrityreview r ON r.sessionId=s.id GROUP BY e.title HAVING AVG(r.score) > (SELECT AVG(score) FROM integrityreview);

-- QUERY 9: Show student + exam + score using JOIN (3 tables)
SELECT u.name AS student, e.title AS exam, ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/NULLIF(SUM(q.points),0)*100,1) AS score FROM user u JOIN examsession s ON s.studentId=u.id JOIN exam e ON e.id=s.examId JOIN question q ON q.examId=e.id LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY u.name, e.title;

-- QUERY 10: Show exam + question + answer statistics (incorrect rate)
SELECT e.title AS exam, q.text AS question, q.type, COUNT(a.id) AS attempts, SUM(CASE WHEN a.answer = q.correctAnswer THEN 1 ELSE 0 END) AS correct, SUM(CASE WHEN a.answer <> q.correctAnswer AND a.answer IS NOT NULL THEN 1 ELSE 0 END) AS incorrect FROM exam e JOIN question q ON q.examId=e.id LEFT JOIN answer a ON a.questionId=q.id GROUP BY e.title, q.text, q.type;
