import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Alert } from "@/components/ui/Alert"
export default function Placeholder({title, desc}:{title:string; desc?:string}){
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{desc || "This section will be connected to the backend in Phase 2."}</p>
      </div>
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
          <Alert variant="info" title="Frontend preview">
            This area is mocked for demonstration. The UI structure and service abstraction are ready for Phase 2 backend integration.
          </Alert>
          <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">No data required for demo. Navigate via sidebar to continue the 5-minute walkthrough.</div>
        </CardContent>
      </Card>
    </div>
  )
}

