# ExamGuard Normalization Documentation

## Normalization Analysis

### Why Normalization Matters for ExamGuard

Without normalization, the database would have:
- Duplicate student names across every exam session
- Repeated exam titles in every answer record
- Redundant question text in every event
- Update anomalies when student names change
- Insertion anomalies requiring parent records first

### 1NF Demonstration

**Before (violating 1NF):**
```
Answer table with comma-separated options:
id | sessionId | questionText, options | answer
```

**After (1NF compliant):**
```
Answer table: id, sessionId, questionId, answerText
QuestionOption table: id, questionId, optionText, optionOrder, isCorrect
```

All columns are atomic. No repeating groups.

### 2NF Demonstration

**Before (violating 2NF):**
```
StudentExamScore table:
studentId, studentName, examId, examTitle, score
```
`studentName` depends only on `studentId` (partial dependency).
`examTitle` depends only on `examId` (partial dependency).

**After (2NF compliant):**
```
User table: id, name, email, ...
Exam table: id, title, ...
StudentExamScore table: studentId, examId, score
```
No partial dependencies. All non-key attributes depend on the entire PK.

### 3NF Demonstration

**Before (violating 3NF):**
```
Answer table: id, sessionId, studentName, examTitle, questionText, answer
```
`studentName` → `studentId` (transitive dependency)
`examTitle` → `examId` (transitive dependency)
`questionText` → `questionId` (transitive dependency)

**After (3NF compliant):**
```
Answer: id, sessionId(FK), questionId(FK), answerText
User: id, name (referenced via FK)
Exam: id, title (referenced via FK)
Question: id, text (referenced via FK)
```
No transitive dependencies. Each entity stored once.

## Specific Normalization Examples

### Student Information
- **Stored in**: `User` table once
- **Referenced via**: `studentId` FK in `ExamSession`
- **Never duplicated**: No student name in `Answer`, `ExamEvent`, `IntegrityReview`

### Exam Information
- **Stored in**: `Exam` table once
- **Referenced via**: `examId` FK in `ExamSession`, `Question`, `IntegrityReview`
- **Never duplicated**: No exam title in `Answer`, `ExamEvent`

### Question Information
- **Stored in**: `Question` table once
- **Referenced via**: `questionId` FK in `Answer`, `QuestionOption`, `ExamEvent`
- **Never duplicated**: No question text in `Answer`

### Teacher Information
- **Stored in**: `User` table (role=TEACHER)
- **Referenced via**: `teacherId` FK in `Exam`
- **Never duplicated**: No teacher name in `ExamSession` or `Answer`

## Benefits Achieved

1. **Update Anomaly Prevention**: Changing a student's name requires one update in `User` table
2. **Insertion Anomaly Prevention**: Can add an exam without first creating all questions (via soft references)
3. **Deletion Anomaly Prevention**: Deleting a student's session doesn't lose student identity (User table preserved)
4. **Storage Efficiency**: No redundant data across thousands of answer records
5. **Query Flexibility**: JOINs allow any combination of entity attributes without duplication

## When Denormalization Might Be Considered

- For analytics dashboards with complex joins (materialized views)
- For high-frequency reads where JOINs are too expensive
- For cached aggregates (exam performance summary)
- **NOT implemented here** - keep normalized, use views for performance
