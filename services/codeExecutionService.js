/**
 * Code Execution Service Abstraction
 * 
 * Provides a clean interface for evaluating and running code submissions.
 * Since no secure sandboxed execution runtime (e.g. Judge0 / Piston / gVisor) is currently
 * configured, all local execution calls are blocked to prevent executing arbitrary user code
 * inside the API / serverless process.
 */

const codeExecutionService = {
  /**
   * Run code against visible test cases
   * @param {Object} params { language, sourceCode, input }
   */
  runCode: async ({ language, sourceCode, input }) => {
    return {
      success: false,
      code: 'CODE_EXECUTOR_UNAVAILABLE',
      message: 'Code execution is currently unavailable. Please try again later.',
      stdout: null,
      stderr: null,
      executionTime: 0,
      status: 'CODE_EXECUTOR_UNAVAILABLE'
    };
  },

  /**
   * Evaluate code against all test cases (visible + hidden) for scoring
   * @param {Object} params { language, sourceCode, testCases }
   */
  evaluateCode: async ({ language, sourceCode, testCases }) => {
    return {
      success: false,
      code: 'CODE_EXECUTOR_UNAVAILABLE',
      message: 'Code evaluation is currently unavailable. Scoring pending executor setup.',
      passedTests: 0,
      totalTests: Array.isArray(testCases) ? testCases.length : 0,
      score: 0,
      status: 'PENDING_EVALUATION'
    };
  }
};

module.exports = codeExecutionService;
