import jwt from 'jsonwebtoken'
const SECRET = process.env.JWT_SECRET || 'dev-secret'

export function signToken(payload: {id:string, role:string, email:string}){
  return jwt.sign(payload, SECRET, {expiresIn: '7d'})
}
export function verifyToken(token:string){
  return jwt.verify(token, SECRET) as {id:string, role:string, email:string}
}
