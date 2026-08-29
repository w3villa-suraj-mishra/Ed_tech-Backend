const codeExecutionService = require('../services/codeExecutionService');

async function runDiagnostic() {
  console.log('=== DIAGNOSTIC TEST 1: READ EXACT STDIN LINES ===');
  const codeDiag1 = `import sys
lines = sys.stdin.read().splitlines()
print("TOTAL LINES READ:", len(lines))
for idx, line in enumerate(lines):
    print(f"LINE {idx+1}: {repr(line)}")
`;
  const input2 = "8\n10 5 2 7 1 9 -2 3\n15";

  console.log('Hex buffer of raw input2:', Buffer.from(input2).toString('hex'));
  console.log('JSON.stringify(input2):', JSON.stringify(input2));

  const resDiag1 = await codeExecutionService.runSingleTestCase({
    questionId: 999,
    language: 'python',
    sourceCode: codeDiag1,
    input: input2,
    expectedOutput: ''
  });

  console.log('\nDiag1 stdout:\n' + resDiag1.stdout);

  console.log('=== DIAGNOSTIC TEST 2: RUN STUDENT CODE SOLUTION ===');
  const studentCodeTest = `def longest_subarray_with_sum_k(nums, k):
    prefix_map = {0: -1}
    current_sum = 0
    max_len = 0
    for i, num in enumerate(nums):
        current_sum += num
        if (current_sum - k) in prefix_map:
            max_len = max(max_len, i - prefix_map[current_sum - k])
        if current_sum not in prefix_map:
            prefix_map[current_sum] = i
    return max_len

n = int(input())
nums = list(map(int, input().split()))
k = int(input())

print(longest_subarray_with_sum_k(nums, k))
`;

  const resDiag2 = await codeExecutionService.runSingleTestCase({
    questionId: 999,
    language: 'python',
    sourceCode: studentCodeTest,
    input: input2,
    expectedOutput: '4'
  });

  console.log('\nDiag2 stdout:\n' + resDiag2.stdout);
  console.log('Diag2 stderr:\n' + resDiag2.stderr);
  console.log('Diag2 status:', resDiag2.status);
  console.log('Diag2 passed:', resDiag2.passed);
}

runDiagnostic().then(() => process.exit(0)).catch(err => {
  console.error('Diagnostic error:', err);
  process.exit(1);
});
