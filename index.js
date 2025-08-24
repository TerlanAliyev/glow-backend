const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const cron = require('node-cron');

// Security middleware-lər
const { 
  authLimiter, 
  generalLimiter, 
  messageLimiter, 
  signalLimiter,
  helmetConfig 
} = require('./src/middleware/security');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = require('./src/config/swagger');

const authRouter = require('./src/auth/auth.router');
const profileRouter = require('./src/profile/profile.router');
const interestRouter = require('./src/interest/interest.router');
const locationRouter = require('./src/location/location.router');
const errorHandler = require('./src/middleware/errorHandler');
const chatRouter = require('./src/chat/chat.router');
const { initializeSocket } = require('./src/socket/socket.handler');
const notificationRouter = require('./src/notification/notification.router');
const userRouter = require('./src/user/user.router');
const connectionRouter = require('./src/connection/connection.router');
const healthRouter = require('./src/health/health.router');
const feedbackRouter = require('./src/feedback/feedback.router');
const adminRouter = require('./src/admin/admin.router');
const purchaseRouter = require('./src/purchase/purchase.router');
const rewardsRouter = require('./src/rewards/rewards.router');
const { sendReEngagementNotifications, calculateVenueStatistics } = require('./src/scheduler/scheduler.service');
const gamificationRouter = require('./src/gamification/gamification.router');
const challengeRouter = require('./src/challenge/challenge.router');
const { initializeScheduledJobs } = require('./src/scheduler/scheduler');
const optionsRouter = require('./src/options/options.router');

const app = express();
const server = http.createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://your-frontend-domain.com"] 
      : ["http://localhost:3000", "http://localhost:19006"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = ['https://your-frontend-domain.com'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    } else {
      const devOrigins = [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://localhost:19006'
      ];
      if (!origin || devOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token']
};

const PORT = process.env.PORT || 3000;

// Production-da trust proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware-lər (ƏN ƏVVƏL!)
app.use(helmetConfig);

// CORS və JSON
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
app.use(generalLimiter); // Bütün API-yə ümumi limit

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Ana səhifə
app.get('/', (req, res) => {
    res.json({
        message: 'Lyra Backend is running!',
        version: '1.0.0',
        docs: '/api-docs',
        health: '/api/health'
    });
});

// Health check (rate limit olmadan)
app.use('/api/health', healthRouter);

// Auth route-ları (xüsusi rate limit)
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/users', authLimiter, userRouter);

// Mesaj və siqnal route-ları (xüsusi rate limit)
app.use('/api/chat', messageLimiter, chatRouter);
app.use('/api/connections', signalLimiter, connectionRouter);

// Digər API route-ları
app.use('/api/profile', profileRouter);
app.use('/api/interest', interestRouter);
app.use('/api/location', locationRouter);
app.use('/api/notification', notificationRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/admin', adminRouter);
app.use('/api/purchase', purchaseRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api', gamificationRouter);
app.use('/api', challengeRouter);
app.use('/api', optionsRouter);

// Cron jobs
cron.schedule('0 12 * * *', () => {
    sendReEngagementNotifications();
}, {
    timezone: "Asia/Baku"
});

cron.schedule('0 5 * * *', () => {
    calculateVenueStatistics();
}, {
    timezone: "Asia/Baku"
});

// Socket initialization
initializeSocket(io);

// Error handler (ƏN SONDA!)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route tapılmadı',
        message: `${req.method} ${req.originalUrl} mövcud deyil`
    });
});

// Server başlatma
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    initializeScheduledJobs();
});