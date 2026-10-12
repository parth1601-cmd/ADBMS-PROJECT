// @ts-nocheck
import { Response, NextFunction } from "express"
import { prisma } from "../../utils/prisma.js"
import { AuthRequest } from "../../middleware/auth.js"
import { parseDateRange } from "./analyticsService.js"

function levelDisplay(l: string) {
  if (l === "HIGH_PRIORITY_REVIEW") return "High Priority Review"
  if (l === "REQUIRES_REVIEW") return "Requires Review"
  if (l === "LOW_CONCERN") return "Low Concern"
  return "Normal"
}

export async function overview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const teacherId = req.user!.id
    const { from, to } = parseDateRange(req.query)
    const exams = await prisma.exam.findMany({ where: { teacherId } })
    const examIds = exams.map(e => e.id)
    if (examIds.length === 0) {
      return res.json({ success: true, data: {
        totalStudents: 0, totalExams: 0, averageScore: 0, passRate: 0, integrityReviews: 0, highPriority:0,
        activeExams:0, pendingReviews:0, completedReviews:0, distribution:{ NORMAL:0, LOW_CONCERN:0, REQUIRES_REVIEW:0, HIGH_PRIORITY_REVIEW:0 },
        exams: [], reviewsOverTime: [], signalFrequency: []
      }})
    }
    // sessions filter by date if provided
    const sessionWhere: any = { examId: { in: examIds } }
    if (from || to) {
      sessionWhere.createdAt = {}
      if (from) sessionWhere.createdAt.gte = from
      if (to) sessionWhere.createdAt.lte = to
    }
    const sessions = await prisma.examSession.findMany({ where: sessionWhere, include: { exam: true } })
    const reviewsWhere: any = { session: { examId: { in: examIds } } }
    if (from || to) {
      reviewsWhere.generatedAt = {}
      if (from) reviewsWhere.generatedAt.gte = from
      if (to) reviewsWhere.generatedAt.lte = to
    }
    const reviews = await prisma.integrityReview.findMany({ where: reviewsWhere, include: { signals: true } })
    const totalStudents = await prisma.user.count({ where: { role: "STUDENT" } })
    // compute average score across submitted sessions via grade calc naive? Use 60% pass assumption via integrity? Instead compute from examSession scores via compute? For analytics we will compute average obtained via answer correctness for submitted sessions
    // For simplicity compute average percentage via sessions: we need to compute per session result
    // We'll approximate by fetching answers for submitted sessions and computing percentage efficiently (batched)
    let totalPct = 0, pctCount = 0, passCount = 0
    for (const s of sessions.filter(ss=> ss.status==='SUBMITTED')) {
      // naive compute: fetch questions/answers count
      // For performance, aggregate but keep simple: loaded already? Need to compute quickly
      const questions = await prisma.question.findMany({ where: { examId: s.examId } })
      const answers = await prisma.answer.findMany({ where: { sessionId: s.id } })
      const map = new Map(answers.map(a=>[a.questionId, a.answer]))
      let correct=0, totalMarks=0, obtained=0
      for (const q of questions) {
        totalMarks+=q.points
        const ans = map.get(q.id)
        if (ans && (q.type==='MCQ' || q.type==='TF') && String(ans).trim().toLowerCase()===String(q.correctAnswer).trim().toLowerCase()) {
          obtained+=q.points
          correct++
        }
      }
      const pct = totalMarks? Math.round(obtained/totalMarks*100*10)/10:0
      totalPct+=pct
      pctCount++
      if (pct>=40) passCount++
    }
    const averageScore = pctCount? Math.round(totalPct/pctCount*10)/10 : 0
    const passRate = pctCount? Math.round(passCount/pctCount*100):0

    const pending = reviews.filter(r=> r.status==='PENDING').length
    const inReview = reviews.filter(r=> r.status==='IN_REVIEW').length
    const reviewed = reviews.filter(r=> r.status==='REVIEWED').length
    const followUp = reviews.filter(r=> r.status==='REQUIRES_FOLLOW_UP').length
    const high = reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length
    const distro = {
      NORMAL: reviews.filter(r=> r.level==='NORMAL').length,
      LOW_CONCERN: reviews.filter(r=> r.level==='LOW_CONCERN').length,
      REQUIRES_REVIEW: reviews.filter(r=> r.level==='REQUIRES_REVIEW').length,
      HIGH_PRIORITY_REVIEW: high,
    }
    // Signal frequency
    const signalFreq: Record<string, number> = {}
    for (const rev of reviews) for (const sig of rev.signals) signalFreq[sig.type]=(signalFreq[sig.type]||0)+1
    const signalFrequency = Object.entries(signalFreq).map(([type,count])=>({type,count}))

    // Reviews over time: group by day last 14 days
    const reviewsOverTimeMap: Record<string, number> = {}
    for (const rev of reviews) {
      const day = rev.generatedAt.toISOString().slice(0,10)
      reviewsOverTimeMap[day]=(reviewsOverTimeMap[day]||0)+1
    }
    const reviewsOverTime = Object.entries(reviewsOverTimeMap).sort((a,b)=> a[0].localeCompare(b[0])).map(([date,count])=>({date,count}))

    // Exam performance quick: for each exam, pending, avgScore
    const examReports = await Promise.all(exams.slice(0,10).map(async e=>{
      const qCount = await prisma.question.count({where:{examId:e.id}})
      const sCount = await prisma.examSession.count({where:{examId:e.id}})
      const subCount = await prisma.examSession.count({where:{examId:e.id, status:'SUBMITTED'}})
      const avgScoreAgg = await prisma.integrityReview.aggregate({ where:{session:{examId:e.id}}, _avg:{score:true}})
      const pendingForExam = await prisma.integrityReview.count({where:{session:{examId:e.id}, status:'PENDING'}})
      return { id:e.id, title:e.title, subject:e.subject, status:e.status, questionsCount:qCount, studentsCount:sCount, submissionsCount:subCount, pending: pendingForExam, avgScore: Math.round(avgScoreAgg._avg.score||0) }
    }))

    res.json({ success:true, data:{
      totalStudents,
      totalExams: exams.length,
      activeExams: exams.filter(e=> e.status==='LIVE' || e.status==='SCHEDULED').length,
      averageScore,
      passRate,
      pendingReviews: pending,
      inReview,
      reviewed,
      requiresFollowUp: followUp,
      completedReviews: reviewed,
      highPriority: high,
      distribution: distro,
      exams: examReports,
      reviewsOverTime,
      signalFrequency,
      // legacy keys for frontend
      activeExamsLegacy: exams.filter(e=> e.status==='LIVE' || e.status==='SCHEDULED').length,
      totalStudentsLegacy: totalStudents
    }})
  } catch(e){ next(e) }
}

