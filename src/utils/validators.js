// utils/validators.js
exports.validatePhoneNumber = (phone) => {
  // Indian phone number validation (10 digits)
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

exports.validateAge = (age) => {
  return age >= 18 && age <= 100;
};

exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove any HTML tags and trim
  return input
    .replace(/<[^>]*>/g, '')
    .trim()
    .substring(0, 500); // Limit length
};