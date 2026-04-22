const companyService = require('../../services/company/company.service');
const auditLogService = require('../../services/auditLog/auditLog.service');
const { successResponse, paginatedResponse } = require('../../utils/response');

class CompanyController {
  async create(req, res, next) {
    try {
      const company = await companyService.createCompany(req.body, req.user.id);

      // Audit log: COMPANY_CREATE
      await auditLogService.logAction({
        action: 'COMPANY_CREATE',
        module: 'COMPANY',
        description: `Created company ${company.name}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: company._id,
        entityId: company._id,
        entityType: 'COMPANY',
        metadata: { name: company.name, email: company.email },
        req,
      });

      return successResponse(res, company, 'Company created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await companyService.getAllCompanies(req.query);
      return paginatedResponse(res, result.data, result.total, result.page, result.limit);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const company = await companyService.getCompanyById(req.params.id);
      return successResponse(res, company);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const company = await companyService.updateCompany(req.params.id, req.body);

      // Audit log: COMPANY_UPDATE
      await auditLogService.logAction({
        action: 'COMPANY_UPDATE',
        module: 'COMPANY',
        description: `Updated company ${company.name}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: company._id,
        entityId: company._id,
        entityType: 'COMPANY',
        metadata: { changes: req.body },
        req,
      });

      return successResponse(res, company, 'Company updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const company = await companyService.deleteCompany(req.params.id);

      // Audit log: COMPANY_DELETE
      await auditLogService.logAction({
        action: 'COMPANY_DELETE',
        module: 'COMPANY',
        description: `Deleted company ${company.name}`,
        performedBy: req.user._id,
        role: req.user.role,
        entityId: company._id,
        entityType: 'COMPANY',
        metadata: { name: company.name },
        req,
      });

      return successResponse(res, null, 'Company deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async renewSubscription(req, res, next) {
    try {
      const { subscriptionId, duration } = req.body;
      const company = await companyService.renewSubscription(
        req.params.id,
        subscriptionId,
        duration
      );

      // Audit log: COMPANY_SUBSCRIPTION_RENEW
      await auditLogService.logAction({
        action: 'COMPANY_SUBSCRIPTION_RENEW',
        module: 'COMPANY',
        description: `Renewed subscription for company ${company.name}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: company._id,
        entityId: company._id,
        entityType: 'COMPANY',
        metadata: { subscriptionId, duration },
        req,
      });

      return successResponse(res, company, 'Subscription renewed successfully');
    } catch (error) {
      next(error);
    }
  }

  async extendTrial(req, res, next) {
    try {
      const { days } = req.body;
      const company = await companyService.extendTrial(req.params.id, days);

      // Audit log: COMPANY_TRIAL_EXTEND
      await auditLogService.logAction({
        action: 'COMPANY_TRIAL_EXTEND',
        module: 'COMPANY',
        description: `Extended trial for company ${company.name} by ${days} days`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: company._id,
        entityId: company._id,
        entityType: 'COMPANY',
        metadata: { days },
        req,
      });

      return successResponse(res, company, 'Trial extended successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStats(req, res, next) {
    try {
      const stats = await companyService.getCompanyStats(req.params.id);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }

  async getExpiring(req, res, next) {
    try {
      const { days } = req.query;
      const companies = await companyService.getExpiringSubscriptions(days || 7);
      return successResponse(res, companies);
    } catch (error) {
      next(error);
    }
  }

  async getDashboardOverview(req, res, next) {
    try {
      const overview = await companyService.getDashboardOverview();
      return successResponse(res, overview);
    } catch (error) {
      next(error);
    }
  }

  // Admin Management
  async createAdmin(req, res, next) {
    try {
      const { companyId } = req.params;
      const result = await companyService.createAdmin(companyId, req.body, req.user.id);

      // Audit log: COMPANY_ADMIN_CREATE
      await auditLogService.logAction({
        action: 'COMPANY_ADMIN_CREATE',
        module: 'COMPANY',
        description: `Created admin ${result.user.name} for company`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: companyId,
        entityId: result.user._id,
        entityType: 'USER',
        metadata: { email: result.user.email },
        req,
      });

      // [ADMIN EMAIL FIX] Return appropriate message based on email status
      const message = result.emailSent
        ? 'Admin created successfully. Login credentials sent to email.'
        : 'Admin created successfully.';

      return successResponse(res, { ...result.user, accessToken: result.accessToken, emailSent: result.emailSent }, message, 201);
    } catch (error) {
      next(error);
    }
  }

  async getCompanyAdmins(req, res, next) {
    try {
      const { companyId } = req.params;
      const admins = await companyService.getCompanyAdmins(companyId);
      return successResponse(res, admins);
    } catch (error) {
      next(error);
    }
  }

  async getAdminById(req, res, next) {
    try {
      const admin = await companyService.getAdminById(req.params.adminId);
      return successResponse(res, admin);
    } catch (error) {
      next(error);
    }
  }

  async updateAdmin(req, res, next) {
    try {
      const admin = await companyService.updateAdmin(req.params.adminId, req.body);

      // Audit log: COMPANY_ADMIN_UPDATE
      await auditLogService.logAction({
        action: 'COMPANY_ADMIN_UPDATE',
        module: 'COMPANY',
        description: `Updated admin ${admin.name}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: admin.companyId,
        entityId: admin._id,
        entityType: 'USER',
        metadata: { changes: req.body },
        req,
      });

      return successResponse(res, admin, 'Admin updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteAdmin(req, res, next) {
    try {
      const admin = await companyService.deleteAdmin(req.params.adminId);

      // Audit log: COMPANY_ADMIN_DELETE
      await auditLogService.logAction({
        action: 'COMPANY_ADMIN_DELETE',
        module: 'COMPANY',
        description: `Deleted admin ${admin.name}`,
        performedBy: req.user._id,
        role: req.user.role,
        companyId: admin.companyId,
        entityId: admin._id,
        entityType: 'USER',
        metadata: { email: admin.email },
        req,
      });

      return successResponse(res, null, 'Admin deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async resetAdminPassword(req, res, next) {
    try {
      const result = await companyService.resetAdminPassword(req.params.adminId, req.body.password, req.user);

      // Audit log: USER_PASSWORD_RESET
      await auditLogService.logAction({
        action: 'USER_PASSWORD_RESET',
        module: 'USER',
        description: `Reset password for admin`,
        performedBy: req.user._id,
        role: req.user.role,
        entityId: req.params.adminId,
        entityType: 'USER',
        req,
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getMySubscription(req, res, next) {
    try {
      const subscription = await companyService.getMySubscription(req.user.companyId);
      return successResponse(res, subscription);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CompanyController();