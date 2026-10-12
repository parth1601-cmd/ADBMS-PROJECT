import { api } from './api'
import type { Exam } from '@/types'

// Safe query builder: filters out undefined/null/"undefined"/"null"/empty values
function buildQuery(params?: Record<string, any>): string {
  if (!params) return ''
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    if (s === '' || s === 'undefined' || s === 'null') continue
    filtered[k] = s
  }
  return new URLSearchParams(filtered).toString()
}

// Helpers to map backend to frontend types
function mapExam(e:any): Exam {
  return {
    id:e.id,
    title:e.title,
    subject:e.subject,
    description:e.description || '',
    status: e.status as any,
    durationMinutes: e.durationMinutes,
    questionsCount: e.questionsCount ?? 0,
    studentsCount: e.studentsCount ?? 0,
    submissionsCount: e.submissionsCount ?? 0,
    pendingReviews: e.pendingReviews ?? 0,
    startDate: e.startAt ? (typeof e.startAt==='string'? e.startAt.slice(0,10): new Date(e.startAt).toISOString().slice(0,10)) : e.startDate || '',
    endDate: e.endAt ? (typeof e.endAt==='string'? e.endAt.slice(0,10): new Date(e.endAt).toISOString().slice(0,10)) : e.endDate || '',
    instructions: e.instructions || '',
    attempts: e.attemptsAllowed || 1,
  }
}

export const examApi = {
  async getExams(params?: {search?:string, status?:string}): Promise<Exam[]>{
    const q = new URLSearchParams()
    if(params?.search) q.set('search', params.search)
    if(params?.status) q.set('status', params.status)
    const data = await api.get<any[]>(`/exams?${q.toString()}`)
    return data.map(mapExam)
  },
  async getExamById(id:string): Promise<Exam | null>{
    try{
      const e = await api.get<any>(`/exams/${id}`)
      return mapExam(e)
    }catch{ return null }
  },
  async createExam(payload: Partial<Exam>): Promise<Exam>{
    const body:any = {
      title: payload.title,
      description: payload.description,
      subject: payload.subject,
      durationMinutes: payload.durationMinutes,
      startAt: payload.startDate || null,
      endAt: payload.endDate || null,
      instructions: payload.instructions,
      attemptsAllowed: payload.attempts,
      status: (payload.status || 'Draft').toUpperCase()
    }
    const e = await api.post<any>('/exams', body)
    return mapExam({ ...e, questionsCount:0, studentsCount:0, submissionsCount:0, pendingReviews:0 })
  },
  async updateExam(id:string, payload: Partial<Exam>): Promise<Exam>{
    const body:any = {}
    if(payload.title) body.title=payload.title
    if(payload.description) body.description=payload.description
    if(payload.subject) body.subject=payload.subject
    if(payload.durationMinutes) body.durationMinutes=payload.durationMinutes
    if(payload.startDate) body.startAt=payload.startDate
    if(payload.endDate) body.endAt=payload.endDate
    if(payload.instructions) body.instructions=payload.instructions
    if(payload.status) body.status=payload.status.toUpperCase()
    const e = await api.patch<any>(`/exams/${id}`, body)
    return mapExam(e)
  },
  async publishExam(id:string){
    const e = await api.post<any>(`/exams/${id}/publish`, {})
    return e
  },
  async deleteExam(id:string){
    await api.del(`/exams/${id}`)
  }
}

