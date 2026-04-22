# SIM Management SaaS

A complete multi-tenant SaaS solution for SIM card management with recharge tracking, call log analytics, and notification system.

## 🚀 Features

### Core Features
- **Multi-tenant Architecture** - Super Admin → Admin → User hierarchy
- **SIM Management** - Add, edit, import, export SIM cards with Excel support
- **Recharge Tracking** - Track recharges with due date reminders
- **Call Log Analytics** - Sync and analyze call history
- **Notification System** - Email and in-app notifications
- **Subscription Plans** - Flexible pricing with feature limits

### Role-Based Access
- **Super Admin**: Platform management, company creation, subscription assignment
- **Admin**: Company-level SIM and recharge management
- **User**: View assigned SIMs, sync call logs

### Technical Features
- JWT Authentication with refresh tokens
- Role-based middleware and authorization
- Company-level data isolation
- RESTful API with validation
- Background cron jobs for reminders
- Responsive premium UI with Tailwind CSS

## 📁 Project Structure

```
sim-management-2/
├── ai-helper/              # AI Development Assistant SOP
│   ├── system.txt          # AI behavior rules
│   ├── prompt-format.txt   # Prompt templates
│   ├── projects/           # Project contexts
│   ├── templates/          # Code templates
│   └── history/            # Development logs
│
├── backend/                # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, validation, etc.
│   │   ├── utils/          # Utilities
│   │   ├── jobs/           # Cron jobs
│   │   └── server.js       # Entry point
│   └── package.json
│
└── frontend/               # React + Tailwind UI
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── context/        # React context (Auth)
    │   ├── layouts/        # Layout components
    │   ├── pages/          # Page components
    │   └── main.jsx        # Entry point
    └── package.json
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Validation**: Express Validator
- **Email**: Nodemailer
- **Excel**: XLSX

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP**: Axios
- **Charts**: Recharts
- **Icons**: React Icons

## 📦 Installation

### Prerequisites
- Node.js 18+
- MongoDB 6+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
# - MongoDB connection string
# - JWT secret
# - Email SMTP settings

# Start development server
npm run dev
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

### Initialize Super Admin

```bash
# After starting backend, initialize super admin
curl -X POST http://localhost:5000/api/auth/init-super-admin

# Default credentials:
# Email: admin@simmanagement.com
# Password: SuperAdmin@123
```

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
POST /api/auth/forgot-password
POST /api/auth/reset-password/:token
GET  /api/auth/profile
PUT  /api/auth/profile
POST /api/auth/change-password
```

### Companies (Super Admin)
```
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id
POST   /api/companies/:id/renew-subscription
POST   /api/companies/:id/extend-trial
GET    /api/companies/:id/stats
```

### Subscriptions
```
GET  /api/subscriptions
POST /api/subscriptions (Super Admin)
GET  /api/subscriptions/:id
PUT  /api/subscriptions/:id (Super Admin)
```

### SIMs
```
GET    /api/sims
POST   /api/sims
POST   /api/sims/import
GET    /api/sims/export
GET    /api/sims/:id
PUT    /api/sims/:id
DELETE /api/sims/:id
PATCH  /api/sims/:id/status
POST   /api/sims/:id/assign
POST   /api/sims/:id/unassign
```

### Recharges
```
GET  /api/recharges
POST /api/recharges
GET  /api/recharges/upcoming
GET  /api/recharges/overdue
GET  /api/recharges/stats
GET  /api/recharges/history/:simId
```

### Call Logs
```
GET  /api/call-logs
POST /api/call-logs/sync
GET  /api/call-logs/stats
GET  /api/call-logs/export
```

### Dashboard
```
GET /api/dashboard/overview
GET /api/dashboard/sims
GET /api/dashboard/recharges
GET /api/dashboard/calls
GET /api/dashboard/monthly-report
```

## 🔒 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb://localhost:27017/sim-management

JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@simmanagement.com

FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🎨 UI Components

The frontend includes:
- **Layout**: Responsive sidebar with mobile support
- **Dashboard**: Stats cards, charts, quick actions
- **Tables**: Sortable, filterable data tables with pagination
- **Forms**: Validated inputs with error handling
- **Modals**: For CRUD operations
- **Notifications**: Toast notifications system

## 📱 Mobile App Integration

The system is designed for mobile app integration:
- Call log sync API ready
- Device binding support
- Background sync capabilities
- API endpoints documented for mobile developers

## 🚀 Deployment

### Backend
```bash
# Build
npm run build

# Start production
npm start

# Or use PM2
pm2 start src/server.js --name sim-management-api
```

### Frontend
```bash
# Build
npm run build

# Serve with nginx or similar
# The build output is in /dist
```

### Docker (Optional)
```bash
# Backend
docker build -t sim-management-api ./backend

# Frontend
docker build -t sim-management-web ./frontend
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, email support@simmanagement.com

---

Built with ❤️ using Node.js, Express, MongoDB, React, and Tailwind CSS.