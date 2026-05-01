const nodemailer = require('nodemailer');
const dns = require('dns');

// Force Node.js to resolve DNS to IPv4 first
// Render's free tier does not support outbound IPv6
dns.setDefaultResultOrder('ipv4first');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 15000,
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
