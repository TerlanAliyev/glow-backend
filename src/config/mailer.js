
const nodemailer = require('nodemailer');

// Nodemailer üçün transporter yaradırıq
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  secure: false, // TLS istifadə edirik
});

const sendPasswordResetEmail = async (to, token) => {
    console.log('📩 Gələn email:', to);  // <-- buranı dəyişdir

    console.log('sendPasswordResetEmail funksiyası çağırıldı:', to, token);

    const mailOptions = {
        from: `"Lyra Support" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Lyra Şifrə Bərpa Kodu',
        html: `
            <div>Şifrə Bərpa Kodunuz: <b>${token}</b></div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Şifrə bərpa emaili ${to} ünvanına göndərildi.`);
    } catch (error) {
        console.error(`Email göndərilərkən xəta:`, error.response || error.message || error);
    }
};

const sendAccountDeletionEmail = async (to, token) => {
    const mailOptions = {
        from: `"Lyra Support" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: 'Lyra Hesab Silmə Təsdiq Kodu',
        html: `
            <div>Hesabınızı silmək üçün təsdiq kodunuz: <b>${token}</b>. Bu kodu heç kimlə paylaşmayın.</div>
        `,
    };
    await transporter.sendMail(mailOptions);
};

const sendEmailChangeConfirmationEmail = async (to, token) => {
    const mailOptions = {
        from: `"Lyra Support" <${process.env.EMAIL_USER}>`,
        to: to, // Yeni e-poçta göndəririk
        subject: 'Lyra E-poçt Dəyişikliyi Təsdiq Kodu',
        html: `<div>E-poçt ünvanınızı təsdiqləmək üçün kodunuz: <b>${token}</b>.</div>`,
    };
    await transporter.sendMail(mailOptions);
};
module.exports = { transporter, 
    sendPasswordResetEmail,
    sendAccountDeletionEmail,
    sendEmailChangeConfirmationEmail };