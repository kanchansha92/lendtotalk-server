


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
const OTP_COOLDOWN = 30 * 1000;   // 30 seconds
const MAX_ATTEMPTS = 5;

/* ================= HELPERS ================= */
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    console.warn('JWT_SECRET is not defined in .env! Using fallback.');
  }
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret_123', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashOTP = async (otp) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
};

/* ======================================================
   CHECK PHONE
====================================================== */
exports.checkPhone = async (req, res) => {
  try {
    const { phone, countryCode } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const fullCountryCode = countryCode || '+91';
    const user = await User.findOne({ phone, countryCode: fullCountryCode });

    if (user && user.isVerified) {
      return res.json({
        success: true,
        exists: true,
        message: 'Phone number is already registered',
      });
    }

    res.json({
      success: true,
      exists: false,
      message: 'Phone number is available',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   REGISTER OTP (STEP 1)
====================================================== */
exports.registerOTP = async (req, res) => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const fullCountryCode = countryCode || '+91';

    // Check if user already exists
    const existingUser = await User.findOne({ phone, countryCode: fullCountryCode });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this phone number already exists',
      });
    }

    let user = existingUser;
    if (!user) {
      user = new User({
        phone,
        countryCode: fullCountryCode,
        authProvider: 'phone',
        registrationStep: 'otp_verification',
      });
    }

    // Security: Cooldown check
    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt < OTP_COOLDOWN) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
      });
    }

    const otp = generateOTP();
    user.otp = await hashOTP(otp);
    user.otpPlain = otp; // Added for debugging per user request
    user.otpExpiry = Date.now() + OTP_EXPIRY;
    user.otpAttempts = 0;
    user.otpLastSentAt = Date.now();

    console.log(`[DEBUG] Register OTP generated for user ${user._id}: ${otp}`);
    await user.save();
    console.log(`[DEBUG] User saved after register OTP.`);

    // Send SMS
    try {
      await sendSMS({
        to: `${fullCountryCode}${phone}`,
        message: otpMessage(otp, 'signup'),
      });
    } catch (smsError) {
      console.error('SMS Send Error:', smsError);
      if (process.env.NODE_ENV === 'development' || !process.env.SMS_API_KEY) {
        // Fallback for development if SMS fails
        return res.json({
          success: true,
          message: 'OTP generated (Dev Mode)',
          data: { userId: user._id, otp }
        });
      }
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        userId: user._id,
        otp: otp // Included for testing per user request. REMOVE IN PRODUCTION.
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   VERIFY OTP (SIGNUP & RESET)
====================================================== */
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp, flow } = req.body; // flow: 'signup' or 'reset'
    if (!userId || !otp)
      return res.status(400).json({ success: false, message: 'Missing data' });

    const user = await User.findById(userId).select('+otp +otpExpiry +otpAttempts');
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    if (user.otpExpiry < Date.now())
      return res.status(400).json({ success: false, message: 'OTP expired' });

    if (user.otpAttempts >= MAX_ATTEMPTS)
      return res.status(403).json({
        success: false,
        message: 'Too many attempts. Please resend OTP.',
      });

    const isValid = await bcrypt.compare(otp, user.otp);
    if (!isValid) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;

    let resetPasswordToken = undefined;
    if (flow === 'reset') {
      const crypto = require('crypto');
      resetPasswordToken = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = resetPasswordToken;
      user.resetPasswordExpiry = Date.now() + 30 * 60 * 1000; // 30 mins
    } else {
      user.isVerified = true;
      user.registrationStep = 'name_entry';
    }

    await user.save();

    res.json({
      success: true,
      message: 'Verification successful',
      data: {
        userId: user._id,
        resetPasswordToken,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   RESEND OTP
====================================================== */
exports.resendOTP = async (req, res) => {
  try {
    const { userId, flow } = req.body;

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt < OTP_COOLDOWN)
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
      });

    const otp = generateOTP();
    user.otp = await hashOTP(otp);
    user.otpPlain = otp; // Added for debugging
    user.otpExpiry = Date.now() + OTP_EXPIRY;
    user.otpAttempts = 0;
    user.otpResendCount += 1;
    user.otpLastSentAt = Date.now();

    console.log(`[DEBUG] Resend OTP generated for user ${user._id}: ${otp}`);
    await user.save();
    console.log(`[DEBUG] User saved after resend OTP.`);

    await sendSMS({
      to: `${user.countryCode}${user.phone}`,
      message: otpMessage(otp, flow || 'signup'),
    });

    res.json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otp: otp // Included for testing per user request. REMOVE IN PRODUCTION.
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   LOGIN
====================================================== */

/* ======================================================
   FINALIZE REGISTER (SET PASSWORD)
====================================================== */
exports.finalizeRegister = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ success: false, message: 'User ID and password are required' });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Phone number not verified' });
    }

    user.password = password;
    user.registrationStep = 'name_entry';
    user.profileCompleted = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account finalized successfully',
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
   LOGIN (PASSWORD ONLY)
