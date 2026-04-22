const Sim = require('../../models/sim/sim.model');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

class StatusService {
  async getStatus(simId, user) {
    const filter = { _id: simId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const sim = await Sim.findOne(filter);

    if (!sim) {
      throw new NotFoundError('SIM');
    }

    return {
      whatsapp: {
        enabled: sim.whatsappEnabled,
        lastActive: sim.whatsappLastActive,
      },
      telegram: {
        enabled: sim.telegramEnabled,
        lastActive: sim.telegramLastActive,
      },
    };
  }

  async updateWhatsAppStatus(simId, enabled, user) {
    const filter = { _id: simId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const sim = await Sim.findOneAndUpdate(
      filter,
      {
        whatsappEnabled: enabled,
        whatsappLastActive: enabled ? new Date() : null,
      },
      { new: true }
    );

    if (!sim) {
      throw new NotFoundError('SIM');
    }

    return {
      enabled: sim.whatsappEnabled,
      lastActive: sim.whatsappLastActive,
    };
  }

  async updateTelegramStatus(simId, enabled, user) {
    const filter = { _id: simId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const sim = await Sim.findOneAndUpdate(
      filter,
      {
        telegramEnabled: enabled,
        telegramLastActive: enabled ? new Date() : null,
      },
      { new: true }
    );

    if (!sim) {
      throw new NotFoundError('SIM');
    }

    return {
      enabled: sim.telegramEnabled,
      lastActive: sim.telegramLastActive,
    };

  }

  async getStatusHistory(simId, user) {
    const filter = { _id: simId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const sim = await Sim.findOne(filter);

    if (!sim) {
      throw new NotFoundError('SIM');
    }

    // For now, return current status (history can be implemented with a separate collection)
    return {
      current: {
        whatsapp: {
          enabled: sim.whatsappEnabled,
          lastActive: sim.whatsappLastActive,
        },
        telegram: {
          enabled: sim.telegramEnabled,
          lastActive: sim.telegramLastActive,
        },
      },
      history: [], // Placeholder for future implementation
    };
  }

  async bulkUpdateStatus(simIds, platform, enabled, user) {
    const filter = { _id: { $in: simIds }, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const updateField = platform === 'whatsapp' ? 'whatsappEnabled' : 'telegramEnabled';
    const updateDate = platform === 'whatsapp' ? 'whatsappLastActive' : 'telegramLastActive';

    const update = {
      [updateField]: enabled,
    };

    if (enabled) {
      update[updateDate] = new Date();
    }

    const result = await Sim.updateMany(filter, update);

    return {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    };
  }

  async getAllStatusOverview(companyId) {
    const sims = await Sim.find({ companyId, isActive: true }).select(
      'mobileNumber whatsappEnabled telegramEnabled whatsappLastActive telegramLastActive'
    );

    const whatsappActive = sims.filter((s) => s.whatsappEnabled).length;
    const telegramActive = sims.filter((s) => s.telegramEnabled).length;

    return {
      total: sims.length,
      whatsapp: {
        enabled: whatsappActive,
        disabled: sims.length - whatsappActive,
      },
      telegram: {
        enabled: telegramActive,
        disabled: sims.length - telegramActive,
      },
      sims: sims.map((s) => ({
        _id: s._id,
        mobileNumber: s.mobileNumber,
        whatsapp: {
          enabled: s.whatsappEnabled,
          lastActive: s.whatsappLastActive,
        },
        telegram: {
          enabled: s.telegramEnabled,
          lastActive: s.telegramLastActive,
        },
      })),
    };
  }
}

module.exports = new StatusService();