export const questionApi = {
  async getQuestions(examId:string){
    const qs = await api.get<any[]>(`/exams/${examId}/questions`)
    return qs.map((q:any)=> ({
      id:q.id, examId:q.examId, type: q.type.toLowerCase() as any, text:q.text, options: q.options || undefined, correctAnswer: q.correctAnswer, points:q.points, required:q.required, order:q.order
    }))
  },
  async createQuestion(examId:string, payload:any){
    const body:any = {
      type: payload.type.toUpperCase(),
      text: payload.text,
      points: payload.points,
      required: payload.required,
      options: payload.options,
      correctAnswer: payload.correctAnswer,
      order: payload.order
    }
    return await api.post(`/exams/${examId}/questions`, body)
  },
  async updateQuestion(id:string, payload:any){
    const body:any={}
    if(payload.type) body.type=payload.type.toUpperCase()
    if(payload.text) body.text=payload.text
    if(payload.points) body.points=payload.points
    if(payload.required!==undefined) body.required=payload.required
    if(payload.options) body.options=payload.options
    if(payload.correctAnswer) body.correctAnswer=payload.correctAnswer
    if(payload.order) body.order=payload.order
    return await api.patch(`/questions/${id}`, body)
  },
  async deleteQuestion(id:string){
    await api.del(`/questions/${id}`)
  },
  async reorder(examId:string, order:string[]){
    await api.post(`/exams/${examId}/questions/reorder`, {order})
  }
}

export const reviewApi = {
  async getReviews(params?: {examId?:string, status?:string, search?:string, signalType?:string, page?:number, limit?:number, scoreFilter?:string, sortBy?:string, sortOrder?:string, subject?:string, from?:string, to?:string}){
    const q=new URLSearchParams()
    if(params?.examId) q.set('examId', params.examId)
    if(params?.status) q.set('status', params.status)
    if(params?.search) q.set('search', params.search)
    if(params?.signalType) q.set('signalType', params.signalType)
    if(params?.page) q.set('page', String(params.page))
    if(params?.limit) q.set('limit', String(params.limit))
    if(params?.scoreFilter) q.set('scoreFilter', params.scoreFilter)
    if(params?.sortBy) q.set('sortBy', params.sortBy)
    if(params?.sortOrder) q.set('sortOrder', params.sortOrder)
    if(params?.subject) q.set('subject', params.subject)
    if(params?.from) q.set('dateFrom', params.from)
    if(params?.to) q.set('dateTo', params.to)
    // Try teacher integrity-reviews alias first, fallback to legacy
    try{
      const res = await api.get<any>(`/teacher/integrity-reviews?${q.toString()}`)
      // backend may return wrapped {success,data:{reviews}} or plain array
      if(Array.isArray(res)) return res
      if(res?.data?.reviews) return res.data.reviews
      if(res?.data && Array.isArray(res.data)) return res.data
      return res
    }catch{
      const data = await api.get<any[]>(`/reviews?${q.toString()}`)
      return data
    }
  },
  async getReviewsPaginated(params?: {examId?:string, status?:string, search?:string, signalType?:string, page?:number, limit?:number, scoreFilter?:string, sortBy?:string, sortOrder?:string, subject?:string, from?:string, to?:string}){
    const q=new URLSearchParams()
    if(params?.examId) q.set('examId', params.examId)
    if(params?.status) q.set('status', params.status)
    if(params?.search) q.set('search', params.search)
    if(params?.signalType) q.set('signalType', params.signalType)
    if(params?.page) q.set('page', String(params.page))
    if(params?.limit) q.set('limit', String(params.limit))
    if(params?.scoreFilter) q.set('scoreFilter', params.scoreFilter)
    if(params?.sortBy) q.set('sortBy', params.sortBy)
    if(params?.sortOrder) q.set('sortOrder', params.sortOrder)
    if(params?.subject) q.set('subject', params.subject)
    if(params?.from) q.set('dateFrom', params.from)
    if(params?.to) q.set('dateTo', params.to)
    try{
      const res = await api.get<any>(`/teacher/integrity-reviews?${q.toString()}`)
      if(res?.success && res?.data) return res.data
      if(Array.isArray(res)) return { reviews: res, total: res.length, page:1, limit: res.length, totalPages:1 }
      return res
    }catch{
      const data = await api.get<any[]>(`/reviews?${q.toString()}`)
      return { reviews: data, total: data.length, page:1, limit: data.length, totalPages:1 }
    }
  },
  async getReview(id:string){
    try{
      return await api.get<any>(`/teacher/integrity-reviews/${id}`)
    }catch{
      return await api.get<any>(`/reviews/${id}`)
    }
  },
  async getTimeline(id:string, filter?:string){
    const q = filter && filter!=='all' ? `?filter=${filter}` : ''
    try{
      const res = await api.get<any>(`/teacher/integrity-reviews/${id}/timeline${q}`)
      if(res?.success) return res.data
      return res
    }catch{
      const r = await api.get<any>(`/reviews/${id}`)
      return { timeline: r.events || [] }
    }
  },
  async getSimilarity(id:string){
    try{
      const res = await api.get<any>(`/teacher/integrity-reviews/${id}/similarity`)
      if(res?.success) return res.data
      return res
    }catch{
      const r = await api.get<any>(`/reviews/${id}`)
      return r.similarity ? [r.similarity] : []
    }
  },
  async getAudit(id:string){
    try{
      const res = await api.get<any>(`/teacher/integrity-reviews/${id}/audit`)
      if(res?.success) return res.data
      return res
    }catch{ return { logs:[] }}
  },
  async addNote(id:string, note:string){
    try{
      return await api.post(`/teacher/integrity-reviews/${id}/notes`, {note})
    }catch{
      return await api.post(`/reviews/${id}/notes`, {note})
    }
  },
  async updateNote(reviewId:string, noteId:string, note:string){
    return await api.patch(`/teacher/integrity-reviews/${reviewId}/notes/${noteId}`, {note})
  },
  async assignReview(id:string, assignedReviewerId:string){
    return await api.patch(`/teacher/integrity-reviews/${id}/assign`, {assignedReviewerId})
  },
  async updateStatus(id:string, status:string, note?:string){
    try{
      return await api.patch(`/teacher/integrity-reviews/${id}/status`, {status, note})
    }catch{
      return await api.patch(`/reviews/${id}/status`, {status, note})
    }
  },
  async markReviewed(id:string, note?:string){
    return await api.patch(`/reviews/${id}/status`, {status:'Reviewed', note})
  },
  async compare(a:string, b:string){
    return await api.get<any>(`/teacher/integrity-reviews/compare?a=${a}&b=${b}`)
  }
}

