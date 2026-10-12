# ExamGuard Phase 4: Database Architecture Documentation

## Overview

This document describes the database architecture, normalization, transaction management, and advanced SQL features implemented in ExamGuard Phase 4.

## Database Technology

- **Primary Database**: MySQL 8.0+
- **ORM**: Prisma Client (with raw SQL for advanced operations)
- **Connection Pool**: Prisma-managed pool (configurable via DATABASE_URL)

## Relational Model

### Entities and Relationships

```
USER (PK: id)
  ├──→ EXAM (FK: teacherId, ON DELETE: RESTRICT)
  ├──→ EXAM_SESSION (FK: studentId, ON DELETE: CASCADE)
  ├──→ REVIEW_NOTE (FK: teacherId, ON DELETE: CASCADE)
  ├──→ INTEGRITY_REVIEW (FK: reviewedBy, ON DELETE: SET NULL)
  ├──→ INTEGRITY_REVIEW (FK: assignedReviewerId, ON DELETE: SET NULL)
  ├──→ NOTIFICATION (FK: userId, ON DELETE: CASCADE)
  ├──→ AUDIT_LOG (FK: actorId, ON DELETE: SET NULL)
  └──→ REPORT (FK: generatedBy, ON DELETE: SET NULL)

EXAM (PK: id)
  ├──→ QUESTION (FK: examId, ON DELETE: CASCADE)
  ├──→ EXAM_SESSION (FK: examId, ON DELETE: CASCADE)
  ├──→ EXAM_ELIGIBILITY (FK: examId, ON DELETE: CASCADE)
  └──→ REPORT (FK: examId, ON DELETE: SET NULL)

EXAM_SESSION (PK: id)
  ├──→ ANSWER (FK: sessionId, ON DELETE: CASCADE)
  ├──→ EXAM_EVENT (FK: sessionId, ON DELETE: CASCADE)
  ├──→ INTEGRITY_REVIEW (FK: sessionId, ON DELETE: CASCADE, UNIQUE)
  └──→ REPORT (FK: sessionId, ON DELETE: SET NULL)

QUESTION (PK: id)
  ├──→ ANSWER (FK: questionId, ON DELETE: CASCADE)
  ├──→ QUESTION_OPTION (FK: questionId, ON DELETE: CASCADE)
  └──→ EXAM_EVENT (FK: questionId, ON DELETE: SET NULL)

INTEGRITY_REVIEW (PK: id)
  ├──→ INTEGRITY_SIGNAL (FK: integrityReviewId, ON DELETE: CASCADE)
  ├──→ REVIEW_NOTE (FK: integrityReviewId, ON DELETE: CASCADE)
  └──→ REPORT (FK: reviewId, ON DELETE: SET NULL)

INTEGRITY_SIGNAL (PK: id)
  └──→ (FK: integrityReviewId, ON DELETE: CASCADE)

REVIEW_NOTE (PK: id)
  └──→ (FK: integrityReviewId, ON DELETE: CASCADE)
  └──→ (FK: teacherId, ON DELETE: CASCADE)
```

## Normalization (3NF)

### 1NF (First Normal Form)
- All tables have atomic values
- No repeating groups
- Each column contains a single value
- All rows are unique (via PRIMARY KEY)

### 2NF (Second Normal Form)
- Satisfies 1NF
- All non-key attributes fully depend on the entire primary key
- No partial dependencies
- Example: `QuestionOrder` in the `Question` table depends on `examId` and `order` (composite)

### 3NF (Third Normal Form)
- Satisfies 2NF
- No transitive dependencies
- Student name is stored in `User` table, not duplicated in `ExamSession` or `Answer`
- Exam title is stored in `Exam` table, referenced via FK in `ExamSession`
- Question text is stored in `Question` table, referenced via FK in `Answer`

## CHECK Constraints

| Constraint | Table | Description |
|---|---|---|
| `chk_exam_duration` | exam | durationMinutes > 0 |
| `chk_exam_passing_min` | exam | passingMarks >= 0 |
| `chk_exam_passing_max` | exam | passingMarks <= totalMarks |
| `chk_question_points` | question | points >= 0 |
| `chk_question_order` | question | order > 0 |
| `chk_review_score` | integrityreview | score BETWEEN 0 AND 100 |
| `chk_answer_marks` | answer | marksAwarded >= 0 |

