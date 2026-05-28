# SIM Management Platform

## Complete Project Flow Document

**Prepared for:** Client Review
**Version:** 1.0
**Date:** May 2026

---

# 1. Project Overview

## The Problem

Companies that manage large numbers of SIM cards — whether for field teams, remote employees, IoT devices, or business operations — face a common set of challenges:

- **No central visibility** over which SIMs are active, which are about to expire, and which have already stopped working.
- **Missed recharges** lead to service interruptions, lost productivity, and emergency top-ups at higher costs.
- **No way to verify** whether a SIM card is actually being used or is sitting idle in a drawer.
- **Manual tracking** through spreadsheets is error-prone, time-consuming, and doesn't scale.
- **No early warnings** for expiring subscriptions, inactive SIMs, or WiFi connectivity issues.
- **No automated way** to check if a person is reachable via WhatsApp or Telegram.

## What This Software Does

**SIM Management Platform** is a complete business tool that lets organizations manage all their SIM cards from a single dashboard. It tracks every SIM's status, reminds you before recharges are due, monitors whether SIMs are actually being used, and automates routine tasks — so nothing falls through the cracks.

Think of it as a **mission control center for your SIM cards**.

## Who Uses It

| Person | What They Do |
|--------|-------------|
| **Platform Owner** (Super Admin) | Manages the entire platform — creates companies, assigns plans, monitors revenue, handles subscriptions |
| **Company Administrator** | Manages their own company's SIMs, users, recharges, and monitors SIM activity |
| **Regular User** | Views their assigned SIMs, syncs call logs and SMS from their phone, tracks personal usage |

## Key Business Advantages

- **Never miss a recharge again** — automatic reminders before due dates
- **Know instantly** which SIMs are active, idle, or disconnected
- **Reduce manual tracking** — everything is recorded automatically
- **Control costs** — see exactly how much you're spending on recharges and where
- **Verify connectivity** — automatically check if SIM holders are reachable via WhatsApp or Telegram
- **Monitor WiFi performance** — get instant alerts when internet speed drops
- **Scale without chaos** — from 10 SIMs to thousands, the system handles it
- **Role-based access** — every person sees only what they need to see

---

# 2. User Roles

## Role Summary Table

| Role | Who They Are | What They Can Do | What They Cannot Do |
|------|-------------|------------------|---------------------|
| **Super Admin** | Platform owner or manager | Create and manage companies, assign subscription plans, view all payments, manage landing page content, manage legal pages, view platform-wide analytics | Cannot manage individual SIMs or recharges (that's the company admin's job) |
| **Company Administrator** | Business owner or team manager | Add/edit/delete SIMs, track recharges, view call logs, send WhatsApp/Telegram status checks, monitor WiFi, manage users, run reports, manage subscriptions | Cannot access other companies' data. Feature access depends on their subscription plan. |
| **Regular User** | Field employee or team member | View their assigned SIMs, sync call logs and SMS from their mobile phone, receive notifications, change their password | Cannot add SIMs, manage other users, or access admin features |

## Access Level Details

```
Super Admin
  ├── Manage Companies (Create, Edit, Delete, Assign Plans)
  ├── Manage Subscription Plans (Create, Edit Pricing/Features)
  ├── View All Payments & Revenue
  ├── Manage Landing Page & Legal Pages
  ├── View Platform Analytics
  └── Manage Super Admin Settings

Company Administrator
  ├── Manage SIMs (Add, Edit, Import, Export)
  ├── Track Recharges (Add, View Overdue, Reminders)
  ├── View Call Logs & SMS Logs *
  ├── Send WhatsApp Status Checks *
  ├── Send Telegram Status Checks *
  ├── Monitor WiFi Networks *
  ├── Configure Call Automation *
  ├── Manage Company Users
  ├── View Reports *
  ├── Manage Subscription & Billing
  ├── View Audit Logs
  └── Manage Notifications & Settings

  (* = depends on subscription plan)

Regular User
  ├── View Assigned SIMs
  ├── Sync Call Logs from Mobile App
  ├── Sync SMS from Mobile App
  ├── Receive Notifications
  └── Update Personal Settings
```

---

# 3. Complete System Workflow

## 3.1 Getting Started — Registration & Setup

```
New Visitor → Landing Page → Select Plan → Register
                                          │
                      ┌─────────────────────┼──────────────────────┐
                      │                     │                      │
                Free Trial           Paid Plan                Super Admin
                (14 days)         (Razorpay Payment)         (Created Internally)
                      │                     │                      │
                      ▼                     ▼                      ▼
              Company Created        Company Created         Platform Management
              Admin Account Made     Admin Account Made      Access Granted
              Trial Plan Assigned    Paid Plan Assigned
              Welcome Email Sent     Welcome Email Sent
```

**Step-by-step:**

1. **Visitor arrives** on the landing page and browses features, pricing, and FAQ.
2. **Visitor selects a plan** (Free Trial or a paid plan) and clicks "Get Started."
3. **If Free Trial:** The visitor enters their company name, email, and password. The system creates a company account with a 14-day trial. No payment required.
4. **If Paid Plan:** The visitor is redirected to a secure payment page (Razorpay). After successful payment, the company account is created with the selected plan.
5. **The first user** in the company automatically becomes the **Company Administrator**.
6. **Welcome email** is sent to the new administrator.

## 3.2 Daily Usage Flow

