const { PracticeQuestion } = require('../models');
const sequelize = require('../config/database');

async function fixTestCaseInputs() {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    const questions = await PracticeQuestion.findAll();
    console.log(`Inspecting ${questions.length} question(s) in database...`);

    let updatedCount = 0;

    for (const q of questions) {
      if (q.type !== 'Coding' && !q.codingDetails) continue;

      let cd = q.codingDetails;
      if (!cd) continue;

      if (typeof cd === 'string') {
        try { cd = JSON.parse(cd); } catch (e) { continue; }
      }

      if (!cd || !Array.isArray(cd.testCases)) continue;

      console.log(`\nInspect Question #${q.id}: "${q.title}"`);

      let changed = false;
      const fixedCases = cd.testCases.map((tc, idx) => {
        const rawInput = tc.input !== undefined ? tc.input : (tc.inputData || '');
        console.log(`  Test Case #${idx + 1} Raw Input: ${JSON.stringify(rawInput)}`);

        let inputStr = String(rawInput).trim();

        // Check for single-line or 2-line input variants of Test Case #2 ("8 10 5 2 7 1 9 -2 3 15" or "8\n10 5 2 7 1 9 -2 3")
        if (inputStr === '8 10 5 2 7 1 9 -2 3 15' || inputStr === '8\n10 5 2 7 1 9 -2 3' || inputStr === '8\n10 5 2 7 1 9 -2 3\n') {
          console.log(`  -> Repairing Test Case #2 input to exact multiline format: "8\\n10 5 2 7 1 9 -2 3\\n15"`);
          inputStr = '8\n10 5 2 7 1 9 -2 3\n15';
          changed = true;
        }
        // Check for single-line input "10 -2 5 3 -1 2 4 -3 6 -4 1 7"
        else if (inputStr === '10 -2 5 3 -1 2 4 -3 6 -4 1 7' || inputStr === '10\n-2 5 3 -1 2 4 -3 6 -4 1') {
          console.log(`  -> Repairing Test Case #1 input to exact multiline format: "10\\n-2 5 3 -1 2 4 -3 6 -4 1\\n7"`);
          inputStr = '10\n-2 5 3 -1 2 4 -3 6 -4 1\n7';
          changed = true;
        }

        return {
          ...tc,
          input: inputStr
        };
      });

      if (changed) {
        cd.testCases = fixedCases;
        q.codingDetails = typeof q.codingDetails === 'string' ? JSON.stringify(cd) : cd;
        await q.save();
        updatedCount++;
        console.log(`-> Saved updated test cases for Question #${q.id}`);
      }
    }

    console.log(`\nFinished inspection & repair. Updated ${updatedCount} question(s).`);
  } catch (err) {
    console.error('Error during test case input fix:', err.message);
  }
}

if (require.main === module) {
  fixTestCaseInputs().then(() => process.exit(0));
}

module.exports = fixTestCaseInputs;