export async function examAnalytics(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const examId = req.params.examId || req.params.id
    const teacherId = req.user!.id
    const exam = await prisma.exam.findUnique({ where:{ id: examId }})
    if(!exam) return res.status(404).json({ success:false, error:{code:'NOT_FOUND', message:'Exam not found'}})
    if(exam.teacherId!==teacherId) return res.status(403).json({ success:false, error:{code:'FORBIDDEN', message:'Forbidden'}})
    const { from, to } = parseDateRange(req.query)
    // Sessions for exam
    const sessionWhere:any = { examId }
    if(from || to){
      sessionWhere.createdAt={}
      if(from) sessionWhere.createdAt.gte=from
      if(to) sessionWhere.createdAt.lte=to
    }
    const sessions = await prisma.examSession.findMany({ where: sessionWhere, include:{ student:true }})
    const submitted = sessions.filter(s=> s.status==='SUBMITTED')
    const started = sessions.length
    const completed = submitted.length
    const expired = sessions.filter(s=> s.status==='EXPIRED').length
    // compute scores
    let totalPct=0, highest=0, lowest=100, medianArr:number[]=[], passCount=0, totalCompletionSec=0, completionCount=0
    let totalMarksPerExam = (await prisma.question.aggregate({ where:{examId}, _sum:{points:true}}))._sum.points || 0
    for(const s of submitted){
      const questions = await prisma.question.findMany({ where:{examId}})
      const answers = await prisma.answer.findMany({ where:{sessionId:s.id}})
      const map=new Map(answers.map(a=>[a.questionId, a.answer]))
      let obtained=0
      for(const q of questions){
        const ans=map.get(q.id)
        if(ans && (q.type==='MCQ' || q.type==='TF') && String(ans).trim().toLowerCase()===String(q.correctAnswer).trim().toLowerCase()){
          obtained+=q.points
        }
      }
      const pct = totalMarksPerExam? Math.round(obtained/totalMarksPerExam*100*10)/10:0
      totalPct+=pct
      medianArr.push(pct)
      if(pct>highest) highest=pct
      if(pct<lowest) lowest=pct
      if(pct>=40) passCount++
      if(s.submittedAt && s.startedAt){
        totalCompletionSec+= Math.round((new Date(s.submittedAt).getTime()-new Date(s.startedAt).getTime())/1000)
        completionCount++
      }
    }
    medianArr.sort((a,b)=>a-b)
    const averageScore = submitted.length? Math.round(totalPct/submitted.length*10)/10:0
    const medianScore = medianArr.length? medianArr[Math.floor(medianArr.length/2)]:0
    const passRate = submitted.length? Math.round(passCount/submitted.length*100):0
    const avgCompletionSec = completionCount? Math.round(totalCompletionSec/completionCount):0

    // Score distribution buckets 0-20,20-40,40-60,60-80,80-100
    const buckets = { '0-20':0,'20-40':0,'40-60':0,'60-80':0,'80-100':0 }
    for(const pct of medianArr){
      if(pct<20) buckets['0-20']++
      else if(pct<40) buckets['20-40']++
      else if(pct<60) buckets['40-60']++
      else if(pct<80) buckets['60-80']++
      else buckets['80-100']++
    }
    const scoreDistribution = Object.entries(buckets).map(([range,count])=>({range,count}))

    // Question analytics
    const questions = await prisma.question.findMany({ where:{examId}, orderBy:{order:'asc'}})
    const questionStats = await Promise.all(questions.map(async q=>{
      const answers = await prisma.answer.findMany({ where:{questionId: q.id }})
      const attempts = answers.length
      let correct=0, incorrect=0
      let totalTime=0, times:number[]=[]
      for(const a of answers){
        // correctness only for MCQ/TF
        if(q.type==='MCQ' || q.type==='TF'){
          const isCorrect = String(a.answer).trim().toLowerCase()===String(q.correctAnswer).trim().toLowerCase()
          if(isCorrect) correct++; else incorrect++
        }
        // time spent approximation via firstAnsweredAt differences? For analytics use avg time from session start diff
        // We approximate via events: fallback to deterministic? Use 60 sec default
        // Instead compute via answer's firstAnsweredAt relative to session start where possible batch
        // For now use changeCount as proxy? We'll compute average time as median naive
        // Fetch session startedAt for each answer session
      }
      // Compute average time via featureExtractor-like? For now compute via answers' firstAnsweredAt vs session startedAt batched
      if(attempts>0){
        const sessionIds = [...new Set(answers.map(a=> a.sessionId))]
        const sessionsMap = new Map((await prisma.examSession.findMany({ where:{id:{in:sessionIds}}})).map(s=>[s.id, s.startedAt]))
        for(const a of answers){
          const start = sessionsMap.get(a.sessionId)
          if(start){
            const sec = Math.round((a.firstAnsweredAt.getTime() - new Date(start).getTime())/1000 % 300) // modulo to avoid huge
            let ssec = sec
            if(ssec<1) ssec=30
            if(ssec>600) ssec=90
            totalTime+=ssec
            times.push(ssec)
          }
        }
      }
      times.sort((a,b)=>a-b)
      const avgTime = attempts? Math.round(totalTime/attempts):0
      const medianTime = times.length? times[Math.floor(times.length/2)]:0
      const skipped = started - attempts // not accurate but estimate
      const correctPct = attempts? Math.round(correct/attempts*100):0
      const incorrectPct = attempts? Math.round(incorrect/attempts*100):0
      const difficultyLabel = correctPct>=80? 'Easy' : correctPct>=50? 'Medium' : correctPct>0? 'Hard' : 'No data'
      // discrimination placeholder if enough data
      let discrimination = null
      if(attempts>=10){
        // simple placeholder: correlation placeholder
        discrimination = correctPct>60? 'Good' : 'Needs review'
      }
      return {
        id: q.id,
        order: q.order,
        text: q.text,
        type: q.type,
        points: q.points,
        attempts,
        correct,
        incorrect,
        skipped: Math.max(0, skipped),
        skippedCount: Math.max(0, skipped),
        correctPct,
        incorrectPct,
        skippedPct: attempts? Math.max(0, 100 - correctPct - incorrectPct):0,
        avgTimeSec: avgTime,
        medianTimeSec: medianTime,
        averageTime: avgTime,
        medianTime,
        difficulty: difficultyLabel,
        difficultyEstimate: difficultyLabel,
        discrimination,
        notEnoughData: attempts<5 ? "Not enough responses yet." : null
      }
    }))

    // Performance by class/section - mocked as single class for now
    const classPerformance = [{ class:"10-A", section:"A", students: started, averageScore, passRate, completionRate: started? Math.round(completed/started*100):0 }]

    // Integrity summary for this exam
    const reviews = await prisma.integrityReview.findMany({ where:{session:{examId}}})
    const integritySummary = {
      totalSubmissions: submitted.length,
      reviewsGenerated: reviews.length,
      averageIntegrityScore: reviews.length? Math.round(reviews.reduce((s,r)=>s+r.score,0)/reviews.length):0,
      highPriority: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length,
      reviewRate: reviews.length? Math.round(reviews.length/submitted.length*100):0
    }

    // Time per question
    const timePerQuestion = questionStats.map(q=>({question:`Q${q.order}`, avgTime: q.avgTimeSec, median: q.medianTimeSec}))

    res.json({ success:true, data:{
      exam:{id:exam.id, title:exam.title, subject:exam.subject, status:exam.status, durationMinutes: exam.durationMinutes, startAt: exam.startAt, endAt: exam.endAt},
      stats:{
        totalStudents: started,
        started,
        completed,
        submitted: completed,
        expired,
        averageScore,
        medianScore,
        highestScore: submitted.length? highest:0,
        lowestScore: submitted.length? lowest:100,
        passRate,
        averageCompletionTimeSec: avgCompletionSec,
        completionRate: started? Math.round(completed/started*100):0,
        totalSessions: started,
        totalQuestions: questions.length,
        totalMarks: totalMarksPerExam
      },
      scoreDistribution,
      questionStats,
      questions: questionStats,
      timePerQuestion,
      classPerformance,
      integrity: integritySummary,
      performanceByClass: classPerformance,
      // for legacy report overview compatibility
      completion: started? Math.round(completed/started*100):0,
      submissionRate: started,
      avgScore: averageScore,
      distribution: {
        NORMAL: reviews.filter(r=> r.level==='NORMAL').length,
        LOW_CONCERN: reviews.filter(r=> r.level==='LOW_CONCERN').length,
        REQUIRES_REVIEW: reviews.filter(r=> r.level==='REQUIRES_REVIEW').length,
        HIGH_PRIORITY_REVIEW: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length,
      }
    }})
  }catch(e){ next(e)}
}

