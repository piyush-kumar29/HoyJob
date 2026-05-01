const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const sendEmail = require('../utils/email');

// @route   POST api/auth/signup
// @desc    Register user
router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user = new User({ 
      name, 
      email, 
      password, 
      role, 
      verificationToken,
      isVerified: false 
    });
    
    await user.save();

    // Send Magic Link
    const verifyUrl = `${req.protocol}://${req.get('host')}/api/auth/verify/${verificationToken}`;
    const message = `Welcome to HoyJob! Please verify your account by clicking the link below:\n\n${verifyUrl}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Verify your HoyJob Account',
        message,
        html: `
          <div style="font-family: 'Sora', sans-serif; background-color: #f9f9f9; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 2px solid #000000; border-radius: 16px; overflow: hidden; box-shadow: 10px 10px 0px #000000;">
              <div style="background-color: #000000; padding: 30px; text-align: center;">
                <h1 style="color: #EFFF00; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">HoyJob</h1>
              </div>
              <div style="padding: 40px;">
                <h2 style="color: #000000; font-size: 24px; margin-top: 0;">Verify your account</h2>
                <p style="color: #444444; font-size: 16px; line-height: 1.6;">Welcome to the future of high-impact job matching. You're just one step away from activating your HoyJob professional profile.</p>
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verifyUrl}" style="display: inline-block; background-color: #EFFF00; color: #000000; padding: 18px 36px; font-weight: 900; text-decoration: none; border-radius: 12px; border: 2px solid #000000; text-transform: uppercase; letter-spacing: 1px; box-shadow: 4px 4px 0px #000000; transition: all 0.2s;">Activate Account</a>
                </div>
                <p style="color: #888888; font-size: 14px; text-align: center;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="color: #000000; font-size: 12px; text-align: center; word-break: break-all;">${verifyUrl}</p>
              </div>
              <div style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="color: #aaaaaa; font-size: 12px; margin: 0;">&copy; 2026 HoyJob Global Inc. All rights reserved.</p>
              </div>
            </div>
          </div>
        `
      });

      res.status(201).json({ msg: 'Registration successful. Please check your email to verify your account.' });
    } catch (err) {
      user.verificationToken = undefined;
      await user.save();
      return res.status(500).json({ msg: 'Error sending verification email. Please try again later.' });
    }
  } catch (err) {
    console.error('Signup Error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// @route   GET api/auth/verify/:token
// @desc    Verify email via magic link
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    if (!user) return res.status(400).json({ msg: 'Invalid or expired verification link' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 4rem;">
        <h1 style="color: #22c55e;">Verification Successful! ✓</h1>
        <p>Your HoyJob account is now active. You can close this window and log in.</p>
        <a href="/" style="color: #000; font-weight: bold;">Go to Login</a>
      </div>
    `);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    if (!user.isVerified) {
      return res.status(401).json({ msg: 'Please verify your email before logging in.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, bio: user.bio } });
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error('Me Error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
