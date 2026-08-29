const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const sequelize = require('./config/database');
const routes = require('./routes');
const adminRoutes = require('./routes/adminRoutes');
const logger = require('./utils/logger');
const { configurePassport, passport } = require('./config/passport');
const startSilverExpirationCron = require('./utils/cron');

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { socketService } = require('./services/notificationService');

const app = express();
const server = http.createServer(app);

if (!process.env.VERCEL) {
  // Initialize Socket.IO with CORS (Only on full Node.js servers like Render/local)
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3001',
        'http://localhost:3001',
        'http://localhost:3000'
      ],
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const cleanToken = token.replace('Bearer ', '');
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'fallbackSecretKeyForJWT12345');
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id || socket.user?._id;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socketService.init(io);
  startSilverExpirationCron();
}

// ==========================================
// MIDDLEWARE
// ==========================================

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  'http://localhost:3001',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// DB connection safety check middleware for Vercel Serverless
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/') {
    return next();
  }
  if (!process.env.DATABASE_URL && (process.env.DB_HOST === 'localhost' || !process.env.DB_HOST) && process.env.VERCEL) {
    return res.status(500).json({
      success: false,
      message: "Database Error: Vercel serverless function cannot connect to localhost PostgreSQL. Please configure DATABASE_URL in Vercel Environment Variables pointing to a remote PostgreSQL database (Supabase, Neon, Render, etc.)."
    });
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Passport OAuth
configurePassport();
app.use(passport.initialize());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check & root route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'EdTech API Backend is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Public DB migration trigger endpoint for Vercel production
app.get('/run-migrations', async (req, res) => {
  try {
    await sequelize.authenticate();
    await sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_practice_questions_testCategory') THEN 
          CREATE TYPE "public"."enum_practice_questions_testCategory" AS ENUM('MCQ', 'Coding', 'Topic Practice', 'Mock Test', 'Interview Test', 'Daily Quiz'); 
        END IF; 
      END $$;
    `);
    await sequelize.query(`ALTER TABLE "practice_questions" ADD COLUMN IF NOT EXISTS "testCategory" "public"."enum_practice_questions_testCategory" NOT NULL DEFAULT 'MCQ';`);
    await sequelize.query(`ALTER TABLE "practice_questions" ADD COLUMN IF NOT EXISTS "answerDetails" JSON;`);
    await sequelize.query(`
      ALTER TYPE "public"."enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'Multiple Select';
      ALTER TYPE "public"."enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'True/False';
      ALTER TYPE "public"."enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'Short Answer';
      ALTER TYPE "public"."enum_practice_questions_type" ADD VALUE IF NOT EXISTS 'Fill in the Blank';
    `).catch(() => {});
    return res.status(200).json({ success: true, message: 'Database migration and sync executed successfully!' });
  } catch (err) {
    console.error('Migration endpoint error:', err);
    return res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
});

// ==========================================
// ROUTES
// ==========================================
app.use('/', routes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.message);
  console.error('[UNHANDLED SERVER ERROR STACK]', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: err.message,
    stack: err.stack
  });
});

// ==========================================
// DATABASE & SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  const startServer = async () => {
    try {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized successfully');
      try {
        const fixTestCaseInputs = require('./scripts/fixTestCaseInputs');
        await fixTestCaseInputs();
      } catch (fixErr) {
        logger.error('Fix test case inputs script error:', fixErr.message);
      }
    } catch (error) {
      logger.error('Database connection warning (server started without DB):', error.message);
    }

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      console.log(`\n✓ EdTech Backend Server with Socket.IO`);
      console.log(`✓ Running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV}\n`);
    });
  };
  startServer();
}

module.exports = app;
