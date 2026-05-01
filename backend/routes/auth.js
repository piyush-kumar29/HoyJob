const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { createClerkClient } = require('@clerk/clerk-sdk-node');

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// @route   GET api/auth/me
// @desc    Get current user (using Clerk session)
router.get('/me', auth, async (req, res) => {
  try {
    const clerkUserId = req.auth.userId;
    
    // 1. Get user details from Clerk
    const clerkUser = await clerk.users.getUser(clerkUserId);
    
    // 2. Find or Create the user in our MongoDB (to keep our role/bio etc)
    let user = await User.findOne({ email: clerkUser.emailAddresses[0].emailAddress });
    
    if (!user) {
      user = new User({
        name: `${clerkUser.firstName} ${clerkUser.lastName}`,
        email: clerkUser.emailAddresses[0].emailAddress,
        password: 'clerk-managed', // placeholder as Clerk handles password
        role: clerkUser.publicMetadata.role || 'agent'
      });
      await user.save();
    }

    res.json(user);
  } catch (err) {
    console.error('Me Error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
