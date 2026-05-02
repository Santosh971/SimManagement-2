const mongoose = require('mongoose');
const Company = require('../../models/company/company.model');
const User = require('../../models/auth/user.model');
const Subscription = require('../../models/subscription/subscription.model');
const Sim = require('../../models/sim/sim.model');
const Recharge = require('../../models/recharge/recharge.model');
const CallLog = require('../../models/callLog/callLog.model');
const Notification = require('../../models/notification/notification.model');
const WhatsAppMessage = require('../../models/whatsapp/whatsapp.model');
const TelegramMessage = require('../../models/telegram/telegram.model');
const Sms = require('../../models/sms/sms.model');
const WifiNetwork = require('../../models/wifi/wifiNetwork.model');
const WifiDevice = require('../../models/wifi/wifiDevice.model');
const WifiMetric = require('../../models/wifi/wifiMetric.model');
const WifiAlert = require('../../models/wifi/wifiAlert.model');
const CallAutomationConfig = require('../../models/callAutomation/callAutomation.model');
const { AppError, NotFoundError, ConflictError } = require('../../utils/errors');
const emailService = require('../../utils/emailService');
const notificationHelper = require('../../utils/notificationHelper');
const config = require('../../config');

class CompanyService {
  async createCompany(data, createdBy) {
    const { name, email, phone, address, subscriptionId, subscriptionDuration = 30 } = data;

    // [GLOBAL UNIQUE EMAIL] Check if company email exists in companies
    const existingCompany = await Company.findOne({ email: email.toLowerCase() });
    if (existingCompany) {
      throw new ConflictError('Company with this email already exists');
    }

    // [GLOBAL UNIQUE EMAIL] Check if email exists in users table
    // Company email should not be used by any user in the system
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('This email address is already registered as a user in the system. Each email can only be used once.');
    }

