# ExamGuard Database Schema Reference

## Prisma Schema Summary

This document describes the complete relational schema for the ExamGuard system.

## Models

### User
```
User (id PK, email UNIQUE)
- id: String @id @default(cuid())
- name: String
- fullName: String?
- email: String @unique
- passwordHash: String
- role: Role (TEACHER, STUDENT, ADMIN)
- status: UserStatus (ACTIVE, INACTIVE, SUSPENDED)
- studentId: String? @unique
- className: String?
- section: String?
- academicYear: String?
- deletedAt: DateTime?
```

### Exam
```
Exam (id PK, teacherId FK → User)
- title: String @db.VarChar(255)
- description: String @db.Text
- subject: String @db.VarChar(100)
- className: String? @db.VarChar(50)
- section: String? @db.VarChar(10)
- academicYear: String? @db.VarChar(20)
- teacherId: String FK → User (ON DELETE: Restrict)
- status: ExamStatus (DRAFT, SCHEDULED, LIVE, COMPLETED, PUBLISHED, UNPUBLISHED, ARCHIVED)
- durationMinutes: Int CHECK(durationMinutes > 0)
- totalMarks: Int CHECK(totalMarks >= 0) @default(0)
- passingMarks: Int CHECK(passingMarks >= 0) @default(0)
- CHECK: passingMarks <= totalMarks
- startAt: DateTime?
- endAt: DateTime?
- attemptsAllowed: Int @default(1)
- publishedAt: DateTime?
- version: Int @default(1)
```

### Question
```
Question (id PK, examId FK → Exam)
- examId: String FK → Exam (ON DELETE: Cascade)
- type: QuestionType (MCQ, TF, SHORT, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER)
- text: String @db.Text
- order: Int CHECK(order > 0)
- points: Int CHECK(points >= 0)
- required: Boolean @default(true)
- correctAnswer: String @db.Text
- version: Int @default(1)
- @@unique([examId, order])
```

### QuestionOption
```
QuestionOption (id PK, questionId FK → Question)
- questionId: String FK → Question (ON DELETE: Cascade)
- optionText: String @db.Text
- optionOrder: Int
- isCorrect: Boolean @default(false)
- @@unique([questionId, optionOrder])
```

### ExamSession
```
ExamSession (id PK, examId FK, studentId FK)
- examId: String FK → Exam (ON DELETE: Cascade)
- studentId: String FK → User (ON DELETE: Cascade)
- startedAt: DateTime @default(now())
- deadlineAt: DateTime?
- submittedAt: DateTime?
- status: SessionStatus (IN_PROGRESS, SUBMITTED, EXPIRED)
- lastActivityAt: DateTime @default(now())
- version: Int @default(1)
- @@unique([examId, studentId, status], name: "unique_active_session")
```

### Answer
```
Answer (id PK, sessionId FK, questionId FK)
- sessionId: String FK → ExamSession (ON DELETE: Cascade)
- questionId: String FK → Question (ON DELETE: Cascade)
- selectedOptionId: String? FK → QuestionOption (ON DELETE: SetNull)
- answer: String @db.Text
- isCorrect: Boolean?
- marksAwarded: Int? CHECK(marksAwarded >= 0) @default(0)
- firstAnsweredAt: DateTime @default(now())
- answeredAt: DateTime?
- changeCount: Int @default(0)
- version: Int @default(1)
- @@unique([sessionId, questionId])
```

### ExamEvent
```
ExamEvent (id PK, sessionId FK)
- sessionId: String FK → ExamSession (ON DELETE: Cascade)
- questionId: String? FK → Question (ON DELETE: SetNull)
- eventType: EventType
- timestamp: DateTime @default(now())
- metadata: String? @db.Text
```

### IntegrityReview
```
IntegrityReview (id PK, sessionId FK UNIQUE)
- sessionId: String FK → ExamSession (ON DELETE: Cascade) UNIQUE
- studentId: String?
- examId: String?
- score: Int CHECK(score BETWEEN 0 AND 100)
- originalScore: Int?
- overrideScore: Int?
- overrideReason: String? @db.Text
- overriddenBy: String?
- overriddenAt: DateTime?
- level: ReviewLevel
- category: String? @db.VarChar(50)
- status: ReviewStatus (PENDING, IN_REVIEW, REVIEWED, REQUIRES_FOLLOW_UP, DISMISSED)
- generatedAt: DateTime @default(now())
- reviewedAt: DateTime?
- reviewedBy: String? FK → User (ON DELETE: SetNull)
- assignedReviewerId: String? FK → User (ON DELETE: SetNull)
- assignedAt: DateTime?
- version: Int @default(1)
```

### IntegritySignal
```
IntegritySignal (id PK, integrityReviewId FK)
- integrityReviewId: String FK → IntegrityReview (ON DELETE: Cascade)
- type: SignalType
- severity: SignalSeverity
- points: Int
- confidence: Float @default(0.85)
- scoreContribution: Int?
- description: String @db.Text
- evidence: String @db.Text
```

