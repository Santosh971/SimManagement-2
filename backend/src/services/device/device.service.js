const Sim = require('../../models/sim/sim.model');
const WifiNetwork = require('../../models/wifi/wifiNetwork.model');
const WifiMetric = require('../../models/wifi/wifiMetric.model');
const { NotFoundError, ForbiddenError, ValidationError, UnauthorizedError } = require('../../utils/errors');
const { buildPhoneQuery, normalizePhoneNumber } = require('../../utils/response');
const logger = require('../../utils/logger');
const crypto = require('crypto');

class DeviceService {
  /**
   * Auto-authenticate device using SIM number
   * POST /api/device/auto-auth
   *
   * Flow:
   * 1. Find SIM by mobile number
   * 2. Check if SIM is active
   * 3. Bind device to SIM (update deviceId)
   * 4. Generate device token
   * 5. Return WiFi networks accessible by this SIM
   */
  async autoAuth(data) {
    const { simNumber, deviceId } = data;

    if (!simNumber || !deviceId) {
      throw new ValidationError('SIM number and device ID are required');
    }

    // [PHONE NORMALIZATION] - Handle different phone formats
    const phoneQuery = buildPhoneQuery(simNumber);
    if (!phoneQuery) {
      throw new ValidationError('Invalid mobile number format');
    }

    // Find SIM by mobile number
    const sim = await Sim.findOne(phoneQuery);

    if (!sim) {
      logger.warn('[DEVICE AUTH] SIM not found', { simNumber });
      throw new NotFoundError('SIM not found. Please register the SIM first.');
    }

    // Check if SIM is active
    if (!sim.isActive || sim.status !== 'active') {
      logger.warn('[DEVICE AUTH] SIM not active', { simId: sim._id, status: sim.status });
      throw new ForbiddenError('SIM is not active. Please contact administrator.');
    }

    // Check for device binding change
    if (sim.deviceId && sim.deviceId !== deviceId) {
      logger.info('[DEVICE AUTH] Device change detected', {
        simId: sim._id,
        oldDeviceId: sim.deviceId,
        newDeviceId: deviceId
      });
      // Allow device change (user got new phone)
    }

    // Bind device to SIM
    sim.deviceId = deviceId;
    sim.deviceLastSeen = new Date();

    // Generate device token
    const { token, expiresAt } = sim.generateDeviceToken();
    await sim.save();

    // [SIM-BASED WIFI ACCESS CONTROL] - Fetch WiFi networks accessible by this SIM
    // Only return WiFi networks where:
    // - assignedSims is empty/undefined (backward compatible - all SIMs allowed)
    // - OR this SIM is in assignedSims array
    const wifiNetworks = await WifiNetwork.findAccessibleBySim(sim.companyId, sim._id);

    // Format WiFi config for device
    const wifiConfig = wifiNetworks.map(wifi => ({
      wifiId: wifi._id,
      ssid: wifi.ssid || wifi.wifiName,
      bssid: wifi.bssid,
      wifiName: wifi.wifiName,
      expectedSpeed: wifi.expectedSpeed,
      alertThreshold: wifi.alertThreshold
    }));

    logger.info('[DEVICE AUTH] Device authenticated successfully', {
      simId: sim._id,
      companyId: sim.companyId,
      deviceId,
      wifiCount: wifiConfig.length
    });

    return {
      allowed: true,
      deviceToken: token,
      tokenExpires: expiresAt,
      simId: sim._id,
      mobileNumber: sim.mobileNumber,
      companyId: sim.companyId,
      wifiConfig
    };
  }

