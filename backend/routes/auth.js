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
      <div style="max-width: 600px; margin: 0 auto; font-family: 'Inter', sans-serif; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #000000; padding: 40px; text-align: center;">
          <h1 style="color: #EFFF00; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px;">HoyJob</h1>
        </div>
        <div style="padding: 40px;">
          <h2 style="color: #1a202c; font-size: 24px; font-weight: 700; margin-bottom: 24px;">Verify your email address</h2>
          <p style="color: #4a5568; font-size: 16px; line-height: 24px; margin-bottom: 32px;">
            Thanks for joining HoyJob! To get started, please confirm your email address by clicking the button below.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${verificationURL}" style="background-color: #000000; color: #EFFF00; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="color: #718096; font-size: 14px; margin-bottom: 0;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            <span style="color: #3182ce;">${verificationURL}</span>
          </p>
        </div>
      </div>
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
