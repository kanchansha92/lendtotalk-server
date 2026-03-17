// // utils/smsService.js
// const twilio = require('twilio');

// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// exports.sendSMS = async ({ to, message }) => {
//   try {
//     const result = await client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: to,
//     });

//     console.log('SMS sent successfully:', result.sid);
//     return {
//       success: true,
//       messageId: result.sid,
//     };
//   } catch (error) {
//     console.error('SMS Error:', error);
//     throw new Error(`Failed to send SMS: ${error.message}`);
//   }
// };













// utils/smsService.js
const twilio = require('twilio');

let client = null;

// Initialize Twilio client only if credentials exist
if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

exports.sendSMS = async ({ to, message }) => {
  try {
    /* =====================================================
       DEVELOPMENT MODE (NO REAL SMS)
    ===================================================== */
    if (process.env.NODE_ENV !== 'production') {
      console.log('📨 SMS MOCK (DEV MODE)');
      console.log('To:', to);
      console.log('Message:', message);
      return {
        success: true,
        mocked: true,
      };
    }

    /* =====================================================
       PRODUCTION MODE (REAL SMS)
    ===================================================== */
    if (!client) {
      throw new Error('Twilio client not initialized');
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    console.log('📨 SMS sent successfully:', result.sid);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error) {
    console.error('❌ SMS Error:', error.message);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};



// Alternative: Using Firebase Cloud Messaging for India
// utils/smsService.js (Firebase SMS alternative)
/*
const admin = require('firebase-admin');

exports.sendSMS = async ({ to, message }) => {
  try {
    // Firebase SMS sending logic
    // Note: You need to set up Firebase Auth with phone authentication
    const result = await admin.auth().sendSignInLinkToEmail(to, {
      url: process.env.CLIENT_URL,
      handleCodeInApp: true,
    });

    return {
      success: true,
      messageId: result,
    };
  } catch (error) {
    console.error('SMS Error:', error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};
*/