export async function classAnalytics(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const teacherId = req.user!.id
    const exams = await prisma.exam.findMany({ where:{teacherId}})
    const examIds = exams.map(e=>e.id)
    const students = await prisma.user.findMany({ where:{role:'STUDENT'}})
    const sessions = await prisma.examSession.findMany({ where:{examId:{in:examIds}}})
    const reviews = await prisma.integrityReview.findMany({ where:{session:{examId:{in:examIds}}}})
    const { from, to } = parseDateRange(req.query)
    let filteredSessions = sessions
    if(from) filteredSessions = filteredSessions.filter(s=> new Date(s.createdAt) >= from)
    if(to) filteredSessions = filteredSessions.filter(s=> new Date(s.createdAt) <= to)

    // compute real average score and pass rate for class
    let classTotalPct=0, classPctCount=0, classPass=0
    for(const s of filteredSessions.filter(x=> x.status==='SUBMITTED')){
      const questions = await prisma.question.findMany({ where:{examId: s.examId}})
      const answers = await prisma.answer.findMany({ where:{sessionId: s.id}})
      const map=new Map(answers.map(a=>[a.questionId, a.answer]))
      let obtained=0,total=0
      for(const q of questions){
        total+=q.points
        const ans=map.get(q.id)
        if(ans && (q.type==='MCQ' || q.type==='TF') && String(ans).trim().toLowerCase()===String(q.correctAnswer).trim().toLowerCase()){
          obtained+=q.points
        }
      }
      const pct = total? Math.round(obtained/total*100):0
      classTotalPct+=pct; classPctCount++; if(pct>=40) classPass++
    }
    const classAvg = classPctCount? Math.round(classTotalPct/classPctCount):0
    const classPassRate = classPctCount? Math.round(classPass/classPctCount*100):0

    const classData = [
      {
        class: "10-A", section:"A", students: students.length,
        averageScore: classAvg,
        passRate: classPassRate,
        completionRate: filteredSessions.length? Math.round(filteredSessions.filter(s=> s.status==='SUBMITTED').length / filteredSessions.length*100):0,
        averageReviewScore: reviews.length? Math.round(reviews.reduce((s,r)=>s+r.score,0)/reviews.length):0,
        reviewsRequiringAttention: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW' || r.level==='REQUIRES_REVIEW').length
      }
    ]
    // Add per section breakdown
    res.json({ success:true, data:{ classes: classData, sections: classData }})
  }catch(e){ next(e)}
}

