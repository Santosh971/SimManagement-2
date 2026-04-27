const { WifiNetwork, WifiDevice, WifiMetric, WifiAlert } = require('../../models/wifi');
const Company = require('../../models/company/company.model');
const Sim = require('../../models/sim/sim.model');
const mongoose = require('mongoose');
const { NotFoundError, ConflictError, ForbiddenError, ValidationError } = require('../../utils/errors');
const notificationHelper = require('../../utils/notificationHelper');
const logger = require('../../utils/logger');

class WifiService {
  // ==================== WIFI NETWORK METHODS ====================

  /**
   * Create a new WiFi network
   * [SIM-BASED WIFI ACCESS CONTROL] - Now supports assignedSims field
   */
  async createWifiNetwork(data, user) {
    const { wifiName, expectedSpeed, alertThreshold, emailAlertEnabled, assignedSims, ssid, bssid } = data;
    const targetCompanyId = user.role === 'super_admin' ? data.companyId : user.companyId;

    if (!targetCompanyId) {
      throw new ForbiddenError('Company ID is required');
    }

    // Check for duplicate WiFi name within company
    const existing = await WifiNetwork.findOne({
      companyId: targetCompanyId,
      wifiName: { $regex: new RegExp(`^${wifiName}$`, 'i') },
      isActive: true,
    });

    if (existing) {
      throw new ConflictError('WiFi network with this name already exists in your company');
    }

    // [SIM-BASED WIFI ACCESS CONTROL] - Validate assignedSims if provided
    if (assignedSims && Array.isArray(assignedSims) && assignedSims.length > 0) {
      // Validate all SIM IDs
      for (const simId of assignedSims) {
        if (!mongoose.Types.ObjectId.isValid(simId)) {
          throw new ValidationError(`Invalid SIM ID: ${simId}`);
        }

        const sim = await Sim.findById(simId);
        if (!sim) {
          throw new NotFoundError(`SIM not found: ${simId}`);
        }

        // Validate SIM belongs to same company
        if (sim.companyId.toString() !== targetCompanyId.toString()) {
          throw new ValidationError(`SIM ${simId} does not belong to this company`);
        }
      }
    }

    const wifiNetwork = new WifiNetwork({
      companyId: targetCompanyId,
      wifiName,
      expectedSpeed,
      alertThreshold,
      emailAlertEnabled: emailAlertEnabled !== undefined ? emailAlertEnabled : true,
      createdBy: user.id,
      // [SIM-BASED WIFI ACCESS CONTROL] - Optional SIM assignment
      assignedSims: assignedSims || [],
      ssid: ssid || '',
      bssid: bssid || '',
    });

    await wifiNetwork.save();

    // Populate assigned SIMs in response
    await wifiNetwork.populate('assignedSims', 'mobileNumber operator status');

    return wifiNetwork;
  }

  /**
   * Get all WiFi networks for a company
   */
  async getWifiNetworks(query, user) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter = { isActive: true };

