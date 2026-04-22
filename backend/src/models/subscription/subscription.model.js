const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
    maxlength: [50, 'Plan name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  price: {
    monthly: {
      type: Number,
      required: [true, 'Monthly price is required'],
      min: [0, 'Price cannot be negative'],
    },
    yearly: {
      type: Number,
      required: [true, 'Yearly price is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly',
  },
  features: {
    callLogSync: { type: Boolean, default: false },
    whatsappStatus: { type: Boolean, default: false },
    telegramStatus: { type: Boolean, default: false },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    advancedReports: { type: Boolean, default: false },
    excelExport: { type: Boolean, default: true },
    apiAccess: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
  },
  limits: {
    maxSims: { type: Number, default: 10 }, // -1 for unlimited
    maxUsers: { type: Number, default: 5 },
    maxRecharges: { type: Number, default: 100 },
    callLogSync: { type: Boolean, default: true },
    whatsappStatus: { type: Boolean, default: false },
    reports: { type: Boolean, default: true },
  },
  trialDays: {
    type: Number,
    default: 14,
    min: [0, 'Trial days cannot be negative'],
  },
  isPopular: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
SubscriptionSchema.index({ name: 1 });
SubscriptionSchema.index({ isActive: 1, sortOrder: 1 });

// Virtual for formatted price
SubscriptionSchema.virtual('formattedPrice').get(function () {
  return {
    monthly: `₹${this.price.monthly}/month`,
    yearly: `₹${this.price.yearly}/year`,
  };
});

// Static method to find active plans
SubscriptionSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ sortOrder: 1 });
};

// Static method to find popular plans
SubscriptionSchema.statics.findPopular = function () {
  return this.find({ isActive: true, isPopular: true }).sort({ sortOrder: 1 });
};

// Method to calculate savings for yearly plan
SubscriptionSchema.methods.calculateYearlySavings = function () {
  const monthlyCost = this.price.monthly * 12;
  const yearlyCost = this.price.yearly;
  return monthlyCost - yearlyCost;
};

// Predefined subscription plans
const defaultPlans = [
  {
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    price: { monthly: 999, yearly: 9990 },
    features: {
      callLogSync: false,
      whatsappStatus: false,
      telegramStatus: false,
      emailNotifications: true,
      smsNotifications: false,
      advancedReports: false,
      excelExport: true,
      apiAccess: false,
      prioritySupport: false,
    },
    limits: { maxSims: 10, maxUsers: 3, maxRecharges: 50, callLogSync: false, whatsappStatus: false, reports: true },
    isPopular: false,
    sortOrder: 1,
  },
  {
    name: 'Professional',
    description: 'Great for growing businesses',
    price: { monthly: 2499, yearly: 24990 },
    features: {
      callLogSync: true,
      whatsappStatus: true,
      telegramStatus: false,
      emailNotifications: true,
      smsNotifications: true,
      advancedReports: true,
      excelExport: true,
      apiAccess: false,
      prioritySupport: false,
    },
    limits: { maxSims: 50, maxUsers: 10, maxRecharges: 500, callLogSync: true, whatsappStatus: true, reports: true },
    isPopular: true,
    sortOrder: 2,
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with advanced needs',
    price: { monthly: 4999, yearly: 49990 },
    features: {
      callLogSync: true,
      whatsappStatus: true,
      telegramStatus: true,
      emailNotifications: true,
      smsNotifications: true,
      advancedReports: true,
      excelExport: true,
      apiAccess: true,
      prioritySupport: true,
    },
    limits: { maxSims: -1, maxUsers: -1, maxRecharges: -1, callLogSync: true, whatsappStatus: true, reports: true },
    isPopular: false,
    sortOrder: 3,
  },
];

module.exports = mongoose.model('Subscription', SubscriptionSchema);
module.exports.defaultPlans = defaultPlans;