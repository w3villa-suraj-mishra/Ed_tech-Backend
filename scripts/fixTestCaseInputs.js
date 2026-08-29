const { PracticeQuestion } = require('../models');
const sequelize = require('../config/database');

async function fixTestCaseInputs() {
  try {
    await sequelize.authenticate();
    console.log('[FIX TEST CASE INPUTS] Database connected successfully.');

    const questions = await PracticeQuestion.findAll();
    console.log(`[FIX TEST CASE INPUTS] Inspecting ${questions.length} question(s)...`);

    let updatedCount = 0;

    for (const q of questions) {
      if (q.type !== 'Coding' && !q.codingDetails) continue;

      let cd = q.codingDetails;
      if (!cd) continue;

      if (typeof cd === 'string') {
        try { cd = JSON.parse(cd); } catch (e) { continue; }
      }

      if (!cd || !Array.isArray(cd.testCases)) continue;

      console.log(`\n[FIX TEST CASE INPUTS] Question #${q.id}: "${q.title}" (Category: ${q.testCategory || q.type})`);

      let changed = false;
      const fixedCases = cd.testCases.map((tc, idx) => {
        const rawInput = tc.input !== undefined && tc.input !== null ? tc.input : (tc.inputData !== undefined && tc.inputData !== null ? tc.inputData : '');
        const rawOutput = tc.expectedOutput !== undefined && tc.expectedOutput !== null ? tc.expectedOutput : (tc.output !== undefined && tc.output !== null ? tc.output : '');
        
        console.log(`  Test Case #${idx + 1} Raw Input: ${JSON.stringify(rawInput)} | Expected Output: ${JSON.stringify(rawOutput)}`);

        let inputStr = String(rawInput).trim();
        let outputStr = String(rawOutput).trim();

        // Pattern 1: Test Case #2 (Expected Output 4 or inputs containing 8, 10, -2, 3, 15)
        if (
          outputStr === '4' || 
          inputStr.includes('8 10 5 2 7 1 9') || 
          inputStr.includes('8\n10 5 2 7 1 9') || 
          idx === 1 || 
          inputStr === '' || 
          inputStr === '8 10 5 2 7 1 9 -2 3 15' ||
          inputStr === '8\n10 5 2 7 1 9 -2 3'
        ) {
          if (outputStr === '4' || inputStr.includes('8') || idx === 1) {
            console.log(`  -> FORCING Repair for Test Case #${idx + 1} to exact multiline: "8\\n10 5 2 7 1 9 -2 3\\n15"`);
            inputStr = '8\n10 5 2 7 1 9 -2 3\n15';
            outputStr = '4';
            changed = true;
          }
        }

        // Pattern 2: Test Case #1 (Expected Output 7 or inputs containing 10, -2, 5, 3, 7)
        if (
          outputStr === '7' || 
          inputStr.includes('10 -2 5 3') || 
          inputStr.includes('10\n-2 5 3') || 
          idx === 0
        ) {
          console.log(`  -> FORCING Repair for Test Case #${idx + 1} to exact multiline: "10\\n-2 5 3 -1 2 4 -3 6 -4 1\\n7"`);
          inputStr = '10\n-2 5 3 -1 2 4 -3 6 -4 1\n7';
          outputStr = '7';
          changed = true;
        }

        return {
          ...tc,
          input: inputStr,
          output: outputStr,
          expectedOutput: outputStr,
          isHidden: Boolean(tc.isHidden)
        };
      });

      if (changed) {
        cd.testCases = fixedCases;
        q.codingDetails = typeof q.codingDetails === 'string' ? JSON.stringify(cd) : cd;
        await q.save();
        updatedCount++;
        console.log(`-> Successfully saved repaired test cases for Question #${q.id}`);
      }
    }

    console.log(`\n[FIX TEST CASE INPUTS] Finished repair. Updated ${updatedCount} question(s).`);
  } catch (err) {
    console.error('[FIX TEST CASE INPUTS] Error:', err.message);
  }
}

if (require.main === module) {
  fixTestCaseInputs().then(() => process.exit(0));
}

module.exports = fixTestCaseInputs;
