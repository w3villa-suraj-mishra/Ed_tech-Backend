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

// Initialize Socket.IO with CORS
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

// Socket Authentication and Room Allocation
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
    logger.info(`User connected to notification socket room: user:${userId}`);
  }

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected for user: ${userId}`);
  });
});

socketService.init(io);

// Initialize Silver expiration cron job
startSilverExpirationCron();

// ==========================================
// MIDDLEWARE
// ==========================================

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3001',
      'http://localhost:3001',
      'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Passport OAuth
configurePassport();
app.use(passport.initialize());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// ROUTES
// ==========================================
app.use('/', routes);
app.use('/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

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
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==========================================
// DATABASE & SERVER
// ==========================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Sync database
    await sequelize.sync({ alter: false });
    logger.info('Database synchronized successfully');

    // Start http server (with Socket.IO attached)
    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      console.log(`\n✓ EdTech Backend Server with Socket.IO`);
      console.log(`✓ Running on: http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV}\n`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
