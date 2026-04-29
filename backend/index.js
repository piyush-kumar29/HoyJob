const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Optimization & Security
const helmet = require('helmet');
const compression = require('compression');

mongoose.set('strictQuery', false);

const Message = require('./models/Message');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

// Production CORS Configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
].map(url => url?.replace(/\/$/, '')).filter(Boolean); // Remove trailing slashes for consistency

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      process.env.NODE_ENV !== 'production' ||
                      !process.env.FRONTEND_URL ||
                      origin.includes('onrender.com') ||
                      origin.includes('localhost') ||
                      origin.includes('127.0.0.1');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      // Instead of throwing an error which triggers a 500 without headers, 
      // we can just return false which the cors middleware handles better
      callback(null, false); 
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

const io = socketIo(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    env: process.env.NODE_ENV || 'development',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    frontend: process.env.FRONTEND_URL || 'not set',
    uptime: process.uptime() 
  });
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('CRITICAL: MONGO_URI is not defined.');
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    // Don't exit(1) immediately to allow Render to stay "alive" for debugging
  });

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/applications', require('./routes/applications'));

// Socket.io Logic
const users = {}; 

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('register', (userId) => {
    if (!userId) return;
    users[userId] = socket.id;
    console.log(`User registered: ${userId}`);
  });

  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, text, imageUrl } = data;
    console.log(`Socket: Attempting to send message from ${senderId} to ${receiverId}`);

    if (!senderId || !receiverId || (!text && !imageUrl)) {
      console.warn('Socket: Invalid message data received');
      return socket.emit('messageError', { error: 'Invalid message data' });
    }
    
    try {
      const newMessage = new Message({ 
        sender: senderId, 
        receiver: receiverId, 
        text: text || '', 
        imageUrl: imageUrl || '' 
      });
      await newMessage.save();
      console.log('Socket: Message saved to DB');

      const receiverSocketId = users[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('newMessage', newMessage);
        console.log(`Socket: Message forwarded to receiver socket ${receiverSocketId}`);
      }
      
      socket.emit('messageSent', newMessage);
    } catch (err) {
      console.error('Socket sendMessage error:', err);
      socket.emit('messageError', { error: 'Failed to save message', details: err.message });
    }
  });

  socket.on('disconnect', () => {
    for (let userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Global Error Handler (Keep this before server.listen)
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  
  // Ensure CORS headers are sent even on errors so the frontend can read the message
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
