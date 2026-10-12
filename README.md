# ExamGuard — Exam Integrity Review System

> **Exam integrity, built for fair review.**  
> ExamGuard combines multiple exam-related behavioral signals to help educators identify unusual activity and prioritize cases for *human* review.  
> **ExamGuard does not automatically determine whether a student cheated.** Every score is a review-priority indicator, not a verdict.

## Product Concept
Technology assists teachers — it does not replace human judgment. Signals identify unusual behavior; teachers make the final judgment.

**Signals:** tab switching / focus changes, unusual answer timing, rapid answer changes, copy/paste events, answer-pattern similarity, subjective answer similarity, multiple active sessions.

**Integrity Review Score 0–100:**
- `0–29` Normal
- `30–59` Low Concern
- `60–79` Requires Review
- `80–100` High Priority Review

Score is capped at 100, explainable, deterministic, and threshold-configurable. Never use language like "Cheater detected" — use "Requires Review", "Potential Anomaly", "Integrity Signal".

## Features (Phase 3 — Integrity Intelligence)
- **Teacher Portal:** auth, exam CRUD, question authoring (MCQ/TF/Short, reorder/publish), student directory, submissions, **advanced integrity review queue** (PENDING/IN_REVIEW/REVIEWED/REQUIRES_FOLLOW_UP/DISMISSED + score ranges 0-29/30-59/60-79/80-100 + subject/class/date/search + pagination/sorting), **investigation workspace** (header, score card with signal contribution, explainable signals with confidence, correlated patterns, timeline with filter + intensity chart, question-by-question analysis, answer similarity with Jaccard, student comparison, session info, notes with edit, assignment, audit history, PDF generation), **analytics** (overview, exam performance, question difficulty, integrity trends, class/section comparison, student analytics, subject analytics, date range filtering), **audit log** (actor/action/entity + search), **notifications** (bell + dropdown + mark read), reports & settings.
- **Student Portal:** auth, dashboard, exam list (Upcoming/Available/Completed), instructions + integrity notice (“signals are indicators for review, not proof”), real exam session with server-authoritative timer, autosave + local recovery warning, event tracking, submission with automatic integrity analysis, results & profile, integrity report with neutral language, PDF download.
- **Integrity Engine (Phase 3):** deterministic, explainable, auditable — `featureExtractor → signalDetector (with confidence) → scoringEngine (capped 100, breakdown) → similarityEngine (Jaccard + objective overlap) → patternAnalyzer (correlated TAB→CHANGE within 5/10/30/60s windows) → timelineAnalyzer → reviewGenerator (transaction-safe, idempotent)` — no Math.random() for business logic. Store event metadata only, never private clipboard contents.

## Tech Stack
- **Frontend:** React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 3, Recharts, Lucide React
- **Backend:** Node.js, Express 5, TypeScript, Zod validation, cookie + JWT auth, bcryptjs, PDFKit 0.20 — layered architecture Controller→Service→Repository→Prisma→MySQL, DTOs, transaction wrapper, optimistic concurrency
- **Database:** Prisma 6 with **MySQL 8** (`mysql` provider, `utf8mb4_unicode_ci`, strict SQL mode) — normalized 3NF, FKs (RESTRICT/CASCADE/SET_NULL documented), UNIQUE/NOT NULL/CHECK/DEFAULT/INDEX/COMPOSITE INDEX, views, stored functions/procedures, triggers, EXPLAIN-optimized — indexes for exam/teacher/status, session/student/exam/status, answer/session/question, event/session/type, review/score/status, audit/actor, notification/user+read
- **Testing:** Vitest 5 (unit), Supertest 7 (API), Playwright-ready (E2E) — deterministic, no Math.random() for business logic
- **MySQL Local:** `127.0.0.1:3307` via custom mysqld (`C:/Users/Parth/AppData/Local/Temp/opencode/mysql_data`), prod `3306`

## Architecture
```
UI → API Client (services/api) → REST API → Controller → Service → Prisma → SQLite/PostgreSQL
ExamSession → Events+Answers → FeatureExtractor → SignalDetector (confidence) → ScoringEngine (capped 100, explainable breakdown) → SimilarityEngine (Jaccard) → PatternAnalyzer (correlated 5/10/30/60s) → TimelineAnalyzer → ReviewGenerator → IntegrityReview (transaction, idempotent)
        ↓
   Analytics (overview/exam/question/student/class/integrity with date filtering) + AuditLog + Notifications + Reports (PDF)
```
> **Integrity philosophy:** “ExamGuard provides review-priority signals and does not automatically determine misconduct.” Signals indicate patterns that may require human review — not proof. UI explicitly states this near integrity analytics and review pages, with legitimate explanations acknowledged (accidental tab switching, accessibility tools, network reconnects, etc.). Final experience is professional, calm, transparent, privacy-conscious, evidence-based — not punitive.

