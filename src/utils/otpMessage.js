// utils/otpMessage.js

exports.otpMessage = (otp, type = 'verify') => {
  switch (type) {
    case 'login':
      return `Your Lend2Talk login code is ${otp}. Valid for 10 minutes. Do not share this code.`;

    case 'resend':
      return `Lend2Talk OTP: ${otp}. Valid for 10 minutes. Do not share.`;

    case 'reset':
      return `Your Lend2Talk password reset code is ${otp}. Valid for 10 minutes. Do not share this code.`;

    default:
      return `Your Lend2Talk verification code is ${otp}. Valid for 10 minutes. Do not share this code.`;
  }
};
