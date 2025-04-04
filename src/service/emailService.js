import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", 
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });
  

  
  const sendEmail = async (options) => {
    try {
      const mailOptions = {
        from: `Education Portal <${process.env.EMAIL_FROM}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
      };
  
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Error sending email');
    }
  };
  
  
export const sendVerificationEmail = async (options) => {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Welcome to Education Portal!</h2>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">Hello ${options.firstName},</p>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you for registering on our platform. To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${options.verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
        </div>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">Or copy and paste this link in your browser:</p>
        <p style="color: #666; font-size: 14px; word-break: break-all; background-color: #efefef; padding: 10px; border-radius: 4px;">${options.verificationUrl}</p>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">If you didn't create an account, please ignore this email.</p>
        <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you,<br>The iBlog Team</p>
      </div>
    `;
  
    return await sendEmail({
      email: options.email,
      subject: options.subject,
      html
    });
  };

  
export const sendTwoFactorEmail = async (options) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
      <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Two-Factor Authentication</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Hello ${options.firstName},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">You are receiving this email because you (or someone else) has requested to log in to your account. Please use the following code to complete the authentication process:</p>
      <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #efefef; border-radius: 4px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
        ${options.code}
      </div>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">This code will expire in 10 minutes.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">If you didn't request this code, please ignore this email or contact support if you have concerns about your account security.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you,<br>The iBlog Team</p>
    </div>
  `;

  return await sendEmail({
    email: options.email,
    subject: options.subject,
    html
  });
};


export const sendPasswordResetEmail = async (options) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
      <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Password Reset</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Hello ${options.firstName},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">You are receiving this email because you (or someone else) has requested to reset the password for your account. Please click the button below to complete the process:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${options.resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Or copy and paste this link in your browser:</p>
      <p style="color: #666; font-size: 14px; word-break: break-all; background-color: #efefef; padding: 10px; border-radius: 4px;">${options.resetUrl}</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
      <p style="color: #e74c3c; font-size: 14px; font-weight: bold;">This link is valid for only 10 minutes.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you,<br>The iBlog Team</p>
    </div>
  `;

  return await sendEmail({
    email: options.email,
    subject: options.subject,
    html
  });
};


export const sendWelcomeEmail = async (options) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #f9f9f9;">
      <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Welcome to iBlog Team!</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Hello ${options.firstName},</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you for completing your registration. We're excited to have you on board!</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">With iBlog Team, you can:</p>
      <ul style="color: #555; font-size: 16px; line-height: 1.5;">
        <li>Access quality educational content</li>
        <li>Track your learning progress</li>
        <li>Connect with teachers and peers</li>
        <li>Receive personalized learning recommendations</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${options.loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Get Started</a>
      </div>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
      <p style="color: #555; font-size: 16px; line-height: 1.5;">Thank you,<br>The iBlog Team</p>
    </div>
  `;

  return await sendEmail({
    email: options.email,
    subject: options.subject || 'Welcome to Education Portal!',
    html
  });
};

