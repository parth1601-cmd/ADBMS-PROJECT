# ER Diagram — ExamGuard Phase 4

```
[User] 1──< [Exam] >── [User(Teacher)]
  |          |
  |          |──< [ExamEligibility]
  |          |──< [Question] ──< [QuestionOption]
  |          |          |
  |          |          └─< [Answer] >── [ExamSession] ──> [User(Student)]
  |          |                    |
  |          └─< [ExamSession] ──< [ExamEvent] ──> [Question]
  |                    |
  |                    └─1─ [IntegrityReview] ──< [IntegritySignal]
  |                              |
  |                              ├─< [ReviewNote] >── [User(Teacher)]
  |                              └─< [Report]
  ├─< [Notification]
  ├─< [ReviewNote]
  ├─< [AuditLog]
  └─< [Report]
```

## Entities & Keys
- **User** PK id, UNIQUE email, UNIQUE studentId NULL, FK none
- **Exam** PK id, FK teacherId → User, UNIQUE none, but index on teacherId+status
- **ExamEligibility** PK id, FK examId → Exam, UNIQUE(examId,className,section)
- **Question** PK id, FK examId → Exam, UNIQUE(examId,order)
- **QuestionOption** PK id, FK questionId → Question, UNIQUE(questionId,order)
- **ExamSession** PK id, FK examId → Exam, FK studentId → User, UNIQUE(examId,studentId,status)
- **Answer** PK id, FK sessionId → ExamSession, FK questionId → Question, FK selectedOptionId → QuestionOption NULL, UNIQUE(sessionId,questionId)
- **ExamEvent** PK id, FK sessionId → ExamSession, FK questionId → Question NULL
- **IntegrityReview** PK id, FK sessionId → ExamSession UNIQUE, FK reviewedBy → User NULL, FK assignedReviewerId → User NULL
- **IntegritySignal** PK id, FK integrityReviewId → IntegrityReview
- **ReviewNote** PK id, FK integrityReviewId → IntegrityReview, FK teacherId → User
- **Notification** PK id, FK userId → User
- **AuditLog** PK id, FK actorId → User NULL (SET_NULL)
- **Report** PK id, UNIQUE reportId, FK sessionId NULL, reviewId NULL, examId NULL, generatedBy NULL

## Relationships Cardinality
- All 1:M except ExamSession 1:1 IntegrityReview (unique constraint enforces)
- User to Notification/AuditLog 1:M but AuditLog actor may be null (preserved after user deletion)

## Notes
- PK = cuid string (MySQL VARCHAR(30))
- FKs enforce referential integrity; see schema.md for ON DELETE decisions
- Indexes on FKs + composite per query patterns
```