====================================================== */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone number and password are required' });
    }

    let user;
    const digits = phone.replace(/\D/g, ''); // Extract only digits

    console.log(`[DEBUG] Attempting login for normalized phone: ${digits}`);

    // Try finding user with the provided phone number exact match
    user = await User.findOne({ phone }).select('+password');

    // If not found, try searching by the digits only (if matches exactly)
    if (!user) {
      user = await User.findOne({ phone: digits }).select('+password');
    }

    // Comprehensive country code splitting logic
    if (!user) {
      const commonCodes = ['91', '1', '44', '971', '61'];
      for (const code of commonCodes) {
        if (digits.startsWith(code) && digits.length > code.length) {
          const mobile = digits.slice(code.length);
          user = await User.findOne({
            phone: mobile,
            countryCode: `+${code}`
          }).select('+password');
          if (user) break;
        }
      }
    }

    // Last resort: search for a user whose phone NUMBER is a suffix of the input
    if (!user && digits.length >= 10) {
      const last10 = digits.slice(-10);
      user = await User.findOne({ phone: last10 }).select('+password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number',
      });
    }

    // DEBUG LOGS (Delete after fixing)
    console.log(`[DEBUG] Login Attempt: ${phone}`);
    console.log(`[DEBUG] User ID: ${user._id}`);
    console.log(`[DEBUG] Has Password in DB: ${!!user.password}`);
    if (user.password) {
      console.log(`[DEBUG] Stored Password starts with: ${user.password.substring(0, 4)}`);
      console.log(`[DEBUG] Stored Password length: ${user.password.length}`);
    }

    const isMatch = user.password ? await user.matchPassword(password) : false;
    console.log(`[DEBUG] Password Match Result: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Update last login without triggering save hooks on password
    await User.findByIdAndUpdate(user._id, { $set: { lastLogin: Date.now() } });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: generateToken(user._id),
        user,
      },
    });
  } catch (error) {
    console.error('CRITICAL LOGIN ERROR:', error);
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




/* ======================================================
   FORGOT PASSWORD (STEP 1)
===================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { phone, countryCode } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const fullCountryCode = countryCode || '+91';
    const user = await User.findOne({ phone, countryCode: fullCountryCode });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number',
      });
    }

    // Security: Cooldown check
    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt < OTP_COOLDOWN) {
      return res.status(429).json({
        success: false,
        message: 'Please wait before requesting another OTP',
      });
    }

    const otp = generateOTP();
    user.otp = await hashOTP(otp);
    user.otpPlain = otp; // Added for debugging
    user.otpExpiry = Date.now() + OTP_EXPIRY;
    user.otpAttempts = 0;
    user.otpLastSentAt = Date.now();

    console.log(`[DEBUG] Forgot Password OTP generated for user ${user._id}: ${otp}`);
    await user.save();
    console.log(`[DEBUG] User saved after forgot password.`);

    // Send SMS
    try {
      await sendSMS({
        to: `${fullCountryCode}${phone}`,
        message: otpMessage(otp, 'reset'),
      });
    } catch (smsError) {
      console.error('SMS Send Error:', smsError);
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: 'OTP generated (Dev Mode)',
          data: { userId: user._id, otp }
        });
      }
    }

    res.json({
      success: true,
      message: 'Verification code sent to your phone',
      data: {
        userId: user._id,
        otp: otp // Included for testing per user request. REMOVE IN PRODUCTION.
      },
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/* ======================================================
   RESET PASSWORD
===================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { resetPasswordToken, newPassword } = req.body;

    if (!resetPasswordToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiry: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword; // Hashing is handled by pre-save hook in User model
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
