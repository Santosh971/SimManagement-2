const Company = require('../models/company/company.model');
const { SubscriptionLimitError } = require('../utils/errors');

const checkSubscriptionLimit = (feature) => {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'super_admin') {
        return next();
      }

      const company = await Company.findById(req.user.companyId).populate('subscriptionId');

      if (!company || !company.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Company account is inactive or not found',
        });
      }

      // Check subscription expiry
      if (company.subscriptionEndDate && new Date() > company.subscriptionEndDate) {
        return res.status(403).json({
          success: false,
          message: 'Subscription has expired. Please renew to continue.',
        });
      }

      const subscription = company.subscriptionId;
      if (!subscription) {
        return res.status(403).json({
          success: false,
          message: 'No subscription found',
        });
      }

      // Check feature limits
      const limits = subscription.limits;

      switch (feature) {
        case 'sims':
          if (limits.maxSims !== -1) {
            const Sim = require('../models/sim/sim.model');
            const simCount = await Sim.countDocuments({ companyId: req.user.companyId });
            if (simCount >= limits.maxSims) {
              throw new SubscriptionLimitError('SIMs', limits.maxSims);
            }
          }
          break;

        case 'users':
          if (limits.maxUsers !== -1) {
            const User = require('../models/auth/user.model');
            const userCount = await User.countDocuments({ companyId: req.user.companyId });
            if (userCount >= limits.maxUsers) {
              throw new SubscriptionLimitError('Users', limits.maxUsers);
            }
          }
          break;

        case 'callLogSync':
          if (!limits.callLogSync) {
            return res.status(403).json({
              success: false,
              message: 'Call log sync feature not available in your plan',
            });
          }
          break;

        case 'whatsappStatus':
          if (!limits.whatsappStatus) {
            return res.status(403).json({
              success: false,
              message: 'WhatsApp status feature not available in your plan',
            });
          }
          break;

        case 'reports':
          if (!limits.reports) {
            return res.status(403).json({
              success: false,
              message: 'Reports feature not available in your plan',
            });
          }
          break;
      }

      req.subscription = subscription;
      req.company = company;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  checkSubscriptionLimit,
};