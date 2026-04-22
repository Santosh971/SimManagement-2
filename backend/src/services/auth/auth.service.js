const jwt = require('jsonwebtoken');
const User = require('../../models/auth/user.model');
const Company = require('../../models/company/company.model');
const Subscription = require('../../models/subscription/subscription.model');
const { AppError, UnauthorizedError, ConflictError, NotFoundError } = require('../../utils/errors');
const config = require('../../config');
const emailService = require('../../utils/emailService');
const crypto = require('crypto');

class AuthService {
  async register(userData) {
    const { email, password, name, role, companyId, phone } = userData;

    // [GLOBAL UNIQUE EMAIL] Check if email exists anywhere in the system
    // One email can only belong to one user across all companies
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('This email address is already registered in the system.');
    }

    // Validate role-specific requirements
    if (role === 'super_admin') {
      throw new AppError('Cannot create super admin through registration', 403);
    }

    if (role === 'admin' && !companyId) {
      throw new AppError('Company ID is required for admin role', 400);
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      role: role || 'user',
      companyId: companyId || null,
      phone,
    });

    try {
      await user.save();
    } catch (saveError) {
      // [GLOBAL UNIQUE EMAIL] Handle MongoDB duplicate key error
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyValue)[0];
        if (field === 'email') {
          throw new ConflictError('This email address is already registered in the system. Each email can only be used once.');
        } else if (field === 'mobileNumber') {
          throw new ConflictError('This phone number is already registered in the system. Please use a different phone number.');
        } else {
          throw new ConflictError(`${field} is already in use.`);
        }
      }
      throw saveError;
    }

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async login(email, password) {
    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated. Please contact administrator.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = this.generateTokens(user);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret);
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Find user
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = this.generateTokens(user);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  }

  async logout(userId) {
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    return true;
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If user exists, password reset email will be sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email
    await emailService.sendPasswordResetEmail(user, resetToken);

    return { message: 'Password reset email sent' };
  }

  // Forgot Password OTP - For Admin users only
  async forgotPasswordOTP(email) {
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return same message to not reveal if email exists
    const genericMessage = 'If an admin account exists with this email, a verification code will be sent';

    if (!user) {
      return { success: true, message: genericMessage };
    }

    // Only allow for admin role
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { success: true, message: genericMessage };
    }

    // Check if user is active
    if (!user.isActive) {
      return { success: true, message: genericMessage };
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP (hashed for security)
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    user.forgotPasswordOTP = hashedOTP;
    user.forgotPasswordOTPExpires = otpExpires;
    user.forgotPasswordOTPVerified = false;
    user.forgotPasswordOTPAttempts = 0;
    await user.save();

    // Send OTP email
    try {
      await emailService.sendForgotPasswordOTPEmail(user.email, otp, user.name);
    } catch (error) {
      // In development, still return success but log error
      if (config.app.env === 'development') {
        console.log('[DEV] Forgot Password OTP:', otp);
        return { success: true, message: genericMessage, devOTP: otp };
      }
      throw new AppError('Failed to send OTP email', 500);
    }

    return { success: true, message: genericMessage };
  }

  // Verify Forgot Password OTP
  async verifyForgotPasswordOTP(email, otp) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+forgotPasswordOTP');

    if (!user) {
      return { success: false, message: 'Invalid verification code' };
    }

    // Only allow for admin role
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { success: false, message: 'Invalid verification code' };
    }

    // Check if OTP exists and not expired
    if (!user.forgotPasswordOTP || !user.forgotPasswordOTPExpires) {
      return { success: false, message: 'No verification code found. Please request a new one.' };
    }

    if (user.forgotPasswordOTPExpires < Date.now()) {
      // Clear expired OTP
      user.forgotPasswordOTP = null;
      user.forgotPasswordOTPExpires = null;
      user.forgotPasswordOTPAttempts = 0;
      await user.save();
      return { success: false, message: 'Verification code has expired. Please request a new one.' };
    }

    // Check attempts
    if (user.forgotPasswordOTPAttempts >= 3) {
      user.forgotPasswordOTP = null;
      user.forgotPasswordOTPExpires = null;
      user.forgotPasswordOTPAttempts = 0;
      await user.save();
      return { success: false, message: 'Maximum attempts exceeded. Please request a new verification code.' };
    }

    // Verify OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.forgotPasswordOTP !== hashedOTP) {
      user.forgotPasswordOTPAttempts += 1;
      await user.save();
      const remaining = 3 - user.forgotPasswordOTPAttempts;
      return { success: false, message: `Invalid verification code. ${remaining} attempts remaining.` };
    }

    // OTP verified - mark as verified
    user.forgotPasswordOTPVerified = true;
    await user.save();

    return { success: true, message: 'Verification successful' };
  }

  // Reset Password with OTP
  async resetPasswordWithOTP(email, otp, newPassword) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+forgotPasswordOTP');

    if (!user) {
      throw new AppError('Password reset failed', 400);
    }

    // Only allow for admin role
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new AppError('Password reset failed', 400);
    }

    // Check if OTP was verified
    if (!user.forgotPasswordOTPVerified) {
      throw new AppError('Please verify your email first', 400);
    }

    // Re-verify OTP is still valid
    if (!user.forgotPasswordOTP || !user.forgotPasswordOTPExpires) {
      throw new AppError('Verification code expired. Please start over.', 400);
    }

    if (user.forgotPasswordOTPExpires < Date.now()) {
      throw new AppError('Verification code expired. Please start over.', 400);
    }

    // Verify OTP again
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    if (user.forgotPasswordOTP !== hashedOTP) {
      throw new AppError('Invalid verification code', 400);
    }

    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();

    // Clear OTP fields
    user.forgotPasswordOTP = null;
    user.forgotPasswordOTPExpires = null;
    user.forgotPasswordOTPVerified = false;
    user.forgotPasswordOTPAttempts = 0;

    await user.save();

    return { success: true, message: 'Password reset successfully' };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.passwordChangedAt = Date.now();
    await user.save();

    return { message: 'Password reset successful' };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new NotFoundError('User');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId) {
    const user = await User.findById(userId).populate('companyId', 'name email');
    if (!user) {
      throw new NotFoundError('User');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId, updateData) {
    const allowedUpdates = ['name', 'phone', 'preferences'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).populate('companyId', 'name email');

    if (!user) {
      throw new NotFoundError('User');
    }

    return this.sanitizeUser(user);
  }

  async createSuperAdmin() {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'santoshshimpankar61@gmail.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      return { message: 'Super admin already exists', user: this.sanitizeUser(existingSuperAdmin) };
    }

    const user = new User({
      email: superAdminEmail,
      password: superAdminPassword,
      name: superAdminName,
      role: 'super_admin',
      companyId: null,
      isActive: true,
      emailVerified: true,
    });

    await user.save();
    return { message: 'Super admin created', user: this.sanitizeUser(user) };
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user._id, role: user.role, companyId: user.companyId },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  sanitizeUser(user) {
    const userObj = user.toObject ? user.toObject() : user;
    delete userObj.password;
    delete userObj.refreshToken;
    delete userObj.resetPasswordToken;
    delete userObj.resetPasswordExpires;
    delete userObj.__v;
    return userObj;
  }
}

module.exports = new AuthService();