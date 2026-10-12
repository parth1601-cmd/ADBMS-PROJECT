import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from './app.js'
import { prisma } from './utils/prisma.js'
import bcrypt from 'bcryptjs'

let studentToken:string
let studentId:string
let teacherToken:string
let teacherId:string
let liveExamId:string
let upcomingExamId:string
let draftExamId:string

async function login(email:string, password:string){
  const res=await request(app).post('/api/auth/login').send({email,password})
  if(res.status!==200) throw new Error(`login ${email} ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.token as string
}

beforeAll(async ()=>{
  // create isolated test users
  const phash=await bcrypt.hash('test123',10)
  const s=await prisma.user.create({data:{name:'Test Student', email:`phase2student_${Date.now()}@test.com`, passwordHash:phash, role:'STUDENT'}})
  const t=await prisma.user.create({data:{name:'Test Teacher', email:`phase2teacher_${Date.now()}@test.com`, passwordHash:phash, role:'TEACHER'}})
  studentId=s.id
  teacherId=t.id
  studentToken=await login(s.email,'test123')
  teacherToken=await login(t.email,'test123')
  // create live exam within window
  const live=await prisma.exam.create({data:{title:`Phase2 Live ${Date.now()}`, description:'test', subject:'Mathematics', teacherId, status:'LIVE', durationMinutes:30, startAt: new Date(Date.now()-3600000), endAt: new Date(Date.now()+86400000), instructions:'test', attemptsAllowed:1}})
  liveExamId=live.id
  await prisma.question.createMany({data:[
    {examId:liveExamId, type:'MCQ', text:'Q1', order:1, points:5, required:true, options:JSON.stringify(['A','B']), correctAnswer:'A'},
    {examId:liveExamId, type:'MCQ', text:'Q2', order:2, points:5, required:true, options:JSON.stringify(['A','B']), correctAnswer:'B'},
  ]})
  const upcoming=await prisma.exam.create({data:{title:`Phase2 Upcoming ${Date.now()}`, description:'test', subject:'Physics', teacherId, status:'SCHEDULED', durationMinutes:30, startAt: new Date(Date.now()+86400000), endAt: new Date(Date.now()+ 2*86400000), instructions:'test', attemptsAllowed:1}})
  upcomingExamId=upcoming.id
  await prisma.question.create({data:{examId:upcomingExamId, type:'MCQ', text:'Q1', order:1, points:5, required:true, options:JSON.stringify(['A','B']), correctAnswer:'A'}})
  const draft=await prisma.exam.create({data:{title:`Phase2 Draft ${Date.now()}`, description:'test', subject:'Science', teacherId, status:'DRAFT', durationMinutes:30, startAt: new Date(Date.now()+86400000), endAt: new Date(Date.now()+ 2*86400000), instructions:'test', attemptsAllowed:1}})
  draftExamId=draft.id
})

afterAll(async ()=>{
  // cleanup
  try{
    await prisma.reviewNote.deleteMany({where:{teacherId}})
    await prisma.integritySignal.deleteMany({where:{review:{session:{studentId}}}})
    await prisma.integrityReview.deleteMany({where:{session:{studentId}}})
    await prisma.examEvent.deleteMany({where:{session:{studentId}}})
    await prisma.answer.deleteMany({where:{session:{studentId}}})
    await prisma.examSession.deleteMany({where:{studentId}})
    await prisma.question.deleteMany({where:{examId:{in:[liveExamId, upcomingExamId, draftExamId]}}})
    await prisma.exam.deleteMany({where:{id:{in:[liveExamId, upcomingExamId, draftExamId]}}})
    await prisma.user.deleteMany({where:{id:{in:[studentId, teacherId]}}})
  }catch{}
  await prisma.$disconnect()
})

describe('Phase2 Student Authentication & Authorization', ()=>{
  it('student login works', async ()=>{
    const res=await request(app).post('/api/auth/login').send({email:'aarav.sharma@example.com', password:'student123'})
    expect(res.status).toBe(200)
    expect(res.body.role).toBe('STUDENT')
  })
  it('student cannot access teacher-only POST /api/exams', async ()=>{
    const res=await request(app).post('/api/exams').set('Authorization',`Bearer ${studentToken}`).send({title:'Hack', description:'x', subject:'Math', durationMinutes:30})
    expect(res.status).toBe(403)
  })
  it('student route requires auth', async ()=>{
    const res=await request(app).get('/api/student/dashboard')
    expect(res.status).toBe(401)
  })
  it('teacher cannot access student dashboard', async ()=>{
    const res=await request(app).get('/api/student/dashboard').set('Authorization',`Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
  })
})

