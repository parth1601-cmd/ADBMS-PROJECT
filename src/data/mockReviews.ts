import type { IntegrityReview, Signal, TimelineEvent } from "@/types"

let _sigCounter = 0
function mkSignal(p: Partial<Signal> & {title:string}): Signal {
  const base: Signal = {
    id: `sig_${String(_sigCounter++).padStart(4,'0')}`,
    severity:"Medium",
    points:12,
    description:"",
    evidence:[],
    icon:"alert",
    type:"tab_switch",
    title: p.title,
  } as Signal
  return { ...base, ...p }
}
function mkEvent(e: Partial<TimelineEvent> & {title:string; at:string; kind:TimelineEvent["kind"]}): TimelineEvent {
  return { id: `ev_${e.at}_${e.title.slice(0,4)}`, timestamp:`2026-09-03T${e.at}.000Z`, description:undefined, at:e.at, title:e.title, kind:e.kind } as TimelineEvent
}

const baseEvents = (extras: TimelineEvent[]): TimelineEvent[] => [
  mkEvent({at:"09:02:14", title:"Exam started", kind:"session", description:"Session initialized"}),
  mkEvent({at:"09:08:43", title:"Question 4 answered", kind:"answer"}),
  mkEvent({at:"09:11:02", title:"Question 5 answered", kind:"answer"}),
  ...extras,
  mkEvent({at:"09:58:21", title:"Exam submitted", kind:"session"}),
]

// Deterministic response times
function fixedTimes(len:number, base:number, pattern:number[]): {q:string; sec:number}[] {
  return Array.from({length:len}, (_,i)=>({q:`Q${i+1}`, sec: base + pattern[i % pattern.length]}))
}