```
Admin Logs In → Dashboard Overview
                    │
         ┌──────────┼──────────┐──────────┐──────────┐──────────┐
         │          │          │          │          │          │
     SIM Mgmt  Recharges  Call Logs  Messages  WiFi Mon  Reports
         │          │          │          │          │          │
    Add/Edit    Add Due    View/     WhatsApp/  Check     Download
    Import/     Recharge   Filter    Telegram   Speed     Excel
    Export      Track      Sync      Status     Alerts    Analytics
```

**Typical Daily Cycle:**

1. **Morning:** Admin logs in and checks the dashboard for:
   - Overdue recharges (shown in red)
   - Recharges due this week (shown in yellow)
   - Active WiFi alerts
   - Unread notifications

2. **During the day:** Admin manages SIMs, adds recharges, sends WhatsApp/Telegram checks, reviews call logs.

3. **End of day:** Admin reviews reports and exports data if needed.

## 3.3 Recharge Tracking Flow

```
SIM Added → Recharge Recorded
                 │
                 ▼
        Next Recharge Date Calculated
        (Recharge Date + Validity Days)
                 │
                 ▼
        ┌────────────────┐
        │ 3 Days Before   │ ← System sends email + in-app notification
        │ Due Date         │
        └────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │ Recharge Date   │ ← If not recharged, marked as OVERDUE
        │ Reached          │
        └────────────────┘
                 │
                 ▼
        Admin Adds New Recharge → Cycle Repeats
```

**Example:** A SIM is recharged on January 1 with a 28-day plan.
- Next recharge date is automatically set to **January 29**.
- On **January 26** (3 days before), the system sends a reminder.
- If the admin doesn't recharge by January 29, it appears as **Overdue** on the dashboard.

## 3.4 WhatsApp/Telegram Status Check Flow

```
Admin Selects SIMs → Composes Message → Sends Bulk Messages
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              SIM Holder 1              SIM Holder 2              SIM Holder 3
              Replies Within            Replies Within             No Reply
              1 Hour                    1 Hour                    After 1 Hour
                    │                         │                         │
                    ▼                         ▼                         ▼
              SIM Marked               SIM Marked                SIM Marked
              ACTIVE                   ACTIVE                    INACTIVE
```

**How it works:**

1. **Admin selects** one or more SIMs and types a message (e.g., "Please confirm you're available").
2. **The system sends** the message via WhatsApp or Telegram to each selected person.
3. **Each person receives** the message on their phone.
4. **If they reply within 1 hour**, the SIM is marked as **Active**.
5. **If they don't reply within 1 hour**, the SIM is marked as **Inactive** (automatically, via scheduled check every 5 minutes).
6. **Admin can see** a summary of who replied and who didn't.

**Business use case:** A company has 200 SIMs distributed to field workers. Instead of calling each person individually, the admin sends a bulk WhatsApp message. Within an hour, they know exactly which workers are available and which SIMs might be lost, broken, or unused.

## 3.5 Call Automation Flow

```
Admin Configures Call Automation
  ├── Selects Caller SIMs (phones that will make calls)
  ├── Selects Target SIMs (phones that will receive calls)
  ├── Sets Call Duration (10-60 seconds)
  ├── Sets Frequency (hourly / daily / weekly)
  └── Sets Scheduled Time (e.g., 9:00 AM daily)
            │
            ▼
  Mobile App Reads Configuration
            │
            ▼
  At Scheduled Time:
  Caller SIM dials Target SIM → Call connects for set duration → Call ends
            │
            ▼
  System Logs the Call → Target SIM marked as Active
```

**Business use case:** Telecom regulations require SIMs to make or receive calls periodically to stay active. This feature automates that process — the system schedules calls between SIMs to ensure they remain active, eliminating manual dialing.

## 3.6 WiFi Monitoring Flow

```
Admin Adds WiFi Network
  ├── Sets Expected Speed (e.g., 50 Mbps)
  ├── Sets Alert Threshold (e.g., 20 Mbps)
  ├── Assigns Relevant SIMs
  └── Saves Network
            │
            ▼
  Mobile App or Device Reports Speed Metrics
            │
            ▼
  System Checks Speed Against Threshold
            │
        ┌─── ┴ ───┐
        │         │
   Speed OK    Speed Below
   Threshold    Threshold
        │         │
        │    Alert Created
        │    (Email + In-App)
        │         │
        │    Admin Notified
        │         │
   Speed      Admin Resolves
   Recovers → Alert When Issue Fixed
        │
   Alert Auto-Closed
```

**Business use case:** A company has WiFi networks at multiple office locations. If the internet speed drops below the acceptable threshold, the admin receives an instant alert, enabling them to contact the internet service provider immediately instead of discovering the problem hours later.

## 3.7 Notification System Flow

```
Event Triggers Notification
         │
    ┌────┼────┐────────┐────────┐────────┐
    │    │    │        │        │        │
  Recharge  SIM     Sub      WiFi     Call
  Due     Inactive  Expiring  Alert   Automation
    │    │        │        │        │
    ▼    ▼        ▼        ▼        ▼
  System Creates Notification
         │
    ┌────┼────┐
    │    │    │
  In-App  Email  SMS
  Badge   Alert  (if enabled)
    │    │    │
    ▼    ▼    ▼
  Admin Sees Notification on Dashboard
  Admin Receives Email
  (SMS based on plan)
```

---

# 4. Module-by-Module Explanation

---

## 4.1 Dashboard

### Purpose
The Dashboard is the first screen every user sees after logging in. It provides a quick snapshot of everything happening with the company's SIMs.

