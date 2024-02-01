// utils/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER_NAME, 
    pass: process.env.EMAIL_PASSWORD   
  }
});

function sendEmail(to, subject, text) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Email not sent:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = { sendEmail };
