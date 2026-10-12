export interface ReportDTO {
  id: string
  reportId: string
  sessionId: string | null
  reviewId: string | null
  examId: string | null
  reportType: string
  generatedBy: string | null
  generatedAt: Date
  fileReference: string | null
  metadata: string | null
}

export interface ReportGenerateDTO {
  reportId: string
  sessionId?: string
  reviewId?: string
  examId?: string
  reportType: string
  generatedBy: string
}