-- ExamGuard MySQL Indexes — applied via Prisma schema already, but explicit SQL for documentation & verification
-- Composite indexes for frequent query patterns

-- EXAM
-- already: teacherId, status, startAt, endAt, subject, (teacherId,status), (className,section)
-- EXPLAIN: SELECT * FROM exam WHERE teacherId=? AND status='LIVE' uses (teacherId,status)

-- SESSION
-- unique_active_session already prevents duplicate IN_PROGRESS per (examId,studentId,status)
-- indexes: (studentId,examId,status), (examId,status), (submittedAt)

-- ANSWER
-- indexes: (sessionId,questionId) unique, (sessionId), (questionId)

-- EVENT
-- indexes: (sessionId,eventType), (sessionId,createdAt)

-- REVIEW
-- indexes: (status,score), (examId,status), (studentId)

-- NOTIFICATION
-- indexes: (userId,readAt), (userId,read), (type)

-- AUDIT
-- indexes: (actorId,createdAt), (action,entityType)

-- CHECK constraints (MySQL 8.0.16+ enforces CHECK)
ALTER TABLE exam ADD CONSTRAINT chk_duration CHECK (durationMinutes > 0);
ALTER TABLE exam ADD CONSTRAINT chk_passing CHECK (passingMarks >=0 AND (totalMarks=0 OR passingMarks <= totalMarks));
ALTER TABLE question ADD CONSTRAINT chk_points CHECK (points >=0);
ALTER TABLE question ADD CONSTRAINT chk_qorder CHECK (`order` >0);
ALTER TABLE integrityreview ADD CONSTRAINT chk_score CHECK (score BETWEEN 0 AND 100);

-- Verify indexes
-- EXPLAIN SELECT * FROM examsession WHERE studentId=? AND examId=? AND status='IN_PROGRESS';
-- Should show: possible_keys = unique_active_session, studentId_examId_status, etc. chosen = unique_active_session
