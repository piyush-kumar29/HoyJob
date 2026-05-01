const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// This middleware will check if the user is authenticated via Clerk
// It will add the clerk user id to req.auth.userId
module.exports = ClerkExpressRequireAuth();