## Phase 3 Routes & APIs
**Teacher Integrity & Analytics:**
- `GET /api/teacher/integrity-reviews?page&limit&search&status&scoreFilter&subject&sortBy&from&to` — paginated, filtered, sorted queue (also `GET /api/reviews` legacy)
- `GET /api/teacher/integrity-reviews/:reviewId` — detail workspace (header + score + signals + timeline + question analysis + similarity + session + notes + audit)
- `GET /api/teacher/integrity-reviews/:reviewId/timeline?filter=all|session|tab|question|answer|clipboard|system`
- `GET /api/teacher/integrity-reviews/:reviewId/similarity` — answer overlap with Jaccard details
- `PATCH /api/teacher/integrity-reviews/:reviewId/status` {status: PENDING|IN_REVIEW|REVIEWED|REQUIRES_FOLLOW_UP|DISMISSED, note?}
- `PATCH /api/teacher/integrity-reviews/:reviewId/assign` {assignedReviewerId}
- `POST /api/teacher/integrity-reviews/:reviewId/notes` / `PATCH .../notes/:noteId`
- `GET /api/teacher/integrity-reviews/:reviewId/audit` — audit history
- `GET /api/teacher/analytics/overview?range=today|7d|30d|month|year|custom&from&to`
- `GET /api/teacher/analytics/exams/:examId`
- `GET /api/teacher/analytics/classes` / `GET /api/teacher/analytics/students/:studentId` / `GET /api/teacher/analytics/integrity` / `GET /api/teacher/analytics/subjects`
- `GET /api/teacher/audit-log?page&limit&search&action&actor&entity&from&to`
- `GET /api/teacher/reports/student/:sessionId` (PDF), `GET /api/teacher/reports/integrity/:reviewId` (PDF), `GET /api/teacher/reports/exam/:examId` (PDF) — structured, paginated, with reportId `EG-YYYY-XXXXXX` persisted deterministically
- `GET /api/notifications?wrapped=true&limit` / `PATCH /api/notifications/:id/read` / `POST /api/notifications/read-all` (also `POST /api/notifications/read` legacy)
- `GET /api/search?q=` — teacher scoped to own exams/students/reviews, student limited
- Security: rate limiting on login/register/session start/answer save/submit/report/search, IDOR checks, transaction safety, idempotent submission, timer server-authoritative, DTOs strip sensitive fields, Zod validation, no secrets committed.

## Folder Structure
```
/
├── src/                    # frontend
│   ├── components/ui/      # Button, Card, Badge, Avatar, Modal, Tabs, etc.
│   ├── layouts/            # TeacherLayout, StudentLayout
│   ├── pages/landing/      # LandingPage
│   ├── pages/teacher/      # Dashboard, Exams, ExamDetail, Questions, Students, ReviewQueue, ReviewDetail, Reports, Settings
│   ├── pages/student/      # Dashboard, Exams, Instructions, TakeExam, Submitted, Results, Profile
│   ├── pages/auth/         # Login, Register
│   ├── services/           # api.ts, apiServices.ts (real), index.ts (mock fallback)
│   ├── context/            # AuthContext
│   ├── data/               # mockStudents (40 Indian), mockQuestions (30 for e1), mockReviews
│   └── types/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # SQLite dev, PostgreSQL prod comment
│   │   └── seed.ts         # deterministic Indian seed
│   └── src/
│       ├── controllers/    # auth, exam, question, student, review, report, search, notification, user
│       ├── routes/
│       ├── middleware/     # auth, errorHandler
│       ├── validators/     # Zod schemas
│       ├── analysis/       # featureExtractor, signalDetector, scoringEngine, reviewGenerator
│       └── server.ts
└── README.md
```

## Database Schema Overview
- **User** (id, name, email, passwordHash, role TEACHER/STUDENT)
- **Exam** (id, teacherId, title, subject, status DRAFT/SCHEDULED/LIVE/COMPLETED, durationMinutes, startAt/endAt, instructions)
- **Question** (id, examId, type MCQ/TF/SHORT, text, order, points, required, options JSON, correctAnswer)
- **ExamSession** (id, examId, studentId, startedAt, submittedAt, status IN_PROGRESS/SUBMITTED/EXPIRED, lastActivityAt)
- **Answer** (id, sessionId, questionId, answer, firstAnsweredAt, lastChangedAt, changeCount)
- **ExamEvent** (id, sessionId, eventType TAB_HIDDEN/TAB_VISIBLE/QUESTION_ANSWERED/ANSWER_CHANGED/COPY/PASTE/SESSION_STARTED/ENDED, timestamp, metadata, questionId)
- **IntegrityReview** (id, sessionId unique, score, level, status PENDING/REVIEWED, generatedAt, reviewedAt, reviewedBy)
- **IntegritySignal** (id, reviewId, type TAB_SWITCH/TIMING/RAPID_CHANGE/COPY_PASTE/SIMILARITY/SUBJECTIVE_SIMILARITY/MULTI_SESSION, severity LOW/MEDIUM/HIGH, points, description, evidence JSON)
- **ReviewNote** (id, reviewId, teacherId, note)
- **Notification** (id, userId, title, message, read)

