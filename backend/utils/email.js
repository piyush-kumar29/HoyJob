const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  // 2) Define the email options
  const mailOptions = {
    from: 'HoyJob <noreply@hoyjob.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // 3) Actually send the email
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('NODEMAILER ERROR:', err);
    throw err;
  }
};

module.exports = sendEmail;
