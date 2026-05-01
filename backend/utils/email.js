const https = require('https');

const sendEmail = async (options) => {
  const data = JSON.stringify({
    sender: {
      name: 'HoyJob',
      email: process.env.BREVO_SENDER_EMAIL
    },
    to: [{ email: options.email }],
    subject: options.subject,
    textContent: options.message,
    htmlContent: options.html
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(data)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Brevo API error ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
};

module.exports = sendEmail;