    // Data isolation
    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    } else if (query.companyId) {
      filter.companyId = query.companyId;
    }

    if (search) {
      filter.wifiName = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const networks = await WifiNetwork.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedSims', 'mobileNumber operator status')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    // Get device count and latest metrics for each network
    const networksWithStats = await Promise.all(
      networks.map(async (network) => {
        const deviceCount = await WifiDevice.countDocuments({ wifiId: network._id, isActive: true });
        const activeAlerts = await WifiAlert.countDocuments({
          wifiId: network._id,
          status: 'active'
        });
        const latestMetrics = await WifiMetric.getAverageSpeed(network._id, 5);

        return {
          ...network.toObject(),
          deviceCount,
          activeAlerts,
          currentAvgSpeed: latestMetrics ? ((latestMetrics.avgDownload + latestMetrics.avgUpload) / 2).toFixed(2) : null,
        };
      })
    );

    const total = await WifiNetwork.countDocuments(filter);

    return { data: networksWithStats, total, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Get WiFi network by ID
   * [SIM-BASED WIFI ACCESS CONTROL] - Now includes assigned SIMs info
   */
  async getWifiNetworkById(wifiId, user) {
    const filter = { _id: wifiId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const network = await WifiNetwork.findOne(filter)
      .populate('createdBy', 'name email')
      .populate('assignedSims', 'mobileNumber operator status assignedTo');

    if (!network) {
      throw new NotFoundError('WiFi network');
    }

    // Get devices for this network
    const devices = await WifiDevice.find({ wifiId: wifiId })
      .populate('wifiId', 'wifiName')
      .sort({ lastSeen: -1 });

    // Get latest metrics
    const latestMetrics = await WifiMetric.getLatestByWifi(wifiId, 100);

    return {
      ...network.toObject(),
      devices,
      latestMetrics,
    };
  }

  /**
   * Update WiFi network
   * [SIM-BASED WIFI ACCESS CONTROL] - Now supports updating assignedSims
   */
  async updateWifiNetwork(wifiId, updateData, user) {
    const filter = { _id: wifiId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const allowedUpdates = ['wifiName', 'expectedSpeed', 'alertThreshold', 'emailAlertEnabled', 'assignedSims', 'ssid', 'bssid'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    // Check for duplicate name if name is being changed
    if (updates.wifiName) {
      const existing = await WifiNetwork.findOne({
        companyId: filter.companyId || (await WifiNetwork.findById(wifiId))?.companyId,
        wifiName: { $regex: new RegExp(`^${updates.wifiName}$`, 'i') },
        _id: { $ne: wifiId },
        isActive: true,
      });

      if (existing) {
        throw new ConflictError('WiFi network with this name already exists');
      }
    }

    // [SIM-BASED WIFI ACCESS CONTROL] - Validate assignedSims if provided
    if (updates.assignedSims !== undefined) {
      // Allow empty array to remove all restrictions
      if (Array.isArray(updates.assignedSims) && updates.assignedSims.length > 0) {
        const targetCompanyId = filter.companyId || (await WifiNetwork.findById(wifiId))?.companyId;

        for (const simId of updates.assignedSims) {
          if (!mongoose.Types.ObjectId.isValid(simId)) {
            throw new ValidationError(`Invalid SIM ID: ${simId}`);
          }

          const sim = await Sim.findById(simId);
          if (!sim) {
            throw new NotFoundError(`SIM not found: ${simId}`);
          }

          // Validate SIM belongs to same company
          if (sim.companyId.toString() !== targetCompanyId.toString()) {
            throw new ValidationError(`SIM ${simId} does not belong to this company`);
          }
        }
      }
    }

    const network = await WifiNetwork.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    }).populate('assignedSims', 'mobileNumber operator status');

    if (!network) {
      throw new NotFoundError('WiFi network');
    }

    return network;
  }

  /**
   * Delete WiFi network (soft delete)
   */
  async deleteWifiNetwork(wifiId, user) {
    const filter = { _id: wifiId };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    // Unassign all devices first
    await WifiDevice.updateMany(
      { wifiId },
      { wifiId: null, isActive: false }
    );

    const network = await WifiNetwork.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );

    if (!network) {
      throw new NotFoundError('WiFi network');
    }

    return true;
  }

  // ==================== WIFI DEVICE METHODS ====================

  /**
   * Register a new device (called from mobile app)
   */
  async registerDevice(data) {
    const { deviceId, deviceName, companyId } = data;

    // Check if device already exists
    let device = await WifiDevice.findOne({ deviceId });

    if (device) {
      // Device exists, update last seen if it belongs to same company
      if (device.companyId.toString() !== companyId.toString()) {
        throw new ConflictError('Device already registered with another company');
      }
      device.lastSeen = new Date();
      await device.save();
      return device;
    }

    // Create new device
    device = new WifiDevice({
      deviceId,
      deviceName,
      companyId,
      isActive: false,
      wifiId: null,
    });

    await device.save();
    return device;
  }

  /**
   * Get device status (for mobile app)
   */
  async getDeviceStatus(deviceId) {
    const device = await WifiDevice.findOne({ deviceId })
      .populate('wifiId', 'wifiName expectedSpeed alertThreshold');

    if (!device) {
      return { exists: false, isActive: false, wifiId: null };
    }

    return {
      exists: true,
      isActive: device.isActive,
      wifiId: device.wifiId?._id || null,
      wifiName: device.wifiId?.wifiName || null,
      deviceName: device.deviceName,
    };
  }

  /**
   * Assign device to WiFi network (Admin action)
   */
  async assignDevice(data, user) {
    const { deviceId, wifiId, isActive } = data;

    const targetCompanyId = user.role === 'super_admin' ? user.companyId : user.companyId;

    // Get device
    const device = await WifiDevice.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError('Device');
    }

    // Verify company access
    if (user.role !== 'super_admin' && device.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this device');
    }

    // Verify WiFi exists
    const wifiNetwork = await WifiNetwork.findOne({ _id: wifiId, isActive: true });
    if (!wifiNetwork) {
      throw new NotFoundError('WiFi network');
    }

    // Verify WiFi belongs to same company
    if (wifiNetwork.companyId.toString() !== device.companyId.toString()) {
      throw new ValidationError('WiFi network does not belong to the same company');
    }

    // Update device
    device.wifiId = wifiId;
    device.isActive = isActive !== undefined ? isActive : true;
    device.lastSeen = new Date();

    await device.save();

    return device.populate('wifiId', 'wifiName expectedSpeed alertThreshold');
  }

  /**
   * Unassign device from WiFi network
   */
  async unassignDevice(deviceId, user) {
    const device = await WifiDevice.findOne({ deviceId });

    if (!device) {
      throw new NotFoundError('Device');
    }

    // Verify company access
    if (user.role !== 'super_admin' && device.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this device');
    }

    device.wifiId = null;
    device.isActive = false;
    await device.save();

    return device;
  }

  /**
   * Get all devices for a company (Admin view)
   */
  async getDevices(query, user) {
    const { page = 1, limit = 10, search, wifiId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter = {};

    // Data isolation
    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    } else if (query.companyId) {
      filter.companyId = query.companyId;
    }

    if (wifiId) {
      filter.wifiId = wifiId === 'unassigned' ? null : wifiId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    if (search) {
      filter.$or = [
        { deviceName: { $regex: search, $options: 'i' } },
        { deviceId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const devices = await WifiDevice.find(filter)
      .populate('wifiId', 'wifiName expectedSpeed alertThreshold')
      .populate('companyId', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    const total = await WifiDevice.countDocuments(filter);

    return { data: devices, total, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Update device
   */
  async updateDevice(deviceId, updateData, user) {
    const device = await WifiDevice.findOne({ deviceId });

    if (!device) {
      throw new NotFoundError('Device');
    }

    // Verify company access
    if (user.role !== 'super_admin' && device.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this device');
    }

    const allowedUpdates = ['deviceName'];
    const updates = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    Object.assign(device, updates);
    await device.save();

    return device.populate('wifiId', 'wifiName expectedSpeed alertThreshold');
  }

  /**
   * Delete device
   */
  async deleteDevice(deviceId, user) {
    const device = await WifiDevice.findOne({ deviceId });

    if (!device) {
      throw new NotFoundError('Device');
    }

    // Verify company access
    if (user.role !== 'super_admin' && device.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this device');
    }

    await WifiDevice.deleteOne({ deviceId });
    return true;
  }

  // ==================== WIFI METRIC METHODS ====================

  /**
   * Submit metrics from mobile device
   */
  async submitMetrics(data) {
    const { deviceId, wifiId, downloadSpeed, uploadSpeed, latency } = data;

    // Validate device
    const device = await WifiDevice.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError('Device');
    }

    // Check if device is active and assigned
    if (!device.isActive) {
      throw new ForbiddenError('Device is not approved. Please wait for admin approval.');
    }

    // Check if wifiId matches assigned wifi
    if (!device.wifiId || device.wifiId.toString() !== wifiId) {
      throw new ValidationError('Device is not assigned to this WiFi network');
    }

    // Update device last seen
    device.lastSeen = new Date();
    await device.save();

    // Create metric
    const metric = new WifiMetric({
      wifiId,
      companyId: device.companyId,
      deviceId,
      deviceObjectId: device._id,
      downloadSpeed,
      uploadSpeed,
      latency,
      timestamp: new Date(),
    });

    await metric.save();

    return metric;
  }

  /**
   * Get metrics for a WiFi network
   */
  async getMetrics(wifiId, query, user) {
    const { startDate, endDate, limit = 100 } = query;

    // Verify access
    const wifiNetwork = await WifiNetwork.findOne({ _id: wifiId, isActive: true });
    if (!wifiNetwork) {
      throw new NotFoundError('WiFi network');
    }

    if (user.role !== 'super_admin' && wifiNetwork.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this WiFi network');
    }

    let metrics;
    if (startDate && endDate) {
      metrics = await WifiMetric.getByWifiAndTimeRange(wifiId, new Date(startDate), new Date(endDate));
    } else {
      metrics = await WifiMetric.getLatestByWifi(wifiId, parseInt(limit));
    }

    return metrics;
  }

  /**
   * Get metrics for a device
   */
  async getDeviceMetrics(deviceId, query, user) {
    const { limit = 100 } = query;

    const device = await WifiDevice.findOne({ deviceId });
    if (!device) {
      throw new NotFoundError('Device');
    }

    // Verify company access
    if (user.role !== 'super_admin' && device.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this device');
    }

    const metrics = await WifiMetric.find({ deviceId })
      .populate('wifiId', 'wifiName')
      .populate('deviceObjectId', 'deviceName')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return metrics;
  }

  // ==================== WIFI ALERT METHODS ====================

  /**
   * Get alerts for a company
   */
  async getAlerts(query, user) {
    const { page = 1, limit = 10, status, wifiId, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    const filter = {};

    // Data isolation
    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    } else if (query.companyId) {
      filter.companyId = query.companyId;
    }

    if (status) {
      filter.status = status;
    }

    if (wifiId) {
      filter.wifiId = wifiId;
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const alerts = await WifiAlert.find(filter)
      .populate('wifiId', 'wifiName expectedSpeed alertThreshold')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort);

    const total = await WifiAlert.countDocuments(filter);

    return { data: alerts, total, page: parseInt(page), limit: parseInt(limit) };
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId, user) {
    const alert = await WifiAlert.findById(alertId);

    if (!alert) {
      throw new NotFoundError('Alert');
    }

    // Verify company access
    if (user.role !== 'super_admin' && alert.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this alert');
    }

    await alert.resolve();
    return alert;
  }

  // ==================== DASHBOARD METHODS ====================

  /**
   * Get WiFi dashboard stats
   */
  async getDashboardStats(user) {
    const targetCompanyId = user.role === 'super_admin' ? user.companyId : user.companyId;

    if (!targetCompanyId) {
      throw new ForbiddenError('Company ID is required');
    }

    const companyId = new mongoose.Types.ObjectId(targetCompanyId);

    // Total networks
    const totalNetworks = await WifiNetwork.countDocuments({ companyId, isActive: true });

    // Total devices
    const totalDevices = await WifiDevice.countDocuments({ companyId });
    const activeDevices = await WifiDevice.countDocuments({ companyId, isActive: true });

    // Active alerts
    const activeAlerts = await WifiAlert.countDocuments({ companyId, status: 'active' });

    // Average speed across all networks
    const networks = await WifiNetwork.find({ companyId, isActive: true });
    let totalAvgSpeed = 0;
    let networksWithData = 0;

    for (const network of networks) {
      const avgSpeed = await WifiMetric.getAverageSpeed(network._id, 5);
      if (avgSpeed) {
        totalAvgSpeed += (avgSpeed.avgDownload + avgSpeed.avgUpload) / 2;
        networksWithData++;
      }
    }

    const avgSpeed = networksWithData > 0 ? totalAvgSpeed / networksWithData : 0;

    // Network-wise stats
    const networkStats = await Promise.all(
      networks.map(async (network) => {
        const deviceCount = await WifiDevice.countDocuments({ wifiId: network._id, isActive: true });
        const avgMetrics = await WifiMetric.getAverageSpeed(network._id, 5);
        const activeAlertsCount = await WifiAlert.countDocuments({ wifiId: network._id, status: 'active' });

        return {
          _id: network._id,
          wifiName: network.wifiName,
          expectedSpeed: network.expectedSpeed,
          alertThreshold: network.alertThreshold,
          deviceCount,
          avgDownload: avgMetrics?.avgDownload || 0,
          avgUpload: avgMetrics?.avgUpload || 0,
          avgLatency: avgMetrics?.avgLatency || 0,
          avgSpeed: avgMetrics ? ((avgMetrics.avgDownload + avgMetrics.avgUpload) / 2).toFixed(2) : 0,
          activeAlerts: activeAlertsCount,
          status: activeAlertsCount > 0 ? 'alert' : (avgMetrics ? 'healthy' : 'unknown'),
        };
      })
    );

    return {
      totalNetworks,
      totalDevices,
      activeDevices,
      inactiveDevices: totalDevices - activeDevices,
      activeAlerts,
      avgSpeed: avgSpeed.toFixed(2),
      networkStats,
    };
  }

  /**
   * Get hourly metrics for charts
   */
  async getHourlyMetrics(wifiId, hours = 24, user) {
    // Verify access
    const wifiNetwork = await WifiNetwork.findOne({ _id: wifiId, isActive: true });
    if (!wifiNetwork) {
      throw new NotFoundError('WiFi network');
    }

    if (user.role !== 'super_admin' && wifiNetwork.companyId.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this WiFi network');
    }

    const hourlyData = await WifiMetric.getHourlyAverage(wifiId, hours);

    return hourlyData.map((d) => ({
      time: `${d._id.hour.toString().padStart(2, '0')}:00`,
      downloadSpeed: d.avgDownload.toFixed(2),
      uploadSpeed: d.avgUpload.toFixed(2),
      latency: d.avgLatency.toFixed(2),
      count: d.count,
    }));
  }

  // ==================== CRON METHODS ====================

  /**
   * Check and create alerts for low speed (called by cron job)
   * Returns summary of actions taken
   */
  async checkAndCreateAlerts() {
    const networks = await WifiNetwork.find({ isActive: true });
    const results = {
      checked: 0,
      skipped: 0,
      alertsCreated: 0,
      alertsUpdated: 0,
      alertsResolved: 0,
      emailsSent: 0,
      emailErrors: [],
      errors: []
    };

    for (const network of networks) {
      try {
        const avgMetrics = await WifiMetric.getAverageSpeed(network._id, 5);

        if (!avgMetrics || avgMetrics.count === 0) {
          // No data received in last 5 minutes, skip
          results.skipped++;
          logger.info('[WIFI ALERT] No metrics data', { wifiId: network._id, wifiName: network.wifiName });
          continue;
        }

        results.checked++;
        const avgSpeed = (avgMetrics.avgDownload + avgMetrics.avgUpload) / 2;

        logger.info('[WIFI ALERT] Speed check', {
          wifiId: network._id,
          wifiName: network.wifiName,
          avgSpeed: avgSpeed.toFixed(2),
          threshold: network.alertThreshold,
          belowThreshold: avgSpeed < network.alertThreshold
        });

        if (avgSpeed < network.alertThreshold) {
          // Check if there's already an active alert
          let alert = await WifiAlert.findOne({
            wifiId: network._id,
            status: 'active',
          });

          if (!alert) {
            // Create new alert
            alert = await WifiAlert.create({
              wifiId: network._id,
              companyId: network.companyId,
              avgSpeed,
              threshold: network.alertThreshold,
              alertType: 'low_speed',
              message: `Average speed ${avgSpeed.toFixed(2)} Mbps is below threshold ${network.alertThreshold} Mbps`,
            });
            results.alertsCreated++;

            logger.info('[WIFI ALERT] New alert created', {
              wifiId: network._id,
              wifiName: network.wifiName,
              avgSpeed: avgSpeed.toFixed(2),
              alertId: alert._id
            });

            // Send email alert if enabled
            if (network.emailAlertEnabled) {
              try {
                const company = await Company.findById(network.companyId);
                if (company) {
                  // Get admin users for the company
                  const adminUsers = await mongoose.model('User').find({
                    companyId: network.companyId,
                    role: { $in: ['admin', 'super_admin'] },
                    isActive: true,
                  });

                  logger.info('[WIFI ALERT] Sending emails to admins', {
                    wifiId: network._id,
                    adminCount: adminUsers.length,
                    admins: adminUsers.map(a => a.email)
                  });

                  for (const admin of adminUsers) {
                    try {
                      await notificationHelper.sendWifiAlertEmail(admin, network, alert);
                      results.emailsSent++;
                      logger.info('[WIFI ALERT] Email sent', { email: admin.email, wifiId: network._id });
                    } catch (emailError) {
                      results.emailErrors.push({ email: admin.email, error: emailError.message });
                      logger.error('[WIFI ALERT] Failed to send email', { email: admin.email, error: emailError.message });
                    }
                  }
                } else {
                  logger.warn('[WIFI ALERT] Company not found', { companyId: network.companyId });
                }
              } catch (emailError) {
                results.errors.push({ wifiId: network._id, error: emailError.message });
                logger.error('[WIFI ALERT] Email process failed', { wifiId: network._id, error: emailError.message });
              }
            } else {
              logger.info('[WIFI ALERT] Email alerts disabled for this network', { wifiId: network._id });
            }
          } else {
            // Update existing alert with new avgSpeed
            alert.avgSpeed = avgSpeed;
            await alert.save();
            results.alertsUpdated++;
            logger.info('[WIFI ALERT] Alert updated', { wifiId: network._id, alertId: alert._id, avgSpeed: avgSpeed.toFixed(2) });
          }
        } else {
          // Speed is good, resolve any active alerts
          const resolveResult = await WifiAlert.updateMany(
            { wifiId: network._id, status: 'active' },
            { status: 'resolved', resolvedAt: new Date() }
          );
          if (resolveResult.modifiedCount > 0) {
            results.alertsResolved += resolveResult.modifiedCount;
            logger.info('[WIFI ALERT] Alerts resolved', { wifiId: network._id, count: resolveResult.modifiedCount });
          }
        }
      } catch (error) {
        results.errors.push({ wifiId: network._id, error: error.message });
        logger.error('[WIFI ALERT] Error processing network', { wifiId: network._id, error: error.message });
      }
    }

    logger.info('[WIFI ALERT] Check completed', results);
    return results;
  }

  /**
   * Clean old metrics (called by cron job)
   */
  async cleanOldMetrics(daysToKeep = 30) {
    return await WifiMetric.cleanOldMetrics(daysToKeep);
  }

  // ==================== SIM-BASED WIFI ACCESS CONTROL METHODS ====================

  /**
   * [SIM-BASED WIFI ACCESS CONTROL] - Check if SIM is allowed for WiFi
   * If assignedSims is empty/undefined, allow all SIMs (backward compatible)
   * If assignedSims has entries, only allow SIMs in the list
   */
  isSimAllowedForWifi(wifi, simId) {
    // No restriction - all SIMs allowed (backward compatible)
    if (!wifi.assignedSims || wifi.assignedSims.length === 0) {
      return true;
    }

    // Check if SIM is in the allowed list
    const simIdStr = simId.toString();
    return wifi.assignedSims.some(id => id.toString() === simIdStr);
  }

  /**
   * [SIM-BASED WIFI ACCESS CONTROL] - Get eligible SIMs for WiFi assignment
   * Returns all SIMs in the company that can be assigned to WiFi networks
   */
  async getEligibleSims(user, queryCompanyId) {
    const targetCompanyId = user.role === 'super_admin' ? queryCompanyId : user.companyId;

    if (!targetCompanyId) {
      throw new ForbiddenError('Company ID is required');
    }

    const sims = await Sim.find({
      companyId: targetCompanyId,
      isActive: true,
      status: 'active'
    })
      .select('mobileNumber operator status assignedTo')
      .populate('assignedTo', 'name email')
      .sort({ mobileNumber: 1 });

    return sims;
  }

  /**
   * [SIM-BASED WIFI ACCESS CONTROL] - Get WiFi networks accessible by a SIM
   * Used by device flow to get available WiFi networks
   */
  async getWifiNetworksForSim(companyId, simId) {
    return await WifiNetwork.findAccessibleBySim(companyId, simId);
  }

  /**
   * [SIM-BASED WIFI ACCESS CONTROL] - Get SIMs assigned to a specific WiFi
   */
  async getWifiAssignedSims(wifiId, user) {
    const filter = { _id: wifiId, isActive: true };

    if (user.role !== 'super_admin') {
      filter.companyId = user.companyId;
    }

    const network = await WifiNetwork.findOne(filter)
      .populate('assignedSims', 'mobileNumber operator status assignedTo');

    if (!network) {
      throw new NotFoundError('WiFi network');
    }

    return network.assignedSims || [];
  }

  /**
   * [MANUAL TESTING] - Test alert email for a specific WiFi network
   * Sends a test email to admin regardless of speed threshold
   */
  async testAlertEmail(wifiId, user) {
    const network = await WifiNetwork.findById(wifiId).populate('companyId');

    if (!network) {
      throw new NotFoundError('WiFi network');
    }

    // Verify access
    if (user.role !== 'super_admin' && network.companyId._id.toString() !== user.companyId.toString()) {
      throw new ForbiddenError('You do not have access to this WiFi network');
    }

    // Get latest metrics
    const latestMetrics = await WifiMetric.getAverageSpeed(wifiId, 5);
    const avgSpeed = latestMetrics ? (latestMetrics.avgDownload + latestMetrics.avgUpload) / 2 : 0;

    // Create a test alert
    const alert = {
      _id: 'test_alert_' + Date.now(),
      avgSpeed: avgSpeed || 10,
      threshold: network.alertThreshold,
      alertType: 'test',
      message: `[TEST] WiFi speed test alert - Average speed is below threshold`,
      createdAt: new Date()
    };

    // Get admin users
    const adminUsers = await mongoose.model('User').find({
      companyId: network.companyId._id,
      role: { $in: ['admin', 'super_admin'] },
      isActive: true,
    });

    const emailResults = [];

    for (const admin of adminUsers) {
      try {
        await notificationHelper.sendWifiAlertEmail(admin, network, alert);
        emailResults.push({
          email: admin.email,
          name: admin.name,
          status: 'sent'
        });
        logger.info('[WIFI TEST] Test email sent', { email: admin.email, wifiId });
      } catch (emailError) {
        emailResults.push({
          email: admin.email,
          name: admin.name,
          status: 'failed',
          error: emailError.message
        });
        logger.error('[WIFI TEST] Failed to send test email', { email: admin.email, error: emailError.message });
      }
    }

    return {
      wifiName: network.wifiName,
      emailAlertEnabled: network.emailAlertEnabled,
      avgSpeed: avgSpeed,
      threshold: network.alertThreshold,
      adminsNotified: emailResults
    };
  }
}

module.exports = new WifiService();