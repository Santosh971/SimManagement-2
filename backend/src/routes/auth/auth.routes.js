const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const authController = require('../../controllers/auth/auth.controller');
const otpController = require('../../controllers/auth/otp.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// Validation rules
const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  // body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('password')
    .if(body('role').isIn(['admin', 'super_admin']))
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
  // [PHONE VALIDATION FIX] - Accept phone with or without country code (same as SIM module)
  body('phone').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number (10-15 digits, optional + prefix)'),
  body('companyId').optional().isMongoId().withMessage('Invalid company ID'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

const updateProfileValidation = [
  body('name').optional().trim().isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  // [PHONE VALIDATION FIX] - Accept phone with or without country code (same as SIM module)
  body('phone').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number (10-15 digits, optional + prefix)'),
  body('preferences.notifications.email').optional().isBoolean(),
  body('preferences.notifications.sms').optional().isBoolean(),
  body('preferences.notifications.inApp').optional().isBoolean(),
  body('preferences.timezone').optional().isString(),
  body('preferences.language').optional().isString(),
];

const resetPasswordValidation = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

// [EMAIL OTP FIX] - OTP validation rules updated to use email instead of mobileNumber
const sendOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .trim(),
];

const verifyOTPValidation = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail()
    .trim(),
  body('otp')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
];

// [BACKWARD COMPATIBILITY] - Keep mobileNumber validation for backward compatibility
// If mobileNumber is sent, it will be ignored (email is required)

// Public routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/refresh-token', refreshTokenValidation, validate, authController.refreshToken);
router.post('/forgot-password', [body('email').isEmail()], validate, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, validate, authController.resetPassword);
router.post('/init-super-admin', authController.initSuperAdmin);

// Forgot Password OTP routes (for admin users)
router.post('/forgot-password-otp', [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail().trim()
], validate, authController.forgotPasswordOTP);

router.post('/verify-forgot-password-otp', [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail().trim(),
  body('otp').matches(/^\d{6}$/).withMessage('OTP must be exactly 6 digits')
], validate, authController.verifyForgotPasswordOTP);

router.post('/reset-password-otp', [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail().trim(),
  body('otp').matches(/^\d{6}$/).withMessage('OTP must be exactly 6 digits'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], validate, authController.resetPasswordWithOTP);

// OTP Authentication routes (public)
router.post('/send-otp', sendOTPValidation, validate, otpController.sendOTP);
router.post('/verify-otp', verifyOTPValidation, validate, otpController.verifyOTP);
router.post('/resend-otp', sendOTPValidation, validate, otpController.resendOTP);

// Protected routes
router.use(authenticate);

router.post('/logout', authController.logout);
router.get('/profile', authController.getProfile);
router.put('/profile', updateProfileValidation, validate, authController.updateProfile);
router.post('/change-password', changePasswordValidation, validate, authController.changePassword);

module.exports = router;