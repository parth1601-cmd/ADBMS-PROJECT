import { prisma } from '../src/utils/prisma.js'

async function main(){
  console.log('🔍 Validating ExamGuard database...')
  const checks: {name:string, ok:boolean, details?:string}[] = []
  function add(name:string, ok:boolean, details?:string){ checks.push({name, ok, details}); console.log(`${ok?'✅':'❌'} ${name}${details?` - ${details}`:''}`) }

  // Tables exist
  try{
    const tables: any = await prisma.$queryRawUnsafe(`SHOW TABLES`)
    const tableNames = tables.map((r:any)=> Object.values(r)[0])
    const expected = ['user','exam','question','questionoption','examsession','answer','examevent','integrityreview','integritysignal','reviewnote','notification','auditlog','report','exameligibility']
    for(const t of expected){
      add(`Table ${t} exists`, tableNames.includes(t))
    }
  }catch(e:any){ add('Tables check', false, e.message) }

  // Constraints
  try{
    const fks: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_TYPE='FOREIGN KEY' AND TABLE_SCHEMA='examguard'`)
    add('Foreign keys exist', Number(fks[0].cnt) > 5, `found ${fks[0].cnt}`)
  }catch(e:any){ add('FK check', false, e.message) }

  // Views
  try{
    const views: any = await prisma.$queryRawUnsafe(`SHOW FULL TABLES IN examguard WHERE TABLE_TYPE LIKE 'VIEW'`)
    add('Views exist', views.length >= 5, `found ${views.length}`)
  }catch(e:any){ add('Views check', false, e.message) }

  // Functions
  try{
    const funcs: any = await prisma.$queryRawUnsafe(`SHOW FUNCTION STATUS WHERE Db='examguard'`)
    add('Functions exist', funcs.length >= 4, `found ${funcs.length}`)
  }catch(e:any){ add('Functions check', false, e.message) }

  // Procedures
  try{
    const procs: any = await prisma.$queryRawUnsafe(`SHOW PROCEDURE STATUS WHERE Db='examguard'`)
    add('Procedures exist', procs.length >= 5, `found ${procs.length}`)
  }catch(e:any){ add('Procedures check', false, e.message) }

  // Indexes
  try{
    const idx: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA='examguard'`)
    add('Indexes exist', Number(idx[0].cnt) > 20, `found ${idx[0].cnt}`)
  }catch(e:any){ add('Indexes check', false, e.message) }

  // Seed data valid
  try{
    const users = await prisma.user.count()
    const exams = await prisma.exam.count()
    add('Seed data valid', users>10 && exams>0, `users=${users} exams=${exams}`)
  }catch(e:any){ add('Seed check', false, e.message) }

  // Triggers
  try{
    const trigs: any = await prisma.$queryRawUnsafe(`SHOW TRIGGERS FROM examguard`)
    add('Triggers exist', trigs.length >= 3, `found ${trigs.length}`)
  }catch(e:any){ add('Triggers check', false, e.message) }

  const failed = checks.filter(c=> !c.ok)
  if(failed.length){
    console.error(`\n❌ Validation failed: ${failed.length} checks failed`)
    process.exit(1)
  } else {
    console.log('\n✅ All database checks passed')
  }
  await prisma.$disconnect()
}
main().catch(e=>{ console.error(e); process.exit(1) })
