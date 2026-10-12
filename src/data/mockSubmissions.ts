import type { Submission } from "@/types"
export const mockSubmissions: Submission[] = [
  {id:"sub1", examId:"e1", studentId:"s1", status:"Submitted", startedAt:"2026-09-03T09:02:14Z", submittedAt:"2026-09-03T09:58:21Z", answersCount:30, totalQuestions:30},
  {id:"sub2", examId:"e1", studentId:"s2", status:"Submitted", startedAt:"2026-09-03T09:02:14Z", submittedAt:"2026-09-03T09:57:10Z", answersCount:30, totalQuestions:30},
  {id:"sub3", examId:"e1", studentId:"s3", status:"Submitted", startedAt:"2026-09-03T09:02:14Z", submittedAt:"2026-09-03T09:59:02Z", answersCount:30, totalQuestions:30},
  {id:"sub4", examId:"e1", studentId:"s4", status:"Submitted", startedAt:"2026-09-03T09:02:14Z", submittedAt:"2026-09-03T09:55:11Z", answersCount:30, totalQuestions:30},
  {id:"sub5", examId:"e1", studentId:"s5", status:"Submitted", startedAt:"2026-09-03T09:02:14Z", submittedAt:"2026-09-03T09:56:33Z", answersCount:30, totalQuestions:30},
  {id:"sub6", examId:"e1", studentId:"s6", status:"In Progress", startedAt:"2026-09-03T09:10:00Z", answersCount:12, totalQuestions:30},
]
