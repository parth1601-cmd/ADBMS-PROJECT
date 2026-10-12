export class AppError extends Error {
  status: number
  constructor(status:number, message:string){ super(message); this.status=status }
}
export const BadRequest = (m:string)=> new AppError(400,m)
export const Unauthorized = (m="Unauthorized")=> new AppError(401,m)
export const Forbidden = (m="Forbidden")=> new AppError(403,m)
export const NotFound = (m="Not found")=> new AppError(404,m)
export const Conflict = (m="Conflict")=> new AppError(409,m)
