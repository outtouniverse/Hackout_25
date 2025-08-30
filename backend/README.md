# Hacout Backend API

A clean and structured Node.js backend API for user authentication and mangrove incident reporting with AI-powered image analysis.

## Features

- User registration and login
- JWT-based authentication
- Role-based user system (community, NGO, govt)
- Profile management
- Mangrove incident reporting system
- **AI-powered image analysis using Google Gemini**
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
| POST | `/reports` | Create new incident report | `{ type, description, photo, lat, lng }` | Report object + AI analysis |
| GET | `/reports` | Get all reports (filterable) | `?status=open&userId=xxx&type=cutting&aiStatus=ai_approved` | `[reports...]` |
| GET | `/reports/:id` | Get specific report | - | Report object |
| PUT | `/reports/:id` | Update a report (by user before validation) | `{ description?, photo? }` | Updated report |
| DELETE | `/reports/:id` | Delete user's report | - | `{ success: true }` |
| POST | `/reports/:id/validate` | Validate report (AI-assisted + manual) | `{ status: "valid" \| "invalid", notes? }` | Updated report |
| GET | `/reports/pending` | Get all pending reports for validation | - | `[reports...]` |
| **GET** | **`/reports/:id/ai-analysis`** | **Get AI analysis for a report** | **-** | **AI analysis details** |

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

## AI Analysis Status

- `pending` - AI analysis in progress
- `ai_approved` - AI approved the image as valid mangrove incident
- `ai_rejected` - AI rejected the image (not a mangrove incident)
- `ai_error` - AI analysis failed due to technical error
- `ai_disabled` - AI analysis not configured (missing API key)
- `ai_quota_exceeded` - AI analysis quota exceeded

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

## AI Image Analysis

The system automatically analyzes uploaded images using Google Gemini AI to:

1. **Validate Image Content**: Check if the image shows a valid mangrove incident
2. **Quality Assessment**: Evaluate image clarity and relevance
3. **Issue Detection**: Identify problems like blurry images or irrelevant content
4. **Recommendations**: Suggest improvements for better images
5. **Confidence Scoring**: Provide confidence levels for AI decisions

### AI Analysis Response Format

```json
{
  "isValid": true/false,
  "confidence": 0-100,
  "notes": "Detailed explanation of what AI sees",
  "issues": "Any problems identified",
  "recommendations": "How to improve the image",
  "timestamp": "Analysis timestamp",
  "model": "gemini-2.0-flash"
}
```

## Upload System with AI Review & Rewards

### Upload Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `POST` | `/uploads` | Upload image for AI review | `{ title, description, imageUrl, category, lat, lng, tags? }` | Upload object |
| `GET` | `/uploads` | Get user's uploads | `?status=approved&category=mangrove_health&page=1&limit=10` | `[uploads...]` |
| `GET` | `/uploads/:id` | Get specific upload | - | Upload object |
| `GET` | `/uploads/:id/ai-analysis` | Get AI analysis results | - | AI analysis + rewards |
| `GET` | `/uploads/leaderboard` | Get upload leaderboard | `?timeframe=month&category=mangrove_destruction` | Leaderboard data |

### Admin Upload Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `GET` | `/uploads/admin/all` | Get all uploads for review | `?status=pending&category=mangrove_health` | `[uploads...]` |
| `PUT` | `/uploads/:id/review` | Approve/reject upload | `{ action: "approve"\|"reject", notes? }` | Review result |

### Upload Categories

- `mangrove_health` - Healthy mangrove ecosystems
- `mangrove_destruction` - Destruction, cutting, pollution
- `mangrove_conservation` - Conservation efforts, restoration
- `mangrove_research` - Research and monitoring
- `other` - Other mangrove-related content

### AI Analysis Results

- **Accuracy Score**: 0-100 (how well image represents category)
- **Confidence Score**: 0-100 (AI confidence in analysis)
- **Quality Assessment**: excellent/good/fair/poor
- **Mangrove Evidence**: Description of mangrove features
- **Points System**: 10-100 points based on accuracy and quality
- **Badges**: Automatic badge assignment based on performance

### Reward System

- **Base Points**: 10 points for any upload
- **Accuracy Bonus**: 0-50 points based on AI accuracy score
- **Quality Bonus**: 5-25 points based on image quality
- **Confidence Bonus**: 0-15 points based on AI confidence
- **Category Bonus**: 10-20 points for specific categories
- **Maximum Points**: 100 points per upload

### Badges

- `first_upload` - First successful upload
- `high_accuracy` - 50+ points earned
- `excellent_quality` - AI rated quality as excellent
- `mangrove_expert` - 90%+ accuracy achieved
- `conservation_hero` - High accuracy in conservation category

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
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Get your Gemini API key:
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

4. Start the server:
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
- **Google Gemini AI for image analysis**
