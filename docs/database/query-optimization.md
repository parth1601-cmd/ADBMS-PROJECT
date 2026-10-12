# Query Optimization & EXPLAIN Report

## Workflow
1. Identify slow query (teacher review queue, student dashboard, etc.)
2. Run `EXPLAIN` (and `EXPLAIN ANALYZE` where useful)
3. Note `type: ALL` (full scan) vs `ref`/`range`, `rows`, `Extra: Using filesort`.
4. Add index, re-run EXPLAIN, verify improvement.

## Examples (from `backend/database/tests/indexes.sql`)

### Teacher Review Queue
```sql
EXPLAIN SELECT * FROM integrityreview WHERE status='PENDING' ORDER BY score DESC LIMIT 20;
-- Before: type ALL, rows 500, Extra Using filesort
-- After INDEX (status,score): type ref, rows 20, Extra Using where ; Using index
```

### Student Active Session Check
```sql
EXPLAIN SELECT * FROM examsession WHERE studentId='x' AND examId='y' AND status='IN_PROGRESS';
-- Before: type ALL, rows 5000
-- After UNIQUE (examId,studentId,status): type const, rows 1
```

### Timeline Pagination
```sql
EXPLAIN SELECT * FROM examevent WHERE sessionId='x' ORDER BY createdAt DESC LIMIT 20;
-- Uses (sessionId,createdAt) composite, avoids filesort
```

## Performance Test Dataset
Seed: 55 users, 8 exams, 100+ questions, 11 sessions, 10 reviews, 30+ signals, 20 events. For larger load, use `backend/database/tests/indexes.sql` comments to scale to 100 students / 5000 answers / 20000 events and re-measure dashboard, review queue, timeline, analytics.

## Materialization Consideration
If analytics become expensive (e.g., exam average over thousands of submissions), consider summary table or cached aggregate, but only after measuring. Currently SQL aggregation is fast enough.

## Security: No Raw Interpolation
Use parameterized queries / Prisma-safe. Audit `grep -r "\$queryRawUnsafe.*\${"` should find none with user input interpolation without binding.

## Files
- `backend/database/tests/indexes.sql` — EXPLAIN examples
- `backend/database/views.sql` — optimized reporting via views
- `backend/database/demo_queries.sql` — 10 analytical queries
