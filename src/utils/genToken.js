import jwt from "jsonwebtoken"
import crypto from 'crypto';
export const generateToken = (userId, userRole) => {
  return jwt.sign({ id: userId, role: userRole }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const generateRandomToken = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return token;
};

export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  
  return otp;
};

export const hashToken = (token) => {
  return Crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

export const getUserFromToken = (req) => {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
    if (!token) return null;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return {
        userId: decoded.id,
        userType: decoded.role // Assuming your JWT has a 'role' field
      };
    } catch (error) {
      return null;
    }
  };


  

 export const generateEmailVerificationToken = () => {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');

  // Hash the token for security
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Set expiration time (e.g., 2 hours from now)
  const emailVerificationExpires = Date.now() + 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  return { token, hashedToken, emailVerificationExpires };
};

