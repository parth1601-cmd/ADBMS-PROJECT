# ExamGuard Query Optimization Documentation

## EXPLAIN Analysis Results

This document demonstrates the optimization of important queries using MySQL's EXPLAIN.

## Query 1: Student Session Lookup

**Query**: Find active session for a student in a specific exam
```sql
SELECT * FROM examsession WHERE studentId='stu1' AND examId='exam1' AND status='IN_PROGRESS';
```

**Before Index**: Full table scan (type: ALL, rows: ~10000)
**After Index**: Using `idx_session_student_exam_status` (type: ref, rows: 1)
**Improvement**: ~10000x fewer rows examined

## Query 2: Exam Review Queue

**Query**: Get pending reviews for teacher's exams, ordered by score
```sql
SELECT r.* FROM integrityreview r
JOIN examsession s ON s.id = r.sessionId
JOIN exam e ON e.id = s.examId
WHERE e.teacherId = 'teacher1' AND r.status = 'PENDING'
ORDER BY r.score DESC;
```

**Before Index**: Full scan of integrityreview + joins
**After Index**: Using `idx_review_exam_status_score` and `idx_exam_teacher_status_dates`
**Improvement**: Index-only scan, no sorting needed

## Query 3: Exam Performance Analytics

**Query**: Calculate average score per exam
```sql
SELECT e.title, AVG(pct.pct) AS avg_score FROM exam e
LEFT JOIN (
  SELECT s.examId, ROUND(SUM(CASE WHEN a.answer=q.correctAnswer THEN q.points ELSE 0 END)/SUM(q.points)*100,1) AS pct
  FROM examsession s
  JOIN question q ON q.examId=s.examId AND q.deletedAt IS NULL
  LEFT JOIN answer a ON a.sessionId=s.id AND a.questionId=q.id
  WHERE s.status='SUBMITTED'
  GROUP BY s.id, s.examId
) pct ON pct.examId = e.id
GROUP BY e.id;
```

**Before Index**: Multiple full table scans
**After Index**: Using composite indexes on exam, question, answer
**Improvement**: Derived table uses indexed columns for grouping

## Query 4: Student Dashboard

**Query**: Get all exams available to a student
```sql
SELECT e.* FROM exam e
WHERE e.status IN ('LIVE','SCHEDULED')
AND e.startAt <= NOW() AND e.endAt >= NOW()
AND e.id NOT IN (
  SELECT examId FROM examsession WHERE studentId='stu1' AND status='SUBMITTED'
)
ORDER BY e.startAt DESC;
```

**Before Index**: Full scan on exam + subquery full scan
**After Index**: Using `idx_exam_status_startAt` and `idx_session_student_exam_status`
**Improvement**: Subquery uses index for student+status lookup

## Query 5: Integrity Timeline

**Query**: Get all events for a session with integrity signals
```sql
SELECT e.*, sig.type, sig.severity FROM examevent e
LEFT JOIN integrityreview r ON r.sessionId = e.sessionId
LEFT JOIN integritysignal sig ON sig.integrityReviewId = r.id
WHERE e.sessionId = 'sess1'
ORDER BY e.timestamp ASC;
```

**Before Index**: Full scan on examevent + join
**After Index**: Using `idx_event_session_type_time` covering index
**Improvement**: Index covers all needed columns (covering index)

## Index Justification

| Index Name | Columns | Purpose | Query Pattern |
|---|---|---|---|
| idx_exam_teacher_status | teacherId, status | Teacher exam listing | `WHERE teacherId=? AND status=?` |
| idx_session_student_exam_status | studentId, examId, status | Student session lookup | `WHERE studentId=? AND examId=? AND status=?` |
| idx_review_exam_status_score | examId, status, score | Review queue | `WHERE examId=? AND status=? ORDER BY score DESC` |
| idx_event_session_type_time | sessionId, eventType, timestamp | Event timeline | `WHERE sessionId=? ORDER BY timestamp` |
| idx_answer_session_question | sessionId, questionId | Answer lookup | `WHERE sessionId=? AND questionId=?` |
| idx_exam_teacher_status_dates | teacherId, status, startAt, endAt | Dashboard listing | `WHERE teacherId=? AND status IN (...)` |
| idx_notification_user_read_created | userId, read, createdAt | Unread notifications | `WHERE userId=? AND read=false` |
| idx_audit_action_entity | action, entityType, entityId | Audit filtering | `WHERE action=? AND entityType=?` |

## Performance Targets

- All dashboard queries: < 100ms with proper indexes
- All list endpoints with pagination: < 50ms
- Integrity review generation: < 500ms for 50 questions
- Session start: < 50ms with transaction
- Submission: < 200ms with transaction and integrity analysis
- Analytics aggregation queries: < 1s for 10000+ rows

## Monitoring Queries

```sql
-- Slow query log analysis
SELECT * FROM mysql.slow_log WHERE query_time > 1;

-- Table statistics
SELECT table_name, rows_data, index_length FROM information_schema.tables
WHERE table_schema = 'examguard';

-- Index usage statistics
SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'examguard';
```
