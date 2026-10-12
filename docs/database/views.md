# Views

All views are MySQL `CREATE VIEW` and use lowercase table names (Prisma MySQL mapping). Located in `backend/database/views.sql`.

## 1. Student_Exam_Summary
- Per session per student per exam with computed `obtained_marks`, `total_marks`, `percentage`.
- JOINs: user → examsession → exam → question → answer.
- Used for student dashboard, result listing.

## 2. Exam_Performance_Summary
- Per exam: total_students, submitted/expired/in_progress counts, avg/max/min integrity.
- Used for teacher exam list.

## 3. Exam_Score_Summary
- Per exam: submissions, average/highest/lowest percentage, pass/fail counts (pass >=40).
- Derived subquery computes percentage per session.

## 4. Integrity_Review_Summary
- Per review: student, exam, score, category, status, signal_count.
- JOINs: integrityreview → examsession → user/exam → integritysignal.

## 5. Teacher_Exam_Dashboard_View
- Comprehensive per exam: teacher, questions, students, started/submitted, average_score, pass_count, review counts, high_priority.
- Used for teacher dashboard analytics (optimized with indexes).

## 6. Student_Performance_Summary
- Per student: exam_count, completed, avg/high/low, pass, reviews.
- Used for student profile / class analytics.

All views simplify repeated REPORT queries and are reusable (proposal requirement).
