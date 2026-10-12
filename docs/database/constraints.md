# Constraints & Validation

## Multi-level Validation
- Frontend: Zod + UI hints
- API: Zod schemas (`validators/schemas.ts`) + business rule checks (service layer) + AppError 400/409
- Database: PK/FK/UNIQUE/NOT NULL/CHECK/INDEX + triggers

Never rely only on frontend.

## CHECK via Triggers + Native CHECK
- durationMinutes >0
- totalMarks >=0, passingMarks >=0, passing <= total
- points >=0, `order` >0
- score 0-100

MySQL 8 triggers enforce with SIGNAL SQLSTATE '45000'.

## Business Rule Validation (Backend)
- Draft/unpublished/expired/ ineligible student cannot start.
- Submitted session cannot receive answers / resubmit.
- Student cannot modify marks, integrity score, review status.
- Teacher cannot access unauthorized exam data (ownership check).

See `backend/database/tests/constraints.sql`.

## Mass Assignment Protection
Never `update(req.body)`. Controllers explicitly pick allowed fields (examController create/update, review note, etc.).

## DTO Layer
Never return raw Prisma models. DTOs strip sensitive fields (correctAnswer hidden for IN_PROGRESS students, passwordHash never returned, teacher notes hidden from students).

## Input Sanitization
Zod strips unknown keys, validates lengths, enum values, JSON metadata size limit (2000 chars), prevents XSS payloads.

## Null Handling Examples
- submittedAt NULL while IN_PROGRESS → query `WHERE submittedAt IS NULL`
- reviewedAt NULL until REVIEWED → don't replace with "N/A"
- assignedReviewerId NULL if unassigned → proper left join handling
