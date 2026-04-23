

const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('./logger');

// ─── Shared Design System ────────────────────────────────────────────────────

const COLORS = {
  brand: '#1A56DB', // primary blue
  brandDark: '#1E429F',
  success: '#057A55',
  successBg: '#F3FAF7',
  successBdr: '#BCF0DA',
  warning: '#92400E',
  warningBg: '#FFFBEB',
  warningBdr: '#FCD34D',
  danger: '#9B1C1C',
  dangerBg: '#FDF2F2',
  dangerBdr: '#F8B4B4',
  info: '#1E429F',
  infoBg: '#EBF5FF',
  infoBdr: '#93C5FD',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
};

// ─── Base Layout ─────────────────────────────────────────────────────────────

function baseLayout({ headerBg, headerIcon, headerTitle, headerSubtitle, bodyContent, footerNote = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${headerTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F3F4F6;
      color: ${COLORS.textPrimary};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    a { color: ${COLORS.brand}; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 12px !important; }
      .email-card { border-radius: 16px !important; }
      .email-header { padding: 28px 24px !important; border-radius: 16px 16px 0 0 !important; }
      .email-body { padding: 28px 24px !important; }
      .email-footer { padding: 20px 24px !important; }
      .btn { display: block !important; text-align: center !important; }
      .info-grid { display: block !important; }
      .info-grid td { display: block !important; padding: 4px 0 !important; }
    }
  </style>
</head>
<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#F3F4F6; padding:0; margin:0;">
    <tr>
      <td align="center" style="padding: 32px 16px;" class="email-wrapper">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px; width:100%;" class="email-card">

          <!-- ── HEADER ── -->
          <tr>
            <td style="
              background: ${headerBg};
              padding: 40px 40px 36px;
              border-radius: 20px 20px 0 0;
              text-align: center;
            " class="email-header">
              <div style="
                width: 52px; height: 52px;
                background: rgba(255,255,255,0.2);
                border-radius: 14px;
                margin: 0 auto 16px;
                display: flex; align-items: center; justify-content: center;
                font-size: 24px; line-height: 52px;
              ">${headerIcon}</div>
              <h1 style="
                color: #FFFFFF;
                font-size: 22px;
                font-weight: 600;
                letter-spacing: -0.3px;
                margin: 0 0 6px;
              ">${headerTitle}</h1>
              ${headerSubtitle ? `<p style="color: rgba(255,255,255,0.82); font-size: 14px; margin: 0;">${headerSubtitle}</p>` : ''}
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="
              background: ${COLORS.surface};
              padding: 36px 40px;
              border-left: 1px solid ${COLORS.border};
              border-right: 1px solid ${COLORS.border};
            " class="email-body">
              ${bodyContent}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="
              background: ${COLORS.surfaceAlt};
              padding: 24px 40px;
              border-radius: 0 0 20px 20px;
              border: 1px solid ${COLORS.border};
              border-top: none;
              text-align: center;
            " class="email-footer">
              ${footerNote ? `<p style="font-size: 13px; color: ${COLORS.textMuted}; margin: 0 0 10px;">${footerNote}</p>` : ''}
              <p style="font-size: 13px; color: ${COLORS.textLight}; margin: 0;">
                &copy; ${new Date().getFullYear()} SIM Management &bull; All rights reserved
              </p>
              <p style="font-size: 12px; color: ${COLORS.textLight}; margin: 8px 0 0;">
                This is an automated message &mdash; please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Reusable Snippets ────────────────────────────────────────────────────────

function greeting(name) {
  return `<p style="font-size: 16px; color: ${COLORS.textPrimary}; margin: 0 0 20px; font-weight: 500;">Hello${name ? `, ${name}` : ''},</p>`;
}

function paragraph(text) {
  return `<p style="font-size: 15px; color: #374151; line-height: 1.7; margin: 0 0 16px;">${text}</p>`;
}

function divider() {
  return `<hr style="border: none; border-top: 1px solid ${COLORS.border}; margin: 24px 0;" />`;
}

function infoCard(rows, { bg = COLORS.surfaceAlt, border = COLORS.border } = {}) {
  const rowsHtml = rows
    .filter(Boolean)
    .map(([label, value]) => `
      <tr>
        <td style="padding: 9px 0; font-size: 13px; color: ${COLORS.textMuted}; width: 42%; vertical-align: top;">${label}</td>
        <td style="padding: 9px 0; font-size: 14px; color: ${COLORS.textPrimary}; font-weight: 500; vertical-align: top;">${value}</td>
      </tr>`)
    .join('');
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    ">
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="info-grid">
          ${rowsHtml}
        </table>
      </td></tr>
    </table>`;
}

function alertBox(text, { bg, border, textColor, label = '' } = {}) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
      background: ${bg};
      border: 1px solid ${border};
      border-radius: 10px;
      padding: 14px 18px;
      margin: 20px 0;
    ">
      <tr><td style="font-size: 14px; color: ${textColor}; line-height: 1.6;">
        ${label ? `<strong>${label}</strong><br />` : ''}${text}
      </td></tr>
    </table>`;
}

function otpBox(otp) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
      background: ${COLORS.infoBg};
      border: 2px solid ${COLORS.brand};
      border-radius: 14px;
      padding: 28px 20px;
      margin: 24px 0;
      text-align: center;
    ">
      <tr><td>
        <p style="font-size: 12px; color: ${COLORS.brand}; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; margin: 0 0 12px;">Your Verification Code</p>
        <p style="
          font-size: 40px;
          font-weight: 600;
          letter-spacing: 12px;
          color: ${COLORS.brandDark};
          font-family: 'Courier New', Courier, monospace;
          margin: 0;
          line-height: 1;
        ">${otp}</p>
      </td></tr>
    </table>`;
}

function ctaButton(label, href, color = COLORS.brand) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 10px; background: ${color};">
          <a href="${href}" class="btn" style="
            display: inline-block;
            padding: 13px 28px;
            font-size: 15px;
            font-weight: 600;
            color: #FFFFFF;
            text-decoration: none;
            border-radius: 10px;
            letter-spacing: 0.1px;
          ">${label} &rarr;</a>
        </td>
      </tr>
    </table>`;
}

function passwordBox(password) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
      background: ${COLORS.successBg};
      border: 1.5px solid ${COLORS.successBdr};
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    ">
      <tr><td>
        <p style="font-size: 12px; color: ${COLORS.success}; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 10px;">Temporary Password</p>
        <p style="
          font-size: 22px;
          font-family: 'Courier New', Courier, monospace;
          font-weight: 600;
          letter-spacing: 4px;
          color: #065F46;
          background: #FFFFFF;
          border: 1px solid ${COLORS.successBdr};
          border-radius: 8px;
          padding: 10px 16px;
          margin: 0 auto;
          display: inline-block;
        ">${password}</p>
        <p style="font-size: 13px; color: #B45309; margin: 12px 0 0;">
          &#9888; Please change your password after your first login.
        </p>
      </td></tr>
    </table>`;
}

// ─── Email Service Class ──────────────────────────────────────────────────────

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.connectionVerified = false;
    this.init();
  }

  init() {
    const emailHost = config.email.host;
    const emailPort = config.email.port;
    const emailUser = config.email.user;
    const emailPass = config.email.pass ? config.email.pass.replace(/\s/g, '') : null;
    const emailFrom = config.email.from;

    logger.info('Email configuration check', {
      hasHost: !!emailHost,
      host: emailHost,
      port: emailPort,
      hasUser: !!emailUser,
      user: emailUser,
      hasPass: !!emailPass,
      passLength: emailPass ? emailPass.length : 0,
      hasFrom: !!emailFrom,
    });

    if (!emailHost || !emailUser || !emailPass) {
      logger.warn('Email configuration is incomplete. Email notifications will be disabled.', {
        hasHost: !!emailHost,
        hasUser: !!emailUser,
        hasPass: !!emailPass,
      });
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: { user: emailUser, pass: emailPass },
        connectionTimeout: 5000,
        socketTimeout: 5000,
        tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
      });

      this.isConfigured = true;
      logger.info('Email service initialized successfully', { host: emailHost, port: emailPort, user: emailUser });
      this.verifyConnectionAsync();
    } catch (error) {
      logger.error('Failed to initialize email service', { error: error.message });
    }
  }

  verifyConnectionAsync() {
    this.verifyConnection().catch(err => {
      logger.warn('Email connection could not be established. Email delivery may fail.', {
        error: err.message,
        code: err.code,
        note: 'On cloud platforms (Render, Heroku, etc.), SMTP ports are often blocked. Consider using SendGrid, Mailgun, or Amazon SES for production.',
      });
    });
  }

  async verifyConnection() {
    if (!this.transporter) {
      logger.warn('Cannot verify email connection: transporter not initialized');
      return false;
    }
    try {
      await this.transporter.verify();
      this.connectionVerified = true;
      logger.info('Email transporter verified successfully - emails will be sent');
      return true;
    } catch (error) {
      this.connectionVerified = false;
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        logger.warn('Email connection timeout - SMTP may be blocked on this platform', {
          host: config.email.host,
          port: config.email.port,
          solution: 'Consider using SendGrid, Mailgun, Amazon SES, or Gmail API instead of SMTP for production',
        });
      } else if (error.message.includes('Invalid login') || error.message.includes('535') || error.code === 'EAUTH') {
        logger.error('GMAIL AUTHENTICATION ERROR - Please fix:');
        logger.error('Gmail requires App Password for SMTP. Steps:');
        logger.error('1. Go to https://myaccount.google.com/');
        logger.error('2. Enable 2-Step Verification');
        logger.error('3. Go to Security > App passwords');
        logger.error('4. Create new App password for "Mail"');
        logger.error('5. Use the 16-character password as SMTP_PASS');
      } else {
        logger.warn('Email transporter verification failed', { error: error.message, code: error.code });
      }
      return false;
    }
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.isConfigured || !this.transporter) {
      logger.warn('Email not sent: Email service not configured', { to, subject });
      return { success: false, error: 'Email service not configured' };
    }
    if (!to || !to.includes('@')) {
      logger.error('Invalid email address', { to });
      return { success: false, error: 'Invalid email address' };
    }
    try {
      const mailOptions = {
        from: config.email.from || config.email.user,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      };
      logger.info('Sending email', { to, subject });
      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { messageId: info.messageId, to, subject, response: info.response });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send email', { error: error.message, to, subject, code: error.code });
      return { success: false, error: error.message };
    }
  }

  // ─── Welcome Email ──────────────────────────────────────────────────────────

  async sendWelcomeEmail(user, company, tempPassword = null) {
    const subject = `Welcome to SIM Management — ${company.name}`;
    const loginUrl = `${config.app.frontendUrl || 'http://localhost:3000'}/login`;

    const body = `
      ${greeting(user.name)}
      ${paragraph(`Your account has been successfully created for <strong>${company.name}</strong>. You're all set to start managing your SIM cards and services.`)}
      ${infoCard([
      ['Email Address', user.email],
      ['Role', user.role || 'User'],
      ['Company', company.name],
    ])}
      ${tempPassword ? passwordBox(tempPassword) : ''}
      ${paragraph('Click below to log in and get started:')}
      ${ctaButton('Log In to Dashboard', loginUrl)}
      ${divider()}
      ${paragraph(`If you have any questions or need help getting set up, feel free to reach out to your administrator.`)}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #1A56DB 0%, #1E429F 100%)`,
      headerIcon: '&#128272;',
      headerTitle: 'Welcome to SIM Management',
      headerSubtitle: `Account created for ${company.name}`,
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Company Created Email ──────────────────────────────────────────────────

  async sendCompanyCreatedEmail(company, admin) {
    const subject = `Company Registration Confirmed — ${company.name}`;
    const dashboardUrl = `${config.app.frontendUrl || 'http://localhost:3000'}/dashboard`;
    const expiryDate = company.subscriptionEndDate
      ? new Date(company.subscriptionEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';

    const body = `
      ${greeting(company.name)}
      ${paragraph('Your company has been successfully registered on the SIM Management platform. You can now start managing SIM cards, assign users, and track recharges.')}
      ${infoCard([
      ['Company Email', company.email],
      ['Subscription Valid Until', expiryDate],
      ['Status', '<span style="color:#057A55; font-weight:600;">Active</span>'],
    ], { bg: '#F0FDF4', border: '#BBF7D0' })}
      ${paragraph('Get started by logging into your dashboard:')}
      ${ctaButton('Go to Dashboard', dashboardUrl, '#057A55')}
      ${divider()}
      ${alertBox('If you have any questions, please contact our support team. We\'re here to help you get the most out of SIM Management.', {
      bg: COLORS.infoBg,
      border: COLORS.infoBdr,
      textColor: COLORS.info,
      label: 'Need help?',
    })}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #057A55 0%, #065F46 100%)`,
      headerIcon: '&#10003;',
      headerTitle: 'Registration Successful',
      headerSubtitle: 'Your company is ready to go',
      bodyContent: body,
    });

    return this.sendEmail({ to: company.email, subject, html });
  }

  // ─── SIM Assignment Email ───────────────────────────────────────────────────

  async sendSimAssignmentEmail(user, sim, assignedBy) {
    const subject = `SIM Card Assigned — ${sim.mobileNumber}`;

    const body = `
      ${greeting(user.name)}
      ${paragraph(`A SIM card has been assigned to you by <strong>${assignedBy.name}</strong>. Please find the details below.`)}
      ${infoCard([
      ['Mobile Number', `<strong style="font-size:16px;">${sim.mobileNumber}</strong>`],
      ['Operator', sim.operator],
      ['Status', sim.status],
      sim.circle ? ['Circle', sim.circle] : null,
      ['Assigned By', assignedBy.name],
    ])}
      ${paragraph('You can view full SIM details, recharge history, and usage information in your dashboard.')}
      ${ctaButton('View SIM Details', `${config.app.frontendUrl || 'http://localhost:3000'}/dashboard`)}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #1A56DB 0%, #1E429F 100%)`,
      headerIcon: '&#128241;',
      headerTitle: 'SIM Card Assigned',
      headerSubtitle: sim.mobileNumber,
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Recharge Reminder Email ────────────────────────────────────────────────

  async sendRechargeReminder(user, sim, recharge) {
    const subject = `Recharge Reminder — SIM ${sim.mobileNumber}`;
    const nextDate = new Date(recharge.nextRechargeDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const body = `
      ${greeting(user.name)}
      ${paragraph('Your SIM card is due for recharge soon. Please recharge before the due date to avoid any service interruption.')}
      ${infoCard([
      ['Mobile Number', sim.mobileNumber],
      ['Operator', sim.operator],
      ['Next Recharge Date', `<strong style="color:#B45309;">${nextDate}</strong>`],
      ['Last Recharge Amount', `&#8377;${recharge.amount}`],
    ], { bg: COLORS.warningBg, border: COLORS.warningBdr })}
      ${alertBox(
      'Failure to recharge before the due date may result in service suspension or loss of the number.',
      { bg: '#FFF7ED', border: '#FED7AA', textColor: '#92400E', label: '&#9888; Important Notice' }
    )}
      ${ctaButton('Recharge Now', `${config.app.frontendUrl || 'http://localhost:3000'}/dashboard`, '#D97706')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #D97706 0%, #B45309 100%)`,
      headerIcon: '&#8635;',
      headerTitle: 'Recharge Reminder',
      headerSubtitle: `Action required for ${sim.mobileNumber}`,
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Password Reset Email ───────────────────────────────────────────────────

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.app.frontendUrl || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password — SIM Management';

    const body = `
      ${greeting(user.name)}
      ${paragraph('We received a request to reset the password for your account. Click the button below to choose a new password.')}
      ${ctaButton('Reset My Password', resetUrl, '#DC2626')}
      ${alertBox(`
        This link will expire in <strong>1 hour</strong>.<br />
        If you did not request a password reset, you can safely ignore this email &mdash; your password will remain unchanged.
      `, { bg: COLORS.dangerBg, border: COLORS.dangerBdr, textColor: '#991B1B', label: '&#128274; Security Notice' })}
      ${divider()}
      ${paragraph(`If the button above doesn't work, copy and paste this link into your browser:<br />
        <span style="font-size:12px; color:${COLORS.textMuted}; word-break:break-all;">${resetUrl}</span>`)}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #DC2626 0%, #991B1B 100%)`,
      headerIcon: '&#128274;',
      headerTitle: 'Password Reset',
      headerSubtitle: 'Requested for your account',
      bodyContent: body,
      footerNote: 'You received this email because a password reset was requested for your account.',
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Forgot Password OTP Email ──────────────────────────────────────────────

  async sendForgotPasswordOTPEmail(email, otp, userName) {
    const subject = 'Your Password Reset Code — SIM Management';

    const body = `
      ${greeting(userName)}
      ${paragraph('We received a request to reset your password. Use the verification code below to proceed.')}
      ${otpBox(otp)}
      ${alertBox(`
        <ul style="margin: 6px 0 0; padding-left: 20px; line-height: 1.8;">
          <li>This code expires in <strong>10 minutes</strong></li>
          <li>Do not share this code with anyone</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
      `, { bg: COLORS.warningBg, border: COLORS.warningBdr, textColor: '#92400E', label: '&#9888; Important' })}
      ${paragraph('Enter this code in the app to reset your password.')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #1A56DB 0%, #1E429F 100%)`,
      headerIcon: '&#128272;',
      headerTitle: 'Password Reset Code',
      headerSubtitle: 'SIM Management Verification',
      bodyContent: body,
      footerNote: 'This code is valid for 10 minutes. Do not share it with anyone.',
    });

    return this.sendEmail({ to: email, subject, html });
  }

  // ─── Subscription Expiry Email ──────────────────────────────────────────────

  async sendSubscriptionExpiryNotice(company, daysRemaining) {
    const subject = `Subscription Expiring in ${daysRemaining} Day${daysRemaining !== 1 ? 's' : ''} — Action Required`;
    const expiryDate = company.subscriptionEndDate
      ? new Date(company.subscriptionEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'N/A';
    const isUrgent = daysRemaining <= 3;

    const body = `
      ${greeting(company.name)}
      ${paragraph('Your SIM Management subscription is expiring soon. Renew now to avoid interruption to your services.')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="
        background: ${isUrgent ? COLORS.dangerBg : COLORS.warningBg};
        border: 1.5px solid ${isUrgent ? COLORS.dangerBdr : COLORS.warningBdr};
        border-radius: 14px;
        padding: 24px;
        margin: 20px 0;
        text-align: center;
      ">
        <tr><td>
          <p style="font-size: 13px; color: ${COLORS.textMuted}; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Time Remaining</p>
          <p style="font-size: 44px; font-weight: 600; color: ${isUrgent ? '#9B1C1C' : '#92400E'}; margin: 0; line-height: 1;">${daysRemaining}</p>
          <p style="font-size: 16px; color: ${isUrgent ? '#9B1C1C' : '#92400E'}; margin: 4px 0 12px;">day${daysRemaining !== 1 ? 's' : ''} remaining</p>
          <p style="font-size: 14px; color: ${COLORS.textMuted}; margin: 0;">Expiry Date: <strong>${expiryDate}</strong></p>
        </td></tr>
      </table>
      ${isUrgent
        ? alertBox('Your subscription expires very soon. Renew immediately to prevent service disruption and data access issues.', {
          bg: COLORS.dangerBg, border: COLORS.dangerBdr, textColor: '#991B1B', label: '&#128680; Urgent'
        })
        : ''}
      ${paragraph('Renew your subscription to continue accessing all features uninterrupted.')}
      ${ctaButton('Renew Subscription', `${config.app.frontendUrl || 'http://localhost:3000'}/subscription`, isUrgent ? '#DC2626' : '#D97706')}
    `;

    const html = baseLayout({
      headerBg: isUrgent
        ? `linear-gradient(135deg, #DC2626 0%, #991B1B 100%)`
        : `linear-gradient(135deg, #D97706 0%, #B45309 100%)`,
      headerIcon: '&#128197;',
      headerTitle: 'Subscription Expiry Notice',
      headerSubtitle: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`,
      bodyContent: body,
    });

    return this.sendEmail({ to: company.email, subject, html });
  }

  // ─── OTP Login Email ────────────────────────────────────────────────────────

  async sendOTPEmail(email, otp, mobileNumber) {
    const subject = 'Your Login OTP — SIM Management';

    const body = `
      ${paragraph('You requested to log in to SIM Management using your mobile number. Use the one-time password below to complete your login.')}
      ${infoCard([['Mobile Number', `+91 ${mobileNumber}`]])}
      ${otpBox(otp)}
      ${alertBox(`
        <ul style="margin: 6px 0 0; padding-left: 20px; line-height: 1.8;">
          <li>This OTP is valid for <strong>5 minutes</strong></li>
          <li>Do not share this OTP with anyone</li>
          <li>If you didn't request this, please ignore this email</li>
        </ul>
      `, { bg: COLORS.warningBg, border: COLORS.warningBdr, textColor: '#92400E', label: '&#9888; Security Notice' })}
      ${paragraph('Enter this OTP in the app to complete your login.')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #1A56DB 0%, #1E429F 100%)`,
      headerIcon: '&#128241;',
      headerTitle: 'One-Time Password',
      headerSubtitle: 'Login verification for SIM Management',
      bodyContent: body,
      footerNote: 'This OTP is valid for 5 minutes. Never share it with anyone.',
    });

    console.log('OTP:', otp);
    return this.sendEmail({ to: email, subject, html });
  }

  // ─── SIM Unassignment Email ──────────────────────────────────────────────────

  async sendSimUnassignmentEmail(user, sim, unassignedBy) {
    const subject = `SIM Card Unassigned — ${sim.mobileNumber}`;

    const body = `
      ${greeting(user.name)}
      ${paragraph(`The SIM card <strong>${sim.mobileNumber}</strong> has been unassigned from you by <strong>${unassignedBy.name}</strong>.`)}
      ${infoCard([
      ['Mobile Number', sim.mobileNumber],
      ['Operator', sim.operator],
      ['Status', 'Unassigned'],
      sim.circle ? ['Circle', sim.circle] : null,
      ['Unassigned By', unassignedBy.name],
    ])}
      ${paragraph('If you have any questions about this change, please contact your administrator.')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #6B7280 0%, #4B5563 100%)`,
      headerIcon: '&#128241;',
      headerTitle: 'SIM Card Unassigned',
      headerSubtitle: sim.mobileNumber,
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Subscription Renewal Email ──────────────────────────────────────────────

  async sendSubscriptionRenewalEmail(company, newEndDate, planName) {
    const subject = `Subscription Renewed Successfully — ${company.name}`;
    const formattedDate = new Date(newEndDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const body = `
      ${greeting(company.name)}
      ${paragraph('Your subscription has been renewed successfully. Thank you for continuing with SIM Management.')}
      ${infoCard([
      ['Plan', planName || 'Current Plan'],
      ['New Expiry Date', `<strong style="color:#057A55;">${formattedDate}</strong>`],
      ['Status', '<span style="color:#057A55; font-weight:600;">Active</span>'],
    ], { bg: '#F0FDF4', border: '#BBF7D0' })}
      ${paragraph('You can continue using all features of your subscription without any interruption.')}
      ${ctaButton('Go to Dashboard', `${config.app.frontendUrl || 'http://localhost:3000'}/dashboard`, '#057A55')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #057A55 0%, #065F46 100%)`,
      headerIcon: '&#10003;',
      headerTitle: 'Subscription Renewed',
      headerSubtitle: 'Your subscription has been extended',
      bodyContent: body,
    });

    return this.sendEmail({ to: company.email, subject, html });
  }

  // ─── Trial Extension Email ────────────────────────────────────────────────────

  async sendTrialExtensionEmail(company, newEndDate, additionalDays) {
    const subject = `Trial Extended — ${additionalDays} Days Added`;
    const formattedDate = new Date(newEndDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    const body = `
      ${greeting(company.name)}
      ${paragraph(`Good news! Your trial period has been extended by <strong>${additionalDays} days</strong>.`)}
      ${infoCard([
      ['Additional Days', `<strong style="color:#D97706;">${additionalDays} days</strong>`],
      ['New Expiry Date', formattedDate],
      ['Status', '<span style="color:#D97706; font-weight:600;">Trial Extended</span>'],
    ], { bg: '#FFFBEB', border: '#FCD34D' })}
      ${paragraph('Take this time to explore all features of SIM Management before your trial ends.')}
      ${ctaButton('Continue Exploring', `${config.app.frontendUrl || 'http://localhost:3000'}/dashboard`, '#D97706')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #D97706 0%, #B45309 100%)`,
      headerIcon: '&#128197;',
      headerTitle: 'Trial Period Extended',
      headerSubtitle: `${additionalDays} additional days added`,
      bodyContent: body,
    });

    return this.sendEmail({ to: company.email, subject, html });
  }

  // ─── Admin Password Reset Email ───────────────────────────────────────────────

  async sendAdminPasswordResetEmail(user, newPassword, resetBy) {
    const subject = 'Your Password Has Been Reset — SIM Management';
    const loginUrl = `${config.app.frontendUrl || 'http://localhost:3000'}/login`;

    const body = `
      ${greeting(user.name)}
      ${paragraph(`Your password has been reset by <strong>${resetBy.name}</strong> (${resetBy.role === 'super_admin' ? 'Super Admin' : 'Administrator'}).`)}
      ${passwordBox(newPassword)}
      ${paragraph('For your security, we recommend changing this password after your first login.')}
      ${ctaButton('Log In Now', loginUrl)}
      ${alertBox(`
        <strong>Security Tips:</strong><br />
        &bull; Change your password immediately after logging in<br />
        &bull; Use a strong password with at least 8 characters<br />
        &bull; Never share your password with anyone
      `, { bg: COLORS.infoBg, border: COLORS.infoBdr, textColor: COLORS.info, label: '&#128274;' })}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #DC2626 0%, #991B1B 100%)`,
      headerIcon: '&#128274;',
      headerTitle: 'Password Reset',
      headerSubtitle: 'Your password has been updated',
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── User Deactivation Email ──────────────────────────────────────────────────

  async sendUserDeactivationEmail(user, company, deactivatedBy) {
    const subject = 'Account Deactivated — SIM Management';

    const body = `
      ${greeting(user.name)}
      ${paragraph(`Your account has been deactivated by <strong>${deactivatedBy.name}</strong>.`)}
      ${infoCard([
      ['Email', user.email],
      ['Company', company.name],
      ['Status', '<span style="color:#DC2626; font-weight:600;">Deactivated</span>'],
    ])}
      ${paragraph('If you believe this is an error or need to reactivate your account, please contact your company administrator.')}
      ${alertBox('You will no longer be able to log in or access any SIM Management features.', { bg: COLORS.dangerBg, border: COLORS.dangerBdr, textColor: '#991B1B', label: '&#9888;' })}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #6B7280 0%, #4B5563 100%)`,
      headerIcon: '&#128274;',
      headerTitle: 'Account Deactivated',
      headerSubtitle: 'Your account has been deactivated',
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── User Activation Email ────────────────────────────────────────────────────

  async sendUserActivationEmail(user, company, activatedBy) {
    const subject = 'Account Reactivated — SIM Management';
    const loginUrl = `${config.app.frontendUrl || 'http://localhost:3000'}/login`;

    const body = `
      ${greeting(user.name)}
      ${paragraph(`Good news! Your account has been reactivated by <strong>${activatedBy.name}</strong>.`)}
      ${infoCard([
      ['Email', user.email],
      ['Company', company.name],
      ['Status', '<span style="color:#057A55; font-weight:600;">Active</span>'],
    ])}
      ${paragraph('You can now log in and access all your SIM Management features.')}
      ${ctaButton('Log In Now', loginUrl, '#057A55')}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #057A55 0%, #065F46 100%)`,
      headerIcon: '&#10003;',
      headerTitle: 'Account Reactivated',
      headerSubtitle: 'Your account is now active',
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Telegram Link Email ────────────────────────────────────────────────────

  async sendTelegramLinkEmail(user, sim, telegramLink, sentBy) {
    const subject = `Connect Your SIM to Telegram — ${sim.mobileNumber}`;

    const body = `
      ${greeting(user.name)}
      ${paragraph(`Your administrator <strong>${sentBy.name}</strong> has requested you to link your SIM to Telegram for activity tracking.`)}
      ${infoCard([
      ['Mobile Number', `<strong style="font-size:16px;">${sim.mobileNumber}</strong>`],
      ['Operator', sim.operator],
      ['Status', sim.status],
      sim.circle ? ['Circle', sim.circle] : null,
      ['Requested By', sentBy.name],
    ])}
      ${alertBox('Linking your SIM to Telegram allows us to track your SIM activity. You will receive periodic check messages and need to reply to keep your SIM marked as active.', {
      bg: COLORS.infoBg, border: COLORS.infoBdr, textColor: COLORS.info, label: '&#128241; Why Link?'
    })}
      ${paragraph('Click the button below to open Telegram and connect your SIM:')}
      ${ctaButton('Connect via Telegram', telegramLink, '#0088cc')}
      ${divider()}
      ${paragraph(`<strong>How to connect:</strong>`)}
      <ol style="margin: 12px 0; padding-left: 20px; line-height: 1.8; color: #374151;">
        <li>Click the button above or copy the link</li>
        <li>Open Telegram (app or web)</li>
        <li>Start a chat with the bot</li>
        <li>Tap the <strong>"Start"</strong> button</li>
        <li>Done! Your SIM is now linked</li>
      </ol>
      ${paragraph(`If the button doesn't work, copy this link:<br />
        <span style="font-size:12px; color:${COLORS.textMuted}; word-break:break-all;">${telegramLink}</span>`)}
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #0088cc 0%, #006699 100%)`,
      headerIcon: '&#9995;',
      headerTitle: 'Connect SIM to Telegram',
      headerSubtitle: sim.mobileNumber,
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  // ─── Bulk Telegram Link Email ────────────────────────────────────────────────────

  async sendBulkTelegramLinkEmail(user, simLinks, sentBy) {
    const subject = `Connect Your SIMs to Telegram — ${simLinks.length} SIM${simLinks.length > 1 ? 's' : ''}`;

    const simRows = simLinks.map(({ sim, link }) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid ${COLORS.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top;">
                <p style="font-size: 15px; font-weight: 600; color: ${COLORS.textPrimary}; margin: 0;">${sim.mobileNumber}</p>
                <p style="font-size: 13px; color: ${COLORS.textMuted}; margin: 4px 0 0;">${sim.operator}</p>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <a href="${link}" style="display: inline-block; padding: 8px 16px; background: #0088cc; color: #fff; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 500;">Connect</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    const body = `
      ${greeting(user.name)}
      ${paragraph(`Your administrator <strong>${sentBy.name}</strong> has requested you to link ${simLinks.length} SIM${simLinks.length > 1 ? 's' : ''} to Telegram for activity tracking.`)}
      ${alertBox('Please connect each SIM to Telegram. You will receive check messages and need to reply to keep your SIMs marked as active.', {
      bg: COLORS.infoBg, border: COLORS.infoBdr, textColor: COLORS.info, label: '&#128241; Important'
    })}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
        ${simRows}
      </table>
      ${paragraph('<strong>How to connect:</strong>')}
      <ol style="margin: 12px 0; padding-left: 20px; line-height: 1.8; color: #374151;">
        <li>Click "Connect" next to each SIM</li>
        <li>Open Telegram and tap "Start"</li>
        <li>Your SIM will be automatically linked</li>
      </ol>
    `;

    const html = baseLayout({
      headerBg: `linear-gradient(135deg, #0088cc 0%, #006699 100%)`,
      headerIcon: '&#9995;',
      headerTitle: 'Connect SIMs to Telegram',
      headerSubtitle: `${simLinks.length} SIM${simLinks.length > 1 ? 's' : ''} to link`,
      bodyContent: body,
    });

    return this.sendEmail({ to: user.email, subject, html });
  }

  isReady() {
    return this.isConfigured && this.transporter !== null;
  }
}

module.exports = new EmailService();