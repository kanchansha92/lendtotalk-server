
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testFlow() {
  const phone = '9998880000';
  const countryCode = '+91';
  const password = 'TestPassword123';

  try {
    console.log('1. register-otp');
    const res1 = await axios.post(`${BASE_URL}/auth/register-otp`, { phone, countryCode });
    const { userId, otp } = res1.data.data;
    console.log('OTP:', otp);

    console.log('2. verify-otp');
    await axios.post(`${BASE_URL}/auth/verify-otp`, { userId, otp, flow: 'signup' });

    console.log('3. finalize-register');
    await axios.post(`${BASE_URL}/auth/finalize-register`, { userId, password });

    console.log('4. login (initial)');
    const res4 = await axios.post(`${BASE_URL}/auth/login`, { phone, password });
    console.log('Login Success:', res4.data.success);

    console.log('5. forgot-password');
    const res5 = await axios.post(`${BASE_URL}/auth/forgot-password`, { phone, countryCode });
    const resetOtp = res5.data.data.otp;
    console.log('Reset OTP:', resetOtp);

    console.log('6. verify-otp (reset)');
    const res6 = await axios.post(`${BASE_URL}/auth/verify-otp`, { userId, otp: resetOtp, flow: 'reset' });
    const { resetPasswordToken } = res6.data.data;
    console.log('Reset Token:', resetPasswordToken);

    console.log('7. reset-password');
    const newPassword = 'NewPassword789';
    await axios.post(`${BASE_URL}/auth/reset-password`, { resetPasswordToken, newPassword });

    console.log('8. login (with new password)');
    const res8 = await axios.post(`${BASE_URL}/auth/login`, { phone, password: newPassword });
    console.log('Login with New Password Success:', res8.data.success);

  } catch (err) {
    console.error('Test Failed:', err.response ? err.response.data : err.message);
  }
}

testFlow();
