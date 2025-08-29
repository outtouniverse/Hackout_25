# Hacout Backend API

A clean and structured Node.js backend API for user authentication and mangrove incident reporting.

## Features

- User registration and login
- JWT-based authentication
- Role-based user system (community, NGO, govt)
- Profile management
- Mangrove incident reporting system
- Admin panel for government users
- Report validation system
- Notification system
- Gamification and rewards
- Input validation
- MongoDB integration

## API Endpoints

### Authentication

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/register` | Register new user | `{ name, email, password, role, phone, location }` | User object + JWT |
| POST | `/auth/login` | User login | `{ email, password }` | JWT + user details |
| GET | `/auth/profile` | Get logged-in user profile | Header: Bearer token | User object |
| PUT | `/auth/profile` | Update profile | `{ name?, phone?, location?, photo? }` | Updated user |
| POST | `/auth/logout` | Logout user | - | `{ success: true }` |

### Reports

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/reports` | Create new incident report | `{ type, description, photo, lat, lng }` | Report object |
| GET | `/reports` | Get all reports (filterable) | `?status=open&userId=xxx&type=cutting` | `[reports...]` |
| GET | `/reports/:id` | Get specific report | - | Report object |
| PUT | `/reports/:id` | Update a report (by user before validation) | `{ description?, photo? }` | Updated report |
| DELETE | `/reports/:id` | Delete user's report | - | `{ success: true }` |
| POST | `/reports/:id/validate` | Validate report (AI-assisted + manual) | `{ status: "valid" \| "invalid", notes? }` | Updated report |
| GET | `/reports/pending` | Get all pending reports for validation | - | `[reports...]` |

### Admin (Government Users Only)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/auth/admin/users` | Get all users (filterable) | `?role=community` | `[users...]` |
| PUT | `/auth/admin/users/:id/ban` | Ban user | `{ reason }` | `{ success: true }` |
| GET | `/auth/admin/stats` | Get system-wide stats | - | `{ totalUsers, totalReports, validatedReports, mangrovesSaved }` |
| GET | `/auth/admin/map` | Heatmap view data | - | `[ {lat, lng, type, status}, ... ]` |

### Notifications (Admin Only)

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/notifications/send` | Send push/SMS/email notification | `{ userId, message, type }` | `{ success: true }` |
| GET | `/auth/notifications/:userId` | Get user's notifications | - | `[notifications...]` |

### Gamification

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/auth/gamification/leaderboard` | Get top users by points | `?region=xyz` | `[users ranked...]` |
| GET | `/auth/gamification/user/:id` | Get gamification details of a user | - | `{ points, badges, reportsCount }` |
| POST | `/auth/gamification/rewards/redeem` | Redeem reward | `{ rewardId }` | `{ success, rewardDetails }` |

### Health Check

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/health` | Server health check | `{ success: true, message: "Server is running" }` |

## User Roles

- `community` - Community members
- `NGO` - Non-governmental organizations
- `govt` - Government entities (admin access)

## Report Types

- `cutting` - Mangrove cutting incidents
- `dumping` - Waste dumping incidents
- `pollution` - Pollution incidents
- `land_reclamation` - Land reclamation incidents
- `other` - Other incidents

## Report Status

- `open` - New report, pending validation
- `validated` - Report has been validated
- `resolved` - Issue has been resolved
- `rejected` - Report was rejected

## User Status

- `active` - User account is active
- `banned` - User account is banned
- `inactive` - User account is inactive

## Notification Types

- `push` - Push notification
- `sms` - SMS notification
- `email` - Email notification

## Gamification System

- **Points**: Earned through reports and validations
- **Badges**: Achievement-based rewards
- **Leaderboard**: Regional and global rankings
- **Rewards**: Redeemable for real-world benefits

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with:
   ```
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/hacout_db
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=30d
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- express-validator for input validation
