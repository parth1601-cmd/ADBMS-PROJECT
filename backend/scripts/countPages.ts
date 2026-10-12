import fs from 'fs'
import path from 'path'
const files = fs.readdirSync(process.cwd()).filter(f => f.startsWith('ExamGuard_') && f.endsWith('.pdf'))
for (const file of files.slice(0,3)) {
  const buf = fs.readFileSync(path.join(process.cwd(), file))
  const str = buf.toString('utf8')
  // Count Page X of Y occurrences
  const m = str.match(/Page \d+ of \d+/g)
  console.log(file, 'Page footers found:', m ? m.length : 0, 'unique?', m ? [...new Set(m)].length : 0)
  // Also count /Type /Page but not /Pages via precise regex
  const m2 = str.match(/\/Type\s*\/Page\s/g)
  console.log('  /Type /Page count', m2 ? m2.length : 0)
  const m3 = str.match(/\/Pages/g)
  console.log('  /Pages count', m3 ? m3.length : 0)
  console.log('  Size', buf.length, 'bytes')
}