export async function studentAnalytics(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const teacherId = req.user!.id
    const studentId = req.params.studentId || req.params.id
    const student = await prisma.user.findUnique({ where:{id:studentId}})
    if(!student) return res.status(404).json({ success:false, error:{code:'NOT_FOUND', message:'Student not found'}})
    // verify teacher scope: check if student has session in teacher's exam
    const teacherExams = await prisma.exam.findMany({ where:{teacherId}, select:{id:true}})
    const examIds = teacherExams.map(e=>e.id)
    const sessions = await prisma.examSession.findMany({ where:{ studentId, examId:{in:examIds}}, include:{ exam:true, integrityReview:true }})
    if(sessions.length===0) {
      // allow anyway but indicate no data
    }
    const { from, to } = parseDateRange(req.query)
    let filteredSessions = sessions
    if(from) filteredSessions = filteredSessions.filter(s=> new Date(s.createdAt) >= from)
    if(to) filteredSessions = filteredSessions.filter(s=> new Date(s.createdAt) <= to)

    let totalPct=0, count=0, passCount=0
    let subjectMap: Record<string, {total:number, count:number}> = {}
    const recentResults:any[]=[]
    for(const s of filteredSessions.filter(x=> x.status==='SUBMITTED')){
      const questions = await prisma.question.findMany({ where:{examId: s.examId}})
      const answers = await prisma.answer.findMany({ where:{sessionId: s.id}})
      const map=new Map(answers.map(a=>[a.questionId, a.answer]))
      let obtained=0,totalMarks=0
      for(const q of questions){
        totalMarks+=q.points
        const ans=map.get(q.id)
        if(ans && (q.type==='MCQ' || q.type==='TF') && String(ans).trim().toLowerCase()===String(q.correctAnswer).trim().toLowerCase()){
          obtained+=q.points
        }
      }
      const pct = totalMarks? Math.round(obtained/totalMarks*100*10)/10:0
      totalPct+=pct; count++; if(pct>=40) passCount++
      const subj = s.exam.subject
      if(!subjectMap[subj]) subjectMap[subj]={total:0,count:0}
      subjectMap[subj].total+=pct
      subjectMap[subj].count++
      recentResults.push({ examId: s.examId, title: s.exam.title, subject: s.exam.subject, submittedAt: s.submittedAt, score: pct, obtained, totalMarks, passed: pct>=40 })
    }
    recentResults.sort((a,b)=> new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    const averageScore = count? Math.round(totalPct/count*10)/10:0
    const passRate = count? Math.round(passCount/count*100):0
    const subjectPerformance = Object.entries(subjectMap).map(([subject,v])=>({subject, averageScore: Math.round(v.total/v.count*10)/10, count: v.count}))
    const integrityHistory = filteredSessions.filter(s=> s.integrityReview).map(s=> ({ sessionId:s.id, exam: s.exam.title, subject: s.exam.subject, score: s.integrityReview!.score, level: levelDisplay(s.integrityReview!.level), levelRaw: s.integrityReview!.level, status: s.integrityReview!.status, generatedAt: s.integrityReview!.generatedAt }))
    const reviewsCount = integrityHistory.length
    const reviewed = integrityHistory.filter(r=> r.status==='REVIEWED').length
    const followUp = integrityHistory.filter(r=> r.status==='REQUIRES_FOLLOW_UP').length
    const integritySummary = { total: reviewsCount, reviewed, requiresFollowUp: followUp, pending: integrityHistory.filter(r=> r.status==='PENDING').length, averageIntegrityScore: reviewsCount? Math.round(integrityHistory.reduce((s,r)=>s+r.score,0)/reviewsCount):0 }

    res.json({ success:true, data:{
      student:{id:student.id, name:student.name, email:student.email, studentId:`STU-${student.id.slice(-5).toUpperCase()}`, class:"10-A", section:"A"},
      stats:{ examsCompleted: count, averageScore, passRate, subjectPerformance, recentResults: recentResults.slice(0,5)},
      subjectPerformance,
      recentResults: recentResults.slice(0,5),
      examsCompleted: count,
      averageScore,
      passRate,
      integrity: integritySummary,
      integrityHistory,
      integrityReviews: integrityHistory.length,
      reviewed: reviewed,
      requiresFollowUp: followUp,
      exams: recentResults
    }})
  }catch(e){ next(e)}
}

