const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const companyController = require('../../controllers/company/company.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// Validation rules
const createCompanyValidation = [
  body('name').trim().notEmpty().withMessage('Company name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  // [PHONE VALIDATION FIX] - Accept phone with or without country code (same as SIM module)
  body('phone').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number (10-15 digits, optional + prefix)'),
  body('subscriptionId').isMongoId().withMessage('Valid subscription ID is required'),
  body('subscriptionDuration').optional().isInt({ min: 1 }).withMessage('Invalid subscription duration'),
  body('address.street').optional().isString(),
  body('address.city').optional().isString(),
  body('address.state').optional().isString(),
  body('address.country').optional().isString(),
  body('address.zipCode').optional().isString(),
];

const updateCompanyValidation = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('name').optional().trim().isLength({ max: 100 }),
  // [PHONE VALIDATION FIX] - Accept phone with or without country code (same as SIM module)
  body('phone').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number (10-15 digits, optional + prefix)'),
  body('logo').optional().isString(),
  body('settings.currency').optional().isString(),
  body('settings.timezone').optional().isString(),
  body('settings.dateFormat').optional().isString(),
  body('settings.notificationsEnabled').optional().isBoolean(),
  body('settings.rechargeReminderDays').optional().isInt({ min: 1, max: 30 }),
  body('settings.inactiveSimDays').optional().isInt({ min: 1, max: 90 }),
];

const renewSubscriptionValidation = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('subscriptionId').isMongoId().withMessage('Valid subscription ID is required'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Invalid duration'),
];

const extendTrialValidation = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('days').isInt({ min: 1, max: 30 }).withMessage('Days must be between 1 and 30'),
];

// Admin validation
const createAdminValidation = [
  param('companyId').isMongoId().withMessage('Invalid company ID'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  // [PHONE VALIDATION FIX] - Accept phone with or without country code (same as SIM module)
  body('phone').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number (10-15 digits, optional + prefix)'),
];

const updateAdminValidation = [
  param('adminId').isMongoId().withMessage('Invalid admin ID'),
  body('name').optional().trim().isLength({ max: 50 }),
  // [PHONE VALIDATION FIX] - Accept phone with or without country code (same as SIM module)
  body('phone').optional().matches(/^\+?\d{10,15}$/).withMessage('Invalid phone number (10-15 digits, optional + prefix)'),
  body('isActive').optional().isBoolean(),
];

const resetPasswordValidation = [
  param('adminId').isMongoId().withMessage('Invalid admin ID'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  query('search').optional().trim(),
  query('status').optional().isIn(['active', 'inactive', 'expired']),
  query('sortBy').optional().isIn(['name', 'createdAt', 'subscriptionEndDate']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];

// All routes require authentication and super admin role
router.use(authenticate);

// Admin-only route to get their company's subscription
router.get('/my-subscription', authorize('admin'), companyController.getMySubscription);

router.use(authorize('super_admin'));

// Routes
router.post('/', createCompanyValidation, validate, companyController.create);
router.get('/', queryValidation, validate, companyController.getAll);
router.get('/expiring', companyController.getExpiring);
router.get('/overview', companyController.getDashboardOverview);
router.get('/:id', companyController.getById);
router.put('/:id', updateCompanyValidation, validate, companyController.update);
router.delete('/:id', companyController.delete);
router.post('/:id/renew-subscription', renewSubscriptionValidation, validate, companyController.renewSubscription);
router.post('/:id/extend-trial', extendTrialValidation, validate, companyController.extendTrial);
router.get('/:id/stats', companyController.getStats);

// Admin Management Routes
router.post('/:companyId/admins', createAdminValidation, validate, companyController.createAdmin);
router.get('/:companyId/admins', companyController.getCompanyAdmins);
router.get('/admins/:adminId', companyController.getAdminById);
router.put('/admins/:adminId', updateAdminValidation, validate, companyController.updateAdmin);
router.delete('/admins/:adminId', companyController.deleteAdmin);
router.post('/admins/:adminId/reset-password', resetPasswordValidation, validate, companyController.resetAdminPassword);

module.exports = router;