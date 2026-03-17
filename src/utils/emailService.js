const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Lend 2 Talk'}" <${
        process.env.EMAIL_FROM || process.env.EMAIL_USER
      }>`,
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error('Email Error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Email templates
exports.getOTPEmailTemplate = (otp, userName) => {
  return {
    subject: 'Your Verification Code - Lend 2 Talk',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .otp-box {
            background: white;
            border: 2px dashed #667eea;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #667eea;
            margin: 20px 0;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Lend 2 Talk</h1>
            <p>Verification Code</p>
          </div>
          <div class="content">
            <p>Hi${userName ? ' ' + userName : ''},</p>
            <p>Your verification code is:</p>
            <div class="otp-box">${otp}</div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Lend 2 Talk. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};