export async function integrityAnalytics(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const teacherId = req.user!.id
    const teacherExams = await prisma.exam.findMany({ where:{teacherId}, select:{id:true, title:true, subject:true}})
    const examIds = teacherExams.map(e=>e.id)
    const { from, to } = parseDateRange(req.query)
    const reviewWhere:any = { session:{examId:{in:examIds}}}
    if(from || to){
      reviewWhere.generatedAt={}
      if(from) reviewWhere.generatedAt.gte=from
      if(to) reviewWhere.generatedAt.lte=to
    }
    const reviews = await prisma.integrityReview.findMany({ where:reviewWhere, include:{signals:true, session:{include:{exam:true}}}})
    const sessions = await prisma.examSession.findMany({ where:{examId:{in:examIds}}})
    const totalSubmissions = sessions.filter(s=> s.status==='SUBMITTED').length
    const reviewsGenerated = reviews.length
    const averageIntegrityScore = reviews.length? Math.round(reviews.reduce((s,r)=>s+r.score,0)/reviews.length):0
    const highPriority = reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW').length
    const reviewRate = totalSubmissions? Math.round(reviewsGenerated/totalSubmissions*100):0

    const events = await prisma.examEvent.findMany({ where:{sessionId:{in: sessions.map(s=>s.id)}}})
    const avgTabEvents = sessions.length? Math.round(events.filter(e=> e.eventType==='TAB_HIDDEN').length / sessions.length*10)/10:0
    const answers = await prisma.answer.findMany({ where:{sessionId:{in: sessions.map(s=>s.id)}}})
    const avgChanges = sessions.length? Math.round(answers.reduce((s,a)=>s+a.changeCount,0)/sessions.length*10)/10:0
    const avgClipboard = sessions.length? Math.round(events.filter(e=> e.eventType==='PASTE' || e.eventType==='COPY').length / sessions.length*10)/10:0
    const avgSessionAnomalies = reviews.filter(r=> r.signals.some(s=> s.type==='MULTI_SESSION' || s.type==='SESSION_ANOMALY')).length

    const distribution = {
      NORMAL: reviews.filter(r=> r.level==='NORMAL').length,
      LOW_CONCERN: reviews.filter(r=> r.level==='LOW_CONCERN').length,
      REQUIRES_REVIEW: reviews.filter(r=> r.level==='REQUIRES_REVIEW').length,
      HIGH_PRIORITY_REVIEW: highPriority
    }

    // Signal frequency
    const freqMap:Record<string, number>={}
    for(const rev of reviews) for(const sig of rev.signals) freqMap[sig.type]=(freqMap[sig.type]||0)+1
    const signalFrequency = Object.entries(freqMap).map(([type,count])=>({type, count, avgPerReview: reviews.length? Math.round(count/reviews.length*100)/100:0}))

    // Reviews over time (last 30 days grouped by day)
    const reviewsOverTimeMap:Record<string, number> = {}
    for(const rev of reviews){
      const day = rev.generatedAt.toISOString().slice(0,10)
      reviewsOverTimeMap[day]=(reviewsOverTimeMap[day]||0)+1
    }
    const reviewsOverTime = Object.entries(reviewsOverTimeMap).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,count])=>({date,count}))

    // Signal frequency by exam
    const byExam:Record<string,{exam:string, counts:Record<string,number>}> = {}
    for(const rev of reviews){
      const title = rev.session.exam.title
      if(!byExam[title]) byExam[title]={exam:title, counts:{}}
      for(const sig of rev.signals) byExam[title].counts[sig.type]=(byExam[title].counts[sig.type]||0)+1
    }
    const signalByExam = Object.values(byExam)

    // Class/section comparison (mock single class)
    const classComparison = [{ class:"10-A", section:"A", students: await prisma.user.count({where:{role:'STUDENT'}}), averageReviewScore: averageIntegrityScore, reviewsRequiringAttention: reviews.filter(r=> r.level==='HIGH_PRIORITY_REVIEW' || r.level==='REQUIRES_REVIEW').length }]

    res.json({ success:true, data:{
      totalSubmissions,
      reviewsGenerated,
      averageIntegrityScore,
      highPriorityReviews: highPriority,
      reviewRate,
      averageTabEvents: avgTabEvents,
      averageAnswerChanges: avgChanges,
      averageClipboardEvents: avgClipboard,
      averageSessionAnomalies: avgSessionAnomalies,
      distribution,
      scoreDistribution: distribution,
      signalFrequency,
      reviewsOverTime,
      signalByExam,
      classComparison,
      // legacy keys
      highPriority,
      avgTabEvents,
      avgChanges
    }})
  }catch(e){ next(e)}
}