### User Actions
- View total SIMs, active SIMs, and monthly recharge amounts
- See upcoming and overdue recharges at a glance
- Check call statistics (incoming, outgoing, missed)
- View recharge trends over the past 14 days
- See SIM distribution by operator (Jio, Airtel, Vi, BSNL, etc.)
- Quickly identify recently added SIMs

### System Behavior
- Automatically calculates and refreshes all statistics
- Color-codes overdue recharges in **red** and upcoming recharges in **yellow**
- Shows a live count of unread notifications

### Business Benefit
No need to run separate reports to understand the current state. The dashboard gives you the answer in 5 seconds: **Are we on track? Is anything overdue? Which SIMs need attention?**

### Example Scenario
An admin logs in on Monday morning and immediately sees that **3 recharges are overdue** and **5 are due this week**. They can take action right away without digging through spreadsheets.

---

## 4.2 SIM Management

### Purpose
The core module where every SIM card is registered, tracked, and managed throughout its lifecycle.

### User Actions
- **Add a SIM manually** — Enter Contact Number, operator, circle/region, status, and optionally assign it to a user
- **Bulk import SIMs** — Upload an Excel file with multiple SIMs at once. The system validates each row and shows errors before importing.
- **Edit SIM details** — Update operator, status, assignment, notes, or tags
- **Change SIM status** — Active, Inactive, Suspended, or Lost
- **Assign/Unassign** a SIM to a team member
- **Export SIMs** — Download all SIMs to Excel for offline records
- **Track messaging status** — See which SIMs are connected on WhatsApp or Telegram
- **Support for 30+ countries** — Country code selector with auto-detection of operators and circles for Indian numbers

### System Behavior
- Prevents duplicate SIM numbers within the same company
- Auto-sends an email notification when a SIM is assigned or unassigned
- Automatically updates company statistics (total SIMs, active SIMs) on every change
- When bulk importing, automatically creates new user accounts if assigned users don't exist yet

### Business Benefit
One central place to know exactly how many SIMs you have, who holds each one, and whether they're active. **No more lost SIMs or wondering who has which number.**

### Example Scenario
A company onboards 50 new employees. Instead of adding 50 SIMs one by one, the admin uploads an Excel file. The system imports all 50 SIMs in seconds, creates user accounts for any new employees, and sends welcome emails — all automatically.

---

## 4.3 Recharge Tracking

### Purpose
Track every recharge, know when the next one is due, and never let a SIM go inactive because of a missed payment.

### User Actions
- **Add a recharge** — Select a SIM, enter amount, validity (days), plan details, payment method
- **View all recharges** — Filter by date range, status (completed, pending, failed)
- **See overdue recharges** — Highlighted in red on the dashboard
- **See upcoming recharges** — Shown 7 days in advance
- **Track spending** — Total spent, average amount, monthly comparison

### System Behavior
- When a recharge is added, the system **automatically calculates the next recharge date** (Recharge Date + Validity Days)
- Sends **automatic email and in-app reminders** 3 days before the due date
- Marks recharges as **Overdue** if the next recharge date has passed
- Supports multiple payment methods: Cash, UPI, Card, Net Banking, Wallet, Other

### Business Benefit
**Eliminates the #1 reason SIMs go dead: forgotten recharges.** The system tracks every recharge, predicts the next due date, and sends timely reminders.

### Example Scenario
An admin recharges a SIM on March 1 with a 28-day plan. The system sets the next recharge date to March 29. On March 26, the admin receives an email reminder. On March 29, if not recharged, it shows as **Overdue** in red on the dashboard.

---

## 4.4 Call Log Analytics

### Purpose
Record and analyze all call activity for each SIM to understand usage patterns, identify unusual activity, and maintain records.

### User Actions
- **View call logs** — Filter by SIM, call type (incoming, outgoing, missed), date range, phone number
- **Sync call logs** — Users can push call history from their mobile phone to the platform
- **Export call logs** — Download to Excel for offline analysis
- **View call statistics** — Total calls, call duration breakdown, top contacts

### System Behavior
- Mobile app users sync their call logs automatically
- The system **deduplicates entries** — if the same call log is synced twice, it won't create duplicates
- Call statistics are computed automatically: total calls by type, average duration, most-contacted numbers
- Supports filtering and pagination for large call log datasets

### Business Benefit
**Complete visibility into how SIMs are being used.** Are employees making business calls or personal calls? Which numbers are called the most? Are there suspicious patterns? This data helps with cost control and compliance.

### Example Scenario
A manager notices that a field SIM has been making 3-hour personal calls daily. The call log report clearly shows the pattern, enabling a productive conversation about usage policy.

---

## 4.5 SMS Logs

### Purpose
Track all SMS messages (inbox and sent) associated with each SIM for record-keeping and compliance.

### User Actions
- **View SMS logs** — Filter by SIM, type (inbox/sent), date range
- **Sync SMS from mobile** — Users push their SMS history from the mobile app
- **View statistics** — Total SMS count by type, top senders

