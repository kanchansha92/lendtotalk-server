// // middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// // Protect routes - verify JWT token
// exports.protect = async (req, res, next) => {
//   try {
//     let token;

//     // Check for token in Authorization header
//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith('Bearer')
//     ) {
//       token = req.headers.authorization.split(' ')[1];
//     }

//     // Check if token exists
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Not authorized, no token provided',
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Get user from token
//     req.user = await User.findById(decoded.id).select('-password -otp -otpExpiry');

//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // Check if user is active
//     if (!req.user.isActive) {
//       return res.status(403).json({
//         success: false,
//         message: 'Account is deactivated',
//       });
//     }

//     // Check if user is blocked
//     if (req.user.isBlocked) {
//       return res.status(403).json({
//         success: false,
//         message: 'Account is blocked',
//         reason: req.user.blockedReason,
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Auth Middleware Error:', error);

//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Token has expired, please login again',
//       });
//     }

//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid token',
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: 'Not authorized',
//       error: error.message,
//     });
//   }
// };

// // Require profile completion
// exports.requireProfileComplete = async (req, res, next) => {
//   try {
//     if (!req.user.profileCompleted) {
//       return res.status(403).json({
//         success: false,
//         message: 'Please complete your profile first',
//         needsProfileSetup: true,
//         currentStep: req.user.registrationStep,
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Profile Check Middleware Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message,
//     });
//   }
// };

// // Check user type (for premium features)
// exports.authorize = (...userTypes) => {
//   return (req, res, next) => {
//     if (!userTypes.includes(req.user.userType)) {
//       return res.status(403).json({
//         success: false,
//         message: 'You do not have permission to perform this action',
//         requiredType: userTypes,
//         currentType: req.user.userType,
//       });
//     }
//     next();
//   };
// };

// // Check subscription status
// exports.checkSubscription = (requiredPlan) => {
//   return (req, res, next) => {
//     const planHierarchy = {
//       free: 0,
//       basic: 1,
//       premium: 2,
//       vip: 3,
//     };

//     const userPlanLevel = planHierarchy[req.user.subscription.type] || 0;
//     const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

//     if (userPlanLevel < requiredPlanLevel) {
//       return res.status(403).json({
//         success: false,
//         message: `This feature requires ${requiredPlan} subscription`,
//         currentPlan: req.user.subscription.type,
//         requiredPlan,
//       });
//     }

//     // Check if subscription is active
//     if (
//       req.user.subscription.endDate &&
//       new Date(req.user.subscription.endDate) < new Date()
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: 'Your subscription has expired',
//         needsRenewal: true,
//       });
//     }

//     next();
//   };
// };

// // Rate limiting middleware for OTP requests
// const otpRequestTracker = new Map();

// exports.rateLimitOTP = (req, res, next) => {
//   const identifier = req.body.phone || req.body.email || req.body.userId;

//   if (!identifier) {
//     return next();
//   }

//   const now = Date.now();
//   const requests = otpRequestTracker.get(identifier) || [];

//   // Remove requests older than 1 hour
//   const recentRequests = requests.filter((time) => now - time < 3600000);

//   // Allow maximum 5 OTP requests per hour
//   if (recentRequests.length >= 5) {
//     return res.status(429).json({
//       success: false,
//       message: 'Too many OTP requests. Please try again later.',
//     });
//   }

//   // Add current request
//   recentRequests.push(now);
//   otpRequestTracker.set(identifier, recentRequests);

//   next();
// };

// // Clean up old OTP request records every hour
// setInterval(() => {
//   const now = Date.now();
//   for (const [identifier, requests] of otpRequestTracker.entries()) {
//     const recentRequests = requests.filter((time) => now - time < 3600000);
//     if (recentRequests.length === 0) {
//       otpRequestTracker.delete(identifier);
//     } else {
//       otpRequestTracker.set(identifier, recentRequests);
//     }
//   }
// }, 3600000); // Run every hour









// // middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// // Protect routes - verify JWT token
// exports.protect = async (req, res, next) => {
//   try {
//     let token;

//     // Check for token in cookies first, then Authorization header
//     if (req.cookies.token) {
//       token = req.cookies.token;
//     } else if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith('Bearer')
//     ) {
//       token = req.headers.authorization.split(' ')[1];
//     }

//     // Check if token exists
//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: 'Not authorized, no token provided',
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Get user from token
//     req.user = await User.findById(decoded.id).select('-password -otp -otpExpiry');

//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // Check if user is active
//     if (!req.user.isActive) {
//       return res.status(403).json({
//         success: false,
//         message: 'Account is deactivated',
//       });
//     }

//     // Check if user is blocked
//     if (req.user.isBlocked) {
//       return res.status(403).json({
//         success: false,
//         message: 'Account is blocked',
//         reason: req.user.blockedReason,
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Auth Middleware Error:', error);

//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Token has expired, please login again',
//       });
//     }

