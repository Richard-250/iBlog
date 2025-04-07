import User from "../models/user.js";
import crypto from "crypto";
import { generateToken } from "../utils/genToken.js";
import { sendVerificationEmail, sendTwoFactorEmail, sendWelcomeEmail } from "../service/emailService.js";
import { generateEmailVerificationToken } from "../utils/genToken.js";
import cacheService from "../config/cacheConfig.js"; 

// Use the createCache function from the imported object
const cache = cacheService.createCache(600);

export const registerUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    // Input validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide all required fields" 
      });
    }
    

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "User already exists" 
      });
    }

    const user = await User.create(req.body);
    
    const verificationToken = user.createEmailVerificationToken();
    
    await user.save({ validateBeforeSave: false });

    // Build verification URL
    const verificationUrl = `${req.protocol}://${req.get("host")}/api/auth/verify-email/${verificationToken}`;

    try {
      await sendVerificationEmail({
        email: user.email,
        subject: "iBlog Team - Verify Your Email",
        firstName: user.firstName,
        verificationUrl,
      });

      return res.status(201).json({
        success: true,
        message: "User registered successfully. Please verify your email."
      });
    } catch (err) {
      // If email sending fails, clean up the tokens and respond with error
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        message: "Error sending verification email. Please try again."
      });
    }
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired',
        redirect: '/api/auth/resend-verification-email'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is already verified.' 
      });
    }
    
    // Update user
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error("Error in verifyEmail:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is already verified' 
      });
    }

    // Generate new token
    const { token, hashedToken, emailVerificationExpires } = generateEmailVerificationToken();

    // Update user with new verification token and expiration
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save({ validateBeforeSave: false });

    // Send new verification email
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${token}`;
    await sendVerificationEmail({
      email: user.email,
      subject: "iBlog Team - Verify Your Email",
      firstName: user.firstName,
      verificationUrl,
    });

    return res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error("Error in resendVerificationEmail:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false, 
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials'
      });
    }
    
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }
    
    // If 2FA is enabled, send verification code
    if (user.twoFactorEnabled) {
      // Generate and save temporary token for the 2FA process
      const tempToken = user.createTwoFactorTempToken();
      await user.save({ validateBeforeSave: false });
  
      // Generate 2FA code
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = crypto
        .createHash('sha256')
        .update(twoFactorCode)
        .digest('hex');
  
      // Store code in cache with user ID as key
      cache.set(`2fa_${user._id.toString()}`, hashedCode);
      
      // Send 2FA code via email
      await sendTwoFactorEmail({
        email: user.email,
        subject: 'iBlog Team - Your 2FA Code',
        firstName: user.firstName,
        code: twoFactorCode
      });
  
      // Set secure cookie with temp token
      res.cookie('tempToken', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development', // Fixed logic - secure in production
        signed: true,
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000 // 10 minutes
      });
      
      return res.status(200).json({
        success: true,
        message: '2FA code sent to your email. Please verify it as soon as possible.',
        requiresTwoFactor: true
      });
    }
  
    // Generate token for non-2FA login
    const token = generateToken(user._id, user.role);

    res.cookie('tempToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development', // Fixed logic - secure in production
      signed: true,
      sameSite: 'strict',
      maxAge: 100 * 60 * 1000 // 10 minutes
    });
    
  
    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
  
     res.status(200).json({
      success: true,
      token,
      user: { 
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      message: 'Login successful'
    });
    
    const loginUrl = `${req.protocol}://${req.get('host')}/login`;

    await sendWelcomeEmail({
      email: user.email,
      subject: "iBlog Team - WELCOME",
      firstName: user.firstName,
      loginUrl,
    })

  } catch (error) {
    console.error("Error in Login:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error"
    });
  }
};

export const verifyTwoFactor = async (req, res) => {
  try {
    const { code } = req.body;
    const tempToken = req.signedCookies.tempToken;

    if (!code || !tempToken) {
      return res.status(400).json({
        success: false, 
        message: 'Please provide verification code and temporary token'
      });
    }
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(tempToken)
      .digest('hex');
  
    const user = await User.findOne({
      twoFactorTempToken: hashedToken,
      twoFactorTempExpires: { $gt: Date.now() }
    });
  
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired'
      });
    }
  
    // Get stored code from cache
    const hashedStoredCode = await cache.get(`2fa_${user._id.toString()}`);
    
    if (!hashedStoredCode) {
      return res.status(400).json({
        success: false,
        message: '2FA code has expired. Please log in again.'
      });
    }
    
    // Hash provided code for comparison
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    if (hashedCode !== hashedStoredCode) {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification code'
      });
    }
  
    // Clear 2FA temp data
    user.twoFactorTempToken = undefined;
    user.twoFactorTempExpires = undefined;
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    // Clear cache entry
    cache.del(`2fa_${user._id.toString()}`);
  
    // Generate authentication token
    const token = generateToken(user._id);
  
    // Clear the temporary token cookie
    res.clearCookie("tempToken");
    
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      message: '2FA verification successful'
    });
  } catch (error) {
    console.error("Error in 2FA verify:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal Server Error"
    });
  }
};