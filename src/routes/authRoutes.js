// // routes/authRoutes.js
// const express = require('express');
// const router = express.Router();
// const {
//   register,
//   verifyOTP,
//   resendOTP,
//   login,
//   verifyLoginOTP,
//   socialLogin,
//   completeProfile,
//   getMe,
//   updateLocation,
//   logout,
// } = require('../controllers/authController');
// const { protect } = require('../middleware/authMiddleware');

// // Public routes
// router.post('/register', register);
// router.post('/verify-otp', verifyOTP);
// router.post('/resend-otp', resendOTP);
// router.post('/login', login);
// router.post('/verify-login', verifyLoginOTP);
// router.post('/social-login', socialLogin);

// // Protected routes
// router.get('/me', protect, getMe);
// router.post('/complete-profile', protect, completeProfile);
// router.post('/update-location', protect, updateLocation);
// router.post('/logout', protect, logout);

// module.exports = router;






// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const {
  registerOTP,
  checkPhone,
  verifyOTP,
  resendOTP,
  finalizeRegister,
  login,
  getMe,
  logout,
  googleLogin,
  facebookLogin,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
// const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/check-phone', checkPhone);
router.post('/register-otp', registerOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/finalize-register', finalizeRegister);
router.post('/login', login);
// router.post('/verify-login', verifyLoginOTP);
// router.post('/resend-login-otp', resendLoginOTP);
// router.post('/social-login', socialLogin);
router.post('/google-login', googleLogin);
router.post('/facebook-login', facebookLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