All relations have FKs, indexes, unique constraints (examId+order, sessionId+questionId, sessionId unique for review).

## Environment Setup
Create `backend/.env` from `backend/.env.example`:

```env
# SQLite dev
DATABASE_URL="file:./dev.db"
# For production PostgreSQL:
# DATABASE_URL="postgresql://user:password@localhost:5432/examguard"
JWT_SECRET="change-this-to-a-long-random-secret-32+chars"
PORT=4000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

Frontend env (optional) — `/.env`:
```env
VITE_API_URL=http://localhost:4000/api
```

## PostgreSQL Setup (production)
```bash
# change provider in backend/prisma/schema.prisma to postgresql
# set DATABASE_URL to postgres connection string
```

## Prisma Migration & Seed
```bash
cd backend
npx prisma db push      # or: npx prisma migrate dev --name init  (for postgres)
npx prisma generate
npm run seed            # seeds 12 teachers, 40 students, 5 exams, 30+questions for e1, sessions, events, reviews
# verify
npx prisma studio       # optional GUI
```

## Backend Startup
```bash
cd backend
npm install
npm run build           # tsc
npm run dev             # tsx watch src/server.ts  → http://localhost:4000
# or
npm start               # node dist/server.js
# health
curl http://localhost:4000/api/health
```

## Frontend Startup
```bash
# root
npm install
npm run dev             # vite → http://localhost:5173
npm run build
npm run preview
```

## Testing
```bash
cd backend
npm test                # vitest run — scoring engine, signal detection, determinism
# E2E manual flow:
# 1. Teacher login → Dashboard → Create Exam → Add Questions → Publish
# 2. Student login → My Exams → Instructions → Start → answer + visibility events → Submit → review generated
# 3. Teacher → Review Queue → Review Detail → add note → mark reviewed
```

## Authentication
- `POST /api/auth/register` {name,email,password,role}
- `POST /api/auth/login` {email,password} → sets httpOnly cookie + returns token
- `POST /api/auth/logout`
- `GET /api/auth/me` (protected)
- JWT in httpOnly cookie + Authorization Bearer fallback, 7d expiry, bcrypt hashed passwords.
- RBAC: `TEACHER` vs `STUDENT`, ownership checks on every resource (exam.teacherId, session.studentId, question.exam.teacherId, review.session.exam.teacherId). Correct answers stripped for students. IDOR prevented by server-side verification.

## Integrity Analysis
Deterministic rules in `backend/src/analysis/`:
- **Tab switching:** count TAB_HIDDEN; ≥6 HIGH (22pts), ≥4 MEDIUM (18), ≥2 LOW (10)
- **Timing:** fast responses ≤5s; ≥5 HIGH (20), ≥3 MEDIUM (16), ≥1 LOW (9)
- **Rapid changes:** sum changeCount; ≥6 MEDIUM (8-14), ≥4 MEDIUM (12), 1-2 LOW (5)
- **Copy/paste:** count PASTE/COPY; ≥3 MEDIUM (14), ≥2 MEDIUM (14), 1 LOW (10)
- **Similarity:** compare MCQ overlap with peers; ≥85% HIGH (18), ≥75% MEDIUM (15), ≥70% LOW (10)
- **Subjective:** Jaccard on token sets for SHORT answers >20 chars; ≥80% MEDIUM (14)
- **Multi-session:** overlapping sessions → MEDIUM (12)
- **Scoring:** sum points capped 100 → level thresholds 0/30/60/80.

Same data → same score. No Math.random() for business logic.

## Privacy Principles
- Only exam-scoped events (focus, answer, timing, clipboard *relevant*). No browsing history, no arbitrary clipboard contents, no unrelated app monitoring, no device fingerprinting.
- UI messaging: "Signals identify unusual behavior. Teachers make the final judgment."

## Security Considerations
- Passwords hashed (bcryptjs), never plaintext.
- HttpOnly cookies, sameSite lax, CORS credentials.
- Zod validation on all inputs.
- Authorization on every endpoint; never trust IDs from frontend.
- Rate limiting ready (add middleware), event batch size 1–100, submission idempotent, duplicate review prevention.
- XSS/CSRF mitigations via httpOnly + CORS allowlist + input sanitization.

## Demo Accounts (seeded)
- **Teacher:** `teacher@examguard.demo` / `demo123` (also `priyanka.sharma@examguard.demo` etc)
- **Students:** `aarav.sharma@example.com` / `student123` (all 40 Indian students use `student123`)
- **Demo students:** `student1@examguard.demo` / `student123`, `student2@examguard.demo`, `student3@examguard.demo`
- Do not hardcode credentials in frontend; they are seeded via `backend/prisma/seed.ts`.

## Phase 4 — MySQL, Transactions & Reliability (NEW)
**Database:** MySQL 8 strict mode, Prisma `mysql` provider, `DATABASE_URL=mysql://examguard:examguard_pwd_2026@127.0.0.1:3307/examguard` (local custom MySQL), normalized 3NF (separate User/Exam/Question/QuestionOption/ExamSession/Answer/ExamEvent/IntegrityReview/Signal/ReviewNote/Notification/AuditLog/Report/ExamEligibility), PK/FK per relationship, UNIQUE/NOT NULL/CHECK/DEFAULT/INDEX/COMPOSITE INDEX, NULL handling correct, soft delete via deletedAt, views (Student_Exam_Summary, Exam_Performance_Summary, Integrity_Review_Summary, Teacher_Exam_Dashboard_View, Student_Performance_Summary, Exam_Score_Summary), stored functions (GetStudentAverageScore, GetStudentExamCount, GetExamPassRate, GetExamAverageScore), stored procedures (CreateExamSession, RecordExamEvent, FinalizeExamSession, GenerateExamSummary, UpdateReviewStatus), triggers (exam marks/points/score checks), EXPLAIN-analyzed indexes.

