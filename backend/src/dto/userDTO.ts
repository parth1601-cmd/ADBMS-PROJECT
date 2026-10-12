export interface UserDTO {
  id: string
  name: string
  fullName: string | null
  email: string
  role: string
  status: string
  studentId: string | null
  className: string | null
  section: string | null
  academicYear: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuthUserDTO {
  id: string
  name: string
  email: string
  role: string
}