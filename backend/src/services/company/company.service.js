const Company = require('../../models/company/company.model');
const User = require('../../models/auth/user.model');
const Subscription = require('../../models/subscription/subscription.model');
const Sim = require('../../models/sim/sim.model');
const Recharge = require('../../models/recharge/recharge.model');
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
    const allowedUpdates = ['name', 'phone', 'address', 'logo', 'settings'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

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

    // Soft delete - deactivate instead of removing
    company.isActive = false;
    await company.save();

    // Deactivate all company users
    await User.updateMany({ companyId }, { isActive: false });

    return true;
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
    const totalSims = await Sim.countDocuments({ companyId, isActive: true });
    const activeSims = await Sim.countDocuments({ companyId, isActive: true, status: 'active' });
    const inactiveSims = await Sim.countDocuments({ companyId, isActive: true, status: 'inactive' });

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
    const totalCompanies = await Company.countDocuments();
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

    // Soft delete - deactivate
    admin.isActive = false;
    await admin.save();

    return true;
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

    // Get current SIM and User counts
    const currentSims = await Sim.countDocuments({ companyId, isActive: true });
    const currentUsers = await User.countDocuments({ companyId, isActive: true });

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
}

module.exports = new CompanyService();