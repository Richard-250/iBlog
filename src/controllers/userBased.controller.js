import User from "../models/user.js";
import { sendPasswordResetEmail } from "../service/emailService.js";
import crypto from "crypto";
import CloudinaryConfig from '../config/cloudinaryConfig.js';
import { extractPublicIdFromUrl } from "../utils/cloudinary.js";


export const enableTwoFactor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
    
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: 'Two-factor authentication is already enabled'
            });
        }

        // Update user
        user.twoFactorEnabled = true;
        await user.save({ validateBeforeSave: false });
    
        res.status(200).json({
            success: true,
            message: 'Two-factor authentication enabled successfully'
        });
    } catch (err) {
        console.error('Error enabling two-factor authentication:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};
  
export const disableTwoFactor = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
  
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
  
        // Update user
        user.twoFactorEnabled = false;
        await user.save({ validateBeforeSave: false });
  
        res.status(200).json({
            success: true,
            message: 'Two-factor authentication disabled successfully'
        });
    } catch (err) {
        console.error('Error disabling two-factor authentication:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};
  
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
  
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email'
            });
        }
  
        const user = await User.findOne({ email });
  
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with that email'
            });
        }
  
        // Generate reset token
        const resetToken = user.createPasswordResetToken();
        await user.save({ validateBeforeSave: false });
  
        // Send password reset email
        const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
        
        try {
            await sendPasswordResetEmail({
                email: user.email,
                subject: 'Education Portal - Password Reset',
                firstName: user.firstName,
                resetUrl
            });
  
            res.status(200).json({
                success: true,
                message: 'Password reset link sent to your email'
            });
        } catch (err) {
            // Reset token if email sending fails
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
  
            return res.status(500).json({
                success: false,
                message: 'Error sending email. Please try again.'
            });
        }
    } catch (err) {
        console.error('Error in forgot password process:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
}; 

export const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a new password'
            });
        }
  
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');
  
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
  
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Token is invalid or has expired'
            });
        }
  
        // Update user
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
  
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};
  
export const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
  
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        } 
        
        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User not verified'
            });
        }
  
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        console.error('Error fetching current user:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const { firstName, lastName, email, phoneNumber } = req.body;
        const user = await User.findById(req.user.id);
  
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
  
        // Check if email is unique
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email is already in use' 
                });
            }
        }
  
        // Handle profile photo upload
        if (req.file) {
            try {
                // Delete existing profile photo if exists
                if (user.profilePhoto) {
                    const oldPublicId = extractPublicIdFromUrl(user.profilePhoto);
                    await CloudinaryConfig.CloudinaryService.deleteFile(oldPublicId);
                }
  
                // Upload new profile photo
                const uploadResult = await CloudinaryConfig.CloudinaryService.uploadFile({
                    path: req.file.path,
                    mimetype: req.file.mimetype,
                    originalname: req.file.originalname,
                });
                
                user.profilePhoto = uploadResult.secure_url;
            } catch (err) {
                console.error('Cloudinary upload error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error updating profile photo' 
                });
            }
        }
  
        // Update user fields
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        
        await user.save();
  
        res.status(200).json({ 
            success: true, 
            data: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                profilePhoto: user.profilePhoto
            }, 
            message: 'Profile updated successfully' 
        });
  
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        // Check if the requesting user is a teacher
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        
        // Set up pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;
        
        // Set up filtering
        const filterOptions = {};
        
        // Apply optional filters
        if (req.query.role) filterOptions.role = req.query.role;
        if (req.query.twoFactorEnabled !== undefined) {
            filterOptions.twoFactorEnabled = req.query.twoFactorEnabled === 'true';
        }
        if (req.query.isVerified !== undefined) {
            filterOptions.isVerified = req.query.isVerified === 'true';
        }
        
        // Search by name or email
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            filterOptions.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ];
        }
        
        // Execute query with pagination
        const users = await User.find(filterOptions)
            .select('_id firstName lastName email role twoFactorEnabled isVerified createdAt lastLogin')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        // Get total count for pagination
        const total = await User.countDocuments(filterOptions);
        
        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};
 
export const getUserById = async (req, res) => {
    try {
        // Check if the requesting user is an admin
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        
        const user = await User.findById(req.params.id)
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const adminUpdateUser = async (req, res) => {
    try {
        // Check if the requesting user is an admin
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        
        const { firstName, lastName, email, role, twoFactorEnabled } = req.body;
        
        // Find the user
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Check if email is being changed and if it's already in use
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }
        
        // Update user fields if provided
        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;
        
        // Save the updated user
        await user.save();
        
        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            },
            message: 'User updated successfully'
        });
    } catch (err) {
        console.error('Error updating user by admin:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};

export const deleteUser = async (req, res) => {
    try {
        // Check if the requesting user is an admin
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        
        // Check if user is trying to delete themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account this way'
            });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        await User.findByIdAndDelete(req.params.id);
        
        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
};