## Indexes

### Single Column Indexes
- `exam(teacherId)`, `exam(status)`, `exam(startAt)`, `exam(endAt)`, `exam(subject)`
- `examSession(studentId)`, `examSession(examId)`, `examSession(status)`, `examSession(deadlineAt)`
- `answer(sessionId)`, `answer(questionId)`
- `examEvent(sessionId)`, `examEvent(eventType)`, `examEvent(timestamp)`
- `integrityReview(score)`, `integrityReview(status)`, `integrityReview(level)`
- `notification(userId)`, `notification(read)`, `notification(readAt)`
- `auditLog(actorId)`, `auditLog(action)`, `auditLog(entityType)`

### Composite Indexes
- `exam(teacherId, status)` - Teacher exam listing
- `exam(teacherId, status, startAt)` - Teacher dashboard
- `examSession(studentId, examId, status)` - Student session lookup
- `examSession(examId, status)` - Exam session count
- `answer(sessionId, questionId)` - Answer lookup (unique)
- `examEvent(sessionId, eventType)` - Event timeline
- `integrityReview(status, score)` - Review queue
- `integrityReview(examId, status)` - Exam review queue
- `notification(userId, readAt)` - Unread notification lookup
- `auditLog(action, entityType)` - Audit log filtering

## Views

### Student_Exam_Summary
Student + exam + score summary with percentage calculation.

### Exam_Performance_Summary
Per-exam aggregates including total students, submissions, and integrity scores.

### Integrity_Review_Summary
Review with signal count, student name, and exam title.

### Teacher_Exam_Dashboard_View
Teacher-centric aggregates for dashboard including high-priority review counts.

### Student_Performance_Summary
Per-student aggregates across all exams completed.

## Stored Functions

### GetStudentAverageScore(student_id)
Returns average percentage across completed exams. Returns 0 for invalid student.

### GetStudentExamCount(student_id)
Returns number of completed exams. Returns 0 for invalid student.

### GetExamPassRate(exam_id)
Returns pass percentage. Handles zero submissions without division-by-zero errors.

### GetExamAverageScore(exam_id)
Returns average percentage score for an exam. Returns 0 for zero submissions.

## Stored Procedures

### CreateExamSession(student_id, exam_id)
Safely creates a session with:
- Exam existence check
- Status validation (must be PUBLISHED/LIVE/SCHEDULED)
- Time window validation
- Existing active session check
- Attempts limit check
- Eligibility check
- Event creation
- Audit logging

### RecordExamEvent(session_id, event_type, question_id, metadata)
Records an exam event with:
- Session existence and active status check
- Event insertion
- Session lastActivityAt update

### FinalizeExamSession(session_id)
Idempotent session finalization:
- Returns ALREADY_SUBMITTED if already submitted
- Calculates objective marks
- Sets submittedAt and status=SUBMITTED
- Creates SESSION_ENDED event
- Creates audit log

### UpdateReviewStatus(review_id, new_status, reviewer_id)
Transactional review status update:
- Row locking for concurrency
- Status transition validation
- Audit logging
- Version increment

## Triggers

### trg_exam_check_marks_insert / _update
Prevents invalid exam configuration on insert/update:
- passingMarks > totalMarks → error
- durationMinutes <= 0 → error
- startAt >= endAt → error

### trg_question_check_insert
Prevents invalid question data:
- points < 0 → error
- order <= 0 → error

### trg_review_score_check_insert / _update
Prevents invalid integrity scores:
- score < 0 OR score > 100 → error

### trg_review_updated_at
Auto-sets updatedAt on review update.

## Transaction Management

### Transaction Isolation Levels

| Operation | Isolation Level | Rationale |
|---|---|---|
| Session Start | RepeatableRead | Prevents phantom reads during eligibility check and session creation |
| Submission | Serializable | Maximum isolation for critical financial-like operation |
| Answer Save | ReadCommitted | Balance between consistency and performance |
| Review Update | ReadCommitted with row lock | Row-level locking provides concurrency control |
| Exam Publish | ReadCommitted | Adequate with row-level FOR UPDATE locking |

### Deadlock Handling
- MySQL deadlock errors (code 1213, 1205, P2034) trigger automatic retry
- Maximum 3 retries with exponential backoff (50ms, 100ms, 200ms)
- After max retries, returns controlled error to client

