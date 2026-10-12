// Simple API client for ExamGuard backend
const BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'

async function request<T>(path:string, opts: RequestInit = {}): Promise<T>{
  let res: Response
  try{
    res = await fetch(`${BASE}${path}`, {
      credentials:'include',
      headers:{ 'Content-Type':'application/json', ...(opts.headers||{}) },
      ...opts,
      body: opts.body ? (typeof opts.body==='string'? opts.body : JSON.stringify(opts.body)) : undefined
    })
  }catch(e:any){
    // Network failure => backend not running
    throw new Error(`Cannot connect to backend at ${BASE}. Is the backend running? (cd backend && npm run dev) - ${e.message}`)
  }
  if(!res.ok){
    const body = await res.json().catch(()=>({}))
    // Centralized mapping to user-friendly messages, never expose internal DB errors
    const statusMessages: Record<number,string> = {
      401: "Your session has expired. Please sign in again.",
      403: "You don't have permission to access this resource.",
      404: "The requested resource could not be found.",
      409: "This action conflicts with the current state.",
      422: "Please check the highlighted fields.",
      429: "Too many requests. Please try again shortly.",
    }
    const msg = body.error || statusMessages[res.status] || (res.status>=500 ? "Something went wrong. Please try again." : `Request failed (${res.status})`)
    // Never expose stack traces or raw DB errors
    const safe = msg.includes("prisma") || msg.includes("SQL") || msg.includes("at ") ? "Something went wrong. Please try again." : msg
    throw new Error(safe)
  }
  // 204
  if(res.status===204) return null as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(p:string)=> request<T>(p, {method:'GET'}),
  post: <T>(p:string, body?:any)=> request<T>(p, {method:'POST', body: JSON.stringify(body)}),
  put: <T>(p:string, body?:any)=> request<T>(p, {method:'PUT', body: JSON.stringify(body)}),
  patch: <T>(p:string, body?:any)=> request<T>(p, {method:'PATCH', body: JSON.stringify(body)}),
  del: <T>(p:string)=> request<T>(p, {method:'DELETE'}),
  getBlob: async (p:string)=>{
    const BASE2 = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'
    const res = await fetch(`${BASE2}${p}`, { credentials:'include' })
    if(!res.ok){
      const body = await res.json().catch(()=>({}))
      const statusMessages: Record<number,string> = {
        401: "Your session has expired. Please sign in again.",
        403: "You don't have permission to access this resource.",
        404: "The requested resource could not be found.",
        500: "Report generation failed. Please try again.",
      }
      throw new Error(body.error || statusMessages[res.status] || `Request failed ${res.status}`)
    }
    return await res.blob()
  },
  getBlobWithHeaders: async (p:string)=>{
    const BASE2 = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api'
    const res = await fetch(`${BASE2}${p}`, { credentials:'include' })
    if(!res.ok){
      const body = await res.json().catch(()=>({}))
      const statusMessages: Record<number,string> = {
        401: "Your session has expired. Please sign in again.",
        403: "You don't have permission to access this resource.",
        404: "The requested resource could not be found.",
        500: "Report generation failed. Please try again.",
      }
      throw new Error(body.error || statusMessages[res.status] || `Request failed ${res.status}`)
    }
    const blob = await res.blob()
    const headers: Record<string,string> = {}
    res.headers.forEach((v,k)=>{ headers[k]=v; headers[k.toLowerCase()]=v })
    return { blob, headers, status: res.status }
  },
}
