// const express = require("express");
// const connectDB = require("./config/database");
// const app = express();

// require("dotenv").config();

// connectDB()
//   .then(() => {
//     console.log("Database connection established...");
//     app.listen(process.env.PORT, () => {
//       console.log("Server is successfully listening on port 7777...");
//     });
//   })
//   .catch((err) => {
//     console.error("Database cannot be connected!!");
//   });

// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const hpp = require('hpp');
// const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
// const connectDB = require('./config/database');
// const { errorHandler } = require('./utils/errorHandler');
// const sanitize = require('./middlewares/sanitize');
// // const sanitize = require('./middleware/sanitize');

// dotenv.config();
// connectDB();

// const app = express();

// /* Body parser */
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// /* CORS */
// app.use(
//   cors({
//     origin: process.env.CLIENT_URL || 'http://localhost:3000',
//     credentials: true,
//   })
// );

// /* Security */
// app.use(helmet());
// app.use(sanitize); // ✅ SAFE replacement
// app.use(hpp());

// /* Rate limit */
// app.use(
//   '/api/',
//   rateLimit({
//     windowMs: 10 * 60 * 1000,
//     max: 100,
//   })
// );

// /* Logging */
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// /* Routes */
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/onboarding', require('./routes/onboardingRoutes'));

// /* Health */
// app.get('/health', (_, res) =>
//   res.json({ success: true, message: 'Server running' })
// );

// /* 404 */
// app.use((req, res) =>
//   res.status(404).json({ success: false, message: 'Route not found' })
// );

// /* Error handler */
// app.use(errorHandler);

// const PORT = process.env.PORT || 5001;
// const server = app.listen(PORT, () =>
//   console.log(`🚀 Server running on port ${PORT}`)
// );

// process.on('unhandledRejection', (err) => {
//   console.error(err);
//   server.close(() => process.exit(1));
// });



// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
// const hpp = require('hpp');
// const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
// const connectDB = require('./config/database');
// const { errorHandler } = require('./utils/errorHandler');
// const sanitize = require('./middlewares/sanitize');

// dotenv.config();
// connectDB();

// const app = express();

// /* =========================
//    BODY PARSER
// ========================= */
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());
// // Increase the limit for incoming requests
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));
// /* =========================
//    CORS (MOBILE SAFE)
// ========================= */
// app.use(
//   cors({
//     origin: true, // ✅ allow Expo / mobile / browser
//     credentials: true,
//     allowedHeaders: ['Content-Type', 'Authorization']
//   })
// );

// /* =========================
//    SECURITY
// ========================= */
// app.use(helmet());
// // app.use(sanitize);
// app.use(hpp());

// /* =========================
//    RATE LIMIT
// ========================= */
// app.use(
//   '/api',
//   rateLimit({
//     windowMs: 10 * 60 * 1000,
//     max: 100,
//   })
// );

// /* =========================
//    LOGGING
// ========================= */
// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// /* =========================
//    ROUTES
// ========================= */
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use(sanitize);
// app.use('/api/onboarding', require('./routes/onboardingRoutes'));
// app.use("/api/discover", require("./routes/discoverRoutes"));
// app.use("/api/requests", require("./routes/requestRoutes"));
// app.use("/api/profile", require("./routes/usersRoutes"));

// /* =========================
//    HEALTH CHECK
// ========================= */
// app.get('/health', (req, res) => {
//   res.json({ success: true, message: 'Server running' });
// });

// /* =========================
//    404 HANDLER
// ========================= */
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found',
//   });
// });

// /* =========================
//    ERROR HANDLER
// ========================= */
// app.use(errorHandler);

// /* =========================
//    SERVER (CRITICAL PART)
// ========================= */
// const PORT = process.env.PORT || 5000;

// const server = app.listen(PORT, '0.0.0.0', () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

// /* =========================
//    UNHANDLED REJECTION
// ========================= */
// process.on('unhandledRejection', (err) => {
//   console.error('Unhandled Rejection:', err);
//   server.close(() => process.exit(1));
// });



const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/database');
const { errorHandler } = require('./utils/errorHandler');
const sanitize = require('./middlewares/sanitize');
const presenceCleanup = require('../services/presenceCleanup');
// const presenceCleanup = require('./services/presenceCleanup'); // ADD THIS

dotenv.config();
connectDB();

const app = express();

/* =========================
   BODY PARSER
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Increase the limit for incoming requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/* =========================
   CORS (MOBILE SAFE)
========================= */
app.use(
  cors({
    origin: true, // ✅ allow Expo / mobile / browser
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* =========================
   SECURITY
========================= */
app.use(helmet());
// app.use(sanitize);
app.use(hpp());

/* =========================
   RATE LIMIT
========================= */
app.use(
  '/api',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 1000, // Increased for development and E2EE key fetching
  })
);

/* =========================
   LOGGING
========================= */
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* =========================
   ROUTES
========================= */
app.use('/api/auth', require('./routes/authRoutes'));
app.use(sanitize);
app.use('/api/onboarding', require('./routes/onboardingRoutes'));
app.use("/api/discover", require("./routes/discoverRoutes"));
app.use("/api/requests", require("./routes/requestRoutes"));
app.use("/api/profile", require("./routes/usersRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/calls", require("./routes/callRoutes"));
app.use("/api/subscription", require("./routes/subscriptionRoutes"));

/* =========================
   HEALTH CHECK
========================= */
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server running' });
});

/* =========================
   404 HANDLER
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* =========================
   ERROR HANDLER
========================= */
app.use(errorHandler);

/* =========================
   SERVER (CRITICAL PART)
========================= */
const http = require('http');
const { Server } = require('socket.io');
const { initializeSocketHandlers } = require('./utils/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
  pingTimeout: 60000,
});

// Initialize socket handlers
initializeSocketHandlers(io);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Socket.IO initialized`);

  // START PRESENCE CLEANUP JOB
  presenceCleanup.start();
});

/* =========================
   GRACEFUL SHUTDOWN
========================= */
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received: closing HTTP server gracefully`);

  // Stop presence cleanup
  presenceCleanup.stop();

  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

/* =========================
   UNHANDLED REJECTION
========================= */
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  presenceCleanup.stop(); // Stop cleanup before exit
  server.close(() => process.exit(1));
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));