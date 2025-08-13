const winston = require('winston');

const logger = winston.createLogger({
  // Logun səviyyəsi: 'info' və ondan daha yüksək səviyyəli (warn, error) bütün logları qeydə al
  level: 'info',
  // Log formatı: JSON formatında, zaman damğası ilə birlikdə
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  // Logların hara yazılacağını təyin edən "transport"-lar
  transports: [
    // Bütün 'error' səviyyəli logları 'error.log' faylına yaz
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Bütün logları (info və yuxarı) 'combined.log' faylına yaz
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Əgər production mühitində deyiliksə (yəni lokalda işləyiriksə),
// logları daha oxunaqlı formatda terminala da yazdırırıq.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(), // Rəngli format
      winston.format.simple()    // Sadə format
    ),
  }));
}

module.exports = logger;