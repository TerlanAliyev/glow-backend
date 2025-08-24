
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const cron = require('node-cron');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerOptions = require('./src/config/swagger');

const authRouter = require('./src/auth/auth.router');
const profileRouter = require('./src/profile/profile.router');
const interestRouter = require('./src/interest/interest.router');
const locationRouter = require('./src/location/location.router');
const errorHandler = require('./src/middleware/errorHandler');
const chatRouter = require('./src/chat/chat.router'); // YENİ İMPORT
const { initializeSocket } = require('./src/socket/socket.handler');
const notificationRouter = require('./src/notification/notification.router'); // YENİ İMPORT
const userRouter = require('./src/user/user.router'); // YENİ İMPORT
const connectionRouter = require('./src/connection/connection.router'); // YENİ İMPORT
const { generalLimiter } = require('./src/middleware/rateLimiter'); // Ümumi limiteri import edirik
const healthRouter = require('./src/health/health.router'); // Health router importu
const feedbackRouter = require('./src/feedback/feedback.router'); // YENİ İMPORT
const adminRouter = require('./src/admin/admin.router'); // YENİ İMPORT
const purchaseRouter = require('./src/purchase/purchase.router');
const rewardsRouter = require('./src/rewards/rewards.router');
const { sendReEngagementNotifications, calculateVenueStatistics } = require('./src/scheduler/scheduler.service');
const gamificationRouter = require('./src/gamification/gamification.router');
const challengeRouter = require('./src/challenge/challenge.router');
const { initializeScheduledJobs } = require('./src/scheduler/scheduler'); // <-- YENİ İMPORT
const optionsRouter = require('./src/options/options.router');

const app = express();
const server = http.createServer(app);

// === DÜZƏLİŞ BURADADIR ===
// CORS ayarını yenidən "*" edirik ki, həm admin.socket.io, həm də
// bizim öz test.html faylımız qoşula bilsin.
const io = new Server(server, {
    cors: {
        origin: "*", // Bütün ünvanlardan gələn bağlantılara icazə ver
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use('/api/auth', authRouter);
app.use('/api/profile', profileRouter);
app.use('/api/interest', interestRouter);
app.use('/api/location', locationRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notification', notificationRouter); // YENİ ROUTER-İ QOŞURUQ
app.use('/api/users', userRouter); // YENİ ROUTER-İ QOŞURUQ
app.use('/api/connections', connectionRouter); // YENİ ROUTER-İ QOŞURUQ
app.use('/api', generalLimiter);
app.use('/api/health', healthRouter); // Health check routeri
app.use('/api/feedback', feedbackRouter); // YENİ ROUTER-İ QOŞURUQ
app.use('/api/admin', adminRouter); // Admin routerini qoşuruq
app.use('/api/purchase', purchaseRouter);
app.use('/api/rewards', rewardsRouter);
app.use('/api', gamificationRouter); // və ya '/api/gamification'
app.use('/api', challengeRouter);
app.use('/api', optionsRouter);


app.get('/', (req, res) => {
    res.send('Glow Backend is running! API docs available at /api-docs');
});
cron.schedule('0 12 * * *', () => {
    sendReEngagementNotifications();
}, {
    timezone: "Asia/Baku" // Bakı vaxtı ilə işləməsi üçün
});
cron.schedule('0 5 * * *', () => {
    calculateVenueStatistics();
}, {
    timezone: "Asia/Baku"
});

initializeSocket(io);

app.use(errorHandler);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
    initializeScheduledJobs();
});