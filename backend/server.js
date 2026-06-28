require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const timeRoutes = require('./routes/timeRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const leaveRoutes = require('./routes/leaveRoutes'); // Leave Routes
const sequelize = require('./config/database');
const passport = require('passport');
const http = require('http'); // Add HTTP module
const { Server } = require('socket.io'); // Add Socket.io

require('./config/passport');
require('./models/TimeEntry');
require('./models/Screenshot');
require('./models/LeaveRequest'); // Ensure Leave model syncs

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

// Make io accessible globally in controllers
app.set('io', io);

io.on('connection', (socket) => {
    console.log('A dashboard client connected for live updates');
    socket.on('disconnect', () => {
        console.log('Dashboard client disconnected');
    });
});

// Advanced Concept: Security Middleware
app.use(helmet({ crossOriginResourcePolicy: false })); // allow images to load locally
app.use(cors({ origin: "*" }));
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Serve static uploads
app.use('/uploads', express.static('uploads'));

// Advanced Concept: Rate Limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }); // Increased for SS uploads
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/time', timeRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/leave', leaveRoutes); // Leave API

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

const PORT = 5000;

// Database Connection & Server Start
sequelize.sync({ alter: true })
    .then(() => {
        console.log('MySQL Database Connected successfully!');
        server.listen(PORT, () => console.log(`Server running on port ${PORT} with WebSockets`));
    })
    .catch(err => {
        console.error('MySQL Connection Error:', err);
    });
