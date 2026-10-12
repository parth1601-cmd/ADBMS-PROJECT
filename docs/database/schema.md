# Database Schema — ExamGuard Phase 4

## Provider
MySQL 8 (production) with `utf8mb4_unicode_ci`. Development uses same schema via Prisma `mysql` provider. Host: `127.0.0.1:3307` (local) / `3306` prod. Strict SQL mode enabled.

## ER Entities (13 core + eligibility)
- User(id PK, email UNIQUE, studentId UNIQUE NULL, role ENUM, status ENUM, className, section, academicYear, deletedAt)
- Exam(id PK, teacherId FK → User RESTRICT, status ENUM, durationMinutes INT CHECK >0, totalMarks INT CHECK >=0, passingMarks INT CHECK <= totalMarks, startAt NULL, endAt NULL CHECK start<end, publishedAt NULL, version INT, deletedAt NULL)
- ExamEligibility(id PK, examId FK CASCADE, className, section, academicYear, UNIQUE(examId,className,section))
- Question(id PK, examId FK CASCADE, type ENUM, text TEXT, `order` INT CHECK >0, points INT CHECK >=0, correctAnswer TEXT, version INT, deletedAt NULL, UNIQUE(examId,order))
- QuestionOption(id PK, questionId FK CASCADE, optionText TEXT, optionOrder INT, isCorrect BOOL, UNIQUE(questionId,optionOrder))
- ExamSession(id PK, examId FK CASCADE, studentId FK CASCADE, deadlineAt NULL, submittedAt NULL, status ENUM, version INT, UNIQUE(examId,studentId,status) prevents duplicate active)
- Answer(id PK, sessionId FK CASCADE, questionId FK CASCADE, selectedOptionId FK SET_NULL, answer TEXT, isCorrect NULL, marksAwarded NULL, changeCount INT, version INT, UNIQUE(sessionId,questionId))
- ExamEvent(id PK, sessionId FK CASCADE, questionId FK SET_NULL NULL, eventType ENUM, timestamp DATETIME(3), metadata TEXT NULL, indexes composite)
- IntegrityReview(id PK, sessionId UNIQUE FK CASCADE, studentId NULL, examId NULL, score INT CHECK 0-100, originalScore NULL, overrideScore NULL, level ENUM, status ENUM, version INT)
- IntegritySignal(id PK, integrityReviewId FK CASCADE, type ENUM, severity ENUM, points INT, confidence FLOAT, evidence TEXT, indexes)
- ReviewNote(id PK, integrityReviewId FK CASCADE, teacherId FK CASCADE, note TEXT)
- Notification(id PK, userId FK CASCADE, title VARCHAR(255), read BOOL, readAt NULL, type VARCHAR(50) NULL, indexes composite)
- AuditLog(id PK, actorId FK SET_NULL NULL, actorRole VARCHAR(20), action ENUM, entityType VARCHAR(50), entityId VARCHAR(100), metadata TEXT NULL, indexes composite)
- Report(id PK, reportId UNIQUE VARCHAR(20) deterministic EG-YYYY-000000, sessionId FK SET_NULL NULL, reviewId FK SET_NULL NULL, examId FK SET_NULL NULL, generatedBy FK SET_NULL NULL, reportType ENUM, generatedAt DATETIME(3))

## DDL
Generated via `prisma db push` + raw SQL for CHECKs, triggers, views, functions, procedures.
MySQL DDL files: `backend/prisma/schema.prisma`, `backend/database/views.sql`, `backend/database/functions.sql`, `backend/database/procedures.sql`, `backend/database/triggers.sql`, `backend/database/indexes.sql`.

## Constraints Summary
- PK on every table (cuid)
- FK with explicit ON DELETE: RESTRICT for Exam→User (preserve history), CASCADE for dependent rows (sessions→answers/events), SET_NULL for optional references (answer.selectedOption, review.reviewer)
- UNIQUE: user.email, user.studentId, examId+order, sessionId+questionId, sessionId unique for review, reportId, examEligibility composite
- NOT NULL: email, passwordHash, title, etc.
- CHECK via triggers + native CHECK (MySQL 8.0.16+): duration>0, points>=0, order>0, score 0-100, passing<=total, start<end
- DEFAULT: status enums default DRAFT/ACTIVE/PENDING/IN_PROGRESS, version 1, read false, createdAt now(3)
- INDEX: single + composite as per query patterns (see indexes.md)

## Null Handling
- submittedAt NULL while IN_PROGRESS
- reviewedAt NULL until REVIEWED
- assignedReviewerId NULL if unassigned
- deadlineAt NULL only if duration derived (but always set via server)
- readAt NULL until read
- deletedAt NULL = not deleted (soft delete)
- Never use "N/A", "Unknown" strings; proper SQL NULL.

## Referential Schema (TEXT)
```
USER(user_id PK)
EXAM(exam_id PK, teacher_id FK)
EXAM_ELIGIBILITY(id PK, exam_id FK)
QUESTION(question_id PK, exam_id FK)
QUESTION_OPTION(option_id PK, question_id FK)
EXAM_SESSION(session_id PK, exam_id FK, student_id FK)
ANSWER(answer_id PK, session_id FK, question_id FK, selected_option_id FK NULL)
EXAM_EVENT(event_id PK, sessionId FK, questionId FK NULL)
INTEGRITY_REVIEW(review_id PK, session_id FK UNIQUE)
INTEGRITY_SIGNAL(signal_id PK, review_id FK)
REVIEW_NOTE(note_id PK, review_id FK, author_id FK)
NOTIFICATION(notification_id PK, user_id FK)
AUDIT_LOG(audit_id PK, actor_id FK NULL)
REPORT(report_id PK, session_id FK NULL, review_id FK NULL, exam_id FK NULL, generatedBy FK NULL)
```
