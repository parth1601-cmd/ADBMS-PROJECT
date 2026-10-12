# Relationships & Cardinality

- User 1:M Exam (Teacher → Exams) `RESTRICT` on teacher delete to preserve history
- Exam 1:M Question `CASCADE`
- Exam 1:M QuestionOption via Question `CASCADE`
- Exam 1:M ExamSession `CASCADE`
- Exam 1:M ExamEligibility `CASCADE`
- User 1:M ExamSession (Student → Sessions) `CASCADE`
- ExamSession 1:M Answer `CASCADE`
- Question 1:M Answer `CASCADE`
- Question 1:M QuestionOption `CASCADE`
- QuestionOption 1:M Answer (selectedOption) `SET_NULL`
- ExamSession 1:M ExamEvent `CASCADE`
- Question 1:M ExamEvent (optional questionId) `SET_NULL`
- ExamSession 1:1 IntegrityReview `CASCADE` + unique constraint
- IntegrityReview 1:M IntegritySignal `CASCADE`
- IntegrityReview 1:M ReviewNote `CASCADE`
- User 1:M ReviewNote `CASCADE`
- User 1:M Notification `CASCADE`
- User 1:M AuditLog `SET_NULL` (preserve audit even if user deleted)
- User 1:M Report (generator) `SET_NULL`
- ExamSession 1:M Report `SET_NULL`
- IntegrityReview 1:M Report `SET_NULL`
- Exam 1:M Report `SET_NULL`

## Soft Delete Strategy
Historical entities (User, Exam, Question) use `deletedAt` instead of hard delete, preserving results. Dependent temporary rows (Answer, Event) use CASCADE when session deleted (e.g., test cleanup). Important entities (Exam) use RESTRICT for teacher deletion.

## FK Visualization
```
User ──< Exam ──< Question ──< QuestionOption
 │        │          │
 │        │          └─< Answer >─ ExamSession >─ User
 │        │                  │
 │        └─< ExamSession ──< ExamEvent
 │               │
 │               └─1─ IntegrityReview ──< IntegritySignal
 │                                        └─< ReviewNote >─ User
 │                                        └─< Report
 └─< Notification
 └─< AuditLog
```
