const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Use the built-in 'gmail' service config which is most reliable
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 15000
  });

  const mailOptions = {
    from: `HoyJob <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
