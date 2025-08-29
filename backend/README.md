# Hacout Backend API

A clean and structured Node.js backend API for user authentication and mangrove incident reporting.

## Features

- User registration and login
- JWT-based authentication
- Role-based user system (community, NGO, govt)
- Profile management
- Mangrove incident reporting system
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

### Health Check

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/api/health` | Server health check | `{ success: true, message: "Server is running" }` |

## User Roles

- `community` - Community members
- `NGO` - Non-governmental organizations
- `govt` - Government entities

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
