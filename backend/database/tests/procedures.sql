-- procedures.sql — test stored procedures

-- CreateExamSession: needs valid student and exam
-- CALL CreateExamSession('student_id','exam_id');
-- Expected: CREATED with sessionId or EXISTS if already active

-- RecordExamEvent: logs event
-- CALL RecordExamEvent('session_id','TAB_HIDDEN', NULL, '{"reason":"test"}');

-- FinalizeExamSession: idempotent finalize
-- CALL FinalizeExamSession('session_id');
-- Expected: SUBMITTED with obtained/total/percentage or ALREADY_SUBMITTED

-- GenerateExamSummary: analytics
-- CALL GenerateExamSummary('exam_id');

-- UpdateReviewStatus: transactional status change
-- CALL UpdateReviewStatus('review_id','IN_REVIEW','teacher_id');

-- Example full flow:
-- SET @stu = (SELECT id FROM user WHERE role='STUDENT' LIMIT 1);
-- SET @ex = (SELECT id FROM exam WHERE status='LIVE' LIMIT 1);
-- CALL CreateExamSession(@stu, @ex);
-- SET @sess = (SELECT id FROM examsession WHERE studentId=@stu AND examId=@ex AND status='IN_PROGRESS' ORDER BY createdAt DESC LIMIT 1);
-- CALL RecordExamEvent(@sess, 'QUESTION_ANSWERED', NULL, '{}');
-- CALL FinalizeExamSession(@sess);
