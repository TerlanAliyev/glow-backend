
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary konfiqurasiyası (.env faylından məlumatları oxuyur)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Faylların Cloudinary-də necə saxlanacağını təyin edirik
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'lyra_files', // Qovluğun adını daha ümumi edək
    // DƏYİŞİKLİK: İcazə verilən formatları genişləndiririk
    allowed_formats: ['jpg', 'png', 'jpeg', 'mp3', 'm4a', 'webm', 'ogg'],
    // Yüklənən faylın növünə görə fərqli qovluqlara yerləşdirmək (peşəkar yanaşma)
    resource_type: 'auto', 
  },
});

// Multer middleware-ini konfiqurasiya edirik
const upload = multer({ storage: storage });

module.exports = upload;