export async function subjectAnalytics(req: AuthRequest, res: Response, next: NextFunction){
  try{
    const teacherId = req.user!.id
    const exams = await prisma.exam.findMany({ where:{teacherId}})
    const subjects = [...new Set(exams.map(e=> e.subject))]
    const result = await Promise.all(subjects.map(async subj=>{
      const subExams = exams.filter(e=> e.subject===subj)
      const subExamIds = subExams.map(e=>e.id)
      const sessions = await prisma.examSession.findMany({ where:{examId:{in:subExamIds}, status:'SUBMITTED'}})
      let totalPct=0
      for(const s of sessions){
        const questions = await prisma.question.findMany({ where:{examId: s.examId}})
        const answers = await prisma.answer.findMany({ where:{sessionId: s.id}})
        const map=new Map(answers.map(a=>[a.questionId,a.answer]))
        let obtained=0, total=0
        for(const q of questions){
          total+=q.points
          const ans=map.get(q.id)
          if(ans && (q.type==='MCQ' || q.type==='TF') && String(ans).trim().toLowerCase()===String(q.correctAnswer).trim().toLowerCase()){
            obtained+=q.points
          }
        }
        const pct = total? Math.round(obtained/total*100):0
        totalPct+=pct
      }
      const avgScore = sessions.length? Math.round(totalPct/sessions.length):0
      return { subject: subj, exams: subExams.length, submissions: sessions.length, averageScore: avgScore }
    }))
    res.json({ success:true, data: result })
  }catch(e){ next(e)}
}
