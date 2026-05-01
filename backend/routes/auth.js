const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/email');
const auth = require('../middleware/auth');

// @route   POST api/auth/signup
// @desc    Register user & send verification email
router.post('/signup', async (req, res) => {
  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const password = req.body.password.trim();
  const role = req.body.role;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    user = new User({
      name,
      email,
      password, // The Model's pre-save hook will hash this automatically!
      role,
      verificationToken,
      isVerified: false
    });

    await user.save();

    // Send verification email
    const verificationURL = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
    
    const message = `Welcome to HoyJob! Please verify your email by clicking the link below:\n\n${verificationURL}\n\nThis link will expire in 24 hours.`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Epilogue:wght@900&family=Inter:wght@400;600&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: 'Inter', -apple-system, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f7f7f7; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #000000; padding: 50px 40px; text-align: center;">
                    <h1 style="color: #EFFF00; margin: 0; font-family: 'Epilogue', sans-serif; font-size: 38px; font-weight: 900; letter-spacing: -1.5px; text-transform: uppercase;">HoyJob</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 50px 40px;">
                    <h2 style="color: #111827; font-size: 28px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px;">Verify your account</h2>
                    <p style="color: #4b5563; font-size: 17px; line-height: 28px; margin: 0 0 32px 0;">
                      Welcome to the future of hiring. To activate your account and start exploring premium opportunities, please verify your email address.
                    </p>
                    <div style="text-align: center;">
                      <a href="${verificationURL}" style="background-color: #000000; color: #EFFF00; padding: 20px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block; transition: transform 0.2s;">VERIFY ADDRESS</a>
                    </div>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <div style="border-top: 1px solid #e5e7eb;"></div>
                  </td>
                </tr>
                <!-- Footer Info -->
                <tr>
                  <td style="padding: 32px 40px; background-color: #fafafa;">
                    <p style="color: #9ca3af; font-size: 13px; line-height: 20px; margin: 0;">
                      If you didn't create an account, you can safely ignore this email.
                      <br><br>
                      <strong>Link not working?</strong> Copy this into your browser:
                      <br>
                      <span style="color: #6366f1; word-break: break-all;">${verificationURL}</span>
                    </p>
                  </td>
                </tr>
              </table>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">© 2026 HoyJob Inc. All Rights Reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify your HoyJob account',
        message,
        html
      });

      res.status(201).json({ 
        msg: 'Verification email sent! Please check your inbox.',
        requiresVerification: true 
      });
    } catch (err) {
      console.error('Email Error:', err);
      // If email fails, we might want to delete the user or handle it
      res.status(500).json({ msg: 'Error sending verification email. Please try again later.' });
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/verify/:token
// @desc    Verify email token
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).send('<h1>Invalid or expired verification token</h1>');
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <div style="text-align:center; padding:50px; font-family:sans-serif;">
        <h1 style="color:#155724">Email Verified Successfully!</h1>
        <p>You can now close this window and log in to HoyJob.</p>
        <a href="/pages/login.html" style="display:inline-block; background:#000; color:#EFFF00; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold;">Go to Login</a>
      </div>
    `);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password.trim();

    console.log(`Login attempt for: ${email}`);

    let user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User not found for ${email}`);
      return res.status(400).json({ msg: "Account doesn't exist. Please create one." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Login failed: Password mismatch for ${email}`);
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        msg: 'Please verify your email before logging in.',
        notVerified: true
      });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
