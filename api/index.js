const app = require('../server');

module.exports = (req, res) => {
  try {
    return app(req, res);
  } catch (error) {
    console.error("Vercel Serverless Function Execution Error:", error);
    return res.status(500).json({
      success: false,
      message: "Serverless Execution Error",
      error: error.message
    });
  }
};
