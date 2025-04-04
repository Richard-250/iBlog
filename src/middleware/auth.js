import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/user.js';

export const authenticate = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.signedCookies && req.signedCookies.jwt) {
            // Alternatively, check for token in cookies
            token = req.cookies.jwt;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        // Verify token
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

        // Find user and exclude password
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found.',
            });
        }

        // Check if user changed password after the token was issued
        if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                success: false,
                message: 'User recently changed password. Please log in again.',
            });
        }

        // Update last login time (except for the /me route)
        if (!req.path.includes('/me')) {
            user.lastLogin = Date.now();
            await user.save({ validateBeforeSave: false });
        }

        // Attach user to request object
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Please log in again.',
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Your token has expired. Please log in again.',
            });
        }

        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed.',
        });
    }
};

export const restrictTo = (...roles) => {
    return (req, res, next) => {
      // Check if user role is included in the allowed roles
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action'
        });
      }
  
      next();
    };
  };

export const requireTwoFactor = (req, res, next) => {
    if (!req.user.twoFactorEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Two-factor authentication must be enabled to access this resource'
      });
    }
    
    next();
  };