    // Validate subscription
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    // Calculate subscription dates
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + subscriptionDuration);

    // Create company
    const company = new Company({
      name,
      email: email.toLowerCase(),
      phone,
      address,
      subscriptionId,
      subscriptionStartDate,
      subscriptionEndDate,
      createdBy,
    });

    try {
      await company.save();
    } catch (saveError) {
      // [GLOBAL UNIQUE EMAIL] Handle MongoDB duplicate key error
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyValue)[0];
        if (field === 'email') {
          throw new ConflictError('This email address is already registered in the system. Each email can only be used once.');
        } else {
          throw new ConflictError(`${field} is already in use.`);
        }
      }
      throw saveError;
    }

    // Send notification for company creation
    try {
      await notificationHelper.notifyCompanyCreated(company, null);
    } catch (notificationError) {
      // Don't fail company creation if notification fails
      console.error('Failed to send company creation notification:', notificationError.message);
    }

    return company;
  }

  async getAllCompanies(query = {}) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;
    if (status === 'expired') filter.subscriptionEndDate = { $lt: new Date() };

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const companies = await Company.find(filter)
      .populate('subscriptionId', 'name price')
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    const total = await Company.countDocuments(filter);

    return { data: companies, total, page: parseInt(page), limit: parseInt(limit) };
  }

  // Get simple list of companies for dropdowns
  async getCompanyList() {
    const companies = await Company.find({})
      .select('name email')
      .sort({ name: 1 });
    return companies;
  }

  async getCompanyById(companyId) {
    const company = await Company.findById(companyId)
      .populate('subscriptionId')
      .populate('createdBy', 'name email');

    if (!company) {
      throw new NotFoundError('Company');
    }

    return company;
  }

  async updateCompany(companyId, updateData) {
    const allowedUpdates = ['name', 'email', 'phone', 'address', 'logo', 'settings', 'isActive'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    // Check if email is being updated and if it's already used by another company
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      const existingCompany = await Company.findOne({
        email: updates.email,
        _id: { $ne: companyId }
      });
      if (existingCompany) {
        throw new ConflictError('This email is already used by another company');
      }

      // Also check if email exists in users table
      const existingUser = await User.findOne({
        email: updates.email,
        companyId: { $ne: companyId }
      });
      if (existingUser) {
        throw new ConflictError('This email is already registered as a user in the system');
      }
    }

    const company = await Company.findByIdAndUpdate(companyId, updates, {
      new: true,
      runValidators: true,
    }).populate('subscriptionId');

    if (!company) {
      throw new NotFoundError('Company');
    }

    return company;
  }

  async deleteCompany(companyId) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ========================================
      // CASCADE DELETE - Company Data
      // ========================================
      // NOTE: We do NOT delete Payment data (financial records)
      // NOTE: We do NOT delete AuditLog data (compliance records)

      // 1. Delete CallAutomationConfig
      await CallAutomationConfig.deleteMany({ companyId }).session(session);

      // 2. Delete WiFi related data
      await WifiAlert.deleteMany({ companyId }).session(session);
      await WifiMetric.deleteMany({ companyId }).session(session);
      await WifiDevice.deleteMany({ companyId }).session(session);
      await WifiNetwork.deleteMany({ companyId }).session(session);

      // 3. Delete messaging logs
      await TelegramMessage.deleteMany({ companyId }).session(session);
      await WhatsAppMessage.deleteMany({ companyId }).session(session);
      await Sms.deleteMany({ companyId }).session(session);

      // 4. Delete notifications
      await Notification.deleteMany({ companyId }).session(session);

      // 5. Delete call logs
      await CallLog.deleteMany({ companyId }).session(session);

      // 6. Delete recharges
      await Recharge.deleteMany({ companyId }).session(session);

      // 7. Delete SIMs
      await Sim.deleteMany({ companyId }).session(session);

      // 8. Delete Users (except super_admin - shouldn't have companyId anyway)
      await User.deleteMany({ companyId }).session(session);

      // 9. Finally delete the company
      await Company.findByIdAndDelete(companyId).session(session);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`[DELETE] Company ${company.name} (${companyId}) deleted with all related data`);

      return true;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      console.error('[DELETE] Transaction aborted:', error.message);
      throw new AppError(`Failed to delete company: ${error.message}`, 500);
    }
  }

  async renewSubscription(companyId, subscriptionId, duration = 30) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription');
    }

    company.subscriptionId = subscriptionId;
    company.subscriptionStartDate = new Date();
    company.subscriptionEndDate = new Date();
    company.subscriptionEndDate.setDate(company.subscriptionEndDate.getDate() + duration);
    company.isActive = true;

    await company.save();

    // Send notification for subscription renewal
    try {
      await notificationHelper.notifySubscriptionRenewed(
        company,
        company.subscriptionEndDate,
        subscription.name
      );
    } catch (notificationError) {
      // Don't fail renewal if notification fails
      console.error('Failed to send subscription renewal notification:', notificationError.message);
    }

    return company;
  }

  async extendTrial(companyId, days = 7) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    company.subscriptionEndDate = new Date(company.subscriptionEndDate);
    company.subscriptionEndDate.setDate(company.subscriptionEndDate.getDate() + days);

    await company.save();

    // Send notification for trial extension
    try {
      await notificationHelper.notifyTrialExtended(
        company,
        company.subscriptionEndDate,
        days
      );
    } catch (notificationError) {
      // Don't fail extension if notification fails
      console.error('Failed to send trial extension notification:', notificationError.message);
    }

    return company;
  }

  async getCompanyStats(companyId) {
    // [HARD DELETE] Removed isActive: true filter - records are now hard deleted
    const totalSims = await Sim.countDocuments({ companyId });
    const activeSims = await Sim.countDocuments({ companyId, status: 'active' });
    const inactiveSims = await Sim.countDocuments({ companyId, status: 'inactive' });

    const totalRecharges = await Recharge.countDocuments({ companyId, status: 'completed' });
    const rechargeStats = await Recharge.getTotalSpent(companyId);

    const company = await Company.findById(companyId);

    return {
      totalSims,
      activeSims,
      inactiveSims,
      totalRecharges,
      totalSpent: rechargeStats.total,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionEndDate: company.subscriptionEndDate,
    };
  }

  async getExpiringSubscriptions(days = 7) {
    return Company.find({
      isActive: true,
      subscriptionEndDate: {
        $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        $gt: new Date(),
      },
    }).populate('subscriptionId');
  }

  async getDashboardOverview() {
    // [HARD DELETE] Count all companies since soft delete is removed
    const totalCompanies = await Company.countDocuments();
    // Keep subscription-based status filtering (isActive = subscription active)
    const activeCompanies = await Company.countDocuments({ isActive: true });
    const expiredCompanies = await Company.countDocuments({
      isActive: true,
      subscriptionEndDate: { $lt: new Date() },
    });

    return {
      totalCompanies,
      activeCompanies,
      expiredCompanies,
    };
  }

  // Admin Management
  async createAdmin(companyId, adminData, createdBy) {
    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // [GLOBAL UNIQUE EMAIL] Check if email exists anywhere in the system
    // One email can only belong to one user across all companies
    const existingUser = await User.findOne({ email: adminData.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError(`Email ${adminData.email} is already registered in the system. Each email can only be used once across all companies.`);
    }

    // [ADMIN EMAIL FIX] Capture plain-text password BEFORE hashing
    // The password will be hashed during admin.save() by User model pre-save hook
    const plainTextPassword = adminData.password;

    // Create admin user
    const admin = new User({
      email: adminData.email.toLowerCase(),
      password: adminData.password,
      name: adminData.name,
      phone: adminData.phone,
      role: 'admin',
      companyId: companyId,
      isActive: true,
      emailVerified: true,
    });

    try {
      await admin.save();
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
      // Re-throw other errors
      throw saveError;
    }

    // Generate tokens for the admin
    const { accessToken, refreshToken } = this.generateTokens(admin);
    admin.refreshToken = refreshToken;
    await admin.save();

    // [ADMIN EMAIL FIX] Send welcome email after successful DB save
    let emailSent = false;
    try {
      await notificationHelper.notifyUserCreated(admin, company, plainTextPassword);
      emailSent = true;
    } catch (error) {
      // Don't fail admin creation if email fails
      console.error('Failed to send admin welcome email:', error.message);
    }

    return {
      user: this.sanitizeUser(admin),
      accessToken,
      emailSent, // [ADMIN EMAIL FIX] Return email status to controller
    };
  }

  async getCompanyAdmins(companyId) {
    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    const admins = await User.find({ companyId, role: 'admin' })
      .select('-password -refreshToken -resetPasswordToken')
      .sort({ createdAt: -1 });

    return admins;
  }

  async getAdminById(adminId) {
    const admin = await User.findOne({ _id: adminId, role: 'admin' })
      .select('-password -refreshToken -resetPasswordToken')
      .populate('companyId', 'name email');

    if (!admin) {
      throw new NotFoundError('Admin');
    }

    return admin;
  }

  async updateAdmin(adminId, updateData) {
    const allowedUpdates = ['name', 'phone', 'isActive'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    const admin = await User.findOneAndUpdate(
      { _id: adminId, role: 'admin' },
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshToken -resetPasswordToken');

    if (!admin) {
      throw new NotFoundError('Admin');
    }

    return admin;
  }

  async deleteAdmin(adminId) {
    const admin = await User.findOne({ _id: adminId, role: 'admin' });
    if (!admin) {
      throw new NotFoundError('Admin');
    }

    const companyId = admin.companyId;

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Unassign SIMs from this admin (if any)
      await Sim.updateMany(
        { assignedTo: adminId },
        { assignedTo: null },
        { session }
      );

      // Delete notifications for this user
      await Notification.deleteMany({ userId: adminId }).session(session);

      // Hard delete the admin user
      await User.findByIdAndDelete(adminId).session(session);

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`[DELETE] Admin ${admin.email} (${adminId}) deleted`);

      return admin;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('[DELETE] Admin delete transaction aborted:', error.message);
      throw new AppError(`Failed to delete admin: ${error.message}`, 500);
    }
  }

  async resetAdminPassword(adminId, newPassword, resetBy = null) {
    const admin = await User.findOne({ _id: adminId, role: 'admin' }).select('+password');
    if (!admin) {
      throw new NotFoundError('Admin');
    }

    admin.password = newPassword;
    admin.passwordChangedAt = Date.now();
    admin.refreshToken = null;
    await admin.save();

    // Send password reset notification
    if (resetBy) {
      try {
        const company = await Company.findById(admin.companyId);
        await notificationHelper.notifyPasswordResetByAdmin(admin, newPassword, resetBy, company);
      } catch (notificationError) {
        console.error('Failed to send admin password reset notification:', notificationError.message);
      }
    }

    return { message: 'Password reset successfully' };
  }

  generateTokens(user) {
    const jwt = require('jsonwebtoken');
    const config = require('../../config');

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

  // Get company's subscription for admin dashboard
  async getMySubscription(companyId) {
    const company = await Company.findById(companyId)
      .populate('subscriptionId');

    if (!company) {
      throw new NotFoundError('Company');
    }

    // [HARD DELETE] Removed isActive: true filter - records are now hard deleted
    // Get current SIM and User counts (exclude admin from user count)
    const currentSims = await Sim.countDocuments({ companyId });
    const currentUsers = await User.countDocuments({ companyId, role: { $ne: 'admin' } });

    // Determine subscription status
    const now = new Date();
    let status = 'active';
    if (!company.subscriptionEndDate || new Date(company.subscriptionEndDate) < now) {
      status = 'expired';
    } else if (!company.isActive) {
      status = 'inactive';
    }

    // Calculate days until expiry
    const daysUntilExpiry = company.subscriptionEndDate
      ? Math.ceil((new Date(company.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24))
      : null;

    return {
      company: {
        name: company.name,
        email: company.email,
      },
      plan: company.subscriptionId ? {
        _id: company.subscriptionId._id,
        name: company.subscriptionId.name,
        description: company.subscriptionId.description,
        price: company.subscriptionId.price,
        features: company.subscriptionId.features,
        limits: company.subscriptionId.limits,
        isPopular: company.subscriptionId.isPopular,
      } : null,
      billingCycle: company.billingCycle || 'monthly',
      status,
      subscriptionStartDate: company.subscriptionStartDate,
      subscriptionEndDate: company.subscriptionEndDate,
      daysUntilExpiry,
      isActive: company.isActive,
      usage: {
        currentSims,
        currentUsers,
        maxSims: company.subscriptionId?.limits?.maxSims ?? 0,
        maxUsers: company.subscriptionId?.limits?.maxUsers ?? 0,
      },
    };
  }

  /**
   * Get company details for logged-in user
   * @param {string} companyId - Company ID from JWT token
   * @returns {Object} Mapped company response
   */
  async getMyCompany(companyId) {
    const company = await Company.findById(companyId)
      .populate('subscriptionId', 'name price limits')
      .select('_id name logo address phone email website subscriptionId subscriptionStartDate subscriptionEndDate status isActive createdAt settings');

    if (!company) {
      throw new NotFoundError('Company');
    }

    return this.mapCompanyResponse(company);
  }

  /**
   * Get company details by ID (Admin use)
   * @param {string} companyId - Company ID
   * @param {string} requesterCompanyId - Requester's company ID for validation
   * @param {string} requesterRole - Requester's role
   * @returns {Object} Mapped company response
   */
  async getCompanyDetailsById(companyId, requesterCompanyId, requesterRole) {
    // Security: Only super_admin can access any company, others only their own
    if (requesterRole !== 'super_admin' && companyId !== requesterCompanyId) {
      throw new NotFoundError('Company');
    }

    const company = await Company.findById(companyId)
      .populate('subscriptionId', 'name price limits')
      .select('_id name logo address phone email website subscriptionId subscriptionStartDate subscriptionEndDate status isActive createdAt settings');

    if (!company) {
      throw new NotFoundError('Company');
    }

    return this.mapCompanyResponse(company);
  }

  /**
   * Update own company profile (for company admins)
   * Admins can only update: name, phone, website, address
   * Email changes require separate verification process
   * @param {string} companyId - Company ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - Requesting user
   * @returns {Object} Updated company
   */
  async updateMyCompany(companyId, updateData, user) {
    // Only allow specific fields to be updated (email removed - requires verification)
    const allowedUpdates = ['name', 'phone', 'website', 'address'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    // If phone is being updated, normalize it
    if (updates.phone) {
      updates.phone = updates.phone.trim();
    }

    const company = await Company.findByIdAndUpdate(
      companyId,
      updates,
      { new: true, runValidators: true }
    ).populate('subscriptionId', 'name price limits');

    if (!company) {
      throw new NotFoundError('Company');
    }

    return this.mapCompanyResponse(company);
  }

  /**
   * Map company document to safe response object
   * @param {Object} company - Company document
   * @returns {Object} Mapped response
   */
  mapCompanyResponse(company) {
    return {
      _id: company._id,
      name: company.name,
      logo: company.logo || null,
      address: company.address || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      plan: company.subscriptionId?.name || 'basic',
      planDetails: company.subscriptionId ? {
        _id: company.subscriptionId._id,
        name: company.subscriptionId.name,
        price: company.subscriptionId.price,
        limits: company.subscriptionId.limits,
      } : null,
      maxSIMs: company.subscriptionId?.limits?.maxSims || 0,
      maxUsers: company.subscriptionId?.limits?.maxUsers || 0,
      subscriptionStartDate: company.subscriptionStartDate,
      subscriptionEndDate: company.subscriptionEndDate,
      status: company.isActive ? 'active' : 'inactive',
      subscriptionStatus: company.subscriptionEndDate && new Date(company.subscriptionEndDate) < new Date() ? 'expired' : 'active',
      createdAt: company.createdAt,
      settings: company.settings || {},
    };
  }

  /**
   * Request company email change - Step 1
   * Verifies admin password and sends OTP to current company email
   */
  async requestCompanyEmailChange(companyId, newEmail, password, user) {
    const crypto = require('crypto');
    const User = require('../../models/auth/user.model');
    const emailService = require('../../utils/emailService');

    // Get company
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Verify user's password (the admin making the request)
    const adminUser = await User.findById(user._id).select('+password');
    if (!adminUser) {
      throw new NotFoundError('User');
    }

    const isPasswordValid = await adminUser.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Incorrect password');
    }

    // Check if new email is same as current
    if (newEmail.toLowerCase() === company.email.toLowerCase()) {
      throw new AppError('New email cannot be the same as the current company email', 400);
    }

    // Check if new email is already used by another company
    const existingCompany = await Company.findOne({ email: newEmail.toLowerCase() });
    if (existingCompany) {
      throw new ConflictError('This email is already used by another company');
    }

    // Check if new email is already used by a user
    const existingUser = await User.findOne({ email: newEmail.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('This email is already registered as a user in the system');
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP and pending new email
    company.emailChangeOTP = crypto.createHash('sha256').update(otp).digest('hex');
    company.emailChangeOTPExpires = otpExpires;
    company.emailChangeOTPVerified = false;
    company.pendingNewEmail = newEmail.toLowerCase();
    await company.save();

    // Send OTP to current company email
    try {
      await emailService.sendEmailChangeOTPOld(company.email, otp, company.name, newEmail);
    } catch (error) {
      // Clear the OTP if email fails
      company.emailChangeOTP = undefined;
      company.emailChangeOTPExpires = undefined;
      company.pendingNewEmail = undefined;
      await company.save();
      throw new AppError('Failed to send verification email. Please try again.', 500);
    }

    return {
      success: true,
      message: 'Verification code sent to current company email',
      oldEmail: company.email,
      newEmail: newEmail,
    };
  }

  /**
   * Verify old email OTP - Step 2
   * Validates OTP and sends new OTP to the new email
   */
  async verifyCompanyEmailOld(companyId, otp) {
    const crypto = require('crypto');
    const emailService = require('../../utils/emailService');

    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Check if email change was initiated
    if (!company.emailChangeOTP || !company.emailChangeOTPExpires || !company.pendingNewEmail) {
      throw new AppError('No pending email change request. Please start over.', 400);
    }

    // Check if OTP expired
    if (company.emailChangeOTPExpires < Date.now()) {
      company.emailChangeOTP = undefined;
      company.emailChangeOTPExpires = undefined;
      company.pendingNewEmail = undefined;
      await company.save();
      throw new AppError('Verification code has expired. Please start over.', 400);
    }

    // Verify OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    if (company.emailChangeOTP !== hashedOTP) {
      throw new AppError('Invalid verification code', 400);
    }

    // Mark old email as verified
    company.emailChangeOTPVerified = true;
    await company.save();

    // Generate new OTP for NEW email verification
    const newOTP = crypto.randomInt(100000, 999999).toString();
    const newOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update OTP for new email verification
    company.emailChangeOTP = crypto.createHash('sha256').update(newOTP).digest('hex');
    company.emailChangeOTPExpires = newOTPExpires;
    await company.save();

    // Send OTP to NEW email
    try {
      await emailService.sendEmailChangeOTPNew(company.pendingNewEmail, newOTP, company.name, company.email);
    } catch (error) {
      throw new AppError('Failed to send verification email to new address. Please try again.', 500);
    }

    return {
      success: true,
      message: 'Verification code sent to the new email',
    };
  }

  /**
   * Verify new email OTP and complete email change - Step 3
   */
  async verifyCompanyEmailNew(companyId, otp, user) {
    const crypto = require('crypto');
    const User = require('../../models/auth/user.model');
    const emailService = require('../../utils/emailService');

    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Check if email change was initiated and old email was verified
    if (!company.emailChangeOTP || !company.emailChangeOTPExpires || !company.pendingNewEmail || !company.emailChangeOTPVerified) {
      throw new AppError('No pending email change request. Please start over.', 400);
    }

    // Check if OTP expired
    if (company.emailChangeOTPExpires < Date.now()) {
      company.emailChangeOTP = undefined;
      company.emailChangeOTPExpires = undefined;
      company.emailChangeOTPVerified = undefined;
      company.pendingNewEmail = undefined;
      await company.save();
      throw new AppError('Verification code has expired. Please start over.', 400);
    }

    // Verify OTP
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    if (company.emailChangeOTP !== hashedOTP) {
      throw new AppError('Invalid verification code', 400);
    }

    // Double-check new email is still available
    const existingCompany = await Company.findOne({ email: company.pendingNewEmail });
    if (existingCompany) {
      throw new ConflictError('This email is now used by another company. Please try a different email.');
    }

    const existingUser = await User.findOne({ email: company.pendingNewEmail });
    if (existingUser) {
      throw new ConflictError('This email is now registered as a user. Please try a different email.');
    }

    // Store old email for confirmation
    const oldEmail = company.email;

    // Update company email
    company.email = company.pendingNewEmail;

    // Clear email change fields
    company.emailChangeOTP = undefined;
    company.emailChangeOTPExpires = undefined;
    company.emailChangeOTPVerified = undefined;
    company.pendingNewEmail = undefined;

    await company.save();

    // Send confirmation emails
    try {
      await emailService.sendEmailChangeConfirmationOld(oldEmail, company.name, company.email);
      await emailService.sendEmailChangeConfirmationNew(company.email, company.name, oldEmail);
    } catch (error) {
      // Email failed but email change is complete, just log the error
      console.error('Failed to send confirmation emails:', error);
    }

    return this.mapCompanyResponse(company);
  }

  /**
   * Cancel company email change
   */
  async cancelCompanyEmailChange(companyId) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new NotFoundError('Company');
    }

    // Clear email change fields
    company.emailChangeOTP = undefined;
    company.emailChangeOTPExpires = undefined;
    company.emailChangeOTPVerified = undefined;
    company.pendingNewEmail = undefined;

    await company.save();

    return { success: true };
  }
}

module.exports = new CompanyService();