**Backend:** Service layer (examService, sessionService, answerService, submissionService, scoringService, integrityService, analyticsService, databaseHealthService) + Repository layer (exam/session/answer/event/review/audit/analytics) + DTOs (StudentExamDTO, StudentSessionDTO, StudentResultDTO) + transaction utility (`withTransaction` with isolation levels `ReadCommitted`/`RepeatableRead`/`Serializable`, `SELECT ... FOR UPDATE`, deadlock retry with deterministic backoff, SAVEPOINT demo via SQL) + server-time authoritative deadlines + idempotent submission + optimistic concurrency (version) + status machines (Exam/Session/Review).

**Security:** RBAC + IDOR prevention (ownership checks), Zod validation + CHECK constraints + mass-assignment protection, DTO stripping (correctAnswer hidden for IN_PROGRESS), rate limiting, security headers (helmet-like), CORS allowlist, input sanitization.

**Testing & Reliability:** `backend/src/phase4.test.ts` covers transactions (commit/rollback), duplicate active session, double submit, constraints, NULL handling, publish validation, views/functions/procedures, health endpoints. Concurrency tested via parallel `Promise.all` starts. Health: `GET /api/health` (app+DB), `GET /api/ready`, `GET /api/admin/database/health` (14 checks).

**Docs:** `docs/database/{schema,relationships,normalization,indexes,transactions,views,functions,procedures,constraints,query-optimization,er}.md` + `backend/database/{views,functions,procedures,triggers,indexes}.sql` + `database/tests/*.sql` + `backend/database/tests/*.sql` + `backend/database/demo_queries.sql`.

**Run MySQL Phase 4:**
```bash
# 1. Start custom MySQL (if not running) on 3307 (data dir in %TEMP%/opencode/mysql_data)
# Already running via scripts; else:
# mysqld --defaults-file="%TEMP%/opencode/my3307.ini"
# 2. Backend
cd backend
# .env already points to mysql://examguard:examguard_pwd_2026@127.0.0.1:3307/examguard
npx prisma db push
npx prisma generate
npm run seed
npm run db:validate
npm test
npm run build
npm run dev
```

## Known Limitations
- MySQL locally via custom 3307 instance; prod 3306.
- No real email, no advanced proctoring, no ML.
- Reports use SQL aggregation + views; no S3 export yet.
- Notifications basic (in DB, fetched via `/api/notifications`).

## Future Improvements
- PostgreSQL + Prisma Migrate in CI, Redis for rate limiting, S3 for attachments, WebSocket for live proctoring, Playwright E2E, pagination for large tables.

## How to Run Full E2E Demo
1. `cd backend && npm run seed && npm run dev` (terminal 1)
2. `npm run dev` (root, terminal 2)
3. Open http://localhost:5173 → Teacher Demo → login `teacher@examguard.demo / demo123` → Dashboard → Exams → Mathematics Midterm → verify 30 questions → Students → Reviews → open Aarav Sharma 78 → view signals/timeline → Add Note → Mark Reviewed.
4. Switch to Student: logout → login `karan.malhotra@example.com / student123` → My Exams → Mathematics Midterm → Instructions → Start → answer 2 Q, change tab (triggers TAB_HIDDEN), paste, submit → review generated → teacher sees new Karan review.
#   A D B M S - P R O J E C T  
 