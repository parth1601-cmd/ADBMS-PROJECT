import { PrismaClient, Role, ExamStatus, QuestionType, SessionStatus, EventType, ReviewLevel, SignalType, SignalSeverity, ReviewStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
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
];
const students = [
    ["Aarav Sharma", "aarav.sharma@example.com", "CS21-042"],
    ["Ananya Patel", "ananya.patel@example.com", "CS21-017"],
    ["Aditya Kumar", "aditya.kumar@example.com", "CS21-033"],
    ["Diya Nair", "diya.nair@example.com", "CS21-058"],
    ["Arjun Reddy", "arjun.reddy@example.com", "CS21-102"],
    ["Sneha Iyer", "sneha.iyer@example.com", "CS21-011"],
    ["Rohan Mehta", "rohan.mehta@example.com", "CS21-089"],
    ["Kavya Rao", "kavya.rao@example.com", "CS21-067"],
    ["Rahul Verma", "rahul.verma@example.com", "CS21-074"],
    ["Priya Singh", "priya.singh@example.com", "CS21-029"],
    ["Akash Gupta", "akash.gupta@example.com", "CS21-005"],
    ["Ishita Das", "ishita.das@example.com", "CS21-091"],
    ["Vikram Joshi", "vikram.joshi@example.com", "CS21-036"],
    ["Meera Menon", "meera.menon@example.com", "CS21-021"],
    ["Karthik Krishnan", "karthik.krishnan@example.com", "CS21-044"],
    ["Pooja Yadav", "pooja.yadav@example.com", "CS21-062"],
    ["Nikhil Choudhary", "nikhil.choudhary@example.com", "CS21-099"],
    ["Aditi Kulkarni", "aditi.kulkarni@example.com", "CS21-076"],
    ["Suresh Patil", "suresh.patil@example.com", "CS21-052"],
    ["Neha Agarwal", "neha.agarwal@example.com", "CS21-008"],
    ["Harsh Vardhan", "harsh.vardhan@example.com", "CS21-112"],
    ["Shreya Deshmukh", "shreya.deshmukh@example.com", "CS21-014"],
    ["Abhishek Mishra", "abhishek.mishra@example.com", "CS21-083"],
    ["Tanvi Shah", "tanvi.shah@example.com", "CS21-019"],
    ["Manish Thakur", "manish.thakur@example.com", "CS21-120"],
    ["Riya Kapoor", "riya.kapoor@example.com", "CS21-121"],
    ["Sai Teja", "sai.teja@example.com", "CS21-122"],
    ["Nandini Reddy", "nandini.reddy@example.com", "CS21-123"],
    ["Rohit Bhat", "rohit.bhat@example.com", "CS21-124"],
    ["Divya Srinivasan", "divya.srinivasan@example.com", "CS21-125"],
    ["Karan Malhotra", "karan.malhotra@example.com", "CS21-126"],
    ["Anjali Bansal", "anjali.bansal@example.com", "CS21-127"],
    ["Siddharth Rao", "siddharth.rao@example.com", "CS21-128"],
    ["Fatima Sheikh", "fatima.sheikh@example.com", "CS21-129"],
    ["Sanjay Pillai", "sanjay.pillai@example.com", "CS21-130"],
    ["Lakshmi Narayanan", "lakshmi.narayanan@example.com", "CS21-131"],
    ["Vivek Oberoi", "vivek.oberoi@example.com", "CS21-132"],
    ["Ayesha Khan", "ayesha.khan@example.com", "CS21-133"],
    ["Devendra Chauhan", "devendra.chauhan@example.com", "CS21-134"],
    ["Sunita Desai", "sunita.desai@example.com", "CS21-135"],
];
function getLevel(score) {
    if (score >= 80)
        return ReviewLevel.HIGH_PRIORITY_REVIEW;
    if (score >= 60)
        return ReviewLevel.REQUIRES_REVIEW;
    if (score >= 30)
        return ReviewLevel.LOW_CONCERN;
    return ReviewLevel.NORMAL;
}
async function main() {
    console.log("Seeding ExamGuard...");
    // Clean
    await prisma.reviewNote.deleteMany();
    await prisma.integritySignal.deleteMany();
    await prisma.integrityReview.deleteMany();
    await prisma.examEvent.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.examSession.deleteMany();
    await prisma.question.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    const passwordHash = await bcrypt.hash("demo123", 10);
    const studentHash = await bcrypt.hash("student123", 10);
    // Create teachers
    const teacherRecords = {};
    for (const t of teachers) {
        const u = await prisma.user.create({ data: { name: t.name, email: t.email, passwordHash, role: Role.TEACHER } });
        teacherRecords[t.email] = u.id;
    }
    // Create students
    const studentRecords = {};
    for (const [name, email, roll] of students) {
        const u = await prisma.user.create({ data: { name, email, passwordHash: studentHash, role: Role.STUDENT } });
        studentRecords[email] = u.id;
    }
    // Also create explicit demo students with known passwords
    // student1@examguard.demo etc for easy login
    const demoStudents = [
        { name: "Aarav Sharma (Demo)", email: "student1@examguard.demo" },
        { name: "Ananya Patel (Demo)", email: "student2@examguard.demo" },
        { name: "Aditya Kumar (Demo)", email: "student3@examguard.demo" },
    ];
    for (const d of demoStudents) {
        const exists = await prisma.user.findUnique({ where: { email: d.email } });
        if (!exists) {
            const u = await prisma.user.create({ data: { name: d.name, email: d.email, passwordHash: studentHash, role: Role.STUDENT } });
            studentRecords[d.email] = u.id;
        }
    }
    const mainTeacherId = teacherRecords["teacher@examguard.demo"];
    // Create Exams
    const examData = [
        { title: "Mathematics Midterm", subject: "Mathematics", description: "Midterm covering calculus, linear algebra and probability.", status: ExamStatus.LIVE, durationMinutes: 60, startAt: new Date("2026-09-02T09:00:00Z"), endAt: new Date("2026-09-09T18:00:00Z"), instructions: "Answer all questions. No external aids. Integrity signals will be recorded for review." },
        { title: "Physics Assessment", subject: "Physics", description: "Mechanics and thermodynamics fundamentals assessment.", status: ExamStatus.SCHEDULED, durationMinutes: 45, startAt: new Date("2026-09-12T09:00:00Z"), endAt: new Date("2026-09-13T18:00:00Z"), instructions: "MCQs and short answers. Time-bound." },
        { title: "Computer Science Quiz", subject: "Computer Science", description: "Data structures, algorithms and OS concepts.", status: ExamStatus.COMPLETED, durationMinutes: 30, startAt: new Date("2026-08-24T09:00:00Z"), endAt: new Date("2026-08-24T12:00:00Z"), instructions: "Quiz with auto-submit on timeout." },
        { title: "Statistics Final", subject: "Statistics", description: "Comprehensive final covering inference and regression.", status: ExamStatus.DRAFT, durationMinutes: 90, startAt: new Date("2026-09-20T09:00:00Z"), endAt: new Date("2026-09-21T18:00:00Z"), instructions: "Detailed instructions to be added." },
        { title: "Data Structures Assessment", subject: "Computer Science", description: "Linked lists, trees, graphs and complexity.", status: ExamStatus.COMPLETED, durationMinutes: 75, startAt: new Date("2026-08-18T09:00:00Z"), endAt: new Date("2026-08-19T18:00:00Z"), instructions: "Code-tracing and theory." },
    ];
    const examIds = [];
    for (const e of examData) {
        const ex = await prisma.exam.create({ data: {
                title: e.title, description: e.description, subject: e.subject, teacherId: mainTeacherId, status: e.status, durationMinutes: e.durationMinutes, startAt: e.startAt, endAt: e.endAt, instructions: e.instructions, attemptsAllowed: 1
            } });
        examIds.push(ex.id);
    }
    const [e1, e2, e3, e4, e5] = examIds;
    // Create 30 questions for e1
    const e1Questions = [
        { text: "What is the derivative of sin(x)?", options: JSON.stringify(["cos(x)", "-cos(x)", "sin(x)", "-sin(x)"]), correctAnswer: "cos(x)", type: QuestionType.MCQ, points: 2, order: 1 },
        { text: "Which of the following is a vector space axiom?", options: JSON.stringify(["Commutativity", "Associativity", "Closure under addition", "All of the above"]), correctAnswer: "All of the above", type: QuestionType.MCQ, points: 2, order: 2 },
        { text: "The determinant of an identity matrix is 0.", options: JSON.stringify(["True", "False"]), correctAnswer: "False", type: QuestionType.TF, points: 1, order: 3 },
        { text: "Expected value of a fair dice roll is:", options: JSON.stringify(["3", "3.5", "4", "2.5"]), correctAnswer: "3.5", type: QuestionType.MCQ, points: 2, order: 4 },
        { text: "Explain the Central Limit Theorem in 2–3 sentences.", options: null, correctAnswer: "Sample mean approaches normal distribution as n grows", type: QuestionType.SHORT, points: 5, order: 5 },
        { text: "Eigenvalues of a diagonal matrix are:", options: JSON.stringify(["Diagonal entries", "Zeros", "Ones", "Cannot determine"]), correctAnswer: "Diagonal entries", type: QuestionType.MCQ, points: 2, order: 6 },
        { text: "∫0 to 1 x² dx =", options: JSON.stringify(["1/2", "1/3", "1/4", "1"]), correctAnswer: "1/3", type: QuestionType.MCQ, points: 2, order: 7 },
        { text: "A p-value of 0.03 means null hypothesis is true with 3% probability.", options: JSON.stringify(["True", "False"]), correctAnswer: "False", type: QuestionType.TF, points: 1, order: 8 },
        { text: "Rank of matrix [[1,2],[2,4]] is:", options: JSON.stringify(["0", "1", "2", "Undefined"]), correctAnswer: "1", type: QuestionType.MCQ, points: 2, order: 9 },
        { text: "Define Type I and Type II errors with one example each.", options: null, correctAnswer: "Type I false positive, Type II false negative", type: QuestionType.SHORT, points: 5, order: 10 },
        { text: "If A and B are independent with P(A)=0.4, P(B)=0.5, then P(A∩B) is:", options: JSON.stringify(["0.2", "0.9", "0.1", "0.45"]), correctAnswer: "0.2", type: QuestionType.MCQ, points: 2, order: 11 },
        { text: "Which distribution models number of successes in n trials?", options: JSON.stringify(["Poisson", "Binomial", "Normal", "Exponential"]), correctAnswer: "Binomial", type: QuestionType.MCQ, points: 2, order: 12 },
        { text: "Every continuous function is differentiable.", options: JSON.stringify(["True", "False"]), correctAnswer: "False", type: QuestionType.TF, points: 1, order: 13 },
        { text: "Mean of Poisson(λ) is:", options: JSON.stringify(["λ", "λ²", "√λ", "1/λ"]), correctAnswer: "λ", type: QuestionType.MCQ, points: 2, order: 14 },
        { text: "State Bayes' theorem and give one application.", options: null, correctAnswer: "P(A|B)=P(B|A)P(A)/P(B)", type: QuestionType.SHORT, points: 5, order: 15 },
        { text: "Gradient of f(x,y)=x²+y² at (1,1) is:", options: JSON.stringify(["(1,1)", "(2,2)", "(0,0)", "(2,0)"]), correctAnswer: "(2,2)", type: QuestionType.MCQ, points: 2, order: 16 },
        { text: "Which is orthogonal matrix property?", options: JSON.stringify(["QᵀQ=I", "det=0", "Symmetric", "Eigenvalues 0"]), correctAnswer: "QᵀQ=I", type: QuestionType.MCQ, points: 2, order: 17 },
        { text: "Variance of constant is zero.", options: JSON.stringify(["True", "False"]), correctAnswer: "True", type: QuestionType.TF, points: 1, order: 18 },
        { text: "Limit of (1+1/n)ⁿ as n→∞ is:", options: JSON.stringify(["0", "1", "e", "∞"]), correctAnswer: "e", type: QuestionType.MCQ, points: 2, order: 19 },
        { text: "Correlation coefficient range is:", options: JSON.stringify(["0 to 1", "-1 to 1", "-∞ to ∞", "0 to ∞"]), correctAnswer: "-1 to 1", type: QuestionType.MCQ, points: 2, order: 20 },
        { text: "Explain the difference between population and sample with an example.", options: null, correctAnswer: "Population is whole set, sample is subset", type: QuestionType.SHORT, points: 5, order: 21 },
        { text: "Trace of a matrix is:", options: JSON.stringify(["Sum of diagonal elements", "Sum of eigenvalues", "Both", "None"]), correctAnswer: "Both", type: QuestionType.MCQ, points: 2, order: 22 },
        { text: "If X~N(0,1), P(X>0) is:", options: JSON.stringify(["0.25", "0.5", "0.75", "1"]), correctAnswer: "0.5", type: QuestionType.MCQ, points: 2, order: 23 },
        { text: "A symmetric matrix is always diagonalizable.", options: JSON.stringify(["True", "False"]), correctAnswer: "True", type: QuestionType.TF, points: 1, order: 24 },
        { text: "Jacobian determinant is used for:", options: JSON.stringify(["Change of variables", "Differentiation", "Integration by parts", "None"]), correctAnswer: "Change of variables", type: QuestionType.MCQ, points: 2, order: 25 },
        { text: "Standard deviation is:", options: JSON.stringify(["√variance", "variance²", "mean", "median"]), correctAnswer: "√variance", type: QuestionType.MCQ, points: 2, order: 26 },
        { text: "Which test compares means of two groups?", options: JSON.stringify(["t-test", "Chi-square", "ANOVA", "Mann-Whitney"]), correctAnswer: "t-test", type: QuestionType.MCQ, points: 2, order: 27 },
        { text: "Null hypothesis is assumed true until evidence suggests otherwise.", options: JSON.stringify(["True", "False"]), correctAnswer: "True", type: QuestionType.TF, points: 1, order: 28 },
        { text: "Double integral of 1 over [0,1]×[0,1] is:", options: JSON.stringify(["0", "1", "2", "0.5"]), correctAnswer: "1", type: QuestionType.MCQ, points: 2, order: 29 },
        { text: "Briefly describe how to test if a coin is fair using hypothesis testing.", options: null, correctAnswer: "Set H0 p=0.5, collect data, compute test statistic and p-value", type: QuestionType.SHORT, points: 5, order: 30 },
    ];
    for (const q of e1Questions) {
        await prisma.question.create({ data: { examId: e1, text: q.text, options: q.options, correctAnswer: q.correctAnswer, type: q.type, points: q.points, order: q.order, required: true } });
    }
    // e2 minimal realistic set (25 but we'll do 10 for demo, counts derived)
    const e2qs = Array.from({ length: 10 }, (_, i) => ({ text: `Physics Q${i + 1}: Fundamental concept ${i + 1}`, options: JSON.stringify(["Option A", "Option B", "Option C", "Option D"]), correctAnswer: "Option A", type: QuestionType.MCQ, points: 2, order: i + 1 }));
    for (const q of e2qs)
        await prisma.question.create({ data: { examId: e2, text: q.text, options: q.options, correctAnswer: q.correctAnswer, type: q.type, points: q.points, order: q.order, required: true } });
    const e3qs = Array.from({ length: 5 }, (_, i) => ({ text: `CS Quiz Q${i + 1}`, options: JSON.stringify(["O(n)", "O(log n)", "O(1)", "O(n log n)"]), correctAnswer: "O(log n)", type: QuestionType.MCQ, points: 2, order: i + 1 }));
    for (const q of e3qs)
        await prisma.question.create({ data: { examId: e3, text: q.text, options: q.options, correctAnswer: q.correctAnswer, type: q.type, points: q.points, order: q.order, required: true } });
    // e4 draft empty
    const e5qs = Array.from({ length: 5 }, (_, i) => ({ text: `DSA Q${i + 1}`, options: JSON.stringify(["Sorted order", "Reverse", "Random", "Level"]), correctAnswer: "Sorted order", type: QuestionType.MCQ, points: 2, order: i + 1 }));
    for (const q of e5qs)
        await prisma.question.create({ data: { examId: e5, text: q.text, options: q.options, correctAnswer: q.correctAnswer, type: q.type, points: q.points, order: q.order, required: true } });
    // Create sessions + answers + events + reviews for e1
    // Map student email to desired scores
    const scoreMap = {
        "aarav.sharma@example.com": 78,
        "ananya.patel@example.com": 61,
        "aditya.kumar@example.com": 84,
        "diya.nair@example.com": 24,
        "arjun.reddy@example.com": 82,
        "sneha.iyer@example.com": 38,
        "rohan.mehta@example.com": 61,
        "priya.singh@example.com": 78,
    };
    // deterministic timings
    const baseStart = new Date("2026-09-03T09:02:14Z");
    const allQuestionsE1 = await prisma.question.findMany({ where: { examId: e1 }, orderBy: { order: 'asc' } });
    let reviewCounter = 0;
    for (const [email, targetScore] of Object.entries(scoreMap)) {
        const studentId = studentRecords[email];
        const session = await prisma.examSession.create({ data: {
                examId: e1, studentId, startedAt: baseStart, submittedAt: new Date("2026-09-03T09:58:21Z"), status: SessionStatus.SUBMITTED, lastActivityAt: new Date("2026-09-03T09:58:21Z")
            } });
        // answers
        for (let i = 0; i < allQuestionsE1.length; i++) {
            const q = allQuestionsE1[i];
            const ans = q.type === QuestionType.SHORT ? "Sample answer for short question" : (JSON.parse(q.options || "[]")[0] || "A");
            // changeCount based on score
            const changes = targetScore >= 80 ? (i % 3 === 0 ? 2 : 0) : targetScore >= 60 ? (i % 5 === 0 ? 1 : 0) : 0;
            await prisma.answer.create({ data: {
                    sessionId: session.id, questionId: q.id, answer: ans, changeCount: changes, firstAnsweredAt: new Date(baseStart.getTime() + (i * 60 + 30) * 1000), lastChangedAt: new Date(baseStart.getTime() + (i * 60 + 40) * 1000)
                } });
        }
        // events
        const events = [];
        events.push({ type: EventType.SESSION_STARTED, ts: baseStart });
        if (targetScore === 78) { // Aarav
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:15:02Z") });
            events.push({ type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:15:18Z") });
            events.push({ type: EventType.ANSWER_CHANGED, ts: new Date("2026-09-03T09:17:41Z") });
            events.push({ type: EventType.PASTE, ts: new Date("2026-09-03T09:18:03Z") });
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:22:11Z") });
            events.push({ type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:22:18Z") });
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:34:05Z") });
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:41:18Z") });
        }
        else if (targetScore === 61 && email.includes("ananya")) {
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:16:04Z") });
            events.push({ type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:16:12Z") });
            events.push({ type: EventType.QUESTION_ANSWERED, ts: new Date("2026-09-03T09:19:21Z") });
        }
        else if (targetScore === 84) {
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:12:03Z") });
            events.push({ type: EventType.TAB_VISIBLE, ts: new Date("2026-09-03T09:12:14Z") });
            events.push({ type: EventType.PASTE, ts: new Date("2026-09-03T09:14:22Z") });
            events.push({ type: EventType.QUESTION_ANSWERED, ts: new Date("2026-09-03T09:18:44Z") });
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:21:09Z") });
        }
        else if (targetScore === 24) {
            // minimal
        }
        else if (targetScore === 82) {
            events.push({ type: EventType.TAB_HIDDEN, ts: new Date("2026-09-03T09:13:11Z") });
            events.push({ type: EventType.ANSWER_CHANGED, ts: new Date("2026-09-03T09:20:44Z") });
        }
        else if (email.includes("sneha")) {
            events.push({ type: EventType.QUESTION_ANSWERED, ts: new Date("2026-09-03T09:18:00Z") });
        }
        else if (email.includes("rohan")) {
            events.push({ type: EventType.PASTE, ts: new Date("2026-09-03T10:12:03Z") });
        }
        events.push({ type: EventType.SESSION_ENDED, ts: new Date("2026-09-03T09:58:21Z") });
        for (const ev of events) {
            await prisma.examEvent.create({ data: { sessionId: session.id, eventType: ev.type, timestamp: ev.ts, metadata: ev.meta ? JSON.stringify(ev.meta) : null, questionId: ev.qid || null } });
        }
        // Integrity review
        const level = getLevel(targetScore);
        const status = targetScore === 24 ? ReviewStatus.REVIEWED : ReviewStatus.PENDING;
        const review = await prisma.integrityReview.create({ data: {
                sessionId: session.id, score: targetScore, level, status, generatedAt: new Date("2026-09-03T10:05:00Z"), reviewedAt: status === ReviewStatus.REVIEWED ? new Date("2026-09-03T11:00:00Z") : null, reviewedBy: status === ReviewStatus.REVIEWED ? mainTeacherId : null
            } });
        // signals based on score
        if (targetScore === 78) {
            await prisma.integritySignal.createMany({ data: [
                    { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.MEDIUM, points: 18, description: "Repeated focus changes were detected during the exam.", evidence: JSON.stringify(["4 tab switches", "31 seconds total focus loss"]) },
                    { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.MEDIUM, points: 16, description: "Several responses occurred substantially faster than the student's overall response pattern.", evidence: JSON.stringify(["3 responses under 5 seconds"]) },
                    { integrityReviewId: review.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.LOW, points: 8, description: "Multiple answers were changed within short intervals.", evidence: JSON.stringify(["6 changes"]) },
                    { integrityReviewId: review.id, type: SignalType.COPY_PASTE, severity: SignalSeverity.MEDIUM, points: 14, description: "Relevant copy/paste activity was detected during the exam.", evidence: JSON.stringify(["2 paste events"]) },
                ] });
        }
        else if (targetScore === 84) {
            await prisma.integritySignal.createMany({ data: [
                    { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.HIGH, points: 22, description: "Frequent focus changes detected.", evidence: JSON.stringify(["6 tab switches"]) },
                    { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.HIGH, points: 20, description: "Multiple unusually fast responses.", evidence: JSON.stringify(["5 responses under 5s"]) },
                    { integrityReviewId: review.id, type: SignalType.COPY_PASTE, severity: SignalSeverity.MEDIUM, points: 14, description: "Paste events during short-answer questions.", evidence: JSON.stringify(["3 paste events"]) },
                    { integrityReviewId: review.id, type: SignalType.MULTI_SESSION, severity: SignalSeverity.MEDIUM, points: 12, description: "Second session token detected.", evidence: JSON.stringify(["Session resumed"]) },
                ] });
        }
        else if (targetScore === 61 && email.includes("ananya")) {
            await prisma.integritySignal.createMany({ data: [
                    { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.LOW, points: 10, description: "Occasional focus changes detected.", evidence: JSON.stringify(["2 tab switches"]) },
                    { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.MEDIUM, points: 15, description: "Faster-than-typical response burst detected.", evidence: JSON.stringify(["2 rapid responses"]) },
                ] });
        }
        else if (targetScore === 24) {
            await prisma.integritySignal.create({ data: { integrityReviewId: review.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.LOW, points: 5, description: "Minimal answer revision.", evidence: JSON.stringify(["1 change"]) } });
            await prisma.reviewNote.create({ data: { integrityReviewId: review.id, teacherId: mainTeacherId, note: "Reviewed by Dr. Rajesh Kumar. No concerns. Consistent timing and no focus events." } });
        }
        else if (targetScore === 82) {
            await prisma.integritySignal.createMany({ data: [
                    { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.MEDIUM, points: 17, description: "Repeated focus loss.", evidence: JSON.stringify(["4 tab switches"]) },
                    { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.MEDIUM, points: 16, description: "Fast response cluster.", evidence: JSON.stringify(["4 responses under 7s"]) },
                    { integrityReviewId: review.id, type: SignalType.SIMILARITY, severity: SignalSeverity.MEDIUM, points: 15, description: "High overlap with peer responses.", evidence: JSON.stringify(["18/20 matches with Aditya Kumar (72%)"]) },
                ] });
        }
        else if (targetScore === 38) {
            await prisma.integritySignal.create({ data: { integrityReviewId: review.id, type: SignalType.TIMING, severity: SignalSeverity.LOW, points: 9, description: "One faster response.", evidence: JSON.stringify(["1 unusually fast response"]) } });
        }
        else if (targetScore === 61 && email.includes("rohan")) {
            await prisma.integritySignal.createMany({ data: [
                    { integrityReviewId: review.id, type: SignalType.COPY_PASTE, severity: SignalSeverity.LOW, points: 10, description: "Paste detected in short answer.", evidence: JSON.stringify(["1 paste event"]) },
                    { integrityReviewId: review.id, type: SignalType.RAPID_CHANGE, severity: SignalSeverity.MEDIUM, points: 12, description: "Multiple quick revisions.", evidence: JSON.stringify(["5 changes"]) },
                ] });
        }
        else if (targetScore === 78 && email.includes("priya")) {
            await prisma.integritySignal.createMany({ data: [
                    { integrityReviewId: review.id, type: SignalType.TAB_SWITCH, severity: SignalSeverity.MEDIUM, points: 16, description: "Focus changes during exam.", evidence: JSON.stringify(["3 tab switches"]) },
                    { integrityReviewId: review.id, type: SignalType.SUBJECTIVE_SIMILARITY, severity: SignalSeverity.MEDIUM, points: 14, description: "High textual overlap in short answers.", evidence: JSON.stringify(["94% similarity"]) },
                ] });
        }
        reviewCounter++;
    }
    // Notifications for teacher
    await prisma.notification.createMany({ data: [
            { userId: mainTeacherId, title: "Exam submitted — Aarav Sharma", message: "Mathematics Midterm · Integrity review generated (78)" },
            { userId: mainTeacherId, title: "Integrity review generated — Ananya Patel", message: "Score 61 · Requires Review" },
            { userId: mainTeacherId, title: "Teacher review completed — Diya Nair", message: "Marked as Reviewed · No concerns" },
        ] });
    console.log("Seeding completed");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
