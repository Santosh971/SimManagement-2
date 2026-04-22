const authService = require('../../services/auth/auth.service');
const auditLogService = require('../../services/auditLog/auditLog.service');
const { successResponse, errorResponse } = require('../../utils/response');
const { ConflictError, AppError } = require('../../utils/errors');
const User = require('../../models/auth/user.model');
const crypto = require('crypto');

class AuthController {
  // async register(req, res, next) {
  //   try {
  //     const result = await authService.register(req.body);
  //     return successResponse(res, result, 'User registered successfully', 201);
  //   } catch (error) {
  //     next(error);
  //   }
  // }



  async register(userData) {
    let { email, password, name, role, companyId, phone } = userData;

    // [GLOBAL UNIQUE EMAIL] Check if email exists anywhere in the system
    // One email can only belong to one user across all companies
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists.');
    }

    // ❗ Prevent creating super admin
    if (role === 'super_admin') {
      throw new AppError('Cannot create super admin through registration', 403);
    }

    // ❗ Admin must have company
    if (role === 'admin' && !companyId) {
      throw new AppError('Company ID is required for admin role', 400);
    }

    // ✅ NEW LOGIC
    if (role === 'user') {
      // Option 1: No login system → no password
      password = undefined;

      // Option 2 (better): auto-generate password
      // password = crypto.randomBytes(8).toString('hex');
    }

    // ❗ Admin must have password
    if (role === 'admin' && !password) {
      throw new AppError('Password is required for admin', 400);
    }

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

    // ❗ Only generate tokens for login users
    let tokens = null;
    if (role !== 'user') {
      tokens = this.generateTokens(user);
      user.refreshToken = tokens.refreshToken;
      await user.save();
    }

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens?.accessToken || null,
      refreshToken: tokens?.refreshToken || null,
    };
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      // [AUDIT LOG FIX] - Fetch user's actual companyId from database to ensure accuracy
      const userForAudit = await User.findById(result.user._id).select('companyId role');
      const actualCompanyId = userForAudit?.companyId || null;

      // Audit log: USER_LOGIN
      await auditLogService.logAction({
        action: 'USER_LOGIN',
        module: 'AUTH',
        description: `User ${result.user.name} (${result.user.email}) logged in successfully`,
        performedBy: result.user._id,
        role: userForAudit?.role || result.user.role,
        companyId: actualCompanyId,
        req,
      });

      return successResponse(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return successResponse(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await authService.logout(req.user.id);

      // [AUDIT LOG FIX] - Fetch user's actual companyId from database to ensure accuracy
      // JWT token might have been issued before companyId was assigned
      const userForAudit = await User.findById(req.user.id).select('companyId role');
      const actualCompanyId = userForAudit?.companyId || null;

      // Determine login method from user info or request
      const loginMethod = req.user.mobileNumber ? 'otp' : 'email';
      const userType = req.user.mobileNumber ? 'mobile' : 'web';

      // Audit log: USER_LOGOUT
      await auditLogService.logAction({
        action: 'USER_LOGOUT',
        module: 'AUTH',
        description: `User logged out (${userType}${loginMethod === 'otp' ? ' - OTP login' : ''})`,
        performedBy: req.user.id,
        role: userForAudit?.role || req.user.role,
        companyId: actualCompanyId,
        metadata: {
          loginMethod,
          userType,
          mobileNumber: req.user.mobileNumber || null,
          email: req.user.email || null,
        },
        req,
      });

      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      return successResponse(res, result, 'Password reset initiated');
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password OTP - Step 1: Send OTP to admin email
  async forgotPasswordOTP(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPasswordOTP(email);

      // Log the attempt
      await auditLogService.logAction({
        action: 'FORGOT_PASSWORD_OTP_REQUEST',
        module: 'AUTH',
        description: `Password reset OTP requested for ${email}`,
        performedBy: null,
        role: 'admin',
        companyId: null,
        metadata: { email },
        req,
      });

      return successResponse(res, result, 'If an admin account exists with this email, a verification code will be sent');
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password OTP - Step 2: Verify OTP
  async verifyForgotPasswordOTP(req, res, next) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyForgotPasswordOTP(email, otp);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Log successful verification
      await auditLogService.logAction({
        action: 'FORGOT_PASSWORD_OTP_VERIFIED',
        module: 'AUTH',
        description: `Password reset OTP verified for ${email}`,
        performedBy: null,
        role: 'admin',
        companyId: null,
        metadata: { email },
        req,
      });

      return successResponse(res, result, 'Verification successful');
    } catch (error) {
      next(error);
    }
  }

  // Forgot Password OTP - Step 3: Reset Password
  async resetPasswordWithOTP(req, res, next) {
    try {
      const { email, otp, newPassword } = req.body;
      const result = await authService.resetPasswordWithOTP(email, otp, newPassword);

      // Log successful password reset
      await auditLogService.logAction({
        action: 'PASSWORD_RESET_VIA_OTP',
        module: 'AUTH',
        description: `Password reset successfully for ${email}`,
        performedBy: null,
        role: 'admin',
        companyId: null,
        metadata: { email },
        req,
      });

      return successResponse(res, result, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token } = req.params;
      const { password } = req.body;
      const result = await authService.resetPassword(token, password);
      return successResponse(res, result, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      return successResponse(res, result, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return successResponse(res, user, 'Profile fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const user = await authService.updateProfile(req.user.id, req.body);
      return successResponse(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async initSuperAdmin(req, res, next) {
    try {
      const result = await authService.createSuperAdmin();
      return successResponse(res, result, 'Super admin initialized');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();