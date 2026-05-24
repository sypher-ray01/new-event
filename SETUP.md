# EventHub Setup Guide

This repo now contains a real backend in `backend/` and a shared frontend client in `js/api.js`.
Use this document as the source of truth instead of the older placeholder notes further below.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
# For local MongoDB:
MONGODB_URI=mongodb://localhost:27017/eventhub

# For MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/eventhub

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_characters
JWT_EXPIRE=30d
```

**Important:** 
- Replace `JWT_SECRET` with a secure random string (at least 32 characters)
- For MongoDB Atlas, replace `username`, `password`, and `cluster` with your actual credentials

### 3. Start MongoDB

#### Local MongoDB:
```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Start MongoDB service from Services panel
```

#### MongoDB Atlas (Cloud):
- No local setup needed, just use your connection string

### 4. Start the Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## Frontend Setup

The frontend is already configured to connect to the backend API at `http://localhost:5000/api`.

### API Configuration

The API base URL is set in `/js/api.js`:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

If you need to change the backend URL, update this file.

## Testing the Setup

### 1. Check Backend Health

Visit: `http://localhost:5000/api/health`

You should see:
```json
{
  "status": "OK",
  "message": "EventHub API is running",
  "timestamp": "..."
}
```

### 2. Register a New User

Use the registration page or make a POST request to:
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 3. Login

Use the login page at `/login.html` or make a POST request to:
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

## Project Structure

```
event/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js  # Authentication logic
│   │   └── eventController.js # Event CRUD operations
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Event.js           # Event schema
│   ├── routes/
│   │   ├── authRoutes.js      # Auth endpoints
│   │   ├── eventRoutes.js     # Event endpoints
│   │   └── userRoutes.js      # User endpoints
│   ├── server.js              # Express server
│   ├── package.json
│   └── .env                   # Environment variables (create this)
├── js/
│   └── api.js                 # Frontend API utility
├── login.html                 # Login page
└── ... (other frontend files)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)
- `PUT /api/auth/updatedetails` - Update user details (Protected)
- `PUT /api/auth/updatepassword` - Update password (Protected)

### Events
- `GET /api/events` - Get all events (with query params)
- `GET /api/events/:id` - Get single event
- `POST /api/events` - Create event (Protected)
- `PUT /api/events/:id` - Update event (Protected)
- `DELETE /api/events/:id` - Delete event (Protected)
- `POST /api/events/:id/register` - Register for event (Protected)
- `GET /api/events/my/events` - Get user's events (Protected)
- `GET /api/events/my/registrations` - Get user's registrations (Protected)

### Users
- `GET /api/users` - Get all users (Protected)
- `GET /api/users/:id` - Get single user (Protected)

## Troubleshooting

### MongoDB Connection Issues

1. **Local MongoDB not running:**
   - Start MongoDB service
   - Check if MongoDB is running: `mongosh` or `mongo`

2. **Connection string incorrect:**
   - Verify your `MONGODB_URI` in `.env`
   - For Atlas, ensure your IP is whitelisted

3. **Authentication failed:**
   - Check MongoDB username/password in connection string
   - Verify database permissions

### Backend Server Issues

1. **Port already in use:**
   - Change `PORT` in `.env` file
   - Or kill the process using port 5000

2. **Module not found:**
   - Run `npm install` in the backend directory
   - Check `package.json` for all dependencies

### Frontend API Issues

1. **CORS errors:**
   - Backend has CORS enabled, but check if server is running
   - Verify API URL in `js/api.js`

2. **401 Unauthorized:**
   - Check if token is being sent in headers
   - Verify token is valid and not expired
   - Re-login to get a new token

## Next Steps

1. Create a registration page (`register.html`)
2. Update other frontend pages to use the API
3. Add more features as needed
4. Deploy to production (update API URLs)

## Support

For issues or questions, check:
- Backend logs in terminal
- Browser console for frontend errors
- MongoDB logs for database issues

