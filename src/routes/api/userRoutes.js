import { Router } from "express";
import CloudinaryConfig from "../../config/cloudinaryConfig.js"
import validateSignup from "../../validations/signup.js";
import validateLogin from "../../validations/login.js";
import { authenticate, restrictTo } from "../../middleware/auth.js";
import { registerUser, verifyEmail, resendVerificationEmail, loginUser, verifyTwoFactor } from "../../controllers/user.controller.js";
import { enableTwoFactor, 
    disableTwoFactor,
    forgotPassword, 
    resetPassword, 
    getCurrentUser, 
    updateUserProfile, 
    getAllUsers, 
    getUserById, 
    adminUpdateUser, 
    deleteUser } from "../../controllers/userBased.controller.js";



const router = Router();
// current user routes
router.post('/signup', validateSignup, registerUser );
router.get('/api/auth/verify-email/:token', verifyEmail);
router.post('/api/auth/resend-verification-email', resendVerificationEmail)
router.post('/login', validateLogin, loginUser); 
router.post('/api/auth/verify-2fa', verifyTwoFactor);
router.post('/api/auth/enable-2fa', authenticate, enableTwoFactor);
router.post('/api/auth/disable-2fa', authenticate, disableTwoFactor);
router.post('/api/auth/forgot-password', forgotPassword);
router.patch('/api/auth/reset-password/:token', resetPassword);
router.get('/api/auth/me', authenticate, getCurrentUser);
router.patch('/api/auth/profile', authenticate, CloudinaryConfig.upload.single('file'), updateUserProfile);

// Admin only routes
router.use(authenticate)
router.get('/api/auth/get-all-user', restrictTo('teacher'), getAllUsers);
router.route('/user/:id')
  .get(restrictTo('teacher'), getUserById)
  .put(restrictTo('teacher'), adminUpdateUser)
  .delete(restrictTo('teacher'), deleteUser);


export default router;