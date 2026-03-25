


const User = require('../models/User');
const ConnectionRequest = require('../models/ConnectionRequest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendSMS } = require('../utils/smsService');
const { otpMessage } = require('../utils/otpMessage');
// const verifyGoogleToken = require('../utils/verifyGoogleToken');
const verifyFacebookToken = require('../utils/verifyFacebookToken');

/* ================= CONSTANTS ================= */
const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN = 60 * 1000;   // 60 seconds
const MAX_ATTEMPTS = 5;

/* ================= HELPERS ================= */
const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/* ======================================================
   REGISTER (SIGNUP)
====================================================== */
/* ======================================================
   REGISTER (SIGNUP)
====================================================== */
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username already exists',
      });
    }

    const user = new User({
      username,
      password,
      authProvider: 'local',
      isVerified: true, // Auto-verify for now
      registrationStep: 'name_entry', // Next step: name entry
      profileCompleted: false,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token: generateToken(user._id),
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   VERIFY SIGNUP OTP
====================================================== */
// exports.verifyOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;
//     if (!userId || !otp)
//       return res.status(400).json({ success: false, message: 'Missing data' });

//     const user = await User.findById(userId);
//     if (!user)
//       return res.status(404).json({ success: false, message: 'User not found' });

//     if (user.otpExpiry < Date.now())
//       return res.status(400).json({ success: false, message: 'OTP expired' });

//     if (user.otpAttempts >= MAX_ATTEMPTS)
//       return res.status(403).json({
//         success: false,
//         message: 'Too many attempts. Please resend OTP.',
//       });

//     const isValid = await bcrypt.compare(otp, user.otp);
//     if (!isValid) {
//       user.otpAttempts += 1;
//       await user.save();
//       return res.status(400).json({ success: false, message: 'Invalid OTP' });
//     }

//     user.isVerified = true;
//     user.otp = undefined;
//     user.otpExpiry = undefined;
//     user.otpAttempts = 0;
//     user.registrationStep = 'name_entry';

//     await user.save();

//     res.json({
//       success: true,
//       message: 'Phone number verified',
//       data: {
//         token: generateToken(user._id),
//         user,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

/* ======================================================
   RESEND SIGNUP OTP
====================================================== */
// exports.resendOTP = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     const user = await User.findById(userId);
//     if (!user)
//       return res.status(404).json({ success: false, message: 'User not found' });

//     if (user.isVerified)
//       return res.status(400).json({
//         success: false,
//         message: 'User already verified. Please login.',
//       });

//     if (user.otpLastSentAt && Date.now() - user.otpLastSentAt < OTP_COOLDOWN)
//       return res.status(429).json({
//         success: false,
//         message: 'Please wait before requesting another OTP',
//       });

//     const otp = generateOTP();
//     user.otp = await hashOTP(otp);
//     user.otpExpiry = Date.now() + OTP_EXPIRY;
//     user.otpAttempts = 0;
//     user.otpResendCount += 1;
//     user.otpLastSentAt = Date.now();

//     await user.save();

//     await sendSMS({
//       to: user.phone,
//       message: otpMessage(otp, 'resend'),
//     });

//     res.json({ success: true, message: 'OTP resent successfully' });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

/* ======================================================
   LOGIN
====================================================== */

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: generateToken(user._id),
        user,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   VERIFY LOGIN OTP
====================================================== */
// exports.verifyLoginOTP = async (req, res) => {
//   try {
//     const { userId, otp } = req.body;

//     const user = await User.findById(userId);
//     if (!user)
//       return res.status(404).json({ success: false, message: 'User not found' });

//     if (user.otpExpiry < Date.now())
//       return res.status(400).json({ success: false, message: 'OTP expired' });

//     const isValid = await bcrypt.compare(otp, user.otp);
//     if (!isValid) {
//       user.otpAttempts += 1;
//       await user.save();
//       return res.status(400).json({ success: false, message: 'Invalid OTP' });
//     }

//     user.otp = undefined;
//     user.otpExpiry = undefined;
//     user.lastLogin = Date.now();

//     await user.save();

//     res.json({
//       success: true,
//       message: 'Login successful',
//       data: {
//         token: generateToken(user._id),
//         user,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

/* ======================================================
   RESEND LOGIN OTP
====================================================== */
// exports.resendLoginOTP = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     const user = await User.findById(userId);
//     if (!user)
//       return res.status(404).json({ success: false, message: 'User not found' });

//     if (user.otpLastSentAt && Date.now() - user.otpLastSentAt < OTP_COOLDOWN)
//       return res.status(429).json({
//         success: false,
//         message: 'Please wait before requesting OTP again',
//       });

//     const otp = generateOTP();
//     user.otp = await hashOTP(otp);
//     user.otpExpiry = Date.now() + OTP_EXPIRY;
//     user.otpAttempts = 0;
//     user.otpLastSentAt = Date.now();

//     await user.save();

//     await sendSMS({
//       to: user.phone,
//       message: otpMessage(otp, 'login'),
//     });

//     res.json({ success: true, message: 'Login OTP resent' });
//   } catch (error) {
//     res.status(500).json({ success: false, error: error.message });
//   }
// };

exports.googleLogin = async (req, res) => {
  try {
    const { name, email, profilePicture, googleId } = req.body;

    // 1️⃣ Validate input
    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Email and Google ID are required",
      });
    }

    // 2️⃣ Find existing user by email
    let user = await User.findOne({ email });

    // 3️⃣ If user exists via PHONE → link Google
    if (user && user.authProvider === "phone") {
      user.authProvider = "google"; // or migrate to array later
      user.socialId = googleId;
      user.profilePicture = profilePicture || user.profilePicture;
      user.isVerified = true;
    }

    // 4️⃣ Block if email exists via other provider (Facebook, Apple, etc.)
    if (
      user &&
      !["google", "phone"].includes(user.authProvider)
    ) {
      return res.status(400).json({
        success: false,
        message: `Email already registered via ${user.authProvider}`,
      });
    }

    // 5️⃣ Create new Google user if not exists
    if (!user) {
      user = await User.create({
        name,
        email,
        profilePicture,
        authProvider: "google",
        socialId: googleId,
        isVerified: true,
        registrationStep: "completed",
      });
    }

    // 6️⃣ Update last login
    user.lastLogin = Date.now();
    await user.save();

    // 7️⃣ Send response
    res.status(200).json({
      success: true,
      data: {
        token: generateToken(user._id),
        user,
      },
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.facebookLogin = async (req, res) => {
  try {
    const { name, email, profilePicture, facebookId } = req.body;

    if (!email || !facebookId) {
      return res.status(400).json({
        success: false,
        message: 'Email and Facebook ID are required',
      });
    }

    let user = await User.findOne({ email });

    if (user) {
      // If user exists but registered via Phone, you can choose to link them 
      // or return error. Current logic: return error to prevent hijacking.
      if (user.authProvider !== 'facebook' && user.authProvider !== 'phone') {
        return res.status(400).json({
          success: false,
          message: `This email is already associated with ${user.authProvider} login.`,
        });
      }

      // Update social ID if not present
      if (!user.socialId) user.socialId = facebookId;
    } else {
      // Create new user if email doesn't exist
      user = await User.create({
        name,
        email,
        profilePicture,
        authProvider: 'facebook',
        socialId: facebookId,
        isVerified: true,
        registrationStep: 'completed',
        profileCompleted: true,
      });
    }

    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: 'Facebook login successful',
      data: {
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture
        },
      },
    });
  } catch (error) {
    console.error("FB Backend Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
/* ======================================================
   GET ME
====================================================== */
exports.getMe = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-otp -otpExpiry');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    // Calculate connection count
    const connectionCount = await ConnectionRequest.countDocuments({
      $or: [
        { sender: userId, status: 'accepted' },
        { receiver: userId, status: 'accepted' },
      ],
    });

    // Add connection count to the response
    const userData = user.toObject();
    userData.connection = connectionCount;

    res.json({ success: true, data: userData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   LOGOUT
====================================================== */
exports.logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};




