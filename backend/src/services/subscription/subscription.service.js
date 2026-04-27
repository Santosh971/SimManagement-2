const Subscription = require('../../models/subscription/subscription.model');
const { NotFoundError, ConflictError } = require('../../utils/errors');

class SubscriptionService {
  async createPlan(data) {
    const { name } = data;

    // Check if plan name exists
    const existingPlan = await Subscription.findOne({ name });
    if (existingPlan) {
      throw new ConflictError('Subscription plan with this name already exists');
    }

    const plan = new Subscription(data);
    await plan.save();

    return plan;
  }

  async getAllPlans(query = {}) {
    const { activeOnly } = query;

    const filter = {};
    // Handle different activeOnly values:
    // - 'all' or undefined: show all plans
    // - 'true', true, or 'active': show only active plans
    // - 'false', false, or 'inactive': show only inactive plans
    if (activeOnly === 'all' || activeOnly === undefined) {
      // Show all plans - no filter
    } else if (activeOnly === 'true' || activeOnly === true || activeOnly === 'active') {
      filter.isActive = true;
    } else if (activeOnly === 'false' || activeOnly === false || activeOnly === 'inactive') {
      filter.isActive = false;
    }

    const plans = await Subscription.find(filter).sort({ sortOrder: 1 });

    return plans;
  }

  async getPlanById(planId) {
    const plan = await Subscription.findById(planId);

    if (!plan) {
      throw new NotFoundError('Subscription plan');
    }

    return plan;
  }

  async updatePlan(planId, updateData) {
    const plan = await Subscription.findByIdAndUpdate(
      planId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!plan) {
      throw new NotFoundError('Subscription plan');
    }

    return plan;
  }

  async deletePlan(planId) {
    const plan = await Subscription.findByIdAndDelete(planId);

    if (!plan) {
      throw new NotFoundError('Subscription plan');
    }

    return true;
  }

  async togglePlanStatus(planId) {
    const plan = await Subscription.findById(planId);

    if (!plan) {
      throw new NotFoundError('Subscription plan');
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    return plan;
  }

  async initializeDefaultPlans() {
    const defaultPlans = Subscription.defaultPlans;
    const createdPlans = [];

    for (const planData of defaultPlans) {
      const existing = await Subscription.findOne({ name: planData.name });
      if (!existing) {
        const plan = new Subscription(planData);
        await plan.save();
        createdPlans.push(plan);
      }
    }

    return {
      message: `Created ${createdPlans.length} default plans`,
      plans: createdPlans,
    };
  }

  async getPlanStats() {
    const totalPlans = await Subscription.countDocuments();
    const activePlans = await Subscription.countDocuments({ isActive: true });
    const popularPlans = await Subscription.find({ isPopular: true, isActive: true });

    return {
      totalPlans,
      activePlans,
      popularPlans,
    };
  }

  async comparePlans() {
    const plans = await Subscription.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .select('name description price features customFeatures limits isPopular');

    return plans.map((plan) => ({
      ...plan.toObject(),
      yearlySavings: plan.calculateYearlySavings(),
      formattedPrice: plan.formattedPrice,
    }));
  }
}

module.exports = new SubscriptionService();