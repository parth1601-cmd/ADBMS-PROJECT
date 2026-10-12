import { mockExams } from "@/data/mockExams"
import { mockQuestions, getQuestionsByExam } from "@/data/mockQuestions"
import { mockStudents } from "@/data/mockStudents"
import { mockReviews } from "@/data/mockReviews"
import { mockSubmissions } from "@/data/mockSubmissions"
import type { Exam, IntegrityReview } from "@/types"

// localStorage persistence for review status/notes and exam drafts
const REVIEWS_KEY = "examguard_reviews_override"

function loadOverrides(): Record<string, Partial<IntegrityReview>> {
  try { return JSON.parse(localStorage.getItem(REVIEWS_KEY) || "{}") } catch { return {} }
}
function saveOverrides(o: Record<string, any>) { localStorage.setItem(REVIEWS_KEY, JSON.stringify(o)) }

function mergedReviews(): IntegrityReview[] {
  const ov = loadOverrides()
  return mockReviews.map(r => ov[r.id] ? {...r, ...ov[r.id]} as IntegrityReview : r)
}

export const examService = {
  getExams(): Exam[] {
    const drafts = (()=>{ try{return JSON.parse(localStorage.getItem("examguard_exam_drafts")||"{}")}catch{return {}}})()
    return mockExams.map(e=> drafts[e.id] ? {...e, ...drafts[e.id]} : e)
  },
  getExamById(id:string){ return examService.getExams().find(e=>e.id===id) },
  saveDraft(exam: Exam){ const drafts = (()=>{ try{return JSON.parse(localStorage.getItem("examguard_exam_drafts")||"{}")}catch{return {}}})(); drafts[exam.id]=exam; localStorage.setItem("examguard_exam_drafts", JSON.stringify(drafts)) },
  createExam(exam: Exam){ const drafts = (()=>{ try{return JSON.parse(localStorage.getItem("examguard_exam_drafts")||"{}")}catch{return {}}})(); // also store as new
    const all = examService.getExams()
    // persist via localStorage extra list
    const extras = (()=>{ try{return JSON.parse(localStorage.getItem("examguard_extra_exams")||"[]")}catch{return []}})() as Exam[]
    extras.push(exam); localStorage.setItem("examguard_extra_exams", JSON.stringify(extras))
    return exam
  },
  getAllExamsCombined(): Exam[] {
    const extras = (()=>{ try{return JSON.parse(localStorage.getItem("examguard_extra_exams")||"[]")}catch{return []}})() as Exam[]
    return [...examService.getExams(), ...extras]
  }
}

export const questionService = {
  getQuestions(examId:string){ return getQuestionsByExam(examId) },
  getAll(){ return mockQuestions }
}

export const studentService = {
  getStudents(){ return mockStudents },
  getStudentsForExam(_examId:string){ return mockStudents.slice(0, 12) } // mock
}

export const reviewService = {
  getReviews(examId?:string){
    const all = mergedReviews()
    return examId ? all.filter(r=>r.examId===examId) : all
  },
  getReview(id:string){ return mergedReviews().find(r=>r.id===id) },
  getReviewByStudentExam(studentId:string, examId:string){ return mergedReviews().find(r=>r.studentId===studentId && r.examId===examId) },
  markReviewed(id:string, note?:string){
    const ov = loadOverrides()
    ov[id] = { ...(ov[id]||{}), status:"Reviewed" as const, teacherNote: note ?? ov[id]?.teacherNote }
    saveOverrides(ov)
  },
  addNote(id:string, note:string){
    const ov = loadOverrides()
    ov[id] = { ...(ov[id]||{}), teacherNote: note }
    saveOverrides(ov)
  },
  updateStatus(id:string, status:"Pending"|"Reviewed"){
    const ov = loadOverrides()
    ov[id] = { ...(ov[id]||{}), status }
    saveOverrides(ov)
  }
}

export const submissionService = {
  getSubmissions(examId?:string){ return examId ? mockSubmissions.filter(s=>s.examId===examId) : mockSubmissions },
  getSubmission(studentId:string, examId:string){ return mockSubmissions.find(s=>s.studentId===studentId && s.examId===examId) }
}