export const mockReviews: IntegrityReview[] = [
  {
    id:"r1",
    examId:"e1",
    studentId:"s1", // Aarav Sharma
    score:78,
    level:"Requires Review",
    status:"Pending",
    generatedAt:"2026-09-03T10:05:00Z",
    questionsAnswered:30,
    answerChanges:6,
    avgResponseSec:48,
    fastestSec:3,
    slowestSec:252,
    responseTimes: fixedTimes(30, 40, [5,12,22,8,35,18, -30, 28, 15, 42]),
    signals: [
      mkSignal({title:"Tab Switching", type:"tab_switch", severity:"Medium", points:18, description:"Repeated focus changes were detected during the exam.", evidence:["4 tab switches","31 seconds total focus loss"], details:"Focus lost at 09:15:02 (16s), 09:22:11 (7s), 09:34:05 (5s), 09:41:18 (3s)."}),
      mkSignal({title:"Answer Timing", type:"timing", severity:"Medium", points:16, description:"Several responses occurred substantially faster than the student's overall response pattern.", evidence:["3 responses under 5 seconds","Average 48s vs 3s outliers"], details:"Q7, Q12, Q19 answered in 3–4s vs median 47s."}),
      mkSignal({title:"Rapid Answer Changes", type:"rapid_change", severity:"Low", points:8, description:"Multiple answers were changed within short intervals.", evidence:["6 changes","2 changes within 10s window"]}),
      mkSignal({title:"Copy / Paste Activity", type:"copy_paste", severity:"Medium", points:14, description:"Relevant copy/paste activity was detected during the exam.", evidence:["2 paste events","No external navigation detected"]}),
    ],
    events: baseEvents([
      mkEvent({at:"09:15:02", title:"Tab became inactive", kind:"focus", description:"Visibility hidden"}),
      mkEvent({at:"09:15:18", title:"Tab became active", kind:"focus"}),
      mkEvent({at:"09:17:41", title:"Question 9 answer changed", kind:"answer"}),
      mkEvent({at:"09:18:03", title:"Paste event detected", kind:"clipboard"}),
      mkEvent({at:"09:22:11", title:"Tab became inactive", kind:"focus"}),
      mkEvent({at:"09:22:18", title:"Tab became active", kind:"focus"}),
      mkEvent({at:"09:34:05", title:"Tab became inactive", kind:"focus"}),
      mkEvent({at:"09:41:18", title:"Tab became inactive", kind:"focus"}),
      mkEvent({at:"09:42:02", title:"Question 18 answer changed", kind:"answer"}),
    ]),
    similarStudentId:"s2", // Ananya Patel
    similarityPercent:90,
    similarityTable: Array.from({length:20},(_,i)=>({q:`Q${i+1}`, a: ["B","C","A","B","D","A","C","B"][i%8], b: (i===2||i===9?"D":""+["B","C","A","B","D","A","C","B"][i%8]), match: !(i===2||i===9)})),
    subjective:[{questionId:"q5", question:"Explain the Central Limit Theorem in 2–3 sentences.", responseA:"Market instability contributed significantly to the sampling distribution approaching normality as sample size increased beyond 30, with mean converging.", responseB:"Market instability contributed significantly to sampling distribution approaching normality as sample size increased beyond 30, mean converging to population mean.", similarity:94}],
    teacherNote: undefined,
  },
  {
    id:"r2",
    examId:"e1",
    studentId:"s2", // Ananya Patel
    score:61,
    level:"Requires Review",
    status:"Pending",
    generatedAt:"2026-09-03T10:07:00Z",
    questionsAnswered:30,
    answerChanges:4,
    avgResponseSec:52,
    fastestSec:6,
    slowestSec:210,
    responseTimes: fixedTimes(30, 45, [10,18,25,7,14,30,22]),
    signals:[
      mkSignal({title:"Tab Switching", type:"tab_switch", severity:"Low", points:10, description:"Occasional focus changes detected.", evidence:["2 tab switches","9 seconds total focus loss"]}),
      mkSignal({title:"Answer Timing", type:"timing", severity:"Medium", points:15, description:"Faster-than-typical response burst detected.", evidence:["2 rapid responses","Clustered in first 10 minutes"]}),
    ],
    events: baseEvents([
      mkEvent({at:"09:16:04", title:"Tab became inactive", kind:"focus"}),
      mkEvent({at:"09:16:12", title:"Tab became active", kind:"focus"}),
      mkEvent({at:"09:19:21", title:"Question 11 answered in 6s", kind:"answer"}),
    ]),
    similarStudentId:"s1",
    similarityPercent:90,
    similarityTable: Array.from({length:20},(_,i)=>({q:`Q${i+1}`, a: ["B","C","A","B"][i%4], b: ["B","C","A","B"][i%4], match:true})),
  },
  {
    id:"r3",
    examId:"e1",
    studentId:"s3", // Aditya Kumar
    score:84,
    level:"High Priority Review",
    status:"Pending",
    generatedAt:"2026-09-03T10:10:00Z",
    questionsAnswered:30,
    answerChanges:9,
    avgResponseSec:38,
    fastestSec:2,
    slowestSec:180,
    responseTimes: fixedTimes(30, 30, [8,12,5,18,22,14,35]),
    signals:[
      mkSignal({title:"Tab Switching", type:"tab_switch", severity:"High", points:22, description:"Frequent focus changes detected.", evidence:["6 tab switches","47 seconds total focus loss"]}),
      mkSignal({title:"Answer Timing", type:"timing", severity:"High", points:20, description:"Multiple unusually fast responses.", evidence:["5 responses under 5 seconds"]}),
      mkSignal({title:"Copy / Paste Activity", type:"copy_paste", severity:"Medium", points:14, description:"Paste events during short-answer questions.", evidence:["3 paste events"]}),
      mkSignal({title:"Multiple Sessions", type:"multi_session", severity:"Medium", points:12, description:"Second session token detected.", evidence:["Session resumed from different viewport"]}),
    ],
    events: baseEvents([
      mkEvent({at:"09:12:03", title:"Tab became inactive", kind:"focus"}),
      mkEvent({at:"09:12:14", title:"Tab became active", kind:"focus"}),
      mkEvent({at:"09:14:22", title:"Paste event detected", kind:"clipboard"}),
      mkEvent({at:"09:18:44", title:"Question 7 answered in 2s", kind:"answer"}),
      mkEvent({at:"09:21:09", title:"Multiple active sessions detected", kind:"session"}),
    ]),
    similarStudentId:"s5", // Arjun Reddy
    similarityPercent:72,
    similarityTable: Array.from({length:20},(_,i)=>({q:`Q${i+1}`, a:"B", b: i<14?"B":"C", match: i<14})),
  },
  {
    id:"r4",
    examId:"e1",
    studentId:"s4", // Diya Nair
    score:24,
    level:"Normal",
    status:"Reviewed",
    generatedAt:"2026-09-03T11:00:00Z",
    questionsAnswered:30,
    answerChanges:1,
    avgResponseSec:66,
    fastestSec:18,
    slowestSec:240,
    responseTimes: fixedTimes(30, 60, [6,12,18,9,15]),
    signals:[
      mkSignal({title:"Rapid Answer Changes", type:"rapid_change", severity:"Low", points:5, description:"Minimal answer revision.", evidence:["1 change"]}),
    ],
    events: baseEvents([]),
    teacherNote:"Reviewed by Dr. Rajesh Kumar. No concerns. Consistent timing and no focus events.",
  },
  {
    id:"r5",
    examId:"e1",
    studentId:"s5", // Arjun Reddy
    score:82,
    level:"High Priority Review",
    status:"Pending",
    generatedAt:"2026-09-03T10:22:00Z",
    questionsAnswered:30,
    answerChanges:7,
    avgResponseSec:41,
    fastestSec:4,
    slowestSec:200,
    responseTimes: fixedTimes(30, 35, [12,18,9,25,30,7,40]),
    signals:[
      mkSignal({title:"Tab Switching", type:"tab_switch", severity:"Medium", points:17, description:"Repeated focus loss.", evidence:["4 tab switches"]}),
      mkSignal({title:"Answer Timing", type:"timing", severity:"Medium", points:16, description:"Fast response cluster.", evidence:["4 responses under 7s"]}),
      mkSignal({title:"Similar Answers", type:"similarity", severity:"Medium", points:15, description:"High overlap with peer responses.", evidence:["18/20 matches with Aditya Kumar (72%)"]}),
    ],
    events: baseEvents([
      mkEvent({at:"09:13:11", title:"Tab became inactive", kind:"focus"}),
      mkEvent({at:"09:20:44", title:"Question 15 answer changed", kind:"answer"}),
    ]),
  },
  {
    id:"r6",
    examId:"e3",
    studentId:"s6", // Sneha Iyer
    score:38,
    level:"Low Concern",
    status:"Pending",
    generatedAt:"2026-08-24T15:02:00Z",
    questionsAnswered:20,
    answerChanges:2,
    avgResponseSec:55,
    fastestSec:12,
    slowestSec:188,
    responseTimes: fixedTimes(20, 50, [5,15,10,20]),
    signals:[
      mkSignal({title:"Answer Timing", type:"timing", severity:"Low", points:9, description:"One faster response.", evidence:["1 unusually fast response"]}),
    ],
    events: baseEvents([]),
  },
  {
    id:"r7",
    examId:"e3",
    studentId:"s7", // Rohan Mehta
    score:61,
    level:"Requires Review",
    status:"Pending",
    generatedAt:"2026-08-24T15:10:00Z",
    questionsAnswered:20,
    answerChanges:5,
    avgResponseSec:42,
    fastestSec:4,
    slowestSec:165,
    responseTimes: fixedTimes(20, 38, [8,14,22,9,30]),
    signals:[
      mkSignal({title:"Copy / Paste Activity", type:"copy_paste", severity:"Low", points:10, description:"Paste detected in short answer.", evidence:["1 paste event"]}),
      mkSignal({title:"Rapid Answer Changes", type:"rapid_change", severity:"Medium", points:12, description:"Multiple quick revisions.", evidence:["5 changes"]}),
    ],
    events: baseEvents([mkEvent({at:"10:12:03", title:"Paste event detected", kind:"clipboard"})]),
  },
  {
    id:"r8",
    examId:"e5",
    studentId:"s10", // Priya Singh
    score:78,
    level:"Requires Review",
    status:"Pending",
    generatedAt:"2026-08-19T09:30:00Z",
    questionsAnswered:32,
    answerChanges:8,
    avgResponseSec:46,
    fastestSec:3,
    slowestSec:220,
    responseTimes: fixedTimes(32, 40, [10,18,25,14,30]),
    signals:[
      mkSignal({title:"Tab Switching", type:"tab_switch", severity:"Medium", points:16, description:"Focus changes during exam.", evidence:["3 tab switches"]}),
      mkSignal({title:"Subjective Similarity", type:"subjective_similarity", severity:"Medium", points:14, description:"High textual overlap in short answers.", evidence:["94% similarity on Q12"]}),
    ],
    events: baseEvents([]),
    subjective:[{questionId:"q14", question:"Explain inorder traversal", responseA:"Inorder traversal of BST visits left, root, right yielding sorted order due to BST property.", responseB:"Inorder traversal of BST visits left subtree, root, then right subtree yielding sorted order.", similarity:88}],
  },
]
