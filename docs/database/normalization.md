# Normalization — 1NF to 3NF

## 1NF
- No repeating groups. Each question's options not stored as CSV in Exam table but as separate rows in Question/QuestionOption.
- Each answer row stores single answer per question per session (unique composite), not array.

## 2NF
- No partial dependencies. ExamSession holds only session-level attributes (startedAt, deadline, status), not exam title or student name (those live in Exam/User).
- Answer's `isCorrect`, `marksAwarded` depend on full PK (sessionId+questionId), not partial.

## 3NF
- No transitive dependencies. Student className/section stored only in User, not duplicated in every session/answer; accessed via JOIN.
- Exam teacher name not stored in Exam table, only teacherId FK; display name via JOIN to User.
- IntegrityReview score/category/status are direct attributes of review, not derived from signals (signals stored separately).

## Why Separation?
- `student information` (User) separated from `exam information` (Exam) vs storing student name in every answer (would duplicate, update anomaly).
- `question information` (Question) separated from `answer information` (Answer) vs storing question text in answer rows.
- `event information` (ExamEvent) separated from sessions; events are append-only log.
- `review information` (IntegrityReview) separated from signals (1:M) to allow multiple signals per review without duplication.

## Denormalization Trade-offs
- `Answer.answer` stores text snapshot for history (if question text later edited, original answer preserved). This is intentional denormalization for audit, justified.
- Views (`Student_Exam_Summary`) pre-join for reporting but base tables remain normalized.

## 3NF Verification Checklist
- No student_name in ExamSession, only studentId FK ✓
- No exam_title in Answer, only via Question→Exam FK ✓
- No teacher name duplicated ✓
- Options normalized to QuestionOption (not JSON only; JSON kept for legacy) ✓
