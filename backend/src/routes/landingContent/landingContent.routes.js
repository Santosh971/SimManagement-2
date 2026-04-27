const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const landingContentController = require('../../controllers/landingContent/landingContent.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');

// Validation rules for hero section
const heroValidation = [
  body('hero.badge').optional().trim().isLength({ max: 200 }),
  body('hero.title').optional().trim().isLength({ max: 200 }),
  body('hero.highlight').optional().trim().isLength({ max: 100 }),
  body('hero.subtitle').optional().trim().isLength({ max: 500 }),
  body('hero.cta1Text').optional().trim().isLength({ max: 50 }),
  body('hero.cta1Link').optional().trim().isLength({ max: 200 }),
  body('hero.cta2Text').optional().trim().isLength({ max: 50 }),
  body('hero.cta2Link').optional().trim().isLength({ max: 200 }),
];

// Validation rules for testimonial
const testimonialValidation = [
  body('testimonials.items').optional().isArray(),
  body('testimonials.items.*.name').optional().trim().isLength({ max: 100 }),
  body('testimonials.items.*.role').optional().trim().isLength({ max: 100 }),
  body('testimonials.items.*.company').optional().trim().isLength({ max: 100 }),
  body('testimonials.items.*.content').optional().trim().isLength({ max: 1000 }),
  body('testimonials.items.*.rating').optional().isInt({ min: 1, max: 5 }),
];

// Validation rules for FAQ
const faqValidation = [
  body('faq.items').optional().isArray(),
  body('faq.items.*.question').optional().trim().isLength({ max: 500 }),
  body('faq.items.*.answer').optional().trim().isLength({ max: 2000 }),
];

// Public route - no authentication required
router.get('/public', landingContentController.getPublicContent);

// All routes below require authentication and super admin role
router.use(authenticate);
router.use(authorize('super_admin'));

// Get full content (Super Admin only)
router.get('/', landingContentController.getFullContent);

// Update entire content (Super Admin only)
router.put('/', heroValidation, testimonialValidation, faqValidation, validate, landingContentController.updateContent);

// Update specific section (Super Admin only)
router.put('/:section', landingContentController.updateSection);

// Reset to default (Super Admin only)
router.post('/reset', landingContentController.resetToDefault);

module.exports = router;