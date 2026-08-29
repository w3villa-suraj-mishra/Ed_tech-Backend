const axios = require('axios');
const logger = require('../utils/logger');

// Centralized Language Mappings for Judge0
const LANGUAGE_MAPPINGS = {
  python: { judge0Id: 71, name: 'Python' },
  javascript: { judge0Id: 63, name: 'JavaScript' },
  java: { judge0Id: 62, name: 'Java' },
  cpp: { judge0Id: 54, name: 'C++' },
  'c++': { judge0Id: 54, name: 'C++' },
  c: { judge0Id: 50, name: 'C' },
  go: { judge0Id: 60, name: 'Go' }
};

/**
 * Normalizes output strings by trimming whitespace and normalizing line breaks
 */
function normalizeOutput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\r\n/g, '\n').trim();
}

/**
 * Normalizes Judge0 execution response into standard format
 */
function normalizeExecutionResult(data, expectedOutput = '') {
  const stdout = data.stdout || '';
  const stderr = data.stderr || '';
  const compileOutput = data.compile_output || '';
  const statusId = data.status?.id || 0;
  const statusDescription = data.status?.description || 'Unknown';
  const executionTime = parseFloat(data.time) || 0.01;
  const memory = data.memory || 0;

  let status = 'ACCEPTED';
  let passed = false;

  if (statusId === 3) {
    status = 'ACCEPTED';
    passed = true;
  } else if (statusId === 4) {
    status = 'WRONG_ANSWER';
    passed = false;
  } else if (statusId === 5) {
    status = 'TIME_LIMIT_EXCEEDED';
    passed = false;
  } else if (statusId === 6) {
    status = 'COMPILATION_ERROR';
    passed = false;
  } else if (statusId >= 7 && statusId <= 12) {
    // If stderr or compileOutput contains SyntaxError, mark as COMPILATION_ERROR
    if (stderr.includes('SyntaxError') || compileOutput.includes('SyntaxError')) {
      status = 'COMPILATION_ERROR';
    } else {
      status = 'RUNTIME_ERROR';
    }
    passed = false;
  } else {
    status = 'EXECUTOR_ERROR';
    passed = false;
  }

  const normActual = normalizeOutput(stdout);
  const normExpected = normalizeOutput(expectedOutput);

  if (expectedOutput !== undefined && expectedOutput !== null && expectedOutput !== '') {
    if (status === 'ACCEPTED') {
      passed = normActual === normExpected;
      if (!passed) {
        status = 'WRONG_ANSWER';
      }
    }
  } else if (status === 'ACCEPTED') {
    passed = true;
  }

  return {
    success: true,
    passed,
    status,
    statusId,
    statusDescription,
    stdout,
    stderr,
    compileOutput,
    executionTime,
    memory,
    actualOutput: normActual,
    expectedOutput: normExpected
  };
}

/**
 * Isolated Sandboxed Code Execution Service using Judge0 Engine
 */
