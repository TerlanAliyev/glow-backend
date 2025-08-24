const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Login və registrasiya cəhdlərini məhdudlaşdır
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dəqiqə
  max: 15, // maksimum 5 cəhd
  message: { 
    error: 'Çox giriş cəhdi! 15 dəqiqə sonra yenidən cəhd edin.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60 // saniyələrlə
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Health check və docs-u skip et
    return req.path === '/health' || req.path.startsWith('/api-docs');
  }
});

// Ümumi API sorğularını məhdudlaşdır
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dəqiqə
  max: 300, // maksimum 300 sorğu (Lyra aktiv tətbiq olduğu üçün yuxarı limit)
  message: {
    error: 'Çox sorğu göndərmisiz! Bir az gözləyin.',
    code: 'GENERAL_RATE_LIMIT_EXCEEDED',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Health check, docs və static faylları skip et
    const skipPaths = ['/health', '/api-docs', '/favicon.ico'];
    return skipPaths.some(path => req.path.includes(path));
  }
  // keyGenerator silindi - default istifadə olunacaq
});

// Mesaj göndərmə limiti (daha strict)
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dəqiqə
  max: 30, // dəqiqədə maksimum 30 mesaj
  message: { 
    error: 'Çox sürətlə mesaj göndərirsiz! Bir az gözləyin.',
    code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
  // keyGenerator silindi - authenticated user tracking üçün ayrıca middleware yazacağıq
});

// Signal göndərmə limiti (ən strict)
const signalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dəqiqə
  max: 10, // dəqiqədə maksimum 10 siqnal
  message: { 
    error: 'Çox sürətlə siqnal göndərirsiz! Premium üzvlük üçün limitsiz siqnal.',
    code: 'SIGNAL_RATE_LIMIT_EXCEEDED',
    retryAfter: 60,
    upgradeMessage: 'Premium üzvlüklə limitsiz siqnal göndərin!'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Premium users skip et (əgər premium system varsa)
    return req.user?.subscriptionStatus === 'PREMIUM';
  }
  // keyGenerator silindi
});

// Helmet konfiqurasiyası (Security headers)
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'", 
        "data:", 
        "https://res.cloudinary.com",
        "https://lh3.googleusercontent.com", // Google profile images
        "https://graph.facebook.com" // Facebook profile images (əgər varsa)
      ],
      connectSrc: [
        "'self'", 
        "wss:", 
        "ws:", 
        "https://api.cloudinary.com",
        "https://accounts.google.com" // Google OAuth
      ],
      scriptSrc: ["'self'"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"], // Audio/Video files
      frameSrc: ["'none'"], // iFrame protection
      objectSrc: ["'none'"], // Object/embed protection
    }
  },
  crossOriginEmbedderPolicy: false, // Socket.IO üçün lazım
  crossOriginResourcePolicy: { policy: "cross-origin" }, // API üçün lazım
  hsts: {
    maxAge: 31536000, // 1 il
    includeSubDomains: true,
    preload: true
  }
});

// Custom security headers middleware
const customSecurityHeaders = (req, res, next) => {
  // Server info-nu gizlə
  res.removeHeader('X-Powered-By');
  
  // Əlavə security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // API Cache control
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// Rate limit error handler
const rateLimitErrorHandler = (err, req, res, next) => {
  if (err && err.message && err.message.includes('Too many requests')) {
    return res.status(429).json({
      error: 'Çox sorğu',
      message: 'Rate limit aşılmışdır. Zəhmət olmasa gözləyin.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.round(err.msBeforeNext / 1000) || 60
    });
  }
  next(err);
};

// Export all security middleware
module.exports = {
  authLimiter,
  generalLimiter,
  messageLimiter,
  signalLimiter,
  helmetConfig,
  customSecurityHeaders,
  rateLimitErrorHandler
};