describe('Test visibility', ()=>{
  it('published live exam returned in /student/exams', async ()=>{
    const res=await request(app).get('/api/student/exams').set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    const found=res.body.find((e:any)=> e.id===liveExamId)
    expect(found).toBeDefined()
  })
  it('draft exam excluded', async ()=>{
    const res=await request(app).get('/api/student/exams').set('Authorization',`Bearer ${studentToken}`)
    const found=res.body.find((e:any)=> e.id===draftExamId)
    expect(found).toBeUndefined()
  })
  it('upcoming exam excluded from available but appears in upcoming', async ()=>{
    const up=await request(app).get('/api/student/exams/upcoming').set('Authorization',`Bearer ${studentToken}`)
    expect(up.status).toBe(200)
    expect(up.body.find((e:any)=> e.id===upcomingExamId)).toBeDefined()
    const av=await request(app).get('/api/student/exams').set('Authorization',`Bearer ${studentToken}`)
    // draft excluded already, but upcoming should be in list with available false
    const upcomingInList=av.body.find((e:any)=> e.id===upcomingExamId)
    if(upcomingInList) expect(upcomingInList.available).toBe(false)
  })
})

describe('Session', ()=>{
  let sessionId:string
  it('creates session', async ()=>{
    const res=await request(app).post(`/api/student/exams/${liveExamId}/start`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(201)
    expect(res.body.session.id).toBeDefined()
    sessionId=res.body.session.id
    expect(res.body.session.deadlineAt).toBeDefined()
  })
  it('reuses existing session', async ()=>{
    const res=await request(app).post(`/api/student/exams/${liveExamId}/start`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.session.id).toBe(sessionId)
    expect(res.body.isNew).toBe(false)
  })
  it('session ownership enforced', async ()=>{
    const otherToken=await login('ananya.patel@example.com','student123')
    const res=await request(app).get(`/api/student/sessions/${sessionId}`).set('Authorization',`Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })
  it('timer/deadline present', async ()=>{
    const res=await request(app).get(`/api/student/sessions/${sessionId}`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.deadlineAt).toBeDefined()
    expect(typeof res.body.remainingSec).toBe('number')
    expect(res.body.remainingSec).toBeGreaterThan(0)
  })
  it('cannot start upcoming early', async ()=>{
    const res=await request(app).post(`/api/student/exams/${upcomingExamId}/start`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/not started|available/i)
  })
})

describe('Answers', ()=>{
  let sid:string
  let qid:string
  beforeAll(async ()=>{
    // get session id
    const r=await request(app).post(`/api/student/exams/${liveExamId}/start`).set('Authorization',`Bearer ${studentToken}`)
    sid=r.body.session.id
    const sess=await request(app).get(`/api/student/sessions/${sid}`).set('Authorization',`Bearer ${studentToken}`)
    qid=sess.body.questions[0].id
  })
  it('save answer', async ()=>{
    const res=await request(app).put(`/api/student/sessions/${sid}/answers`).set('Authorization',`Bearer ${studentToken}`).send({questionId:qid, answer:'A'})
    expect(res.status).toBe(200)
    expect(res.body.answer).toBe('A')
  })
  it('update answer increments changeCount', async ()=>{
    const res=await request(app).put(`/api/student/sessions/${sid}/answers`).set('Authorization',`Bearer ${studentToken}`).send({questionId:qid, answer:'B'})
    expect(res.status).toBe(200)
    expect(res.body.changeCount).toBeGreaterThan(0)
  })
  it('unauthorized session rejected', async ()=>{
    const otherToken=await login('ananya.patel@example.com','student123')
    const res=await request(app).put(`/api/student/sessions/${sid}/answers`).set('Authorization',`Bearer ${otherToken}`).send({questionId:qid, answer:'A'})
    expect(res.status).toBe(403)
  })
})

describe('Submission & Result & PDF', ()=>{
  let sid2:string
  let qid1:string, qid2:string
  beforeAll(async ()=>{
    // create fresh exam for submission scoring test
    const ex=await prisma.exam.create({data:{title:`Submit Test ${Date.now()}`, description:'test', subject:'Math', teacherId, status:'LIVE', durationMinutes:60, startAt: new Date(Date.now()-3600000), endAt: new Date(Date.now()+86400000), instructions:'test', attemptsAllowed:1}})
    liveExamId=ex.id // reuse var but need to keep
    await prisma.question.createMany({data:[
      {examId: ex.id, type:'MCQ', text:'Q1', order:1, points:10, required:true, options:JSON.stringify(['A','B']), correctAnswer:'A'},
      {examId: ex.id, type:'MCQ', text:'Q2', order:2, points:10, required:true, options:JSON.stringify(['A','B']), correctAnswer:'B'},
      {examId: ex.id, type:'SHORT', text:'Q3 short', order:3, points:5, required:true, options:null, correctAnswer:'sample'},
    ]})
    const r=await request(app).post(`/api/student/exams/${ex.id}/start`).set('Authorization',`Bearer ${studentToken}`)
    sid2=r.body.session.id
    const sess=await request(app).get(`/api/student/sessions/${sid2}`).set('Authorization',`Bearer ${studentToken}`)
    qid1=sess.body.questions.find((q:any)=> q.order===1).id
    qid2=sess.body.questions.find((q:any)=> q.order===2).id
    // answer one correct, one incorrect
    await request(app).put(`/api/student/sessions/${sid2}/answers`).set('Authorization',`Bearer ${studentToken}`).send({questionId:qid1, answer:'A'}) // correct
    await request(app).put(`/api/student/sessions/${sid2}/answers`).set('Authorization',`Bearer ${studentToken}`).send({questionId:qid2, answer:'A'}) // incorrect (correct B)
  })
  it('correct score', async ()=>{
    const sub=await request(app).post(`/api/student/sessions/${sid2}/submit`).set('Authorization',`Bearer ${studentToken}`)
    expect(sub.status).toBe(200)
    expect(sub.body.result).toBeDefined()
    expect(sub.body.result.obtained).toBe(10) // only Q1 correct 10, Q2 incorrect 0, Q3 short not auto scored
    expect(sub.body.result.percentage).toBeCloseTo(40,0) // 10/25=40%
  })
  it('duplicate submission idempotent', async ()=>{
    const sub2=await request(app).post(`/api/student/sessions/${sid2}/submit`).set('Authorization',`Bearer ${studentToken}`)
    expect(sub2.status).toBe(200)
    expect(sub2.body.message).toMatch(/Already submitted/)
  })
  it('integrity review generated', async ()=>{
    const rev=await prisma.integrityReview.findUnique({where:{sessionId:sid2}})
    expect(rev).not.toBeNull()
    expect(rev!.score).toBeGreaterThanOrEqual(0)
  })
  it('PDF generated for correct student', async ()=>{
    const res=await request(app).get(`/api/student/results/${sid2}/pdf`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
    expect(res.body.length || res.headers['content-length']).toBeTruthy()
  })
  it('PDF unauthorized rejected', async ()=>{
    const otherToken=await login('ananya.patel@example.com','student123')
    const res=await request(app).get(`/api/student/results/${sid2}/pdf`).set('Authorization',`Bearer ${otherToken}`)
    expect(res.status).toBe(403)
  })
  it('PDF contains reportId deterministic', async ()=>{
    const r1=await request(app).get(`/api/student/results/${sid2}/pdf`).set('Authorization',`Bearer ${studentToken}`)
    const r2=await request(app).get(`/api/student/results/${sid2}/pdf`).set('Authorization',`Bearer ${studentToken}`)
    expect(r1.headers['content-disposition']).toBe(r2.headers['content-disposition'])
  })
})

describe('Data leak prevention', ()=>{
  it('student exam payload should not contain correctAnswer for IN_PROGRESS', async ()=>{
    // create new in-progress session
    const ex=await prisma.exam.findFirst({where:{status:'LIVE'}})
    if(!ex) return
    const fresh=await prisma.exam.create({data:{title:`Leak Test ${Date.now()}`, description:'test', subject:'Math', teacherId, status:'LIVE', durationMinutes:30, startAt: new Date(Date.now()-3600000), endAt: new Date(Date.now()+86400000), instructions:'test', attemptsAllowed:5}})
    await prisma.question.create({data:{examId: fresh.id, type:'MCQ', text:'Q', order:1, points:5, required:true, options:JSON.stringify(['A','B']), correctAnswer:'A'}})
    const r=await request(app).post(`/api/student/exams/${fresh.id}/start`).set('Authorization',`Bearer ${studentToken}`)
    const sid=r.body.session.id
    const sess=await request(app).get(`/api/student/sessions/${sid}`).set('Authorization',`Bearer ${studentToken}`)
    expect(sess.body.questions[0].correctAnswer).toBeUndefined()
    // cleanup
    await prisma.examSession.deleteMany({where:{id:sid}})
    await prisma.question.deleteMany({where:{examId: fresh.id}})
    await prisma.exam.delete({where:{id: fresh.id}})
  })
})
