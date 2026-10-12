-- functions.sql — test stored functions
SELECT GetStudentAverageScore('some_student_id') AS avg_score;
SELECT GetStudentExamCount('some_student_id') AS exam_count;
SELECT GetExamPassRate('some_exam_id') AS pass_rate;
SELECT GetExamAverageScore('some_exam_id') AS avg_exam_score;

-- Test with real data (replace ids after seed)
-- SELECT u.name, GetStudentAverageScore(u.id) AS avg_score, GetStudentExamCount(u.id) AS completed FROM user u WHERE role='STUDENT' LIMIT 5;
-- SELECT e.title, GetExamPassRate(e.id) AS pass_rate, GetExamAverageScore(e.id) AS avg_score FROM exam e LIMIT 5;

-- Edge cases: invalid id should return 0 not error
SELECT GetStudentAverageScore('invalid_id') AS should_be_0;
SELECT GetExamPassRate('invalid_id') AS should_be_0_no_div0;

-- Verify no division by zero
-- GetExamPassRate handles zero submissions via IF total=0 RETURN 0