//     if (error.name === 'JsonWebTokenError') {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid token',
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: 'Not authorized',
//       error: error.message,
//     });
//   }
// };

// // Require profile completion
// exports.requireProfileComplete = async (req, res, next) => {
//   try {
//     if (!req.user.profileCompleted) {
//       return res.status(403).json({
//         success: false,
//         message: 'Please complete your profile first',
//         needsProfileSetup: true,
//         currentStep: req.user.registrationStep,
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Profile Check Middleware Error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error',
//       error: error.message,
//     });
//   }
// };

// // Check user type (for premium features)
// exports.authorize = (...userTypes) => {
//   return (req, res, next) => {
//     if (!userTypes.includes(req.user.userType)) {
//       return res.status(403).json({
//         success: false,
//         message: 'You do not have permission to perform this action',
//         requiredType: userTypes,
//         currentType: req.user.userType,
//       });
//     }
//     next();
//   };
// };

// // Check subscription status
// exports.checkSubscription = (requiredPlan) => {
//   return (req, res, next) => {
//     const planHierarchy = {
//       free: 0,
//       basic: 1,
//       premium: 2,
//       vip: 3,
//     };

//     const userPlanLevel = planHierarchy[req.user.subscription.type] || 0;
//     const requiredPlanLevel = planHierarchy[requiredPlan] || 0;

//     if (userPlanLevel < requiredPlanLevel) {
//       return res.status(403).json({
//         success: false,
//         message: `This feature requires ${requiredPlan} subscription`,
//         currentPlan: req.user.subscription.type,
//         requiredPlan,
//       });
//     }

//     // Check if subscription is active
//     if (
//       req.user.subscription.endDate &&
//       new Date(req.user.subscription.endDate) < new Date()
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: 'Your subscription has expired',
//         needsRenewal: true,
//       });
//     }

//     next();
//   };
// };

// // Rate limiting middleware for OTP requests
// const otpRequestTracker = new Map();

// exports.rateLimitOTP = (req, res, next) => {
//   const identifier = req.body.phone || req.body.email || req.body.userId;

//   if (!identifier) {
//     return next();
//   }

//   const now = Date.now();
//   const requests = otpRequestTracker.get(identifier) || [];

//   // Remove requests older than 1 hour
//   const recentRequests = requests.filter((time) => now - time < 3600000);

//   // Allow maximum 5 OTP requests per hour
//   if (recentRequests.length >= 5) {
//     return res.status(429).json({
//       success: false,
//       message: 'Too many OTP requests. Please try again later.',
//     });
//   }

//   // Add current request
//   recentRequests.push(now);
//   otpRequestTracker.set(identifier, recentRequests);

//   next();
// };

// // Clean up old OTP request records every hour
// setInterval(() => {
//   const now = Date.now();
//   for (const [identifier, requests] of otpRequestTracker.entries()) {
//     const recentRequests = requests.filter((time) => now - time < 3600000);
//     if (recentRequests.length === 0) {
//       otpRequestTracker.delete(identifier);
//     } else {
//       otpRequestTracker.set(identifier, recentRequests);
//     }
//   }
// }, 3600000); // Run every hour






const jwt = require('jsonwebtoken');
const User = require('../models/User');

/* ======================================================
   PROTECT ROUTES (JWT VERIFY)
====================================================== */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Expect: Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token missing',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user
    const user = await User.findById(decoded.id).select(
      '-otp -otpExpiry -otpAttempts'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Account checks
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked',
        reason: user.blockedReason,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};

/* ======================================================
   REQUIRE PROFILE COMPLETION
====================================================== */
exports.requireProfileComplete = (req, res, next) => {
  if (!req.user.profileCompleted) {
    return res.status(403).json({
      success: false,
      message: 'Please complete your profile first',
      currentStep: req.user.registrationStep,
    });
  }
  next();
};

/* ======================================================
   ROLE / USER TYPE AUTHORIZATION
====================================================== */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        requiredRoles: roles,
        currentRole: req.user.userType,
      });
    }
    next();
  };
};

/* ======================================================
   SUBSCRIPTION CHECK (OPTIONAL)
====================================================== */
exports.checkSubscription = (requiredPlan) => {
  return (req, res, next) => {
    const hierarchy = {
      free: 0,
      basic: 1,
      premium: 2,
      vip: 3,
    };

    const userLevel = hierarchy[req.user.subscription?.type] ?? 0;
    const requiredLevel = hierarchy[requiredPlan] ?? 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        message: `Requires ${requiredPlan} subscription`,
      });
    }

    if (
      req.user.subscription?.endDate &&
      new Date(req.user.subscription.endDate) < new Date()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Subscription expired',
      });
    }

    next();
  };
};
exports.trackPresence = async (req, res, next) => {
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, {
      lastActive: new Date(),
      isCurrentlyOnline: true
    });
  }
  next();
};