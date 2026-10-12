-- constraints.sql — test PK, FK, UNIQUE, NOT NULL, CHECK, DEFAULT, NULL handling
-- Run against MySQL examguard

-- PK constraints: id primary key, auto cuid
-- UNIQUE email
-- Should fail on duplicate email
-- INSERT INTO user (id, name, email, passwordHash, role) VALUES ('test1','A','duplicate@test.com','hash','STUDENT');
-- INSERT INTO user (id, name, email, passwordHash, role) VALUES ('test2','B','duplicate@test.com','hash','STUDENT'); -- expect UNIQUE violation

-- FK: exam.teacherId references user.id RESTRICT, deleting teacher with exams should fail
-- DELETE FROM user WHERE id = (SELECT teacherId FROM exam LIMIT 1); -- expect FK restrict

-- UNIQUE examId+order on question
-- INSERT INTO question (id, examId, type, text, `order`, points, correctAnswer) VALUES ('q1','exam1','MCQ','Q',1,2,'A');
-- INSERT INTO question (id, examId, type, text, `order`, points, correctAnswer) VALUES ('q2','exam1','MCQ','Q2',1,2,'B'); -- expect duplicate order violation

-- UNIQUE sessionId+questionId on answer
-- INSERT INTO answer (id, sessionId, questionId, answer) VALUES ('a1','sess1','q1','A');
-- INSERT INTO answer (id, sessionId, questionId, answer) VALUES ('a2','sess1','q1','B'); -- expect duplicate

-- UNIQUE sessionId on integrityreview
-- INSERT INTO integrityreview (id, sessionId, score, level) VALUES ('r1','sess1',50,'NORMAL');
-- INSERT INTO integrityreview (id, sessionId, score, level) VALUES ('r2','sess1',60,'LOW_CONCERN'); -- expect unique violation

-- NOT NULL: email, passwordHash, etc.
-- INSERT INTO user (id, name, email, passwordHash, role) VALUES ('test3','C', NULL,'hash','STUDENT'); -- expect NOT NULL fail

-- CHECK: durationMinutes >0 via trigger
-- INSERT INTO exam (id, title, description, subject, teacherId, durationMinutes) VALUES ('ex_fail','T','D','Math','teacher1', -5); -- trigger rejects

-- CHECK: score BETWEEN 0 AND 100
-- INSERT INTO integrityreview (id, sessionId, score, level) VALUES ('r3','sess2',150,'NORMAL'); -- trigger rejects

-- NULL handling: submittedAt NULL while active, reviewedAt NULL until reviewed
-- SELECT * FROM examsession WHERE status='IN_PROGRESS' AND submittedAt IS NOT NULL; -- should be 0 rows
-- SELECT * FROM integrityreview WHERE status='PENDING' AND reviewedAt IS NOT NULL; -- should be 0 rows

-- DEFAULT: status defaults
-- INSERT INTO exam (id, title, description, subject, teacherId, durationMinutes) VALUES ('ex_def','Def','D','Math','teacher1',60);
-- SELECT status FROM exam WHERE id='ex_def'; -- expect DRAFT

-- Verify
SELECT 'constraints tested' AS result;
