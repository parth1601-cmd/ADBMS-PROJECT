export interface NotificationDTO {
  id: string
  userId: string
  type: string | null
  title: string
  message: string
  read: boolean
  readAt: Date | null
  entityId: string | null
  createdAt: Date
}

export interface NotificationListDTO {
  notifications: NotificationDTO[]
  total: number
  unreadCount: number
  page: number
  limit: number
}