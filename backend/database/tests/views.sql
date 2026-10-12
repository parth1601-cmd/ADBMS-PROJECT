-- views.sql — test views created in views.sql
SELECT * FROM Student_Exam_Summary LIMIT 5;
SELECT * FROM Exam_Performance_Summary LIMIT 5;
SELECT * FROM Exam_Score_Summary LIMIT 5;
SELECT * FROM Integrity_Review_Summary LIMIT 5;
SELECT * FROM Teacher_Exam_Dashboard_View LIMIT 5;
SELECT * FROM Student_Performance_Summary LIMIT 5;

-- Use views for reporting
SELECT student_name, exam_title, percentage FROM Student_Exam_Summary ORDER BY percentage DESC LIMIT 10;
SELECT exam_title, submitted_count, avg_integrity_score FROM Exam_Performance_Summary ORDER BY submitted_count DESC;
SELECT review_id, student_name, integrity_score, signal_count FROM Integrity_Review_Summary WHERE review_status='PENDING' ORDER BY integrity_score DESC;
