# AttendEase - Attendance & Leave Management System

Full-stack Attendance and Leave Management System with eSSL biometric integration, built with Next.js (App Router), PostgreSQL, and Prisma.

## Features

- **Employee Master** - CRUD employees, map biometric user IDs, assign manager & HR
- **Attendance Module** - Fetch from SQL Server (eSSL), daily IN/OUT, working hours, late marks
- **Regularization** - Request missed punch correction (max 3/month), 2-level approval
- **Leave Management** - CL/SL/EL leave types, apply with date range, balance tracking
- **Approval Workflow** - Manager → HR 2-level approval with notification system
- **Reports** - Daily/Monthly attendance & leave reports, CSV export
- **Dashboard** - Stats overview, calendar view, quick actions
- **Security** - JWT authentication, role-based access (Admin/HR/Manager/Employee)
- **Mobile-friendly** - Responsive design with PWA support

## Tech Stack

- **Frontend & Backend**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Prisma ORM)
- **Biometric Integration**: SQL Server (eSSL database via `mssql`)
- **Auth**: JWT (jose + bcryptjs)
- **UI**: Tailwind CSS, Lucide Icons, Recharts
- **State**: Zustand
- **Export**: CSV (built-in), XLSX, jsPDF

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- SQL Server (for eSSL biometric data)

### Setup

```bash
# Clone & install
git clone <repo-url>
cd ESSL-AttendEase
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

### Seed Data

After starting the server, call the seed endpoint to create demo users:

```bash
curl -X POST http://localhost:3000/api/seed
```

Demo accounts:
| Email | Password | Role |
|-------|----------|------|
| admin@attendease.com | admin123 | Admin |
| hr@attendease.com | user123 | HR |
| manager@attendease.com | user123 | Manager |
| john@attendease.com | user123 | Employee |
| jane@attendease.com | user123 | Employee |

## Docker Deployment

```bash
docker compose up -d
```

## Coolify Deployment

1. Push code to GitHub
2. In Coolify, create a new service → Docker Compose
3. Connect your GitHub repo
4. Set environment variables in Coolify dashboard
5. Deploy

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret (change in production!) |
| `MSSQL_SERVER` | eSSL SQL Server host |
| `MSSQL_DATABASE` | eSSL database name |
| `MSSQL_USER` | SQL Server username |
| `MSSQL_PASSWORD` | SQL Server password |
| `OFFICE_START_TIME` | Office start time (default: 09:00) |
| `LATE_THRESHOLD_MINUTES` | Late threshold in minutes (default: 15) |
| `MAX_REGULARIZATIONS_PER_MONTH` | Max regularizations per month (default: 3) |

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes
│   │   ├── auth/             # Login, logout, session
│   │   ├── employees/        # Employee CRUD
│   │   ├── attendance/       # Attendance + biometric sync
│   │   ├── regularization/   # Regularization requests
│   │   ├── leaves/           # Leave applications + balance
│   │   ├── notifications/    # Notification system
│   │   ├── reports/          # Attendance & leave reports
│   │   ├── dashboard/        # Dashboard stats
│   │   └── seed/             # Seed data
│   ├── (dashboard)/          # Authenticated pages
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── attendance/
│   │   ├── regularization/
│   │   ├── leaves/
│   │   ├── approvals/
│   │   ├── reports/
│   │   └── notifications/
│   └── login/
├── components/
│   ├── layout/AppLayout.tsx  # Sidebar + header layout
│   └── ui/index.tsx          # Reusable UI components
├── lib/
│   ├── prisma.ts             # Prisma client
│   ├── mssql.ts              # SQL Server connection
│   ├── auth.ts               # JWT + password utils
│   ├── api-utils.ts          # Response helpers
│   └── api-client.ts         # Frontend API client
├── store/auth.ts             # Zustand auth store
└── middleware.ts              # Auth middleware
```
