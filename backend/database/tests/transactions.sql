-- transactions.sql — demonstrate ACID with START TRANSACTION, SAVEPOINT, COMMIT, ROLLBACK
-- Run in mysql client

-- DEMO 1: Successful transaction (commit)
START TRANSACTION;
  INSERT INTO examsession (id, examId, studentId, startedAt, deadlineAt, status, lastActivityAt, createdAt, updatedAt, version)
  VALUES ('demo_sess_1','demo_exam','demo_student', NOW(3), DATE_ADD(NOW(3), INTERVAL 60 MINUTE),'IN_PROGRESS', NOW(3), NOW(3), NOW(3),1);
  SAVEPOINT after_session;
  INSERT INTO examevent (id, sessionId, eventType, timestamp, createdAt) VALUES ('demo_evt_1','demo_sess_1','SESSION_STARTED', NOW(3), NOW(3));
COMMIT;
-- Verify both inserted
-- SELECT * FROM examsession WHERE id='demo_sess_1';
-- SELECT * FROM examevent WHERE sessionId='demo_sess_1';

-- DEMO 2: Failure with rollback (atomicity)
START TRANSACTION;
  INSERT INTO examsession (id, examId, studentId, startedAt, deadlineAt, status, lastActivityAt, createdAt, updatedAt, version)
  VALUES ('demo_sess_2','demo_exam','demo_student2', NOW(3), DATE_ADD(NOW(3), INTERVAL 60 MINUTE),'IN_PROGRESS', NOW(3), NOW(3), NOW(3),1);
  SAVEPOINT before_event;
  -- Force validation failure: invalid event type will error (or manual SIGNAL)
  -- INSERT INTO examevent (id, sessionId, eventType, timestamp) VALUES ('demo_evt_2','demo_sess_2','INVALID_TYPE', NOW(3));
  -- On error, rollback to savepoint then rollback entire tx
  ROLLBACK TO SAVEPOINT before_event;
ROLLBACK;
-- Verify demo_sess_2 not persisted (atomicity)
-- SELECT * FROM examsession WHERE id='demo_sess_2'; -- should be 0

-- DEMO 3: Savepoint partial rollback (answer saved, event failed -> answer persists if desired)
START TRANSACTION;
  INSERT INTO answer (id, sessionId, questionId, answer, firstAnsweredAt, createdAt, updatedAt, version) VALUES ('demo_ans_1','demo_sess_1','demo_q1','A', NOW(3), NOW(3), NOW(3),1);
  SAVEPOINT answer_saved;
  -- Simulate event insertion failure
  -- INSERT INTO examevent (id, sessionId, eventType) VALUES ('bad','demo_sess_1', NULL); -- will fail due to NOT NULL
  -- ROLLBACK TO SAVEPOINT answer_saved; -- would keep answer but discard event
COMMIT;

-- Isolation demo: two concurrent starts (see concurrency.sql)
-- Durability: after COMMIT, data persists even after crash (InnoDB redo log)