### ReviewNote
```
ReviewNote (id PK, integrityReviewId FK, teacherId FK)
- integrityReviewId: String FK → IntegrityReview (ON DELETE: Cascade)
- teacherId: String FK → User (ON DELETE: Cascade)
- note: String @db.Text
```

### Notification
```
Notification (id PK, userId FK)
- userId: String FK → User (ON DELETE: Cascade)
- title: String @db.VarChar(255)
- message: String @db.Text
- read: Boolean @default(false)
- readAt: DateTime?
- type: String? @db.VarChar(50)
- entityId: String? @db.VarChar(100)
```

### AuditLog
```
AuditLog (id PK, actorId FK)
- actorId: String? FK → User (ON DELETE: SetNull)
- actorRole: String @db.VarChar(20)
- action: AuditAction
- entityType: String @db.VarChar(50)
- entityId: String @db.VarChar(100)
- metadata: String? @db.Text
- ipAddress: String? @db.VarChar(45)
```

### Report
```
Report (id PK, reportId UNIQUE)
- reportId: String @unique @db.VarChar(20) // EG-2026-000124
- sessionId: String? FK → ExamSession (ON DELETE: SetNull)
- reviewId: String? FK → IntegrityReview (ON DELETE: SetNull)
- examId: String? FK → Exam (ON DELETE: SetNull)
- reportType: ReportType (RESULT, INTEGRITY, EXAM_ANALYTICS)
- generatedBy: String? FK → User (ON DELETE: SetNull)
- generatedAt: DateTime @default(now())
- fileReference: String? @db.VarChar(255)
```

### ExamEligibility
```
ExamEligibility (id PK, examId FK)
- examId: String FK → Exam (ON DELETE: Cascade)
- className: String @db.VarChar(50)
- section: String? @db.VarChar(10)
- academicYear: String? @db.VarChar(20)
- @@unique([examId, className, section])
```

## Foreign Key Summary

| Child Table | FK Column | Parent Table | ON DELETE |
|---|---|---|---|
| Exam | teacherId | User | Restrict |
| Question | examId | Exam | Cascade |
| QuestionOption | questionId | Question | Cascade |
| ExamSession | examId | Exam | Cascade |
| ExamSession | studentId | User | Cascade |
| Answer | sessionId | ExamSession | Cascade |
| Answer | questionId | Question | Cascade |
| Answer | selectedOptionId | QuestionOption | SetNull |
| ExamEvent | sessionId | ExamSession | Cascade |
| ExamEvent | questionId | Question | SetNull |
| IntegrityReview | sessionId | ExamSession | Cascade |
| IntegritySignal | integrityReviewId | IntegrityReview | Cascade |
| ReviewNote | integrityReviewId | IntegrityReview | Cascade |
| ReviewNote | teacherId | User | Cascade |
| Notification | userId | User | Cascade |
| AuditLog | actorId | User | SetNull |
| Report | sessionId | ExamSession | SetNull |
| Report | reviewId | IntegrityReview | SetNull |
| Report | examId | Exam | SetNull |
| Report | generatedBy | User | SetNull |
| ExamEligibility | examId | Exam | Cascade |

## Status Machines

### Exam Status Transitions
```
DRAFT → PUBLISHED, SCHEDULED, ARCHIVED
PUBLISHED → UNPUBLISHED, ARCHIVED, COMPLETED
UNPUBLISHED → PUBLISHED, DRAFT, ARCHIVED
ARCHIVED → (terminal)
SCHEDULED → LIVE, PUBLISHED, UNPUBLISHED, COMPLETED
```

### Session Status Transitions
```
IN_PROGRESS → SUBMITTED, EXPIRED
```

### Review Status Transitions
```
PENDING → IN_REVIEW, REVIEWED, DISMISSED
IN_REVIEW → REVIEWED, REQUIRES_FOLLOW_UP, DISMISSED, PENDING
REQUIRES_FOLLOW_UP → REVIEWED, IN_REVIEW, DISMISSED
REVIEWED → REQUIRES_FOLLOW_UP, DISMISSED
DISMISSED → PENDING, IN_REVIEW
```

## Delete Strategy

| Entity | Strategy | Rationale |
|---|---|---|
| User | Soft delete (deletedAt) | Historical audit records reference users |
| Exam | Soft delete (deletedAt) | Historical results reference exams |
| Question | Soft delete (deletedAt) | Historical answers reference questions |
| ExamSession | Hard delete via cascade | Dependent on exam lifecycle |
| Answer | Hard delete via cascade | Dependent on session lifecycle |
| ExamEvent | Hard delete via cascade | Dependent on session lifecycle |
| IntegrityReview | Hard delete via cascade | Dependent on session lifecycle |
| AuditLog | Preserve always | Immutable audit trail |
| Report | Preserve always | Generated artifacts |
| Notification | Preserve | User communication record |