export const studentApi = {
  async getDashboard(){
    return await api.get<any>('/student/dashboard')
  },
  async getStudentExams(){
    return await api.get<any[]>('/student/exams')
  },
  async getStudentExamById(examId:string){
    return await api.get<any>(`/student/exams/${examId}`)
  },
  async getUpcoming(){
    return await api.get<any[]>('/student/exams/upcoming')
  },
  async getInProgress(){
    return await api.get<any[]>('/student/exams/in-progress')
  },
  async getCompleted(){
    return await api.get<any[]>('/student/exams/completed')
  },
  async startExam(examId:string){
    return await api.post<any>(`/student/exams/${examId}/start`, {})
  },
  async getSession(sessionId:string){
    return await api.get<any>(`/student/sessions/${sessionId}`)
  },
  async saveAnswer(sessionId:string, questionId:string, answer:string){
    // Use PUT per spec, but keep POST fallback
    try{
      return await api.put(`/student/sessions/${sessionId}/answers`, {questionId, answer})
    } catch{
      return await api.post(`/student/sessions/${sessionId}/answers`, {questionId, answer})
    }
  },
  async postEvents(sessionId:string, events:any[]){
    return await api.post(`/student/sessions/${sessionId}/events`, {events})
  },
  async postHeartbeat(sessionId:string, data:{currentQuestionId?:string, connectionState?:string, timestamp?:string}){
    return await api.post(`/student/sessions/${sessionId}/heartbeat`, data)
  },
  async toggleMarkForReview(sessionId:string, questionId:string, marked:boolean){
    return await api.post(`/student/sessions/${sessionId}/mark-review`, {questionId, marked})
  },
  async getMarkForReview(sessionId:string){
    return await api.get(`/student/sessions/${sessionId}/mark-review`)
  },
  async getAnnouncements(examId?:string, sessionId?:string){
    const q=new URLSearchParams()
    if(examId) q.set('examId',examId)
    if(sessionId) q.set('sessionId',sessionId)
    const qs=q.toString()
    if(sessionId) return await api.get(`/student/announcements?${qs}`)
    if(examId) return await api.get(`/student/exams/${examId}/announcements`)
    return []
  },
  async submitSession(sessionId:string){
    return await api.post(`/student/sessions/${sessionId}/submit`, {})
  },
  async getResults(){
    return await api.get<any[]>('/student/results')
  },
  async getResultDetail(sessionId:string){
    return await api.get<any>(`/student/results/${sessionId}`)
  },
  async getIntegrityReports(){
    return await api.get<any[]>('/student/integrity-reports')
  },
  async getIntegrityReport(sessionId:string){
    return await api.get<any>(`/student/integrity-reports/${sessionId}`)
  },
  async getProfile(){
    return await api.get<any>('/student/profile')
  },
  async downloadPdf(sessionId:string){
    // Fetch with response headers to get filename from Content-Disposition
    const res = await api.getBlobWithHeaders(`/student/results/${sessionId}/pdf`)
    const blob: Blob = res.blob
    const headers: Record<string,string> = res.headers || {}
    let filename = `ExamGuard-Report-${sessionId.slice(-6)}.pdf`
    const cd = headers['content-disposition'] || headers['Content-Disposition'] || ''
    const m = cd && cd.match(/filename="?([^"]+)"?/i)
    if (m && m[1]) filename = m[1]
    // Sanitize filename on client
    filename = filename.replace(/[^a-zA-Z0-9\-_ .]/g, "_")
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return blob
  },
  async downloadPdfDirect(sessionId:string){
    const res = await api.getBlobWithHeaders(`/student/results/${sessionId}/pdf`)
    return res.blob
  }
}

