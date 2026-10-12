# Indexing & Query Optimization

## Principles
Do not add indexes without reason. Each index supports a frequent query pattern, verified via EXPLAIN.

## Single-column Indexes
- User(email), role, status, studentId, className+section
- Exam(teacherId), status, startAt, endAt, subject, publishedAt
- Question(examId), type, deletedAt
- ExamSession(examId), studentId, status, deadlineAt, submittedAt
- Answer(sessionId), questionId, isCorrect
- ExamEvent(sessionId), eventType, timestamp, createdAt
- IntegrityReview(score), status, level, generatedAt, assignedReviewerId, examId, studentId
- IntegritySignal(type), severity
- ReviewNote(integrityReviewId), teacherId
- Notification(userId), read, readAt, createdAt, type
- AuditLog(actorId), action, entityType, entityId, createdAt

## Composite Indexes (High Value)
- Exam(teacherId, status) → teacher exam listing with filter
- ExamSession(studentId, examId, status) → active session check (unique_active_session also covers)
- ExamSession(examId, status) → exam analytics (submitted count)
- ExamEvent(sessionId, eventType) → timeline filter
- ExamEvent(sessionId, createdAt) → paginated timeline
- IntegrityReview(status, score) → review queue ordered by priority
- IntegrityReview(examId, status) → exam-specific queue
- Notification(userId, readAt) → unread first
- Notification(userId, read) → legacy read boolean
- AuditLog(actorId, createdAt) → actor timeline
- AuditLog(action, entityType) → filtered audit search
- QuestionOption(questionId, optionOrder) unique covers order lookup

## EXPLAIN Analysis (MySQL 8)

### Before Index (Example: session lookup without composite)
```
EXPLAIN SELECT * FROM examsession WHERE studentId='x' AND examId='y' AND status='IN_PROGRESS';
-- type: ALL, possible_keys: NULL, rows: 5000, Extra: Using where
```

### After Index (studentId,examId,status)
```
EXPLAIN SELECT * FROM examsession WHERE studentId='x' AND examId='y' AND status='IN_PROGRESS';
-- type: ref, possible_keys: studentId_examId_status, unique_active_session, key: unique_active_session, rows: 1, Extra: Using index condition
```

### Teacher Review Queue
```
EXPLAIN SELECT * FROM integrityreview WHERE status='PENDING' ORDER BY score DESC LIMIT 20;
-- Before: type ALL, filesort
-- After (status,score): type ref, Extra: Using where; Using index (avoids filesort if covering)
```

Run `backend/database/tests/indexes.sql` for full EXPLAIN examples.

## Checklist
- 5+ important queries optimized ✓
- Composite indexes justified by WHERE + ORDER BY + GROUP BY patterns ✓
- EXPLAIN used before/after ✓
- No redundant indexes (e.g., single column already covered by composite prefix)
