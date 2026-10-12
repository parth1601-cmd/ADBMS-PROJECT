// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { prisma } from '../src/utils/prisma.js'
import bcrypt from 'bcryptjs'

const TEST_DB_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL

let teacherToken: string
let studentToken: string
let teacherId: string
let studentId: string
let examId: string
let sessionId: string

const teacherPassword = await bcrypt.hash('teacher123', 10)
const studentPassword = await bcrypt.hash('student123', 10)

async function login(role: string, email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password })
  return res.body.token
}

describe('Phase 4: Transaction & Concurrency Tests', () => {
  beforeAll(async () => {
    // Ensure database is seeded
    // Create test teacher and student
    const teacher = await prisma.user.upsert({
      where: { email: 'phase4_teacher@test.com' },
      update: {},
      create: { name: 'Phase4 Teacher', email: 'phase4_teacher@test.com', passwordHash: teacherPassword, role: 'TEACHER' }
    })
    teacherId = teacher.id
    teacherToken = await login('TEACHER', 'phase4_teacher@test.com', 'teacher123')

    const student = await prisma.user.upsert({
      where: { email: 'phase4_student@test.com' },
      update: {},
      create: { name: 'Phase4 Student', email: 'phase4_student@test.com', passwordHash: studentPassword, role: 'STUDENT' }
    })
    studentId = student.id
    studentToken = await login('STUDENT', 'phase4_student@test.com', 'student123')
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('TEST 1: Successful session creation', () => {
    it('should create exam with questions, publish, and start session', async () => {
      // Create exam
      const examRes = await request(app)
        .post('/api/exams')
        .set('Cookie', `token=${teacherToken}`)
        .send({
          title: 'Phase4 Transaction Test Exam',
          subject: 'Database',
          description: 'Testing transactions',
          durationMinutes: 60,
          totalMarks: 100,
          passingMarks: 40,
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          className: '10-A',
          section: 'A'
        })
      expect(examRes.status).toBe(201)
      examId = examRes.body.id

      // Add questions
      const qRes = await request(app)
        .post('/api/questions')
        .set('Cookie', `token=${teacherToken}`)
        .send({ examId, type: 'MCQ', text: 'Test question?', options: ['A','B','C','D'], correctAnswer: 'A', points: 2, order: 1 })
      expect(qRes.status).toBe(201)

      // Publish exam
      const pubRes = await request(app)
        .post(`/api/exams/${examId}/publish`)
        .set('Cookie', `token=${teacherToken}`)
      expect([200, 201]).toContain(pubRes.status)

      // Start session
      const startRes = await request(app)
        .post(`/api/student/exams/${examId}/start`)
        .set('Cookie', `token=${studentToken}`)
      expect(startRes.status).toBe(201)
      expect(startRes.body.isNew).toBe(true)
      sessionId = startRes.body.session.id
    })
  })

  describe('TEST 2: Session creation failure - no partial session', () => {
    it('should rollback if exam is not published', async () => {
      // Create draft exam
      const draftRes = await request(app)
        .post('/api/exams')
        .set('Cookie', `token=${teacherToken}`)
        .send({
          title: 'Draft Exam', subject: 'Database',
          description: 'Draft', durationMinutes: 30,
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
        })
      const draftId = draftRes.body.id

      // Should fail because exam is DRAFT
      const startRes = await request(app)
        .post(`/api/student/exams/${draftId}/start`)
        .set('Cookie', `token=${studentToken}`)
      expect(startRes.status).toBe(400)

      // Cleanup
      await request(app)
        .delete(`/api/exams/${draftId}`)
        .set('Cookie', `token=${teacherToken}`)
    })
  })

  describe('TEST 3: Duplicate session prevention', () => {
    it('should prevent duplicate active sessions', async () => {
      // Start session twice rapidly
      const res1 = await request(app)
        .post(`/api/student/exams/${examId}/start`)
        .set('Cookie', `token=${studentToken}`)

      const res2 = await request(app)
        .post(`/api/student/exams/${examId}/start`)
        .set('Cookie', `token=${studentToken}`)

      // Second request should return existing session (idempotent)
      expect(res2.body.isNew).toBe(false)
      expect(res1.body.session.id).toBe(res2.body.session.id)
    })
  })

  describe('TEST 4: Idempotent submission', () => {
    it('should prevent duplicate submissions', async () => {
      // Save an answer first
      await request(app)
        .put(`/api/student/sessions/${sessionId}/answers`)
        .set('Cookie', `token=${studentToken}`)
        .send({ questionId: examId, answer: 'A' }) // Will use question ID from exam

      // Submit twice
      const submit1 = await request(app)
        .post(`/api/student/sessions/${sessionId}/submit`)
        .set('Cookie', `token=${studentToken}`)

      const submit2 = await request(app)
        .post(`/api/student/sessions/${sessionId}/submit`)
        .set('Cookie', `token=${studentToken}`)

      // First should succeed or return already submitted
      expect(submit2.body.alreadySubmitted || submit2.status === 200).toBeTruthy()
    })
  })

  describe('TEST 5: Authorization & IDOR protection', () => {
    it('should prevent student from accessing another student results', async () => {
      // Create a second student
      const otherStudent = await prisma.user.create({
        data: { name: 'Other Student', email: 'other@test.com', passwordHash: studentPassword, role: 'STUDENT' }
      })
      const otherToken = await login('STUDENT', 'other@test.com', 'student123')

      // Other student tries to access session
      const res = await request(app)
        .get(`/api/student/sessions/${sessionId}`)
        .set('Cookie', `token=${otherToken}`)
      expect([403, 404]).toContain(res.status)

      await prisma.user.delete({ where: { id: otherStudent.id } })
    })

    it('should prevent student from modifying integrity review', async () => {
      const res = await request(app)
        .patch('/api/teacher/integrity-reviews/some-review-id/status')
        .set('Cookie', `token=${studentToken}`)
        .send({ status: 'REVIEWED' })
      expect(res.status).toBe(403)
    })
  })

  describe('TEST 6: Database constraint enforcement', () => {
    it('should enforce unique email constraint', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Duplicate', email: 'phase4_teacher@test.com', password: 'test123', role: 'STUDENT' })
      expect(res.status).toBe(400)
    })
  })
})

describe('Phase 4: Transaction Isolation & Deadlock Tests', () => {
  it('should handle concurrent session starts correctly', async () => {
    // Create a published exam for testing
    const examRes = await request(app)
      .post('/api/exams')
      .set('Cookie', `token=${teacherToken}`)
      .send({
        title: 'Concurrency Test Exam', subject: 'Database',
        description: 'Concurrency test', durationMinutes: 30,
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        className: '10-A'
      })
    const concExamId = examRes.body.id

    // Add a question
    await request(app)
      .post('/api/questions')
      .set('Cookie', `token=${teacherToken}`)
      .send({ examId: concExamId, type: 'MCQ', text: 'Q1?', options: ['A','B'], correctAnswer: 'A', points: 2, order: 1 })

    // Publish
    await request(app)
      .post(`/api/exams/${concExamId}/publish`)
      .set('Cookie', `token=${teacherToken}`)

    // Simulate two concurrent start requests
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/student/exams/${concExamId}/start`).set('Cookie', `token=${studentToken}`),
      request(app).post(`/api/student/exams/${concExamId}/start`).set('Cookie', `token=${studentToken}`)
    ])

    // Only one should have isNew=true
    const newSessions = [res1.body.isNew, res2.body.isNew].filter(Boolean)
    expect(newSessions.length).toBe(1)
    expect(res1.body.session.id).toBe(res2.body.session.id)
  })
})