  /**
   * Submit WiFi metrics with SIM-based access validation
   * POST /api/wifi/metrics
   *
   * Validation Flow (strict order):
   * 1. Device token validation
   * 2. SIM validation (exists, active)
   * 3. Device binding validation
   * 4. WiFi access validation (NEW)
   * 5. BSSID validation
   * 6. Store metrics
   */
  async submitMetrics(data) {
    const {
      simNumber,
      deviceId,
      deviceToken,
      ssid,
      bssid,
      downloadSpeed,
      uploadSpeed,
      latency
    } = data;

    // 1. Validate required fields
    if (!simNumber || !deviceId || !deviceToken) {
      throw new ValidationError('SIM number, device ID, and device token are required');
    }

    if (!ssid || !bssid) {
      throw new ValidationError('WiFi SSID and BSSID are required');
    }

    if (downloadSpeed === undefined || uploadSpeed === undefined) {
      throw new ValidationError('Download and upload speeds are required');
    }

    // 2. Find SIM by mobile number
    const phoneQuery = buildPhoneQuery(simNumber);
    if (!phoneQuery) {
      throw new ValidationError('Invalid mobile number format');
    }

    const sim = await Sim.findOne(phoneQuery);

    if (!sim) {
      throw new NotFoundError('SIM not found');
    }

    // 3. Validate SIM is active
    if (!sim.isActive || sim.status !== 'active') {
      throw new ForbiddenError('SIM is not active');
    }

    // 4. [DEVICE TOKEN VALIDATION]
    if (!sim.validateDeviceToken(deviceToken)) {
      logger.warn('[WIFI METRICS] Invalid device token', {
        simId: sim._id,
        deviceId
      });
      throw new UnauthorizedError('Invalid or expired device token');
    }

    // 5. [DEVICE BINDING VALIDATION]
    if (sim.deviceId !== deviceId) {
      logger.warn('[WIFI METRICS] Device ID mismatch', {
        simId: sim._id,
        expectedDeviceId: sim.deviceId,
        receivedDeviceId: deviceId
      });
      throw new ForbiddenError('Device not bound to this SIM');
    }

    // 6. [WIFI ACCESS VALIDATION] - Find WiFi network
    const wifi = await WifiNetwork.findOne({
      companyId: sim.companyId,
      isActive: true,
      $or: [
        { ssid, bssid },
        { wifiName: ssid, bssid },
        { ssid, bssid: { $exists: false } }, // fallback for networks without BSSID
        { wifiName: ssid, bssid: { $exists: false } }
      ]
    });

    if (!wifi) {
      logger.warn('[WIFI METRICS] WiFi network not found', {
        ssid,
        bssid,
        companyId: sim.companyId
      });
      throw new NotFoundError('WiFi network not found');
    }

    // 7. [SIM-BASED ACCESS VALIDATION] - Check if SIM is allowed for this WiFi
    if (!this.isSimAllowedForWifi(wifi, sim._id)) {
      logger.warn('[WIFI METRICS] SIM not authorized for WiFi', {
        simId: sim._id,
        wifiId: wifi._id,
        assignedSims: wifi.assignedSims
      });
      throw new ForbiddenError('SIM not authorized for this WiFi network');
    }

    // 8. [BSSID VALIDATION] - Verify BSSID if set on WiFi network
    if (wifi.bssid && wifi.bssid !== bssid) {
      logger.warn('[WIFI METRICS] BSSID mismatch - possible WiFi spoofing', {
        wifiId: wifi._id,
        expectedBssid: wifi.bssid,
        receivedBssid: bssid
      });
      throw new ValidationError('Invalid WiFi router (BSSID mismatch)');
    }

    // 9. Update SIM last seen
    sim.deviceLastSeen = new Date();
    await sim.save();

    // 10. Store metrics
    const metric = new WifiMetric({
      wifiId: wifi._id,
      companyId: sim.companyId,
      deviceId,
      deviceObjectId: sim._id, // Use SIM as device reference
      simId: sim._id, // Track which SIM submitted the metrics
      downloadSpeed,
      uploadSpeed,
      latency: latency || 0,
      timestamp: new Date(),
    });

    await metric.save();

    logger.info('[WIFI METRICS] Metrics stored successfully', {
      metricId: metric._id,
      simId: sim._id,
      wifiId: wifi._id,
      downloadSpeed,
      uploadSpeed
    });

    return {
      success: true,
      message: 'Metrics stored successfully',
      metricId: metric._id
    };
  }

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
   * Validate device token without submitting metrics
   * GET /api/device/validate
   */
  async validateDevice(data) {
    const { simNumber, deviceId, deviceToken } = data;

    if (!simNumber || !deviceId || !deviceToken) {
      throw new ValidationError('SIM number, device ID, and device token are required');
    }

    const phoneQuery = buildPhoneQuery(simNumber);
    if (!phoneQuery) {
      throw new ValidationError('Invalid mobile number format');
    }

    const sim = await Sim.findOne(phoneQuery);

    if (!sim) {
      throw new NotFoundError('SIM not found');
    }

    if (!sim.isActive || sim.status !== 'active') {
      throw new ForbiddenError('SIM is not active');
    }

    if (!sim.validateDeviceToken(deviceToken)) {
      throw new UnauthorizedError('Invalid or expired device token');
    }

    if (sim.deviceId !== deviceId) {
      throw new ForbiddenError('Device not bound to this SIM');
    }

    return {
      valid: true,
      simId: sim._id,
      mobileNumber: sim.mobileNumber,
      companyId: sim.companyId
    };
  }

  /**
   * Refresh device token
   * POST /api/device/refresh-token
   */
  async refreshToken(data) {
    const { simNumber, deviceId, deviceToken } = data;

    if (!simNumber || !deviceId || !deviceToken) {
      throw new ValidationError('SIM number, device ID, and device token are required');
    }

    const phoneQuery = buildPhoneQuery(simNumber);
    if (!phoneQuery) {
      throw new ValidationError('Invalid mobile number format');
    }

    const sim = await Sim.findOne(phoneQuery);

    if (!sim) {
      throw new NotFoundError('SIM not found');
    }

    // Validate current token (even if expired, allow refresh)
    if (sim.deviceToken !== deviceToken) {
      throw new UnauthorizedError('Invalid device token');
    }

    // Generate new token
    const { token, expiresAt } = sim.generateDeviceToken();
    sim.deviceLastSeen = new Date();
    await sim.save();

    logger.info('[DEVICE AUTH] Token refreshed', { simId: sim._id });

    return {
      deviceToken: token,
      tokenExpires: expiresAt
    };
  }
}

module.exports = new DeviceService();