import { PrismaClient, Role, ExamStatus, QuestionType, SessionStatus, EventType, ReviewLevel, SignalType, SignalSeverity, ReviewStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Deterministic Indian dataset
const teachers = [
  { name: "Dr. Rajesh Kumar", email: "teacher@examguard.demo", dept: "Mathematics" },
  { name: "Priyanka Sharma", email: "priyanka.sharma@examguard.demo", dept: "Physics" },
  { name: "Suresh Iyer", email: "suresh.iyer@examguard.demo", dept: "Computer Science" },
  { name: "Anjali Nair", email: "anjali.nair@examguard.demo", dept: "Statistics" },
  { name: "Vikram Singh", email: "vikram.singh@examguard.demo", dept: "Mathematics" },
  { name: "Kavita Rao", email: "kavita.rao@examguard.demo", dept: "Computer Science" },
  { name: "Amit Patel", email: "amit.patel@examguard.demo", dept: "Physics" },
  { name: "Deepa Menon", email: "deepa.menon@examguard.demo", dept: "Mathematics" },
  { name: "Ramesh Verma", email: "ramesh.verma@examguard.demo", dept: "Statistics" },
  { name: "Swati Kulkarni", email: "swati.kulkarni@examguard.demo", dept: "Computer Science" },
  { name: "Arvind Reddy", email: "arvind.reddy@examguard.demo", dept: "Physics" },
  { name: "Neha Joshi", email: "neha.joshi@examguard.demo", dept: "Mathematics" },
]

const students = [
  ["Aarav Sharma","aarav.sharma@example.com","CS21-042"],
  ["Ananya Patel","ananya.patel@example.com","CS21-017"],
  ["Aditya Kumar","aditya.kumar@example.com","CS21-033"],
  ["Diya Nair","diya.nair@example.com","CS21-058"],
  ["Arjun Reddy","arjun.reddy@example.com","CS21-102"],
  ["Sneha Iyer","sneha.iyer@example.com","CS21-011"],
  ["Rohan Mehta","rohan.mehta@example.com","CS21-089"],
  ["Kavya Rao","kavya.rao@example.com","CS21-067"],
  ["Rahul Verma","rahul.verma@example.com","CS21-074"],
  ["Priya Singh","priya.singh@example.com","CS21-029"],
  ["Akash Gupta","akash.gupta@example.com","CS21-005"],
  ["Ishita Das","ishita.das@example.com","CS21-091"],
  ["Vikram Joshi","vikram.joshi@example.com","CS21-036"],
  ["Meera Menon","meera.menon@example.com","CS21-021"],
  ["Karthik Krishnan","karthik.krishnan@example.com","CS21-044"],
  ["Pooja Yadav","pooja.yadav@example.com","CS21-062"],
  ["Nikhil Choudhary","nikhil.choudhary@example.com","CS21-099"],
  ["Aditi Kulkarni","aditi.kulkarni@example.com","CS21-076"],
  ["Suresh Patil","suresh.patil@example.com","CS21-052"],
  ["Neha Agarwal","neha.agarwal@example.com","CS21-008"],
  ["Harsh Vardhan","harsh.vardhan@example.com","CS21-112"],
  ["Shreya Deshmukh","shreya.deshmukh@example.com","CS21-014"],
  ["Abhishek Mishra","abhishek.mishra@example.com","CS21-083"],
  ["Tanvi Shah","tanvi.shah@example.com","CS21-019"],
  ["Manish Thakur","manish.thakur@example.com","CS21-120"],
  ["Riya Kapoor","riya.kapoor@example.com","CS21-121"],
  ["Sai Teja","sai.teja@example.com","CS21-122"],
  ["Nandini Reddy","nandini.reddy@example.com","CS21-123"],
  ["Rohit Bhat","rohit.bhat@example.com","CS21-124"],
  ["Divya Srinivasan","divya.srinivasan@example.com","CS21-125"],
  ["Karan Malhotra","karan.malhotra@example.com","CS21-126"],
  ["Anjali Bansal","anjali.bansal@example.com","CS21-127"],
  ["Siddharth Rao","siddharth.rao@example.com","CS21-128"],
  ["Fatima Sheikh","fatima.sheikh@example.com","CS21-129"],
  ["Sanjay Pillai","sanjay.pillai@example.com","CS21-130"],
  ["Lakshmi Narayanan","lakshmi.narayanan@example.com","CS21-131"],
  ["Vivek Oberoi","vivek.oberoi@example.com","CS21-132"],
  ["Ayesha Khan","ayesha.khan@example.com","CS21-133"],
  ["Devendra Chauhan","devendra.chauhan@example.com","CS21-134"],
  ["Sunita Desai","sunita.desai@example.com","CS21-135"],
] as const

function getLevel(score:number): ReviewLevel {
  if(score>=80) return ReviewLevel.HIGH_PRIORITY_REVIEW
  if(score>=60) return ReviewLevel.REQUIRES_REVIEW
  if(score>=30) return ReviewLevel.LOW_CONCERN
  return ReviewLevel.NORMAL
}

async function main(){
  console.log("Seeding ExamGuard...")
  // Clean
  await prisma.auditLog.deleteMany()
  await prisma.reviewNote.deleteMany()
  await prisma.integritySignal.deleteMany()
  await prisma.integrityReview.deleteMany()
  await prisma.examEvent.deleteMany()
  await prisma.answer.deleteMany()
  await prisma.examSession.deleteMany()
  await prisma.question.deleteMany()
  await prisma.exam.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash("demo123", 10)
  const studentHash = await bcrypt.hash("student123", 10)

  // Create teachers
  const teacherRecords: Record<string, string> = {}
  for(const t of teachers){
    const u = await prisma.user.create({ data: { name: t.name, email: t.email, passwordHash, role: Role.TEACHER }})
    teacherRecords[t.email]=u.id
  }
  // Create students
  const studentRecords: Record<string, string> = {}
  for(const [name,email,roll] of students){
    const u = await prisma.user.create({ data: { name, email, passwordHash: studentHash, role: Role.STUDENT }})
    studentRecords[email]=u.id
  }

  // Also create explicit demo students with known passwords
  // student1@examguard.demo etc for easy login
  const demoStudents = [
    {name:"Aarav Sharma (Demo)", email:"student1@examguard.demo"},
    {name:"Ananya Patel (Demo)", email:"student2@examguard.demo"},
    {name:"Aditya Kumar (Demo)", email:"student3@examguard.demo"},
  ]
  for(const d of demoStudents){
    const exists = await prisma.user.findUnique({where:{email:d.email}})
    if(!exists){
      const u = await prisma.user.create({ data: { name:d.name, email:d.email, passwordHash: studentHash, role: Role.STUDENT }})
      studentRecords[d.email]=u.id
    }
  }

  const mainTeacherId = teacherRecords["teacher@examguard.demo"]

  // Create Exams — Phase 2 spec alignment
  const examData = [
    { title:"Mathematics Midterm Assessment", subject:"Mathematics", description:"Midterm covering calculus, linear algebra and probability. Class 10-A.", status: ExamStatus.LIVE, durationMinutes:60, startAt: new Date("2026-09-02T09:00:00Z"), endAt: new Date("2026-09-09T18:00:00Z"), instructions:"Answer all questions. No external aids. Integrity signals will be recorded for review. Class 10-A." },
    { title:"Physics Assessment", subject:"Physics", description:"Mechanics and thermodynamics fundamentals assessment. Class 10-A.", status: ExamStatus.SCHEDULED, durationMinutes:45, startAt: new Date("2026-09-12T09:00:00Z"), endAt: new Date("2026-09-13T18:00:00Z"), instructions:"MCQs and short answers. Time-bound." },
    { title:"Computer Science Quiz", subject:"Computer Science", description:"Data structures, algorithms and OS concepts.", status: ExamStatus.COMPLETED, durationMinutes:30, startAt: new Date("2026-08-24T09:00:00Z"), endAt: new Date("2026-08-24T12:00:00Z"), instructions:"Quiz with auto-submit on timeout." },
    { title:"Statistics Final", subject:"Statistics", description:"Comprehensive final covering inference and regression.", status: ExamStatus.DRAFT, durationMinutes:90, startAt: new Date("2026-09-20T09:00:00Z"), endAt: new Date("2026-09-21T18:00:00Z"), instructions:"Detailed instructions to be added." },
    { title:"Data Structures Assessment", subject:"Computer Science", description:"Linked lists, trees, graphs and complexity.", status: ExamStatus.COMPLETED, durationMinutes:75, startAt: new Date("2026-08-18T09:00:00Z"), endAt: new Date("2026-08-19T18:00:00Z"), instructions:"Code-tracing and theory." },
    { title:"Science Unit Assessment", subject:"Science", description:"Unit assessment covering physics, chemistry and biology fundamentals. Class 10-A.", status: ExamStatus.SCHEDULED, durationMinutes:45, startAt: new Date("2026-09-15T09:00:00Z"), endAt: new Date("2026-09-16T18:00:00Z"), instructions:"15 questions, 40 marks, 45 minutes. Class 10-A." },
    { title:"Computer Science Assessment", subject:"Computer Science", description:"Theoretical and practical CS assessment. Class 10-A.", status: ExamStatus.LIVE, durationMinutes:60, startAt: new Date("2026-08-10T09:00:00Z"), endAt: new Date("2026-08-20T18:00:00Z"), instructions:"20 questions, 50 marks, 60 minutes. Will be used for in-progress demo (expired window, but session active)." },
    { title:"English Literature Assessment", subject:"English", description:"Literature and grammar assessment. Class 10-A.", status: ExamStatus.LIVE, durationMinutes:45, startAt: new Date("2026-09-01T09:00:00Z"), endAt: new Date("2026-09-10T18:00:00Z"), instructions:"10 questions, 30 marks, 45 minutes. Class 10-A." },
  ]

  const examIds: string[] = []
  for(const e of examData){
    const ex = await prisma.exam.create({ data: {
      title:e.title, description:e.description, subject:e.subject, teacherId: mainTeacherId, status:e.status, durationMinutes:e.durationMinutes, startAt:e.startAt, endAt:e.endAt, instructions:e.instructions, attemptsAllowed:1
    }})
    examIds.push(ex.id)
  }
  const [e1,e2,e3,e4,e5,e6,e7,e8] = examIds

  // Create 30 questions for e1
  const e1Questions = [
    {text:"What is the derivative of sin(x)?", options:JSON.stringify(["cos(x)","-cos(x)","sin(x)","-sin(x)"]), correctAnswer:"cos(x)", type: QuestionType.MCQ, points:2, order:1},
    {text:"Which of the following is a vector space axiom?", options:JSON.stringify(["Commutativity","Associativity","Closure under addition","All of the above"]), correctAnswer:"All of the above", type: QuestionType.MCQ, points:2, order:2},
    {text:"The determinant of an identity matrix is 0.", options:JSON.stringify(["True","False"]), correctAnswer:"False", type: QuestionType.TF, points:1, order:3},
    {text:"Expected value of a fair dice roll is:", options:JSON.stringify(["3","3.5","4","2.5"]), correctAnswer:"3.5", type: QuestionType.MCQ, points:2, order:4},
    {text:"Explain the Central Limit Theorem in 2–3 sentences.", options:null, correctAnswer:"Sample mean approaches normal distribution as n grows", type: QuestionType.SHORT, points:5, order:5},
    {text:"Eigenvalues of a diagonal matrix are:", options:JSON.stringify(["Diagonal entries","Zeros","Ones","Cannot determine"]), correctAnswer:"Diagonal entries", type: QuestionType.MCQ, points:2, order:6},
    {text:"∫0 to 1 x² dx =", options:JSON.stringify(["1/2","1/3","1/4","1"]), correctAnswer:"1/3", type: QuestionType.MCQ, points:2, order:7},
    {text:"A p-value of 0.03 means null hypothesis is true with 3% probability.", options:JSON.stringify(["True","False"]), correctAnswer:"False", type: QuestionType.TF, points:1, order:8},
    {text:"Rank of matrix [[1,2],[2,4]] is:", options:JSON.stringify(["0","1","2","Undefined"]), correctAnswer:"1", type: QuestionType.MCQ, points:2, order:9},
    {text:"Define Type I and Type II errors with one example each.", options:null, correctAnswer:"Type I false positive, Type II false negative", type: QuestionType.SHORT, points:5, order:10},
    {text:"If A and B are independent with P(A)=0.4, P(B)=0.5, then P(A∩B) is:", options:JSON.stringify(["0.2","0.9","0.1","0.45"]), correctAnswer:"0.2", type: QuestionType.MCQ, points:2, order:11},
    {text:"Which distribution models number of successes in n trials?", options:JSON.stringify(["Poisson","Binomial","Normal","Exponential"]), correctAnswer:"Binomial", type: QuestionType.MCQ, points:2, order:12},
    {text:"Every continuous function is differentiable.", options:JSON.stringify(["True","False"]), correctAnswer:"False", type: QuestionType.TF, points:1, order:13},
    {text:"Mean of Poisson(λ) is:", options:JSON.stringify(["λ","λ²","√λ","1/λ"]), correctAnswer:"λ", type: QuestionType.MCQ, points:2, order:14},
    {text:"State Bayes' theorem and give one application.", options:null, correctAnswer:"P(A|B)=P(B|A)P(A)/P(B)", type: QuestionType.SHORT, points:5, order:15},
    {text:"Gradient of f(x,y)=x²+y² at (1,1) is:", options:JSON.stringify(["(1,1)","(2,2)","(0,0)","(2,0)"]), correctAnswer:"(2,2)", type: QuestionType.MCQ, points:2, order:16},
    {text:"Which is orthogonal matrix property?", options:JSON.stringify(["QᵀQ=I","det=0","Symmetric","Eigenvalues 0"]), correctAnswer:"QᵀQ=I", type: QuestionType.MCQ, points:2, order:17},
    {text:"Variance of constant is zero.", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:1, order:18},
    {text:"Limit of (1+1/n)ⁿ as n→∞ is:", options:JSON.stringify(["0","1","e","∞"]), correctAnswer:"e", type: QuestionType.MCQ, points:2, order:19},
    {text:"Correlation coefficient range is:", options:JSON.stringify(["0 to 1","-1 to 1","-∞ to ∞","0 to ∞"]), correctAnswer:"-1 to 1", type: QuestionType.MCQ, points:2, order:20},
    {text:"Explain the difference between population and sample with an example.", options:null, correctAnswer:"Population is whole set, sample is subset", type: QuestionType.SHORT, points:5, order:21},
    {text:"Trace of a matrix is:", options:JSON.stringify(["Sum of diagonal elements","Sum of eigenvalues","Both","None"]), correctAnswer:"Both", type: QuestionType.MCQ, points:2, order:22},
    {text:"If X~N(0,1), P(X>0) is:", options:JSON.stringify(["0.25","0.5","0.75","1"]), correctAnswer:"0.5", type: QuestionType.MCQ, points:2, order:23},
    {text:"A symmetric matrix is always diagonalizable.", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:1, order:24},
    {text:"Jacobian determinant is used for:", options:JSON.stringify(["Change of variables","Differentiation","Integration by parts","None"]), correctAnswer:"Change of variables", type: QuestionType.MCQ, points:2, order:25},
    {text:"Standard deviation is:", options:JSON.stringify(["√variance","variance²","mean","median"]), correctAnswer:"√variance", type: QuestionType.MCQ, points:2, order:26},
    {text:"Which test compares means of two groups?", options:JSON.stringify(["t-test","Chi-square","ANOVA","Mann-Whitney"]), correctAnswer:"t-test", type: QuestionType.MCQ, points:2, order:27},
    {text:"Null hypothesis is assumed true until evidence suggests otherwise.", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:1, order:28},
    {text:"Double integral of 1 over [0,1]×[0,1] is:", options:JSON.stringify(["0","1","2","0.5"]), correctAnswer:"1", type: QuestionType.MCQ, points:2, order:29},
    {text:"Briefly describe how to test if a coin is fair using hypothesis testing.", options:null, correctAnswer:"Set H0 p=0.5, collect data, compute test statistic and p-value", type: QuestionType.SHORT, points:5, order:30},
  ]
  for(const q of e1Questions){
    await prisma.question.create({ data:{ examId:e1, text:q.text, options:q.options, correctAnswer:q.correctAnswer, type:q.type, points:q.points, order:q.order, required:true }})
  }
  // e2 minimal realistic set (10)
  const e2qs = Array.from({length:10},(_,i)=>({ text:`Physics Q${i+1}: Fundamental concept ${i+1}`, options:JSON.stringify(["Option A","Option B","Option C","Option D"]), correctAnswer:"Option A", type: QuestionType.MCQ, points:2, order:i+1 }))
  for(const q of e2qs) await prisma.question.create({ data:{ examId:e2, text:q.text, options:q.options, correctAnswer:q.correctAnswer, type:q.type, points:q.points, order:q.order, required:true }})

  const e3qs = Array.from({length:5},(_,i)=>({ text:`CS Quiz Q${i+1}`, options:JSON.stringify(["O(n)","O(log n)","O(1)","O(n log n)"]), correctAnswer:"O(log n)", type: QuestionType.MCQ, points:2, order:i+1 }))
  for(const q of e3qs) await prisma.question.create({ data:{ examId:e3, text:q.text, options:q.options, correctAnswer:q.correctAnswer, type:q.type, points:q.points, order:q.order, required:true }})
  // e4 draft empty
  const e5qs = Array.from({length:5},(_,i)=>({ text:`DSA Q${i+1}`, options:JSON.stringify(["Sorted order","Reverse","Random","Level"]), correctAnswer:"Sorted order", type: QuestionType.MCQ, points:2, order:i+1 }))
  for(const q of e5qs) await prisma.question.create({ data:{ examId:e5, text:q.text, options:q.options, correctAnswer:q.correctAnswer, type:q.type, points:q.points, order:q.order, required:true }})
  // e6 Science Unit Assessment 15Q 40 marks 45min
  const e6qs = [
    {text:"What is the chemical formula for water?", options:JSON.stringify(["H2O","CO2","NaCl","O2"]), correctAnswer:"H2O", type: QuestionType.MCQ, points:2, order:1},
    {text:"Photosynthesis occurs in:", options:JSON.stringify(["Mitochondria","Chloroplast","Nucleus","Ribosome"]), correctAnswer:"Chloroplast", type: QuestionType.MCQ, points:2, order:2},
    {text:"Newton's second law is F=ma", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:1, order:3},
    {text:"Which planet is known as Red Planet?", options:JSON.stringify(["Venus","Mars","Jupiter","Saturn"]), correctAnswer:"Mars", type: QuestionType.MCQ, points:2, order:4},
    {text:"Explain the water cycle in brief.", options:null, correctAnswer:"Evaporation, condensation, precipitation", type: QuestionType.SHORT, points:5, order:5},
    {text:"Atomic number of Carbon is 6", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:1, order:6},
    {text:"What is the speed of light?", options:JSON.stringify(["3x10^8 m/s","3x10^6 m/s","3x10^10 m/s","3x10^5 m/s"]), correctAnswer:"3x10^8 m/s", type: QuestionType.MCQ, points:2, order:7},
    {text:"Define ecosystem with example.", options:null, correctAnswer:"Community of living organisms interacting", type: QuestionType.SHORT, points:5, order:8},
    {text:"pH of neutral water is 7", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:1, order:9},
    {text:"Which gas is most abundant in atmosphere?", options:JSON.stringify(["Oxygen","Nitrogen","CO2","Hydrogen"]), correctAnswer:"Nitrogen", type: QuestionType.MCQ, points:2, order:10},
    {text:"Explain Newton's third law with example.", options:null, correctAnswer:"Every action has equal opposite reaction", type: QuestionType.SHORT, points:5, order:11},
    {text:"DNA stands for:", options:JSON.stringify(["Deoxyribonucleic acid","Ribonucleic acid","Dinitric acid","None"]), correctAnswer:"Deoxyribonucleic acid", type: QuestionType.MCQ, points:2, order:12},
    {text:"Human heart has 4 chambers", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:2, order:13},
    {text:"What is the unit of force?", options:JSON.stringify(["Joule","Newton","Watt","Pascal"]), correctAnswer:"Newton", type: QuestionType.MCQ, points:2, order:14},
    {text:"Describe the process of mitosis.", options:null, correctAnswer:"Cell division process", type: QuestionType.SHORT, points:6, order:15},
  ]
  for(const q of e6qs) await prisma.question.create({ data:{ examId:e6, text:q.text, options:q.options, correctAnswer:q.correctAnswer, type:q.type, points:q.points, order:q.order, required:true }})
  // e7 Computer Science Assessment expired LIVE 20Q 50 marks 60min but expired window for in-progress demo
  const e7qs = Array.from({length:10},(_,i)=>({ text:`CS Assessment Q${i+1}: Concept ${i+1}`, options:JSON.stringify(["Alpha","Beta","Gamma","Delta"]), correctAnswer:"Alpha", type: QuestionType.MCQ, points:3, order:i+1 }))
  // make total 50 marks: 10*3=30, need 20 more via short
  e7qs.push({text:"Explain Big O notation with example.", options:null, correctAnswer:"Describes algorithm complexity", type: QuestionType.SHORT, points:5, order:11} as any)
  e7qs.push({text:"Define deadlock with conditions.", options:null, correctAnswer:"Four conditions", type: QuestionType.SHORT, points:5, order:12} as any)
  e7qs.push({text:"TCP is connection-oriented", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:2, order:13} as any)
  e7qs.push({text:"What is normal form in DBMS?", options:JSON.stringify(["Normalization","Indexing","Sharding","All"]), correctAnswer:"Normalization", type: QuestionType.MCQ, points:3, order:14} as any)
  e7qs.push({text:"Stack follows LIFO", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:2, order:15} as any)
  e7qs.push({text:"Explain virtual memory.", options:null, correctAnswer:"Memory management technique", type: QuestionType.SHORT, points:3, order:16} as any)
  for(const q of e7qs) await prisma.question.create({ data:{ examId:e7, text:q.text, options:q.options || null, correctAnswer:q.correctAnswer, type:q.type as any, points:q.points, order:q.order, required:true }})
  // e8 English 10Q 30 marks
  const e8qs = [
    {text:"Who wrote 'Romeo and Juliet'?", options:JSON.stringify(["Shakespeare","Dickens","Austen","Hemingway"]), correctAnswer:"Shakespeare", type: QuestionType.MCQ, points:3, order:1},
    {text:"Synonym of 'Abundant'?", options:JSON.stringify(["Scarce","Plentiful","Rare","Meager"]), correctAnswer:"Plentiful", type: QuestionType.MCQ, points:3, order:2},
    {text:"Antonym of 'Brave' is 'Cowardly'", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:2, order:3},
    {text:"What is a metaphor?", options:JSON.stringify(["Comparison using like","Direct comparison","Exaggeration","Rhyme"]), correctAnswer:"Direct comparison", type: QuestionType.MCQ, points:3, order:4},
    {text:"Explain theme of 'The Road Not Taken'.", options:null, correctAnswer:"Choices and consequences", type: QuestionType.SHORT, points:5, order:5},
    {text:"Passive voice: 'He writes a letter' -> ?", options:JSON.stringify(["A letter is written by him","He written letter","Letter writes him","None"]), correctAnswer:"A letter is written by him", type: QuestionType.MCQ, points:3, order:6},
    {text:"All sonnets have 14 lines", options:JSON.stringify(["True","False"]), correctAnswer:"True", type: QuestionType.TF, points:2, order:7},
    {text:"What is alliteration?", options:JSON.stringify(["Repetition of consonant sounds","Repetition of vowels","Rhyme","None"]), correctAnswer:"Repetition of consonant sounds", type: QuestionType.MCQ, points:3, order:8},
    {text:"Define irony with example.", options:null, correctAnswer:"Contrast between expectation and reality", type: QuestionType.SHORT, points:4, order:9},
    {text:"Who is the protagonist of 'Moby Dick'?", options:JSON.stringify(["Ahab","Ishmael","Queequeg","Starbuck"]), correctAnswer:"Ishmael", type: QuestionType.MCQ, points:2, order:10},
  ]
  for(const q of e8qs) await prisma.question.create({ data:{ examId:e8, text:q.text, options:q.options || null, correctAnswer:q.correctAnswer, type:q.type as any, points:q.points, order:q.order, required:true }})

  // Create sessions + answers + events + reviews for e1
  // Map student email to desired scores
  const scoreMap: Record<string, number> = {
    "aarav.sharma@example.com":78,
    "ananya.patel@example.com":61,
    "aditya.kumar@example.com":84,
    "diya.nair@example.com":24,
    "arjun.reddy@example.com":82,
    "sneha.iyer@example.com":38,
    "rohan.mehta@example.com":61,
    "priya.singh@example.com":78,
  }
  // deterministic timings
  const baseStart = new Date("2026-09-03T09:02:14Z")
  const allQuestionsE1 = await prisma.question.findMany({where:{examId:e1}, orderBy:{order:'asc'}})
  
  let reviewCounter=0
  for(const [email, targetScore] of Object.entries(scoreMap)){
    const studentId = studentRecords[email]
    const deadline = new Date(baseStart.getTime() + 60*60*1000)
    const session = await prisma.examSession.create({ data:{
      examId:e1, studentId, startedAt: baseStart, deadlineAt: deadline, submittedAt: new Date("2026-09-03T09:58:21Z"), status: SessionStatus.SUBMITTED, lastActivityAt: new Date("2026-09-03T09:58:21Z")
    }})
    // answers
    for(let i=0;i<allQuestionsE1.length;i++){
      const q = allQuestionsE1[i]
      const ans = q.type===QuestionType.SHORT ? "Sample answer for short question" : (JSON.parse(q.options||"[]")[0] || "A")
      // changeCount based on score
      const changes = targetScore>=80 ? (i%3===0?2:0) : targetScore>=60 ? (i%5===0?1:0) : 0
      await prisma.answer.create({ data:{
        sessionId: session.id, questionId: q.id, answer: ans, changeCount: changes, firstAnsweredAt: new Date(baseStart.getTime()+ (i*60+ 30)*1000), lastChangedAt: new Date(baseStart.getTime()+ (i*60+40)*1000)
      }})
    }
    // events
    const events: {type: EventType, ts: Date, qid?: string, meta?: any}[] = []
    events.push({type: EventType.SESSION_STARTED, ts: baseStart})
    if(targetScore===78){ // Aarav
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:15:02Z")})
      events.push({type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:15:18Z")})
      events.push({type: EventType.ANSWER_CHANGED, ts: new Date("2026-09-03T09:17:41Z")})
      events.push({type: EventType.PASTE, ts: new Date("2026-09-03T09:18:03Z")})
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:22:11Z")})
      events.push({type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:22:18Z")})
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:34:05Z")})
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:41:18Z")})
    } else if(targetScore===61 && email.includes("ananya")){
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:16:04Z")})
      events.push({type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:16:12Z")})
      events.push({type: EventType.QUESTION_ANSWERED, ts: new Date("2026-09-03T09:19:21Z")})
    } else if(targetScore===84){
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:12:03Z")})
      events.push({type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:12:14Z")})
      events.push({type: EventType.PASTE, ts: new Date("2026-09-03T09:14:22Z")})
      events.push({type: EventType.QUESTION_ANSWERED, ts: new Date("2026-09-03T09:18:44Z")})
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:21:09Z")})
    } else if(targetScore===24){
      // minimal
    } else if(targetScore===82){
      events.push({type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:13:11Z")})
      events.push({type: EventType.ANSWER_CHANGED, ts: new Date("2026-09-03T09:20:44Z")})
    } else if(email.includes("sneha")){
      events.push({type: EventType.QUESTION_ANSWERED, ts: new Date("2026-09-03T09:18:00Z")})
    } else if(email.includes("rohan")){
      events.push({type: EventType.PASTE, ts: new Date("2026-09-03T10:12:03Z")})
    }
    events.push({type: EventType.SESSION_ENDED, ts: new Date("2026-09-03T09:58:21Z")})
    for(const ev of events){
      await prisma.examEvent.create({ data:{ sessionId: session.id, eventType: ev.type, timestamp: ev.ts, metadata: ev.meta ? JSON.stringify(ev.meta): null, questionId: ev.qid || null }})
    }
    // Integrity review – deterministic varied statuses per Phase3 spec
    const level = getLevel(targetScore)
    let status: ReviewStatus = ReviewStatus.PENDING
    let assignedReviewerId: string | null = null
    let assignedAt: Date | null = null
    if(targetScore===24) status = ReviewStatus.REVIEWED
    else if(targetScore===61 && email.includes("ananya")) status = ReviewStatus.IN_REVIEW
    else if(targetScore===78 && email.includes("priya")) status = ReviewStatus.REQUIRES_FOLLOW_UP
    else if(targetScore===82) status = ReviewStatus.IN_REVIEW
    // assign IN_REVIEW to second teacher
    if(status===ReviewStatus.IN_REVIEW){
      const secondTeacher = teacherRecords["priyanka.sharma@examguard.demo"]
      assignedReviewerId = secondTeacher || mainTeacherId
      assignedAt = new Date("2026-09-03T12:00:00Z")
    }
    const review = await prisma.integrityReview.create({ data:{
      sessionId: session.id, score: targetScore, level, status, generatedAt: new Date("2026-09-03T10:05:00Z"), reviewedAt: status===ReviewStatus.REVIEWED ? new Date("2026-09-03T11:00:00Z") : null, reviewedBy: status===ReviewStatus.REVIEWED ? mainTeacherId : null,
      assignedReviewerId, assignedAt
    }})
    // signals based on score – include confidence and correlated patterns per Phase3 (priya specific before generic 78)
    if(targetScore===78 && email.includes("priya")){
      await prisma.integritySignal.createMany({ data:[
        { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.MEDIUM, points:16, description:"Focus changes during exam.", evidence: JSON.stringify(["3 tab switches"]), confidence:0.84},
        { integrityReviewId: review.id, type: SignalType.SUBJECTIVE_SIMILARITY, severity: SignalSeverity.MEDIUM, points:14, description:"High textual overlap in short answers.", evidence: JSON.stringify(["94% similarity"]), confidence:0.88},
        { integrityReviewId: review.id, type: SignalType.CORRELATED_PATTERN, severity: SignalSeverity.LOW, points:6, description:"Correlated activity pattern detected.", evidence: JSON.stringify(["1 correlated pattern within 60s window"]), confidence:0.64},
      ]})
      await prisma.reviewNote.create({ data:{ integrityReviewId: review.id, teacherId: mainTeacherId, note:"Similarity 94% on short answer 'Explain water cycle' vs peer. Requires follow-up discussion." }})
    } else if(targetScore===78){
      await prisma.integritySignal.createMany({ data:[
        { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.MEDIUM, points:18, description:"Repeated focus changes were detected during the exam.", evidence: JSON.stringify(["4 tab switches","31 seconds total focus loss"]), confidence:0.84},
        { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.MEDIUM, points:16, description:"Several responses occurred substantially faster than the student's overall response pattern.", evidence: JSON.stringify(["3 responses under 5 seconds"]), confidence:0.82},
        { integrityReviewId: review.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.LOW, points:8, description:"Multiple answers were changed within short intervals.", evidence: JSON.stringify(["6 changes"]), confidence:0.79},
        { integrityReviewId: review.id, type: SignalType.COPY_PASTE, severity: SignalSeverity.MEDIUM, points:14, description:"Relevant copy/paste activity was detected during the exam.", evidence: JSON.stringify(["2 paste events"]), confidence:0.83},
      ]})
      // Add correlated pattern for Aarav (TAB -> answer change)
      if(email.includes("aarav")){
        await prisma.integritySignal.create({ data:{ integrityReviewId: review.id, type: SignalType.CORRELATED_PATTERN, severity: SignalSeverity.MEDIUM, points:10, description:"Correlated activity pattern detected.", evidence: JSON.stringify(["2 correlated TAB→CHANGE patterns within 30s window"]), confidence:0.78 }})
      }
    } else if(targetScore===84){
      await prisma.integritySignal.createMany({ data:[
        { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.HIGH, points:22, description:"Frequent focus changes detected.", evidence: JSON.stringify(["6 tab switches"]), confidence:0.91},
        { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.HIGH, points:20, description:"Multiple unusually fast responses.", evidence: JSON.stringify(["5 responses under 5s"]), confidence:0.89},
        { integrityReviewId: review.id, type: SignalType.COPY_PASTE, severity: SignalSeverity.MEDIUM, points:14, description:"Paste events during short-answer questions.", evidence: JSON.stringify(["3 paste events"]), confidence:0.85},
        { integrityReviewId: review.id, type: SignalType.MULTI_SESSION, severity: SignalSeverity.MEDIUM, points:12, description:"Second session token detected.", evidence: JSON.stringify(["Session resumed"]), confidence:0.86},
        { integrityReviewId: review.id, type: SignalType.CORRELATED_PATTERN, severity: SignalSeverity.HIGH, points:15, description:"Correlated activity pattern detected.", evidence: JSON.stringify(["3 correlated patterns within 10s window"]), confidence:0.87},
      ]})
    } else if(targetScore===61 && email.includes("ananya")){
      await prisma.integritySignal.createMany({ data:[
        { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.LOW, points:10, description:"Occasional focus changes detected.", evidence: JSON.stringify(["2 tab switches"]), confidence:0.71},
        { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.MEDIUM, points:15, description:"Faster-than-typical response burst detected.", evidence: JSON.stringify(["2 rapid responses"]), confidence:0.82},
        { integrityReviewId: review.id, type: SignalType.SESSION_ANOMALY, severity: SignalSeverity.LOW, points:8, description:"Session reconnected once.", evidence: JSON.stringify(["1 reconnection"]), confidence:0.64},
      ]})
      await prisma.reviewNote.create({ data:{ integrityReviewId: review.id, teacherId: teacherRecords["priyanka.sharma@examguard.demo"], note:"Started review: checking timing clusters and tab activity. Legitimate accessibility tool may explain one focus change." }})
    } else if(targetScore===24){
      await prisma.integritySignal.create({ data:{ integrityReviewId: review.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.LOW, points:5, description:"Minimal answer revision.", evidence: JSON.stringify(["1 change"]), confidence:0.64} })
      await prisma.reviewNote.create({ data:{ integrityReviewId: review.id, teacherId: mainTeacherId, note:"Reviewed by Dr. Rajesh Kumar. No concerns. Consistent timing and no focus events." }})
    } else if(targetScore===82){
      await prisma.integritySignal.createMany({ data:[
        { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.MEDIUM, points:17, description:"Repeated focus loss.", evidence: JSON.stringify(["4 tab switches"]), confidence:0.84},
        { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.MEDIUM, points:16, description:"Fast response cluster.", evidence: JSON.stringify(["4 responses under 7s"]), confidence:0.82},
        { integrityReviewId: review.id, type: SignalType.SIMILARITY, severity: SignalSeverity.MEDIUM, points:15, description:"High overlap with peer responses.", evidence: JSON.stringify(["18/20 matches with Aditya Kumar (72%)"]), confidence:0.80},
      ]})
      await prisma.reviewNote.create({ data:{ integrityReviewId: review.id, teacherId: teacherRecords["priyanka.sharma@examguard.demo"], note:"Correlated pattern noted: 2 tab changes within 30s of answer changes. Follow-up recommended." }})
    } else if(targetScore===38){
      await prisma.integritySignal.create({ data:{ integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.LOW, points:9, description:"One faster response.", evidence: JSON.stringify(["1 unusually fast response"]), confidence:0.66 }})
    } else if(targetScore===61 && email.includes("rohan")){
      await prisma.integritySignal.createMany({ data:[
        { integrityReviewId: review.id, type: SignalType.COPY_PASTE, severity: SignalSeverity.LOW, points:10, description:"Paste detected in short answer.", evidence: JSON.stringify(["1 paste event"]), confidence:0.71},
        { integrityReviewId: review.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.MEDIUM, points:12, description:"Multiple quick revisions.", evidence: JSON.stringify(["5 changes"]), confidence:0.81},
      ]})
    }
    // audit log for review generation per Phase3
    await prisma.auditLog.create({ data:{ actorId: studentId, actorRole:'STUDENT', action:'EXAM_SUBMITTED', entityType:'IntegrityReview', entityId: review.id, metadata: JSON.stringify({score: targetScore, level, status}), createdAt: new Date("2026-09-03T10:06:00Z") }})
    if(status===ReviewStatus.REVIEWED){
      await prisma.auditLog.create({ data:{ actorId: mainTeacherId, actorRole:'TEACHER', action:'REVIEW_STATUS_CHANGED', entityType:'IntegrityReview', entityId: review.id, metadata: JSON.stringify({from:'PENDING', to:'REVIEWED'}), createdAt: new Date("2026-09-03T11:01:00Z") }})
    }
    if(status===ReviewStatus.IN_REVIEW){
      await prisma.auditLog.create({ data:{ actorId: assignedReviewerId!, actorRole:'TEACHER', action:'REVIEW_OPENED', entityType:'IntegrityReview', entityId: review.id, metadata: JSON.stringify({status:'IN_REVIEW'}), createdAt: new Date("2026-09-03T12:01:00Z") }})
      await prisma.auditLog.create({ data:{ actorId: assignedReviewerId!, actorRole:'TEACHER', action:'REVIEW_ASSIGNED', entityType:'IntegrityReview', entityId: review.id, metadata: JSON.stringify({assignedTo: assignedReviewerId}), createdAt: new Date("2026-09-03T12:00:30Z") }})
    }
    if(status===ReviewStatus.REQUIRES_FOLLOW_UP){
      await prisma.auditLog.create({ data:{ actorId: mainTeacherId, actorRole:'TEACHER', action:'REVIEW_STATUS_CHANGED', entityType:'IntegrityReview', entityId: review.id, metadata: JSON.stringify({from:'IN_REVIEW', to:'REQUIRES_FOLLOW_UP'}), createdAt: new Date("2026-09-04T09:00:00Z") }})
    }
    reviewCounter++
  }

  // --- Phase 2 demo student experience for Aarav Sharma ---
  // Ensure Aarav has 3 completed (already has e1), add 2 more completed on e3 and e5, and 1 in-progress on e7
  const aaravId = studentRecords["aarav.sharma@example.com"]
  const e3Questions = await prisma.question.findMany({where:{examId:e3}, orderBy:{order:'asc'}})
  const e5Questions = await prisma.question.findMany({where:{examId:e5}, orderBy:{order:'asc'}})
  const e7Questions = await prisma.question.findMany({where:{examId:e7}, orderBy:{order:'asc'}})

  // Completed on e3 (CS Quiz) — score 68, level REQUIRES_REVIEW
  const csQuizSession = await prisma.examSession.create({ data:{
    examId:e3, studentId: aaravId, startedAt: new Date("2026-08-24T10:00:00Z"), deadlineAt: new Date("2026-08-24T10:30:00Z"), submittedAt: new Date("2026-08-24T10:27:15Z"), status: SessionStatus.SUBMITTED, lastActivityAt: new Date("2026-08-24T10:27:15Z")
  }})
  for(let i=0;i<e3Questions.length;i++){
    const q=e3Questions[i]
    const correct = q.correctAnswer
    // make 4 correct, 1 incorrect deterministically
    const ans = i===2 ? "O(n)" /*wrong*/ : correct
    await prisma.answer.create({ data:{ sessionId: csQuizSession.id, questionId:q.id, answer:ans, changeCount: i%2===0?1:0, firstAnsweredAt: new Date(new Date("2026-08-24T10:02:00Z").getTime()+i*60000), lastChangedAt: new Date("2026-08-24T10:03:00Z") }})
  }
  await prisma.examEvent.createMany({ data:[
    { sessionId: csQuizSession.id, eventType: EventType.SESSION_STARTED, timestamp: new Date("2026-08-24T10:00:00Z") },
    { sessionId: csQuizSession.id, eventType: EventType.QUESTION_ANSWERED, timestamp: new Date("2026-08-24T10:05:00Z") },
    { sessionId: csQuizSession.id, eventType: EventType.TAB_HIDDEN, timestamp: new Date("2026-08-24T10:12:03Z") },
    { sessionId: csQuizSession.id, eventType: EventType.TAB_VISIBLE, timestamp: new Date("2026-08-24T10:12:15Z") },
    { sessionId: csQuizSession.id, eventType: EventType.SESSION_ENDED, timestamp: new Date("2026-08-24T10:27:15Z") },
  ]})
  const csReview = await prisma.integrityReview.create({ data:{ sessionId: csQuizSession.id, score:42, level: ReviewLevel.LOW_CONCERN, status: ReviewStatus.PENDING, generatedAt: new Date("2026-08-24T10:30:00Z") }})
  await prisma.integritySignal.createMany({ data:[
    { integrityReviewId: csReview.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.LOW, points:10, description:"Occasional focus changes detected.", evidence: JSON.stringify(["1 tab switch"]), confidence:0.71},
    { integrityReviewId: csReview.id, type: SignalType.TIMING, severity: SignalSeverity.LOW, points:9, description:"One faster response.", evidence: JSON.stringify(["1 unusually fast response"]), confidence:0.66},
  ]})
  await prisma.auditLog.create({ data:{ actorId: aaravId, actorRole:'STUDENT', action:'EXAM_SUBMITTED', entityType:'IntegrityReview', entityId: csReview.id, metadata: JSON.stringify({score:42, level:'LOW_CONCERN'}), createdAt: new Date("2026-08-24T10:30:00Z") }})

  // Completed on e5 (Data Structures) — score 55
  const dsaSession = await prisma.examSession.create({ data:{
    examId:e5, studentId: aaravId, startedAt: new Date("2026-08-18T14:00:00Z"), deadlineAt: new Date("2026-08-18T15:15:00Z"), submittedAt: new Date("2026-08-18T15:10:00Z"), status: SessionStatus.SUBMITTED, lastActivityAt: new Date("2026-08-18T15:10:00Z")
  }})
  for(let i=0;i<e5Questions.length;i++){
    const q=e5Questions[i]
    const ans = q.correctAnswer
    await prisma.answer.create({ data:{ sessionId: dsaSession.id, questionId:q.id, answer:ans, changeCount:0, firstAnsweredAt: new Date("2026-08-18T14:05:00Z") }})
  }
  await prisma.examEvent.createMany({ data:[
    { sessionId: dsaSession.id, eventType: EventType.SESSION_STARTED, timestamp: new Date("2026-08-18T14:00:00Z") },
    { sessionId: dsaSession.id, eventType: EventType.SESSION_ENDED, timestamp: new Date("2026-08-18T15:10:00Z") },
  ]})
  const dsaReview = await prisma.integrityReview.create({ data:{ sessionId: dsaSession.id, score:18, level: ReviewLevel.NORMAL, status: ReviewStatus.REVIEWED, generatedAt: new Date("2026-08-18T15:20:00Z"), reviewedAt: new Date("2026-08-19T09:00:00Z"), reviewedBy: mainTeacherId }})
  await prisma.integritySignal.create({ data:{ integrityReviewId: dsaReview.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.LOW, points:5, description:"Minimal answer revision.", evidence: JSON.stringify(["1 change"]), confidence:0.64}})
  await prisma.reviewNote.create({ data:{ integrityReviewId: dsaReview.id, teacherId: mainTeacherId, note:"Reviewed by Dr. Rajesh Kumar. No concerns. Clean session."}})
  await prisma.auditLog.create({ data:{ actorId: aaravId, actorRole:'STUDENT', action:'EXAM_SUBMITTED', entityType:'IntegrityReview', entityId: dsaReview.id, metadata: JSON.stringify({score:18, level:'NORMAL'}), createdAt: new Date("2026-08-18T15:20:00Z") }})
  await prisma.auditLog.create({ data:{ actorId: mainTeacherId, actorRole:'TEACHER', action:'REVIEW_STATUS_CHANGED', entityType:'IntegrityReview', entityId: dsaReview.id, metadata: JSON.stringify({from:'PENDING', to:'REVIEWED'}), createdAt: new Date("2026-08-19T09:01:00Z") }})

  // In-progress on e7 (Computer Science Assessment) — still active, 20 min ago started, deadline in 40min
  const now = new Date()
  const inProgStart = new Date(now.getTime() - 20*60*1000)
  const inProgDeadline = new Date(inProgStart.getTime() + 60*60*1000)
  const inProgSession = await prisma.examSession.create({ data:{
    examId:e7, studentId: aaravId, startedAt: inProgStart, deadlineAt: inProgDeadline, status: SessionStatus.IN_PROGRESS, lastActivityAt: now
  }})
  for(let i=0;i<Math.min(5, e7Questions.length);i++){
    const q=e7Questions[i]
    await prisma.answer.create({ data:{ sessionId: inProgSession.id, questionId:q.id, answer: q.correctAnswer, changeCount:0, firstAnsweredAt: new Date(inProgStart.getTime()+ i*120*1000) }})
  }
  await prisma.examEvent.createMany({ data:[
    { sessionId: inProgSession.id, eventType: EventType.SESSION_STARTED, timestamp: inProgStart },
    { sessionId: inProgSession.id, eventType: EventType.QUESTION_ANSWERED, timestamp: new Date(inProgStart.getTime()+ 2*60*1000) },
    { sessionId: inProgSession.id, eventType: EventType.TAB_HIDDEN, timestamp: new Date(inProgStart.getTime()+ 5*60*1000) },
    { sessionId: inProgSession.id, eventType: EventType.TAB_VISIBLE, timestamp: new Date(inProgStart.getTime()+ 5*60*1000+ 8*1000) },
  ]})

  // Ensure notifications for new exams published
  const allStudents = await prisma.user.findMany({where:{role: Role.STUDENT}, select:{id:true}})
  for(const s of allStudents.slice(0,5)){
    await prisma.notification.create({ data:{ userId: s.id, title:"New Test Available", message:"Mathematics Midterm Assessment has been published by Dr. Rajesh Kumar.", createdAt: new Date("2026-09-02T09:05:00Z") }})
  }

  // Notifications for teacher
  await prisma.notification.createMany({ data:[
    { userId: mainTeacherId, title:"Exam submitted — Aarav Sharma", message:"Mathematics Midterm · Integrity review generated (78)", type:'REVIEW_CREATED'},
    { userId: mainTeacherId, title:"Integrity review generated — Ananya Patel", message:"Score 61 · Requires Review", type:'REVIEW_CREATED'},
    { userId: mainTeacherId, title:"Teacher review completed — Diya Nair", message:"Marked as Reviewed · No concerns", type:'REVIEW_STATUS_CHANGED'},
    { userId: mainTeacherId, title:"Review assigned — Arjun Reddy", message:"Assigned to Priyanka Sharma for follow-up", type:'REVIEW_ASSIGNED'},
    { userId: teacherRecords["priyanka.sharma@examguard.demo"], title:"Review assigned to you — Arjun Reddy", message:"High overlap detected, requires your review", type:'REVIEW_ASSIGNED'},
    { userId: mainTeacherId, title:"Student submission expired — Safe Demo", message:"Session expired without submission", type:'SESSION_EXPIRED'},
  ]})

  // Audit logs for exams and reports
  for(const eid of examIds.slice(0,3)){
    await prisma.auditLog.create({ data:{ actorId: mainTeacherId, actorRole:'TEACHER', action:'EXAM_CREATED', entityType:'Exam', entityId: eid, metadata: JSON.stringify({title: 'seeded'}), createdAt: new Date("2026-09-01T08:00:00Z") }})
    await prisma.auditLog.create({ data:{ actorId: mainTeacherId, actorRole:'TEACHER', action:'EXAM_PUBLISHED', entityType:'Exam', entityId: eid, metadata: JSON.stringify({status:'LIVE'}), createdAt: new Date("2026-09-02T09:00:00Z") }})
  }
  // student result viewed and report generated
  const firstReview = await prisma.integrityReview.findFirst()
  if(firstReview){
    await prisma.auditLog.create({ data:{ actorId: mainTeacherId, actorRole:'TEACHER', action:'REPORT_GENERATED', entityType:'IntegrityReview', entityId: firstReview.id, metadata: JSON.stringify({reportId: 'EG-2026-000124'}), createdAt: new Date("2026-09-05T10:00:00Z") }})
    await prisma.auditLog.create({ data:{ actorId: studentRecords["aarav.sharma@example.com"], actorRole:'STUDENT', action:'PDF_DOWNLOADED', entityType:'IntegrityReview', entityId: firstReview.id, metadata: JSON.stringify({reportId: 'EG-2026-000124'}), createdAt: new Date("2026-09-05T10:05:00Z") }})
  }

  console.log("Seeding completed")
}

main().catch(e=>{ console.error(e); process.exit(1)}).finally(async()=>{ await prisma.$disconnect() })