### SAVEPOINT Usage
- Used in submission for atomic answer + event operations
- Used in exam publishing for audit atomicity
- Partial rollback allows keeping critical data when non-critical operations fail

## Concurrency Control

### Duplicate Session Prevention
1. **Database constraint**: `@@unique([examId, studentId, status], name: "unique_active_session")`
2. **Row locking**: `SELECT ... FOR UPDATE` on existing sessions
3. **Application validation**: Check before insert

### Duplicate Submission Prevention
1. **State check**: Verify status !== 'SUBMITTED' in transaction
2. **Row locking**: Lock session with FOR UPDATE
3. **Idempotent response**: Return existing result if already submitted

### Concurrent Review Updates
1. **Optimistic concurrency**: Version field checking
2. **Row locking**: FOR UPDATE on review row
3. **Status machine**: Valid transition enforcement

## Security

### Authentication
- JWT tokens in HTTP-only cookies
- bcrypt password hashing (10 rounds)
- Token verification on every protected request

### Authorization
- Role-based access control (TEACHER, STUDENT, ADMIN)
- Resource ownership verification
- IDOR protection for all student/teacher resources

### Input Validation
- Zod schemas for all request bodies
- Mass assignment protection (explicit field allowlists)
- Input sanitization (XSS prevention)
- Metadata size limits (2KB max)

### SQL Injection Prevention
- Parameterized queries via Prisma
- Raw SQL uses parameterized `$queryRaw` with placeholders
- No string concatenation for SQL

## Data Retention

- All historical data retained (no hard deletes for exams, questions, sessions)
- Soft delete via `deletedAt` on User, Exam, Question
- Audit logs immutable (append-only)
- Answer records preserved for historical integrity

## Backup Strategy

- Database backups via `mysqldump` scheduled daily
- Migration scripts version-controlled in `prisma/`
- Seed data deterministic and reproducible
- Restore: `mysql -u examguard -p examguard < backup.sql`

## Monitoring

### Health Endpoints
- `GET /api/health` - Application and database health
- `GET /api/ready` - Application readiness
- `GET /api/admin/database/health` - Database integrity checks (teacher/admin only)

### Integrity Checks
1. Exams with invalid teachers
2. Sessions with invalid students
3. Sessions with invalid exams
4. Answers without sessions
5. Answers for questions outside exam
6. Reviews without sessions
7. Signals without reviews
8. Active sessions past deadline
9. Duplicate active sessions
10. Invalid score ranges
11. Invalid exam date ranges
12. Invalid question ordering
13. Orphaned audit references
14. Invalid duration constraints
15. Negative question marks

## Migration System

All schema changes follow this process:
1. Modify `prisma/schema.prisma`
2. Run `npx prisma migrate dev --create-only`
3. Apply migration: `npx prisma migrate deploy`
4. Regenerate client: `npx prisma generate`
5. Update seed data if needed
6. Run tests
7. Verify with `npm run db:validate`

## ADBMS Concepts Demonstration

This implementation demonstrates all major ADBMS concepts:

- **DATA MODELLING**: Entity-relationship model with 13 tables
- **NORMALIZATION**: 3NF with separated entities
- **DDL**: CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE VIEW
- **DML**: INSERT, UPDATE, DELETE, SELECT
- **CONSTRAINTS**: PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK, DEFAULT
- **NULL HANDLING**: Proper NULL semantics throughout
- **BASIC QUERIES**: SELECT, WHERE, ORDER BY, GROUP BY
- **AGGREGATES**: COUNT, AVG, SUM, MIN, MAX
- **JOINS**: INNER JOIN, LEFT JOIN, multi-table joins
- **SUBQUERIES**: Scalar, correlated, and derived table subqueries
- **VIEWS**: 5 reusable summary views
- **INDEXING**: 20+ indexes with EXPLAIN analysis
- **EXPLAIN**: Query plan analysis for optimization
- **STORED FUNCTIONS**: 4 functions for database-level computation
- **STORED PROCEDURES**: 4 procedures for transactional operations
- **TRANSACTIONS**: BEGIN, COMMIT, ROLLBACK
- **SAVEPOINT**: Partial rollback demonstrations
- **CONCURRENCY CONTROL**: Row locking, unique constraints, optimistic concurrency
- **DATA INTEGRITY**: CHECK constraints, triggers, foreign keys