const codeExecutionService = {
  /**
   * Run a single test case on the isolated Judge0 runtime with debug logging
   */
  runSingleTestCase: async ({ questionId, language, sourceCode, input = '', expectedOutput = '' }) => {
    const langKey = (language || 'python').toLowerCase();
    const config = LANGUAGE_MAPPINGS[langKey] || LANGUAGE_MAPPINGS.python;

    const executorUrl = process.env.CODE_EXECUTOR_URL || 'https://ce.judge0.com';
    const apiKey = process.env.CODE_EXECUTOR_API_KEY;
    const apiHost = process.env.CODE_EXECUTOR_HOST || 'judge0-ce.p.rapidapi.com';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['X-RapidAPI-Key'] = apiKey;
        headers['X-RapidAPI-Host'] = apiHost;
      }

      // Ensure stdin is passed as exact string format
      const stdinInput = typeof input === 'string' ? input : String(input || '');

      const res = await axios.post(
        `${executorUrl.replace(/\/$/, '')}/submissions?wait=true`,
        {
          source_code: sourceCode,
          language_id: config.judge0Id,
          stdin: stdinInput
        },
        { headers, timeout: 12000 }
      );

      const normalized = normalizeExecutionResult(res.data || {}, expectedOutput);

      // Log execution trace for debugging
      console.log(`\n=================== [CODE EXECUTION TRACE] ===================`);
      console.log(`questionId: ${questionId || 'N/A'}`);
      console.log(`language: ${language} (Key: ${langKey})`);
      console.log(`executorLanguageId: ${config.judge0Id}`);
      console.log(`sourceCodeLength: ${sourceCode?.length || 0}`);
      console.log(`input (stdin): ${JSON.stringify(stdinInput)}`);
      console.log(`executorStatus: ${res.data?.status?.id} (${res.data?.status?.description})`);
      console.log(`normalizedStatus: ${normalized.status}`);
      console.log(`stdout: ${JSON.stringify(normalized.stdout)}`);
      console.log(`stderr: ${JSON.stringify(normalized.stderr)}`);
      console.log(`compileOutput: ${JSON.stringify(normalized.compileOutput)}`);
      console.log(`executionTime: ${normalized.executionTime}s`);
      console.log(`memory: ${normalized.memory} KB`);
      console.log(`============================================================\n`);

      return normalized;
    } catch (err) {
      logger.error(`[Judge0 Sandbox Error]: ${err.message}`);
      return {
        success: false,
        passed: false,
        status: 'CODE_EXECUTOR_UNAVAILABLE',
        message: 'Code execution service is currently unavailable: ' + err.message,
        stdout: '',
        stderr: err.message,
        compileOutput: '',
        executionTime: 0,
        memory: 0
      };
    }
  },

  /**
   * Run code against VISIBLE test cases for "Run Code" button
   */
  runCode: async ({ questionId, language, sourceCode, testCases = [] }) => {
    if (!sourceCode || !sourceCode.trim()) {
      return {
        success: false,
        status: 'INVALID_INPUT',
        message: 'Source code cannot be empty.',
        testResults: []
      };
    }

    const visibleCases = Array.isArray(testCases) && testCases.length > 0
      ? testCases
      : [{ input: '', expectedOutput: '', isHidden: false }];

    const testResults = [];
    let passedCount = 0;
    let overallStatus = 'ACCEPTED';
    let firstStderr = '';
    let firstCompileOutput = '';
    let maxTime = 0;
    let maxMem = 0;

    for (let i = 0; i < visibleCases.length; i++) {
      const tc = visibleCases[i];
      const result = await codeExecutionService.runSingleTestCase({
        questionId,
        language,
        sourceCode,
        input: tc.input || '',
        expectedOutput: tc.output || tc.expectedOutput || ''
      });

      if (!result.success && result.status === 'CODE_EXECUTOR_UNAVAILABLE') {
        return {
          success: false,
          code: 'CODE_EXECUTOR_UNAVAILABLE',
          status: 'CODE_EXECUTOR_UNAVAILABLE',
          message: 'Code execution is currently unavailable. Please try again later.',
          testResults: []
        };
      }

      if (result.stderr && !firstStderr) firstStderr = result.stderr;
      if (result.compileOutput && !firstCompileOutput) firstCompileOutput = result.compileOutput;
      if (result.executionTime > maxTime) maxTime = result.executionTime;
      if (result.memory > maxMem) maxMem = result.memory;

      if (result.passed) {
        passedCount++;
      } else if (overallStatus === 'ACCEPTED') {
        overallStatus = result.status;
      }

      testResults.push({
        testCaseIndex: i + 1,
        input: tc.input !== undefined && tc.input !== null ? String(tc.input) : '',
        expectedOutput: String(tc.expectedOutput || tc.output || tc.expected_output || ''),
        actualOutput: result.actualOutput !== undefined && result.actualOutput !== null ? String(result.actualOutput) : String(result.stdout || ''),
        passed: result.passed,
        status: result.status,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compileOutput: result.compileOutput || '',
        executionTime: result.executionTime,
        memory: result.memory
      });
    }

    const allPassed = passedCount === visibleCases.length;

    return {
      success: true,
      status: allPassed ? 'ACCEPTED' : overallStatus,
      allPassed,
      passedTests: passedCount,
      totalTests: visibleCases.length,
      stdout: testResults[0]?.stdout || '',
      stderr: firstStderr,
      compileOutput: firstCompileOutput,
      executionTime: maxTime,
      memory: maxMem,
      testResults
    };
  },

  /**
   * Evaluate code against ALL test cases (visible + hidden) for test submission scoring
   */
  evaluateCode: async ({ questionId, language, sourceCode, testCases = [] }) => {
    if (!sourceCode || !sourceCode.trim()) {
      return {
        success: true,
        allPassed: false,
        passedTests: 0,
        totalTests: testCases.length || 1,
        scorePercentage: 0,
        status: 'EMPTY_SUBMISSION',
        testResults: []
      };
    }

    const allCases = Array.isArray(testCases) && testCases.length > 0
      ? testCases
      : [{ input: '', expectedOutput: '' }];

    const testResults = [];
    let passedCount = 0;
    let overallStatus = 'ACCEPTED';

    for (let i = 0; i < allCases.length; i++) {
      const tc = allCases[i];
      const result = await codeExecutionService.runSingleTestCase({
        questionId,
        language,
        sourceCode,
        input: tc.input || '',
        expectedOutput: tc.output || tc.expectedOutput || ''
      });

      if (!result.success && result.status === 'CODE_EXECUTOR_UNAVAILABLE') {
        return {
          success: false,
          code: 'CODE_EXECUTOR_UNAVAILABLE',
          status: 'CODE_EXECUTOR_UNAVAILABLE',
          message: 'Code execution service unavailable during evaluation.',
          allPassed: false,
          passedTests: 0,
          totalTests: allCases.length,
          scorePercentage: 0,
          testResults: []
        };
      }

      if (result.passed) {
        passedCount++;
      } else if (overallStatus === 'ACCEPTED') {
        overallStatus = result.status;
      }

      testResults.push({
        testCaseIndex: i + 1,
        isHidden: !!tc.isHidden,
        passed: result.passed,
        status: result.status,
        executionTime: result.executionTime
      });
    }

    const totalCount = allCases.length;
    const scorePercentage = totalCount > 0 ? (passedCount / totalCount) : 0;
    const allPassed = passedCount === totalCount;

    return {
      success: true,
      allPassed,
      passedTests: passedCount,
      totalTests: totalCount,
      scorePercentage,
      status: allPassed ? 'ACCEPTED' : overallStatus,
      testResults
    };
  }
};

module.exports = codeExecutionService;
