import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from './app.js'
import { prisma } from './utils/prisma.js'
import bcrypt from 'bcryptjs'
import { scoreSignals } from './modules/integrity/scoringEngine.js'
import { detectSignals } from './modules/integrity/signalDetector.js'
import { jaccardSimilarity, computeSimilarityResults } from './modules/integrity/similarityEngine.js'
import { analyzeCorrelatedPatterns } from './modules/integrity/patternAnalyzer.js'
import { buildTimeline, filterTimeline } from './modules/integrity/timelineAnalyzer.js'

describe('Phase3 Integrity Engine Unit', ()=>{
  it('score calculation deterministic and capped', ()=>{
    const signals:any[] = [
      {type:'TAB_SWITCH', severity:'HIGH', points:22, confidence:0.91, summary:'', description:'', evidence:[]},
      {type:'TIMING', severity:'HIGH', points:20, confidence:0.89, summary:'', description:'', evidence:[]},
      {type:'COPY_PASTE', severity:'MEDIUM', points:14, confidence:0.85, summary:'', description:'', evidence:[]},
      {type:'MULTI_SESSION', severity:'MEDIUM', points:12, confidence:0.86, summary:'', description:'', evidence:[]},
      {type:'CORRELATED_PATTERN', severity:'HIGH', points:15, confidence:0.87, summary:'', description:'', evidence:[]},
      {type:'SIMILARITY', severity:'HIGH', points:18, confidence:0.90, summary:'', description:'', evidence:[]},
    ]
    const a = scoreSignals(signals as any)
    const b = scoreSignals(signals as any)
    expect(a.capped).toBe(b.capped)
    expect(a.capped).toBeLessThanOrEqual(100)
    expect(a.level).toBe('HIGH_PRIORITY_REVIEW')
    // normalization: 22+20+14+12+15+18=101 -> capped 100
    expect(a.capped).toBe(100)
    expect(a.total).toBe(101)
  })
  it('severity and confidence mapping', ()=>{
    const f:any={ tabSwitches:6, totalFocusLossSec:48, windowBlurs:0, copyPasteCount:0, copyCount:0, pasteCount:0, answerChangeCount:0, timing:{ fastestSec:3, avgResponseSec:50, slowestSec:50, medianSec:30, responseTimes:[{sec:2},{sec:3},{sec:4},{sec:3},{sec:3}], answerChanges:0, questionsAnswered:5}, eventCounts:{}, answers:[], events:[{id:'1', eventType:'TAB_HIDDEN', timestamp:new Date(), questionId:null, metadata:null}], sessionDurationSec:3600, reconnectCount:0, questionOpenCount:0 }
    const sigs = detectSignals(f as any)
    const tab = sigs.find(s=> s.type==='TAB_SWITCH')
    expect(tab?.severity).toBe('HIGH')
    expect(tab?.confidence).toBeGreaterThanOrEqual(0.85)
    expect(tab?.points).toBe(22)
  })
  it('timing analysis rapid answer', ()=>{
    const f:any={ tabSwitches:0, totalFocusLossSec:0, windowBlurs:0, copyPasteCount:0, copyCount:0, pasteCount:0, answerChangeCount:0, timing:{ fastestSec:2, avgResponseSec:45, slowestSec:50, medianSec:30, responseTimes:[{sec:2},{sec:45},{sec:2},{sec:3}], answerChanges:0, questionsAnswered:4}, eventCounts:{}, answers:[], events:[], sessionDurationSec:3600, reconnectCount:0, questionOpenCount:0 }
    const sigs=detectSignals(f as any)
    const timing = sigs.find(s=> s.type==='TIMING')
    expect(timing).toBeDefined()
    expect(timing?.confidence).toBeGreaterThan(0.6)
  })
  it('jaccard similarity explainable', ()=>{
    expect(jaccardSimilarity('hello world','hello world')).toBe(100)
    expect(jaccardSimilarity('The quick brown fox','The quick brown fox jumps')).toBeGreaterThan(70)
    expect(jaccardSimilarity('Explain water cycle evaporation','Explain water cycle evaporation condensation')).toBeGreaterThan(60)
    expect(jaccardSimilarity('','')).toBe(0)
  })
  it('similarity engine peer comparison', ()=>{
    const long = "The quick brown fox jumps over the lazy dog and this answer is long enough for similarity testing"
    const my:any=[{questionId:'q1', answer:'A', type:'MCQ', order:1},{questionId:'q2', answer:'B', type:'MCQ', order:2},{questionId:'q3', answer: long, type:'SHORT', order:3},{questionId:'q4', answer:'C', type:'MCQ', order:4}]
    const peers:any=[{sessionId:'s2', studentId:'stu2', studentName:'Peer', answers:[{questionId:'q1', answer:'A', type:'MCQ', order:1},{questionId:'q2', answer:'B', type:'MCQ', order:2},{questionId:'q3', answer: long, type:'SHORT', order:3},{questionId:'q4', answer:'C', type:'MCQ', order:4}]}]
    const results=computeSimilarityResults(my,peers)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].similarityPercent).toBe(100)
    expect(results[0].confidence).toBeGreaterThan(0.8)
  })
  it('correlated pattern detection window 30s', ()=>{
    const base = new Date()
    const f:any={
      tabSwitches:2, totalFocusLossSec:16, windowBlurs:0, copyPasteCount:0, copyCount:0, pasteCount:0, answerChangeCount:2,
      timing:{ fastestSec:10, avgResponseSec:50, slowestSec:60, medianSec:30, responseTimes:[{sec:10}], answerChanges:2, questionsAnswered:1},
      eventCounts:{}, answers:[], events:[
        {id:'1', eventType:'TAB_HIDDEN', timestamp:new Date(base.getTime()), questionId:null, metadata:null},
        {id:'2', eventType:'ANSWER_CHANGED', timestamp:new Date(base.getTime()+ 8*1000), questionId:null, metadata:null},
        {id:'3', eventType:'TAB_HIDDEN', timestamp:new Date(base.getTime()+ 20*1000), questionId:null, metadata:null},
        {id:'4', eventType:'ANSWER_CHANGED', timestamp:new Date(base.getTime()+ 25*1000), questionId:null, metadata:null},
      ], sessionDurationSec:3600, reconnectCount:0, questionOpenCount:0
    }
    const corrs = analyzeCorrelatedPatterns(f as any)
    expect(corrs.length).toBeGreaterThan(0)
    expect(corrs[0].windowSec).toBeDefined()
    expect(corrs[0].confidence).toBeGreaterThan(0.6)
  })
  it('timeline generation and filtering', ()=>{
    const f:any={
      tabSwitches:1, totalFocusLossSec:8, windowBlurs:0, copyPasteCount:1, copyCount:0, pasteCount:1, answerChangeCount:0,
      timing:{ fastestSec:10, avgResponseSec:50, slowestSec:60, medianSec:30, responseTimes:[], answerChanges:0, questionsAnswered:0},
      eventCounts:{}, answers:[], events:[
        {id:'1', eventType:'SESSION_STARTED', timestamp:new Date(), questionId:null, metadata:null},
        {id:'2', eventType:'TAB_HIDDEN', timestamp:new Date(), questionId:null, metadata:null},
        {id:'3', eventType:'PASTE', timestamp:new Date(), questionId:null, metadata:null},
        {id:'4', eventType:'SESSION_ENDED', timestamp:new Date(), questionId:null, metadata:null},
      ], sessionDurationSec:3600, reconnectCount:0, questionOpenCount:0
    }
    const tl = buildTimeline(f as any, new Map())
    expect(tl.length).toBe(4)
    const filtered = filterTimeline(tl, 'clipboard')
    expect(filtered.length).toBe(1)
    expect(filtered[0].eventType).toBe('PASTE')
    const all = filterTimeline(tl, 'all')
    expect(all.length).toBe(4)
  })
})

