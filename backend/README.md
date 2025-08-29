# Backend API with MongoDB Atlas

A robust Node.js backend with Express.js, MongoDB Atlas, JWT authentication, and comprehensive validation.

## Features

- 🔐 **JWT Authentication** - Secure login/signup with token-based authentication
- 🗄️ **MongoDB Atlas Integration** - Cloud-hosted MongoDB database
- ✅ **Input Validation** - Comprehensive validation using express-validator
- 🛡️ **Security Middleware** - Helmet, CORS, Rate Limiting
- 🔒 **Password Hashing** - Secure password storage using bcryptjs
- 📝 **Error Handling** - Centralized error handling with proper HTTP status codes
- 🚀 **RESTful API** - Clean and organized API endpoints

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Access |
|--------|----------|-------------|---------|
| POST | `/api/auth/register` | User registration | Public |
| POST | `/api/auth/login` | User login | Public |
| GET | `/api/auth/me` | Get current user | Private |
| PUT | `/api/auth/updatedetails` | Update user details | Private |
| PUT | `/api/auth/updatepassword` | Update password | Private |
| POST | `/api/auth/logout` | User logout | Private |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

## Request Examples

### User Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### User Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

### Update User Details (Protected Route)
```bash
PUT /api/auth/updatedetails
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

## Validation Rules

### Registration
- **Name**: 2-50 characters, letters and spaces only
- **Email**: Valid email format, unique in database
- **Password**: Minimum 6 characters, must contain uppercase, lowercase, and number

### Login
- **Email**: Valid email format
- **Password**: Required

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 (or the port specified in your environment variables).

## Security Features

- **JWT Tokens**: Secure authentication tokens
- **Password Hashing**: Bcrypt password encryption
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Cross-origin resource sharing protection
- **Helmet**: Security headers middleware
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error messages (no sensitive data exposure)

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
=
