# EdTech Backend - Complete Setup & Deployment Guide

This guide provides step-by-step instructions for setting up and deploying the Node.js EdTech backend.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Database Configuration](#database-configuration)
3. [Environment Variables](#environment-variables)
4. [Running Migrations](#running-migrations)
5. [Testing the Setup](#testing-the-setup)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 12+ running locally
- **npm** 8+ or **yarn** package manager
- **Git** for version control

### Step 1: Clone or Navigate to Project

```bash
cd edtech_node_backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all packages listed in `package.json`:
- Express.js (web framework)
- Sequelize (ORM for PostgreSQL)
- JWT/Passport (authentication)
- Cloudinary (file uploads)
- Nodemailer (email)
- Razorpay (payments)
- Multer (file handling)
- And more...

### Step 3: Setup Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) section).

### Step 4: Verify Setup with Health Check

```bash
node scripts/health-check.js
```

This validates:
- ✓ .env file configuration
- ✓ All dependencies installed
- ✓ Directory structure complete
- ✓ All required files present
- ✓ All models and controllers exist

---

## Database Configuration

### Step 1: Create PostgreSQL Database

```bash
# Log into PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE edtech_development;

# Verify creation
\l

# Exit
\q
```

### Step 2: Update .env with Database Credentials

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edtech_development
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/edtech_development
```

### Step 3: Verify Database Connection

Test connection without running migrations:

```bash
node -e "
require('dotenv').config();
const sequelize = require('./config/database');
sequelize.authenticate().then(() => {
  console.log('✓ Database connection successful');
  process.exit(0);
}).catch(err => {
  console.error('✗ Database connection failed:', err.message);
  process.exit(1);
});
"
```

---

## Environment Variables

### Required Variables (Must be Set)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=edtech_development
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edtech_development

# Server
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# Authentication
JWT_SECRET=your_super_secret_key_min_32_chars_long
JWT_EXPIRE=7d
```

### OAuth Variables (Required for OAuth Features)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

### Cloudinary Variables (Required for File Uploads)

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Email Variables (Required for Email Notifications)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
EMAIL_FROM=noreply@edtech.com
EMAIL_RECEIVER=admin@edtech.com
```

### Payment Variables (Required for Razorpay)

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_KEY=your_public_key
```

### Frontend Integration

```env
FRONTEND_URL=http://localhost:3001
```

---

## Running Migrations

### Step 1: Run Initial Migration

This creates all database tables:

```bash
npm run migrate
```

Or manually with Sequelize CLI:

```bash
npx sequelize-cli db:migrate
```

### Step 2: Verify Schema

Check that all tables were created:

```bash
# Log into PostgreSQL
psql -U postgres -d edtech_development

# List all tables
\dt

# Check users table structure
\d users

# Exit
\q
```

Expected tables:
- users
- profiles
- categories
- courses
- sections
- sub_sections
- enrollments
- course_progresses
- course_progress_videos
- rating_and_reviews
- otps
- live_sessions
- live_chat_messages

### Step 3: Seed Initial Data (Optional)

Populate database with sample data:

```bash
npm run seed
```

Or manually:

```bash
npx sequelize-cli db:seed:all
```

This creates:
- Admin user (admin@edtech.com / Admin123)
- Sample instructor (instructor@edtech.com / Instructor123)
- Sample student (student@edtech.com / Student123)
- Sample categories and courses

### Rollback (if needed)

Undo migrations:

```bash
# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all
```

---

## Testing the Setup

### Step 1: Start Development Server

```bash
npm run dev
```

Expected output:

```
✓ EdTech Backend Server
✓ Running on: http://localhost:3000
✓ Environment: development

Database synchronized successfully
Server is running on port 3000
```

### Step 2: Test Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### Step 3: Test Authentication

Signup:

```bash
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "Password123",
    "accountType": "Student"
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

### Step 4: Test Protected Route

```bash
curl -X GET http://localhost:3000/profile/getUserDetails \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Production Deployment

### Step 1: Prepare for Production

Update `.env` for production:

```env
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com
JWT_SECRET=your_long_random_production_secret_key
DB_HOST=your_production_db_host
DB_NAME=edtech_production
# ... other production values
```

### Step 2: Build and Start Production Server

```bash
# Skip install if dependencies already present
npm install --omit=dev

# Run migrations on production database
npm run migrate

# Start with PM2 (process manager)
npm install -g pm2
pm2 start server.js --name "edtech-backend"
pm2 save
```

### Step 3: Setup Reverse Proxy (Nginx Example)

```nginx
server {
  listen 80;
  server_name api.edtech.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Step 4: SSL/TLS Certificate

Use Let's Encrypt for free HTTPS:

```bash
sudo certbot certonly --standalone -d api.edtech.com
```

### Step 5: Monitor and Logs

View logs with PM2:

```bash
pm2 logs edtech-backend
```

Monitor processes:

```bash
pm2 monit
```

---

## Troubleshooting

### Database Connection Failed

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check credentials in `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
- Test with: `psql -U postgres`

### Port Already in Use

**Error:** `listen EADDRINUSE :::3000`

**Solution:**
- Kill existing process: `lsof -i :3000` then `kill -9 <PID>`
- Or change PORT in `.env` to 3001, 3002, etc.

### Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Migrations Stuck

**Error:** Migration never completes

**Solution:**
- Check database connection: `npm run health-check`
- Check database logs: `tail -f /var/log/postgresql/postgresql.log`
- Undo and retry: `npm run migrate:undo:all && npm run migrate`

### OAuth Not Working

**Error:** Invalid OAuth credentials

**Solution:**
1. Verify OAuth IDs and secrets in `.env`
2. Check callback URLs registered in OAuth provider dashboards
3. Ensure frontend sends correct redirect_uri
4. Check that Passport strategies are initialized: `npm run dev` and watch logs

### File Upload Fails

**Error:** File upload returns 413 or empty response

**Solution:**
- Check Cloudinary credentials in `.env`
- Verify file size under 200MB limit
- Check uploads directory permissions: `chmod 755 uploads/`
- Ensure `express` has correct body size limit in server.js

### Email Not Sending

**Error:** "Error sending email" in logs

**Solution:**
- Enable "Less secure app access" in Gmail settings
- Use [App Password](https://support.google.com/accounts/answer/185833) instead of regular password
- Check EMAIL_HOST, EMAIL_USER, EMAIL_PASS in `.env`
- Test SMTP connection:

```bash
node -e "
require('dotenv').config();
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
transporter.verify((err, success) => {
  if (err) console.error('✗', err.message);
  else console.log('✓ SMTP connection successful');
});
"
```

---

## Next Steps

After successful setup:

1. **Test all API endpoints** against the frontend
2. **Configure payment webhooks** for Razorpay
3. **Setup monitoring** (errors, performance)
4. **Enable logging** for debugging
5. **Configure backup strategy** for database
6. **Setup CI/CD pipeline** for automated deployments

For more information, see [README.md](./README.md) and API documentation.