export const reportApi = {
  async overview(){ 
    try{
      const res = await api.get<any>('/teacher/analytics/overview')
      if(res?.success) return res.data
      return res
    }catch{
      return await api.get<any>('/reports/overview')
    }
  },
  async examReport(id:string){ 
    try{
      const res = await api.get<any>(`/teacher/analytics/exams/${id}`)
      if(res?.success) return res.data
      return res
    }catch{
      return await api.get<any>(`/reports/exams/${id}`)
    }
  },
  async integrityAnalytics(params?: any){
    const q = buildQuery(params)
    const res = await api.get<any>(`/teacher/analytics/integrity${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async classAnalytics(params?: any){
    const q = buildQuery(params)
    const res = await api.get<any>(`/teacher/analytics/classes${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async studentAnalytics(studentId:string, params?: any){
    const q = buildQuery(params)
    const res = await api.get<any>(`/teacher/analytics/students/${studentId}${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async subjectAnalytics(){
    const res = await api.get<any>(`/teacher/analytics/subjects`)
    if(res?.success) return res.data
    return res
  },
  async generateStudentPdf(sessionId:string){
    const {blob, headers} = await api.getBlobWithHeaders(`/teacher/reports/student/${sessionId}`)
    // trigger download with proper filename if available
    const cd = headers['content-disposition'] || headers['Content-Disposition'] || ''
    let filename = `ExamGuard_Report_${sessionId.slice(-6)}.pdf`
    const m = cd && cd.match(/filename="?([^"]+)"?/i)
    if (m && m[1]) filename = m[1].replace(/[^a-zA-Z0-9\-_ .]/g, "_")
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return blob
  },
  async generateIntegrityPdf(reviewId:string){
    const {blob, headers} = await api.getBlobWithHeaders(`/teacher/reports/integrity/${reviewId}`)
    const cd = headers['content-disposition'] || headers['Content-Disposition'] || ''
    let filename = `ExamGuard_Integrity_${reviewId.slice(-6)}.pdf`
    const m = cd && cd.match(/filename="?([^"]+)"?/i)
    if (m && m[1]) filename = m[1].replace(/[^a-zA-Z0-9\-_ .]/g, "_")
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return blob
  },
  async generateExamAnalyticsPdf(examId:string){
    const {blob, headers} = await api.getBlobWithHeaders(`/teacher/reports/exam/${examId}`)
    const cd = headers['content-disposition'] || headers['Content-Disposition'] || ''
    let filename = `ExamGuard_Analytics_${examId.slice(-6)}.pdf`
    const m = cd && cd.match(/filename="?([^"]+)"?/i)
    if (m && m[1]) filename = m[1].replace(/[^a-zA-Z0-9\-_ .]/g, "_")
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return blob
  }
}

export const analyticsApi = {
  overview: reportApi.overview,
  exam: reportApi.examReport,
  integrity: reportApi.integrityAnalytics,
  classes: reportApi.classAnalytics,
  student: reportApi.studentAnalytics,
  subjects: reportApi.subjectAnalytics
}

export const auditApi = {
  async list(params?: any){
    const q = buildQuery(params)
    const res = await api.get<any>(`/teacher/audit-log${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  }
}

export const notificationApi = {
  async list(limit?:number){
    const q = limit? `?limit=${limit}&wrapped=true` : '?wrapped=true'
    try{
      const res = await api.get<any>(`/notifications${q}`)
      if(Array.isArray(res)) return res
      if(res?.success) return res.data
      return res
    }catch{ return [] }
  },
  async markRead(id:string){
    return await api.patch(`/notifications/${id}/read`, {})
  },
  async markAll(){
    return await api.post(`/notifications/read-all`, {})
  },
  // legacy mark all via POST /notifications/read
  async markAllLegacy(){
    return await api.post(`/notifications/read`, {})
  }
}

export const liveApi = {
  async getSessions(params?:any){
    const q=buildQuery(params)
    const res=await api.get<any>(`/teacher/live/sessions${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async getSession(id:string){
    const res=await api.get<any>(`/teacher/live/sessions/${id}`)
    if(res?.success) return res.data
    return res
  },
  async getEvents(params?:any){
    const q=buildQuery(params)
    const res=await api.get<any>(`/teacher/live/events${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async broadcast(examId:string, message:string, sessionId?:string){
    const res=await api.post<any>(`/teacher/live/exams/${examId}/broadcast`, {message, sessionId, target: sessionId? 'SINGLE':'ALL'})
    if(res?.success) return res.data
    return res
  }
}

export const gradingApi = {
  async getQueue(params?:any){
    const q=buildQuery(params)
    const res=await api.get<any>(`/teacher/grading${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async grade(answerId:string, marksAwarded:number, feedback?:string){
    const res=await api.post<any>(`/teacher/grading/answers/${answerId}/grade`, {marksAwarded, teacherFeedback:feedback})
    if(res?.success) return res.data
    return res
  },
  async getSession(sessionId:string){
    const res=await api.get<any>(`/teacher/grading/sessions/${sessionId}`)
    if(res?.success) return res.data
    return res
  }
}

export const clarificationApi = {
  async create(reviewId:string, message:string, sessionId?:string){
    return await api.post<any>(`/clarifications`, {reviewId, sessionId, message})
  },
  async listForTeacher(params?:any){
    const q=buildQuery(params)
    const res=await api.get<any>(`/clarifications${q?`?${q}`:''}`)
    if(res?.success) return res.data
    return res
  },
  async listForStudent(){
    const res=await api.get<any>(`/clarifications`)
    return Array.isArray(res)? res : (res?.data || [])
  },
  async respond(id:string, response:string){
    return await api.post<any>(`/clarifications/${id}/respond`, {response})
  }
}
