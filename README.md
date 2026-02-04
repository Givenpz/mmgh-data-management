# MMGH Hospital Data Management System

Professional hospital management system with user authentication, role-based access control, audit logging, and email notifications.

## Features

✅ **User Authentication & Authorization**

- Sign-up system with email verification
- Admin approval workflow for new users
- Role-based access control (Admin/Staff)
- JWT token-based session management
- Password hashing with bcrypt

✅ **Admin Dashboard**

- Approve/reject pending user registrations
- User management and status tracking
- Complete audit logs of all system actions
- Export audit logs for compliance

✅ **Data Management**

- Patient management with auto-increment IDs
- Appointment scheduling
- Medical records tracking
- Staff directory
- Real-time search across all modules

✅ **Security & Compliance**

- Encrypted password storage
- JWT tokens for API authentication
- Comprehensive audit logging
- Role-based permission enforcement
- Email notifications for account actions

✅ **Professional UI/UX**

- Responsive design (mobile, tablet, desktop)
- Clean, modern interface
- Real-time notifications
- Intuitive admin panel

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript (no frameworks - lightweight)
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT + Bcrypt
- **Email:** Nodemailer
- **Hosting:** Render.com

## Quick Start

1. **Clone & Install:**

```bash
git clone https://github.com/Givenpz/mmgh-data-management.git
cd mmgh-data-management
npm install
```

2. **Setup Database:**

```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
psql mmgh_hospital -f sql/init.sql
```

3. **Run Locally:**

```bash
npm start
```

Open http://localhost:3000

4. **Demo Credentials:**

- Admin: `admin` / any password
- Staff: `staff` / any password

## Production (Render)

1. Create PostgreSQL database on Render
2. Create Web Service from this GitHub repo
3. Set environment variables (DATABASE_URL, JWT_SECRET, EMAIL_PASS, etc.)
4. Run `psql $DATABASE_URL -f sql/init.sql`

Full instructions in [Production Deployment](#production-deployment-render) section below.

## API Endpoints

**Authentication:**

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with JWT token

**Admin Only:**

- `GET /api/admin/pending-users` - List pending approvals
- `POST /api/admin/approve-user/:userId` - Approve registration
- `POST /api/admin/reject-user/:userId` - Reject registration
- `GET /api/admin/users` - List all users
- `GET /api/admin/audit-logs` - View activity logs

**Data:**

- `GET /api/data` - Get patients, appointments, records, staff
- `POST /api/bulk` - Bulk import

## Email Setup

The system sends emails for registrations, approvals, and rejections. To enable:

1. Enable 2FA on Gmail account
2. Create App Password: https://myaccount.google.com/apppasswords
3. Add to `.env`:

```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@mmgh.local
```

## File Structure

```
├── server.js              # Express backend & API
├── db.js                  # Database connection
├── hospital-management.html   # Frontend (single file)
├── package.json           # Dependencies
├── sql/init.sql          # Database schema
├── .env.example          # Config template
└── README.md
```

## Troubleshooting

| Issue               | Solution                                   |
| ------------------- | ------------------------------------------ |
| DB connection error | Check DATABASE_URL in .env                 |
| Email not sending   | Verify EMAIL_USER, EMAIL_PASS, 2FA enabled |
| Admin only error    | Login with admin role                      |
| Schema error        | Run `psql $DATABASE_URL -f sql/init.sql`   |

## Production Deployment (Render)

### Step 1: Create Database

1. Go to https://render.com/dashboard
2. Click "New +" → "PostgreSQL"
3. Name: `mmgh-hospital`
4. Copy connection string

### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Select GitHub repository
3. Set configuration:
   - Name: `mmgh-hospital`
   - Environment: Node
   - Build: `npm install`
   - Start: `npm start`

4. Add environment variables:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
EMAIL_SERVICE=gmail
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@mmgh.local
APP_URL=https://your-app.onrender.com
NODE_ENV=production
```

### Step 3: Initialize Database

Connect to Postgres and run:

```bash
psql $DATABASE_URL -f sql/init.sql
```

### Step 4: Deploy

Click "Deploy" on Render dashboard. Your app will be live at: `https://mmgh-hospital.onrender.com`

## License

© 2026 Mtendere Mission General Hospital. All rights reserved.

## Version

**v2.0.0** - Professional Edition with Auth & Audit Logs
