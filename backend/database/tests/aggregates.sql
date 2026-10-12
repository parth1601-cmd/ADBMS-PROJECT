-- aggregates.sql — COUNT, AVG, SUM, MIN, MAX using SQL aggregation on server (not JS)

-- COUNT sessions per exam
SELECT examId, COUNT(*) AS total_sessions FROM examsession GROUP BY examId;

-- AVG integrity score per exam
SELECT e.title, AVG(r.score) AS avg_integrity FROM exam e LEFT JOIN examsession s ON s.examId=e.id LEFT JOIN integrityreview r ON r.sessionId=s.id GROUP BY e.title;

-- SUM marks per exam
SELECT examId, SUM(points) AS total_marks FROM question WHERE deletedAt IS NULL GROUP BY examId;

-- MIN/MAX scores per exam (via derived percentage)
SELECT examId, MIN(percentage) AS lowest, MAX(percentage) AS highest FROM (
  SELECT s.examId, CASE WHEN SUM(q.points)>0 THEN ROUND(SUM(CASE WHEN (q.type IN ('MCQ','TF','TRUE_FALSE') AND a.answer=q.correctAnswer) THEN q.points ELSE 0 END)/SUM(q.points)*100,1) ELSE 0 END AS percentage
  FROM examsession s JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id WHERE s.status='SUBMITTED' GROUP BY s.examId, s.id
) t GROUP BY examId;

-- COUNT by status
SELECT status, COUNT(*) FROM examsession GROUP BY status;
SELECT level, COUNT(*) FROM integrityreview GROUP BY level;

-- Maintenance equivalent: report generation count, review workload SUM
SELECT reportType, COUNT(*) AS report_count FROM report GROUP BY reportType;
SELECT DATE(generatedAt) AS day, COUNT(*) AS reviews_generated FROM integrityreview GROUP BY DATE(generatedAt) ORDER BY day;

-- SUM of signal points per review
SELECT integrityReviewId, SUM(points) AS total_signal_points FROM integritysignal GROUP BY integrityReviewId HAVING SUM(points) > 30;

-- AVG response time per question (via answer timing approximation)
-- Example: average changeCount per answer
SELECT questionId, AVG(changeCount) AS avg_changes, MAX(changeCount) AS max_changes FROM answer GROUP BY questionId;