### System Behavior
- Mobile app users sync their SMS automatically
- Messages are deduplicated (same SIM + timestamp + sender won't create duplicates)
- Statistics are computed automatically: total by type, unique senders, daily counts

### Business Benefit
**Keep a complete record of all text communications** associated with company SIMs. Useful for compliance, dispute resolution, and audit requirements.

---

## 4.6 WhatsApp Status Check

### Purpose
Send bulk WhatsApp messages to SIM holders and determine whether they are active and reachable based on their reply.

### User Actions
- **Select SIMs** — Choose individual SIMs or all SIMs with WhatsApp enabled
- **Compose message** — Type a status check message (e.g., "Please confirm your availability")
- **Send in bulk** — One message delivered to all selected SIMs via WhatsApp
- **Choose whether** to update SIM status based on replies
- **View results** — See which SIMs replied, which didn't, and which messages failed
- **View statistics** — Total sent, delivered, replied, inactive counts

### System Behavior
- Messages are sent via **Twilio WhatsApp Business API**
- When a recipient replies, the system matches it to the original message
- **If the person replies within 1 hour**, their SIM is marked **Active**
- **If no reply within 1 hour**, the SIM is marked **Inactive** (checked every 5 minutes by a background process)
- All messages and replies are stored for audit purposes

### Business Benefit
**Know in one hour whether 200 field workers are available — instead of calling them one by one for days.** This turns a multi-day task into a one-click, one-hour operation.

### Example Scenario
An operations manager needs to verify that all 150 field SIMs are active. They select all SIMs, type "Please reply to confirm your SIM is active," and click Send. Within one hour, they can see that 138 SIMs have active holders and 12 need follow-up. Total time spent: 2 minutes.

---

## 4.7 Telegram Status Check

### Purpose
Same as WhatsApp Status Check, but using Telegram as the messaging platform.

### User Actions
- **View eligible SIMs** — See which SIMs are linked to Telegram
- **Send messages** — Compose and send bulk messages via Telegram
- **Generate deep links** — Create invitation links for SIM holders to link their Telegram
- **View verification status** — See which SIMs have verified their phone number on Telegram

### System Behavior
- SIM holders link their Telegram account via a **deep link** (e.g., `t.me/YourBot?start=SIM_123`)
- When they click the link, the bot asks them to **share their phone number** for verification
- The system compares the shared phone number with the SIM's registered number
- **If they match**, the SIM is verified and marked as Telegram-connected
- Reply tracking works the same as WhatsApp — 1-hour window, auto-inactive marking

### Business Benefit
**Some teams prefer Telegram over WhatsApp.** This module ensures you can reach them on their preferred platform while maintaining the same activity tracking capabilities.

---

## 4.8 WiFi Monitoring

### Purpose
Monitor internet speed across office locations, branches, or any location where the company has WiFi connectivity. Get instant alerts when speed drops below acceptable levels.

### User Actions
- **Add WiFi networks** — Name each network, set expected speed and alert threshold
- **Assign SIMs** — Link relevant SIM cards to each WiFi network for device-based monitoring
- **View current speed** — See the latest measured speed for each network
- **View 24-hour speed chart** — Hourly speed trends for each network
- **Receive alerts** — Instant notifications when speed drops below threshold
- **Resolve alerts** — Manually mark resolved when the issue is fixed

### System Behavior
- **Devices (or the mobile app) report speed metrics** to the system periodically
- When the average speed drops below the **alert threshold**, the system creates an alert
- Alerts are **automatically resolved** when speed returns to normal
- If a device goes **offline for 10+ minutes**, it's marked as offline and an alert is created
- The system tracks: download speed, upload speed, and latency for each network
- Old metrics (older than 30 days) are automatically cleaned up

### Alert Types

| Alert Type | What It Means |
|-----------|---------------|
| Low Speed | Average speed dropped below the set threshold |
| High Latency | Network response time is too high |
| Device Offline | A monitoring device hasn't reported in 10+ minutes |
| WiFi Off / Disconnected | The WiFi network is unreachable |
| Mobile Switched Off | The monitoring phone is turned off |

### Business Benefit
**Stop discovering internet problems from employee complaints.** Get alerts the moment speed drops, so you can contact your internet service provider immediately.

### Example Scenario
A branch office's internet speed drops from 100 Mbps to 5 Mbps at 10 AM. The system detects this within 5 minutes, creates an alert, and notifies the admin by email and in-app notification. The admin contacts the ISP immediately — instead of finding out at 4 PM when employees complain.

---

## 4.9 Call Automation

### Purpose
Automatically place calls between SIM cards to keep them active. Many telecom providers deactivate SIMs that don't make or receive calls for a certain period. This module automates the process of keeping them active.

### User Actions
- **Configure automation** — Select which SIMs will make calls (callers) and which will receive calls (targets)
- **Set call duration** — How long each call should last (10-60 seconds)
- **Set frequency** — How often calls should happen: hourly, daily, or weekly
- **Set schedule** — What time the calls should happen (e.g., 9:00 AM daily, or every Monday)
- **Enable/Disable** — Turn automation on or off anytime
- **View last run status** — See when the last call cycle ran and how many succeeded

### System Behavior
- The configuration is saved and the **next run time** is calculated automatically
- The **mobile app reads** the configuration and places calls at the scheduled time
- Calls follow a **round-robin pattern** — each target SIM is called in turn, not always the same one
- Results (success/fail count) are recorded after each run
- The system **tracks which SIMs are callers and which are targets**, so you always know the role of each SIM

### Business Benefit
**Keep all SIMs active without manual effort.** No more SIMs getting deactivated because nobody used them for weeks. The system handles it automatically on the schedule you set.

### Example Scenario
A company has 50 SIMs that need to make or receive at least one call per week to stay active. The admin configures 10 caller SIMs to call the remaining 40 targets, 10 seconds per call, every Monday at 9 AM. The system handles all 40 calls automatically while the admin has their morning coffee.

---

## 4.10 Subscription & Billing

### Purpose
Manage the company's subscription plan, track usage limits, upgrade or renew plans, and handle payments.

### User Actions
- **View current plan** — See plan name, features, limits, validity, and usage
- **See usage meters** — How many SIMs and users are used vs. the plan limit
- **Upgrade or renew** — Choose a higher plan or extend the current one
- **Pay online** — Secure payment via Razorpay (supports cards, UPI, net banking, wallets)
- **View payment history** — All past payments with invoice details
- **Toggle monthly/yearly billing** — See savings for annual plans

### System Behavior
- **Free Trial** gives 14 days of access with limited features
- Plans have **feature gates** — some features (WhatsApp, Telegram, WiFi, Call Automation, SMS Logs) are only available on higher plans
- Plans have **usage limits** — maximum SIMs, maximum users
- When a subscription **expires**, the company account is automatically deactivated
- **Expiry warnings** are sent at 7 days, 3 days, and 1 day before expiry
- Admins don't count toward the user limit

### Available Plans

| Feature | Free Trial | Starter | Professional | Enterprise |
|---------|-----------|---------|-------------|------------|
| Duration | 14 days | Monthly/Yearly | Monthly/Yearly | Monthly/Yearly |
| Price | Free | ₹999/mo | ₹2,499/mo | ₹4,999/mo |
| Max SIMs | 10 | 10 | 50 | Unlimited |
| Max Users | 5 | 3 | 10 | Unlimited |
| Call Log Sync | ✅ | ❌ | ✅ | ✅ |
| WhatsApp Status | ❌ | ❌ | ✅ | ✅ |
| Telegram Status | ❌ | ❌ | ❌ | ✅ |
| WiFi Monitor | ❌ | ❌ | ✅ | ✅ |
| Call Automation | ❌ | ❌ | ✅ | ✅ |
| SMS Logs | ❌ | ❌ | ✅ | ✅ |
| Advanced Reports | ✅ | ❌ | ✅ | ✅ |
| Excel Export | ✅ | ✅ | ✅ | ✅ |
| Email Notifications | ✅ | ✅ | ✅ | ✅ |
| SMS Notifications | ❌ | ❌ | ✅ | ✅ |
| API Access | ❌ | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ |

### Business Benefit
**Pay only for what you need and scale as you grow.** Start with a free trial, upgrade when you need more SIMs or advanced features.

---

## 4.11 User Management

### Purpose
Manage team members who have access to the platform, control their roles, and track their activity.

### User Actions
- **Add users** — Create accounts for team members with specific roles (Admin or User)
- **Edit users** — Update name, email, phone, role
- **Deactivate users** — Temporarily disable access without deleting the account
- **Reset passwords** — Admin-initiated password reset for team members
- **View user activity** — See who logged in when and what actions they performed

### System Behavior
- Email IDes are **globally unique** — one email can only have one account across the entire platform
- Admins can create User accounts within their company
- Super Admins can create other Super Admins and Company Admins
- Password changes are logged in the audit trail
- Deactivated users cannot log in but their data is preserved

### Business Benefit
**Control who sees what.** Team members only access what's relevant to their role. Full audit trail of every action.

---

## 4.12 Reports & Analytics

### Purpose
Generate comprehensive reports on SIM usage, recharge spending, call patterns, and operational metrics.

### User Actions
- **View reports** — Dashboard-level analytics for SIMs, recharges, and calls
- **Monthly reports** — Detailed breakdown by month including operator-wise spending
- **Export to Excel** — Download any report for offline analysis or presentation
- **Filter by date range** — View reports for specific periods

### Available Reports
| Report | What It Shows |
|--------|--------------|
| SIM Report | Total, active, inactive, suspended, lost SIMs with operator breakdown |
| Recharge Report | Total spending, average amount, operator-wise breakdown, trends |
| Call Log Report | Total calls by type, duration analysis, top contacts, daily patterns |
| SMS Report | Total messages by type, top senders, daily counts |
| Audit Log Report | Complete history of all actions taken by all users |
| Monthly Summary | Combined monthly overview of all metrics |

### Business Benefit
**Data-driven decisions.** Know exactly where your money goes, which operators cost the most, which SIMs are underused, and when to optimize your spending.

---

## 4.13 Notifications

### Purpose
Keep everyone informed about important events without manual checking.

### Notification Types

| Type | When It's Sent | Priority |
|------|----------------|----------|
| Recharge Due | 3 days before recharge due date | High/Critical |
| SIM Inactive | When a SIM hasn't been active for 7+ days | High |
| Subscription Expiring | 7, 3, and 1 day before expiry | Critical |
| WiFi Alert | When speed drops below threshold | High |
| Call Automation | After automated call cycles complete | Medium |
| System | General platform announcements | Low |

### Delivery Channels
- **In-App** — Always, shown as badge count and notification list
- **Email** — By default for important notifications
- **SMS** — Based on subscription plan

### Business Benefit
**Never miss a critical event.** The system proactively tells you what needs attention — you don't have to remember to check.

---

## 4.14 Audit Logs

### Purpose
Maintain a complete, tamper-proof record of every action taken in the system for accountability and compliance.

### What's Tracked

| Category | Actions Logged |
|----------|---------------|
| AUTH | Login, logout, password changes, failed attempts, OTP events |
| SIM | Create, update, delete, status change, assignment change |
| RECHARGE | Create, update, delete |
| USER | Create, update, deactivate, password reset |
| COMPANY | Create, update, subscription changes |
| SUBSCRIPTION | Plan changes, renewals |
| PAYMENT | Payment success, failure, refund |
| WHATSAPP | Message sent, reply received |
| TELEGRAM | Message sent, reply received |
| WIFI | Network created, alert triggered, resolved |
| CALL_AUTOMATION | Config saved, calls completed |

### User Actions
- **View audit logs** — Filter by user, action type, module, date range
- **Search logs** — Free text search on descriptions
- **View details** — See exactly what changed, when, and by whom

### Business Benefit
**Complete accountability.** Know who did what, when, and why. Essential for compliance, security investigations, and resolving disputes.

---

## 4.15 Company Management (Super Admin Only)

### Purpose
Manage all companies on the platform — from creation to subscription assignment to deactivation.

### User Actions
- **Create companies** — Set up new company accounts with admin credentials
- **Assign subscription plans** — Choose which plan each company uses
- **Extend trials** — Give companies more trial time
- **Renew subscriptions** — Extend subscription validity
- **Deactivate/activate** companies — Temporarily disable or re-enable access
- **Manage company admins** — Add, edit, or reset passwords for company administrators
- **View company details** — See stats, expiry dates, admin information

### System Behavior
- Super Admin can see **all companies** across the platform
- Company data is **completely isolated** — one company cannot see another company's data
- When a subscription expires, the company is **automatically deactivated**
- Super Admin receives **notifications** when new companies register

### Business Benefit
**Full platform control.** Manage your SaaS business from one screen — see which companies are active, which are expiring, and how revenue is trending.

---

## 4.16 Landing Page & Content Management

### Purpose
Manage the public-facing website content — pricing, features, testimonials, FAQ, and legal pages.

### User Actions
- **Edit landing page** — Update hero text, feature descriptions, stats, testimonials
- **Manage pricing plans** — Update plan names, prices, and feature lists
- **Manage legal pages** — Edit Privacy Policy, Terms of Service, and other legal content
- **Upload company branding** — Logo for the application

### Business Benefit
**No developer needed for content changes.** Update your marketing website whenever you want — new pricing, new features, updated testimonials.

---

## 4.17 Settings

### Purpose
Personalize the platform — company settings, user preferences, and security options.

### User Actions
- **Update profile** — Name, phone, avatar
- **Change password** — With current password verification
- **Change email** — With two-step OTP verification (verify old email, then verify new email)
- **Company settings** — Timezone, currency, date format, notification preferences
- **Notification preferences** — Email, SMS, in-app on/off
- **Branding** — Upload company logo

### System Behavior
- Email change requires **OTP verification** on both old and new Email IDes for security
- Password changes are logged in the audit trail
- Company settings affect all users in the company

### Business Benefit
**Customize the platform to match your business.** Set your timezone, currency, and notification preferences once, and everything works the way you expect.

---

# 5. End-to-End User Journey

## Scenario: A Mid-Size Company Onboards and Operates

### Week 1 — Getting Started

```
Step 1: Company Registration
  └─ Admin visits landing page → Selects Professional Plan → Enters company details
  └─ Redirected to Razorpay payment → Payment successful → Account created
  └─ Welcome email received with login credentials

Step 2: First Login & Setup
  └─ Admin logs in → Sees empty dashboard with "Add your first SIM" prompt
  └─ Goes to Settings → Uploads company logo → Sets timezone and currency

Step 3: Add SIMs
  └─ Admin clicks "Add SIM" → Enters Contact Number, selects operator → Saves
  └─ Or: Admin clicks "Bulk Import" → Downloads template → Fills in SIM data → Uploads Excel
  └─ System imports 50 SIMs in seconds → Sends welcome emails to assigned users

Step 4: Add Team Members
  └─ Admin goes to Users → Clicks "Add User" → Enters name, email, role → Saves
  └─ New users receive email invitations to set their passwords
```

### Week 2 — Daily Operations

```
Step 5: Morning Check
  └─ Admin logs in → Dashboard shows:
     ├── 3 recharges overdue (red)
     ├── 5 recharges due this week (yellow)
     ├── 1 WiFi alert (speed dropped at branch office)
     └── 2 unread notifications

Step 6: Handle Overdue Recharges
  └─ Admin clicks on "Overdue Recharges" → Sees SIMs with past-due dates
  └─ Adds new recharge for each → Enters amount, validity → System calculates next due date
  └─ Overdue items disappear from dashboard

Step 7: Handle WiFi Alert
  └─ Admin opens WiFi Monitor → Sees alert: "Office WiFi speed dropped to 5 Mbps"
  └─ Calls ISP → Issue resolved → Speed recovers → Alert auto-resolves
  └─ Or: Admin manually resolves alert after confirming fix

Step 8: Check SIM Availability via WhatsApp
  └─ Admin goes to WhatsApp → Selects 30 field SIMs → Types "Please confirm availability"
  └─ Messages sent → Within 1 hour → 27 replies (Active) → 3 no replies (Inactive)
  └─ Admin follows up with the 3 inactive SIM holders by phone
```

### Month 1 — Review & Optimize

```
Step 9: Monthly Report Review
  └─ Admin goes to Reports → Selects "Monthly Summary"
  └─ Sees:
     ├── Total SIMs: 50 (45 active, 3 inactive, 2 suspended)
     ├── Total recharge spending: ₹15,000
     ├── Most expensive operator: Jio (₹8,500)
     ├── Average call duration: 4.2 minutes
     ├── Most called number: +91-98765-43210 (42 calls)
     └── 3 SIMs consistently inactive → Consider deactivating

Step 10: Subscription Renewal
  └─ System sends email: "Your subscription expires in 7 days"
  └─ Admin goes to Subscription → Clicks "Renew" → Selects yearly plan (saves ₹3,000)
  └─ Pays via Razorpay → Subscription extended for another year
  └─ All features continue working without interruption
```

---

# 6. Dashboard & Reports Explanation

## Admin Dashboard

| Widget | What It Shows | Why It Matters |
|--------|---------------|---------------|
| Total SIMs / Active | Count of all SIMs and how many are currently active | Instantly spot if SIMs are going inactive |
| Monthly Recharges | Total amount spent and number of recharges this month | Track spending trends |
| Upcoming Recharges | SIMs due for recharge in the next 7 days | Prevent service interruptions |
| Unread Notifications | Count of alerts waiting for your attention | Never miss important events |
| SIM Distribution Chart | Breakdown by operator (Jio, Airtel, etc.) | Understand which operators you use most |
| Call Statistics | Incoming, outgoing, missed call counts | Monitor usage patterns |
| Recharge Trends | 14-day bar chart of daily recharge totals | Spot spending spikes |
| Overdue Recharges | List of SIMs past their recharge date | Take immediate action |

## Super Admin Dashboard

| Widget | What It Shows | Why It Matters |
|--------|---------------|---------------|
| Total Companies | Registered companies on the platform | Platform growth |
| Active/Inactive Companies | How many are currently paying | Revenue health |
| Total Users | Users by role (super_admin, admin, user) | Platform adoption |
| Total SIMs Platform-Wide | All SIMs across all companies | Platform scale |
| Revenue This Month | Total payments received | Business performance |
| Revenue Trend | 12-month revenue trend | Growth trajectory |
| Subscription Distribution | How many companies on each plan | Plan popularity |
| Expiring Subscriptions | Companies expiring in next 7 days | Proactive retention |

## Available Reports

| Report | Contents | Business Value |
|--------|----------|---------------|
| SIM Report | Total/active/inactive/suspended/lost counts, operator breakdown | Identify underperforming SIMs |
| Recharge Report | Total spending, average amount, operator-wise costs, trends | Optimize recharge budgets |
| Call Log Report | Call volumes by type, duration, top contacts | Verify business usage |
| SMS Report | Message volumes by type, top senders | Monitor communication patterns |
| Audit Log | Complete action history | Accountability and compliance |
| WiFi Report | Network performance, alert history | Ensure connectivity quality |

---

# 7. Security & Access Control

## Role-Based Access

Every screen and action in the system is protected by role-based permissions. Here's what each role can and cannot access:

| Capability | Super Admin | Company Admin | User |
|-----------|:-----------:|:------------:|:----:|
| Manage Companies | ✅ | ❌ | ❌ |
| Manage Subscriptions (platform) | ✅ | ❌ | ❌ |
| View All Payments | ✅ | ❌ | ❌ |
| Manage Landing Content | ✅ | ❌ | ❌ |
| Manage SIMs | ❌ | ✅ | View only (assigned) |
| Track Recharges | ❌ | ✅ | ❌ |
| View Call Logs | ❌ | ✅ * | Own only |
| Send WhatsApp/Telegram | ❌ | ✅ * | ❌ |
| Monitor WiFi | ❌ | ✅ * | ❌ |
| Call Automation | ❌ | ✅ * | ❌ |
| View Reports | ❌ | ✅ * | ❌ |
| Manage Company Users | ❌ | ✅ | ❌ |
| Manage Subscription (own) | ❌ | ✅ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ |

*\* = Requires subscription plan that includes this feature*

## Data Protection

| Protection | How It Works |
|-----------|-------------|
| **Password Security** | Passwords are encrypted and never stored in readable form. Even system administrators cannot see your password. |
| **Session Management** | Login sessions expire automatically. You stay logged in for 7 days, after which you must log in again. |
| **Company Data Isolation** | Each company's data is completely separate. Company A cannot see or access Company B's data under any circumstances. |
| **Action Tracking** | Every significant action is recorded in the audit log — who did what, when, and from which device. |
| **Password Reset** | Two options: (1) Email-based reset link that expires in 1 hour, or (2) OTP-based reset for admin accounts. |
| **Email Change** | Requires verification on both the old and new Email IDes via OTP. |
| **Feature Gating** | Subscription plans control which features are accessible. Even if someone knows the URL, they cannot access features their plan doesn't include. |

## Activity Tracking

Every action taken in the system is logged with:

- **Who** — The user who performed the action
- **What** — The specific action (create, update, delete, login, etc.)
- **When** — Exact timestamp
- **Where** — IP address and device information
- **What Changed** — Details of what was modified

This log cannot be edited or deleted, ensuring a complete and trustworthy record.

---

# 8. Business Benefits

## Time Savings

| Task | Manual Process | With This Platform | Time Saved |
|------|---------------|-------------------|-----------|
| Adding 50 SIMs | 2-3 hours of spreadsheet work | 2 minutes (bulk import) | ~97% |
| Checking SIM availability | Calling 100 people individually (2 days) | Bulk WhatsApp message (2 minutes + 1 hour wait) | ~95% |
| Finding overdue recharges | Searching through records (30 min) | Instantly visible on dashboard | ~98% |
| Generating monthly report | Manual data compilation (4 hours) | One click download | ~99% |
| Keeping SIMs active | Manually calling each SIM weekly | Automated call scheduling | ~100% |

## Reduced Errors

- **No duplicate SIMs** — System prevents entering the same number twice
- **No missed recharges** — Automatic reminders and overdue tracking
- **No forgotten SIMs** — Inactive SIM alerts
- **No expired subscriptions** — 7, 3, and 1-day warnings

## Better Tracking

- **Every recharge** is recorded with amount, plan, validity, and payment method
- **Every call log** is synced and stored with analytics
- **Every notification** is tracked — sent, delivered, read
- **Every action** is audit-logged with full details

## Improved Accuracy

- **Automatic next recharge date calculation** eliminates human error
- **Automated WhatsApp/Telegram checks** provide objective activity data
- **WiFi speed monitoring** provides objective, real-time metrics
- **Audit logs** provide verifiable records for compliance

## Scalability

| Scale | Manual Process | Platform | Difference |
|-------|---------------|----------|-----------|
| 10 SIMs | Manageable in spreadsheets | Fully managed | Moderate |
| 50 SIMs | Time-consuming, error-prone | Fully managed | Significant |
| 100 SIMs | Nearly impossible manually | Fully managed | Transformative |
| 500+ SIMs | Not feasible without dedicated staff | Fully managed | Essential |

## Financial Benefits

- **Prevent wasted SIM costs** — Know exactly which SIMs are active and which can be deactivated
- **Never miss recharge deadlines** — Avoid late fees and emergency recharges
- **Optimize plan selection** — Reports show which operators cost the most
- **Reduce manual effort** — Automation replaces hours of manual work
- **Prevent revenue loss** — Subscription expiry warnings ensure continuous service

---

# 9. Future Enhancement Possibilities

## Near-Term Enhancements

1. **Mobile App (Full-Featured)** — A companion mobile app for on-the-go SIM management, real-time push notifications, and automatic call log/SMS sync without manual intervention

2. **Advanced Dashboard Widgets** — Customizable dashboard where admins can pin the metrics they care about most, rearrange widgets, and set personal thresholds for alerts

3. **Multi-Currency Support** — Support for USD, AED, GBP, and other currencies for international companies with SIMs across multiple countries

4. **Bulk Action Improvements** — Select multiple SIMs and perform actions simultaneously (bulk status change, bulk recharges, bulk WhatsApp checks)

5. **Scheduled Reports** — Automatic report generation and email delivery on a weekly or monthly schedule

## Medium-Term Enhancements

6. **AI-Powered Insights** — Automatically detect unusual patterns like sudden call volume spikes, unexpected recharge amounts, or SIMs going inactive in clusters

7. **Integration Marketplace** — Connect with accounting software (QuickBooks, Zoho), communication tools (Slack, Teams), and HR systems for automatic user provisioning

8. **Mobile App Geofencing** — Track SIM locations and set up location-based alerts (e.g., "Alert me when this SIM leaves the city")

9. **White-Label Solution** — Allow partners to rebrand the platform with their own logo, colors, and domain for resale

10. **Advanced Role Customization** — Create custom roles with granular permissions (e.g., "View Only" role, "Recharge Only" role)

## Long-Term Enhancements

11. **Predictive Analytics** — Use historical data to predict which SIMs are likely to go inactive, which recharges are at risk of being missed, and optimize recharge timing for cost savings

12. **Multi-Company Dashboard** — For organizations managing multiple companies or business units, a single dashboard that aggregates data across all companies

13. **API Marketplace** — Public APIs for third-party developers to build integrations and custom tools on top of the platform

14. **IoT SIM Management** — Specialized features for IoT SIMs (data usage monitoring, low-battery alerts, firmware update tracking)

15. **Compliance Automation** — Automated compliance reporting for telecom regulations, data retention policies, and audit requirements

---

# 10. Conclusion

The **SIM Management Platform** is a comprehensive, enterprise-grade solution designed to solve the real-world challenges of managing SIM cards at scale. It replaces fragmented spreadsheets, manual tracking, and reactive problem-solving with a unified, automated, and proactive system.

### What Makes This Platform Different

| Aspect | Traditional Approach | This Platform |
|--------|---------------------|---------------|
| SIM Tracking | Spreadsheets, manual updates | Centralized dashboard, real-time status |
| Recharge Management | Calendar reminders, missed dates | Automatic calculation, email alerts, overdue tracking |
| Activity Verification | Phone calls, manual follow-ups | Automated WhatsApp/Telegram checks, 1-hour results |
| WiFi Monitoring | Employee complaints, delayed response | Automatic speed tracking, instant alerts |
| SIM Activity | Manual dialing, no records | Automated call scheduling, complete logs |
| Reporting | Manual compilation, hours of work | One-click analytics, always up to date |
| Security | Shared logins, no audit trail | Role-based access, complete audit logging |

### At Its Core

This platform takes the chaos out of SIM management and replaces it with **clarity, control, and confidence**. Whether you're managing 10 SIMs or 10,000, every recharge is tracked, every SIM is monitored, and every alert reaches the right person at the right time.

**The result: fewer missed recharges, lower costs, better visibility, and complete peace of mind.**

---

*This document is confidential and intended for the exclusive use of the recipient. It provides a business-level overview of the SIM Management Platform and does not contain technical implementation details.*

---

**Document Version:** 1.0
**Last Updated:** May 2026
**Prepared By:** SIM Management Platform Team