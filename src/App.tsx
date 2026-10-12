import { BrowserRouter, Routes, Route, Navigate, useParams as useParamsRR } from "react-router-dom"
import LandingPage from "@/pages/landing/LandingPage"
import TeacherLayout from "@/layouts/TeacherLayout"
import StudentLayout from "@/layouts/StudentLayout"
import TeacherDashboard from "@/pages/teacher/Dashboard"
import Exams from "@/pages/teacher/Exams"
import ExamDetail from "@/pages/teacher/ExamDetail"
import Questions from "@/pages/teacher/Questions"
import Students from "@/pages/teacher/Students"
import ReviewQueue from "@/pages/teacher/ReviewQueue"
import ReviewDetail from "@/pages/teacher/ReviewDetail"
import StudentDashboard from "@/pages/student/Dashboard"
import StudentExams from "@/pages/student/Exams"
import AvailableTests from "@/pages/student/AvailableTests"
import Upcoming from "@/pages/student/Upcoming"
import InProgress from "@/pages/student/InProgress"
import Completed from "@/pages/student/Completed"
import Instructions from "@/pages/student/Instructions"
import TakeExam from "@/pages/student/TakeExam"
import Submitted from "@/pages/student/Submitted"
import Login from "@/pages/auth/Login"
import Register from "@/pages/auth/Register"
import StudentLogin from "@/pages/auth/StudentLogin"
import TeacherLogin from "@/pages/auth/TeacherLogin"
import StudentRegister from "@/pages/auth/StudentRegister"
import TeacherRegister from "@/pages/auth/TeacherRegister"
import Reports from "@/pages/teacher/Reports"
import StudentResults from "@/pages/student/Results"
import ResultDetail from "@/pages/student/ResultDetail"
import IntegrityReports from "@/pages/student/IntegrityReports"
import IntegrityReportDetail from "@/pages/student/IntegrityReportDetail"
import StudentProfile from "@/pages/student/Profile"
import StudentSettings from "@/pages/student/Settings"
import TeacherStudents from "@/pages/teacher/TeacherStudents"
import TeacherSettings from "@/pages/teacher/Settings"
import AnalyticsOverview from "@/pages/teacher/AnalyticsOverview"
import IntegrityAnalytics from "@/pages/teacher/IntegrityAnalytics"
import ExamAnalytics from "@/pages/teacher/ExamAnalytics"
import ClassAnalytics from "@/pages/teacher/ClassAnalytics"
import StudentAnalytics from "@/pages/teacher/StudentAnalytics"
import AuditLog from "@/pages/teacher/AuditLog"
import NotificationsPage from "@/pages/teacher/NotificationsPage"
import SimilarityPage from "@/pages/teacher/SimilarityPage"
import LiveMonitor from "@/pages/teacher/LiveMonitor"
import Grading from "@/pages/teacher/Grading"
import Compare from "@/pages/teacher/Compare"
import NotFound from "@/pages/errors/NotFound"
import Forbidden from "@/pages/errors/Forbidden"
import ServerError from "@/pages/errors/ServerError"
import VerifyReport from "@/pages/VerifyReport"
import { ToastProvider } from "@/components/ui/Toast"
import { AuthProvider, RequireAuth } from "@/context/AuthContext"

export default function App(){
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify/report/:reportId" element={<VerifyReport />} />
            {/* Generic auth (backwards compat) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Separate Student Website Auth */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />
            {/* Separate Teacher Website Auth */}
            <Route path="/teacher/login" element={<TeacherLogin />} />
            <Route path="/teacher/register" element={<TeacherRegister />} />
            {/* Teacher */}
            <Route path="/teacher" element={<RequireAuth roles={['TEACHER']}><TeacherLayout /></RequireAuth>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="exams" element={<Exams />} />
              <Route path="exams/:id" element={<ExamDetail />} />
              <Route path="exams/:id/questions" element={<Questions />} />
              <Route path="exams/:id/students" element={<Students />} />
              <Route path="exams/:id/reviews" element={<ReviewQueueWrapper />} />
              <Route path="reviews" element={<ReviewQueue />} />
              <Route path="reviews/:id" element={<ReviewDetail />} />
              {/* Phase 3 Integrity Reviews */}
              <Route path="integrity-reviews" element={<ReviewQueue />} />
              <Route path="integrity-reviews/:id" element={<ReviewDetail />} />
              <Route path="integrity-reviews/:id/similarity" element={<SimilarityPage />} />
              <Route path="integrity-reviews/:id/compare" element={<Compare />} />
              <Route path="live-monitor" element={<LiveMonitor />} />
              <Route path="grading" element={<Grading />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="students/:studentId/analytics" element={<StudentAnalytics />} />
              <Route path="analytics" element={<AnalyticsOverview />} />
              <Route path="analytics/integrity" element={<IntegrityAnalytics />} />
              <Route path="analytics/exams/:examId" element={<ExamAnalytics />} />
              <Route path="analytics/classes" element={<ClassAnalytics />} />
              <Route path="analytics/subjects" element={<ClassAnalytics />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-log" element={<AuditLog />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<TeacherSettings />} />
            </Route>

            {/* Student */}
            <Route path="/student" element={<RequireAuth roles={['STUDENT']}><StudentLayout /></RequireAuth>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="exams" element={<StudentExams />} />
              <Route path="tests" element={<AvailableTests />} />
              <Route path="upcoming" element={<Upcoming />} />
              <Route path="in-progress" element={<InProgress />} />
              <Route path="completed" element={<Completed />} />
              <Route path="exams/:id" element={<Instructions />} />
              <Route path="exams/:id/instructions" element={<Instructions />} />
              <Route path="exams/:id/take" element={<TakeExam />} />
              <Route path="exams/:id/submitted" element={<Submitted />} />
              <Route path="results" element={<StudentResults />} />
              <Route path="results/:sessionId" element={<ResultDetail />} />
              <Route path="integrity-reports" element={<IntegrityReports />} />
              <Route path="integrity-reports/:sessionId" element={<IntegrityReportDetail />} />
              <Route path="profile" element={<StudentProfile />} />
              <Route path="settings" element={<StudentSettings />} />
            </Route>

            <Route path="/403" element={<Forbidden />} />
            <Route path="/500" element={<ServerError />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  )
}

function ReviewQueueWrapper(){
  const {id} = useParamsRR()
  return <ReviewQueue examId={id} />
}