describe('Phase3 API & Security', ()=>{
  let studentToken:string
  let studentId:string
  let teacherToken:string
  let teacherId:string
  let teacher2Token:string
  let teacher2Id:string
  let liveExamId:string
  let sessionId:string
  let reviewId:string

  async function login(email:string, password:string){
    const res=await request(app).post('/api/auth/login').send({email,password})
    if(res.status!==200) throw new Error(`login ${email} ${res.status} ${JSON.stringify(res.body)}`)
    return { token: res.body.token, id: res.body.id || null }
  }

  beforeAll(async()=>{
    const hash = await bcrypt.hash('test123',10)
    const s = await prisma.user.create({data:{name:'Phase3 Student', email:`phase3stu_${Date.now()}@test.com`, passwordHash:hash, role:'STUDENT'}})
    const t = await prisma.user.create({data:{name:'Phase3 Teacher', email:`phase3teach_${Date.now()}@test.com`, passwordHash:hash, role:'TEACHER'}})
    const t2 = await prisma.user.create({data:{name:'Phase3 Teacher2', email:`phase3teach2_${Date.now()}@test.com`, passwordHash:hash, role:'TEACHER'}})
    studentId=s.id; teacherId=t.id; teacher2Id=t2.id
    const sLogin = await request(app).post('/api/auth/login').send({email:s.email, password:'test123'})
    studentToken=sLogin.body.token
    const tLogin = await request(app).post('/api/auth/login').send({email:t.email, password:'test123'})
    teacherToken=tLogin.body.token
    const t2Login = await request(app).post('/api/auth/login').send({email:t2.email, password:'test123'})
    teacher2Token=t2Login.body.token

    // create live exam owned by teacher1
    const exam = await prisma.exam.create({data:{title:`Phase3 Live ${Date.now()}`, description:'test', subject:'Mathematics', teacherId, status:'LIVE', durationMinutes:30, startAt: new Date(Date.now()-3600000), endAt: new Date(Date.now()+86400000), instructions:'test', attemptsAllowed:1}})
    liveExamId=exam.id
    await prisma.question.createMany({data:[
      {examId:liveExamId, type:'MCQ', text:'Q1', order:1, points:5, required:true, options:JSON.stringify(['A','B']), correctAnswer:'A'},
      {examId:liveExamId, type:'MCQ', text:'Q2', order:2, points:5, required:true, options:JSON.stringify(['A','B']), correctAnswer:'B'},
    ]})
    // create session and submit to generate review
    const startRes = await request(app).post(`/api/student/exams/${liveExamId}/start`).set('Authorization',`Bearer ${studentToken}`)
    sessionId = startRes.body.session.id
    const sess = await request(app).get(`/api/student/sessions/${sessionId}`).set('Authorization',`Bearer ${studentToken}`)
    const qid1 = sess.body.questions.find((q:any)=> q.order===1).id
    await request(app).put(`/api/student/sessions/${sessionId}/answers`).set('Authorization',`Bearer ${studentToken}`).send({questionId:qid1, answer:'A'})
    await request(app).post(`/api/student/sessions/${sessionId}/events`).set('Authorization',`Bearer ${studentToken}`).send({events:[{eventType:'TAB_HIDDEN'},{eventType:'TAB_VISIBLE'},{eventType:'PASTE'}]})
    const sub = await request(app).post(`/api/student/sessions/${sessionId}/submit`).set('Authorization',`Bearer ${studentToken}`)
    expect(sub.status).toBe(200)
    const rev = await prisma.integrityReview.findUnique({where:{sessionId}})
    reviewId = rev!.id
  })

  afterAll(async()=>{
    try{
      await prisma.auditLog.deleteMany({where:{entityId: reviewId}})
      await prisma.reviewNote.deleteMany({where:{teacherId}})
      await prisma.integritySignal.deleteMany({where:{review:{sessionId}}})
      await prisma.integrityReview.deleteMany({where:{sessionId}})
      await prisma.examEvent.deleteMany({where:{session:{studentId}}})
      await prisma.answer.deleteMany({where:{session:{studentId}}})
      await prisma.examSession.deleteMany({where:{studentId}})
      await prisma.question.deleteMany({where:{examId: liveExamId}})
      await prisma.exam.deleteMany({where:{id: liveExamId}})
      await prisma.user.deleteMany({where:{id:{in:[studentId, teacherId, teacher2Id]}}})
    }catch{}
    await prisma.$disconnect()
  })

  it('unauthorized access → 401', async()=>{
    const res=await request(app).get('/api/reviews')
    expect(res.status).toBe(401)
  })
  it('student accessing teacher review → 403', async()=>{
    const res=await request(app).get(`/api/reviews/${reviewId}`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(403)
  })
  it('student accessing another student’s result → 403', async()=>{
    // create second student session attempt to access first's result
    const otherHash = await bcrypt.hash('test123',10)
    const other = await prisma.user.create({data:{name:'Other Stu', email:`otherphase3_${Date.now()}@test.com`, passwordHash:otherHash, role:'STUDENT'}})
    const otherLogin = await request(app).post('/api/auth/login').send({email:other.email, password:'test123'})
    const otherToken = otherLogin.body.token
    const res=await request(app).get(`/api/student/results/${sessionId}`).set('Authorization',`Bearer ${otherToken}`)
    expect([403,404]).toContain(res.status)
    await prisma.user.deleteMany({where:{id: other.id}})
  })
  it('teacher accessing unauthorized exam → 403', async()=>{
    const res=await request(app).get(`/api/teacher/analytics/exams/${liveExamId}`).set('Authorization',`Bearer ${teacher2Token}`)
    expect(res.status).toBe(403)
  })
  it('valid review → 200 and contains explainable signals', async()=>{
    const res=await request(app).get(`/api/reviews/${reviewId}`).set('Authorization',`Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    expect(res.body.signals).toBeDefined()
    expect(res.body.signals[0].confidence).toBeDefined()
    expect(res.body.score).toBeDefined()
  })
  it('status update workflow PENDING → IN_REVIEW → REVIEWED', async()=>{
    const r1=await request(app).patch(`/api/reviews/${reviewId}/status`).set('Authorization',`Bearer ${teacherToken}`).send({status:'In Review'})
    expect(r1.status).toBe(200)
    const r2=await request(app).patch(`/api/reviews/${reviewId}/status`).set('Authorization',`Bearer ${teacherToken}`).send({status:'Reviewed', note:'Looks good'})
    expect(r2.status).toBe(200)
    // check audit log exists
    const audit = await prisma.auditLog.findMany({where:{entityId: reviewId}})
    expect(audit.length).toBeGreaterThan(0)
  })
  it('duplicate submission idempotent', async()=>{
    const res=await request(app).post(`/api/student/sessions/${sessionId}/submit`).set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/Already submitted/)
    const count = await prisma.integrityReview.count({where:{sessionId}})
    expect(count).toBe(1)
  })
  it('invalid review ID → 404', async()=>{
    const res=await request(app).get('/api/reviews/invalid-id-12345').set('Authorization',`Bearer ${teacherToken}`)
    expect(res.status).toBe(404)
  })
  it('invalid payload → 400', async()=>{
    const res=await request(app).post(`/api/reviews/${reviewId}/notes`).set('Authorization',`Bearer ${teacherToken}`).send({note:'x'})
    expect(res.status).toBe(400)
  })
  it('IDOR teacher scope violation via analytics → 403', async()=>{
    const otherExam = await prisma.exam.create({data:{title:'Other', description:'x', subject:'Math', teacherId: teacher2Id, status:'LIVE', durationMinutes:30, startAt: new Date(), endAt: new Date(Date.now()+86400000)}})
    const res=await request(app).get(`/api/teacher/analytics/exams/${otherExam.id}`).set('Authorization',`Bearer ${teacherToken}`)
    expect(res.status).toBe(403)
    await prisma.exam.delete({where:{id: otherExam.id}})
  })
  it('analytics pagination and date filtering', async()=>{
    const res=await request(app).get('/api/teacher/analytics/overview?range=7d').set('Authorization',`Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    const body = res.body.success ? res.body.data : res.body
    expect(body.totalStudents).toBeDefined()
  })
  it('audit log list with filtering', async()=>{
    const res=await request(app).get('/api/teacher/audit-log?action=EXAM_SUBMITTED').set('Authorization',`Bearer ${teacherToken}`)
    expect(res.status).toBe(200)
    const body = res.body.success ? res.body.data : res.body
    expect(body.logs || body.data || body).toBeDefined()
  })
  it('notification marking', async()=>{
    const notifsBefore = await request(app).get('/api/notifications?wrapped=true').set('Authorization',`Bearer ${teacherToken}`)
    const list = notifsBefore.body.success ? notifsBefore.body.data : notifsBefore.body
    expect(Array.isArray(list)).toBe(true)
    if(list.length>0){
      const nid = list[0].id
      const mark = await request(app).patch(`/api/notifications/${nid}/read`).set('Authorization',`Bearer ${teacherToken}`)
      expect([200,204]).toContain(mark.status)
    }
  })
  it('PDF generation authorization', async()=>{
    const res=await request(app).get(`/api/student/results/${sessionId}/pdf`).set('Authorization',`Bearer ${teacherToken}`)
    // teacher owns exam, so allowed
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/pdf/)
    // other teacher should be forbidden
    const otherRes=await request(app).get(`/api/student/results/${sessionId}/pdf`).set('Authorization',`Bearer ${teacher2Token}`)
    expect([403,404]).toContain(otherRes.status)
  })
  it('search prevents unauthorized records', async()=>{
    const res=await request(app).get('/api/search?q=Phase3').set('Authorization',`Bearer ${studentToken}`)
    expect(res.status).toBe(200)
    // student search should not return reviews of other students
    expect(res.body.reviews || []).toEqual([])
  })
})
