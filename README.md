# 🏛️ Jail Information System

A comprehensive web application for managing jail visitation records, PDL (Persons Deprived of Liberty) information, and visitor tracking with QR code functionality.

## 🚀 Features

- **PDL Management**: Add, edit, delete, and search PDL records
- **Visitor Management**: Track visitors with detailed information and relationships
- **QR Code System**: Generate and scan visitor ID cards
- **Import/Export**: Excel file support for bulk data operations
- **User Authentication**: Secure login with JWT tokens
- **Real-time Tracking**: Monitor visitor check-in/check-out times
- **Reporting**: Generate logs and reports for visitation records

## 🛠️ Technology Stack

### Frontend
- **React 19.1.0** - Modern UI framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **QR Code Libraries** - QR generation and scanning
- **Excel.js** - Import/export functionality

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **Git**

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd "Jail System"
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
```

#### Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment Setup
1. Copy the environment template:
```bash
cd backend
copy ..\env.example .env
```

2. Edit `backend/.env` and set your configuration:
```env
# JWT Configuration (REQUIRED)
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=jail_visitation
PORT=3001

# Environment
NODE_ENV=development
```

**⚠️ Important**: Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Database Setup
The SQLite database will be automatically created on first run in `backend/data/jail_visitation.sqlite`.

### 5. Start the Application

#### Option A: Use the Batch Script (Windows)
```bash
start_servers.bat
```

#### Option B: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

### 6. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 🔐 Default Login

**Username**: `admin`  
**Password**: `admin123`

*⚠️ Change these credentials immediately after first login!*

## 📁 Project Structure

```
Jail System/
├── backend/                 # Backend API server
│   ├── config/             # Database configuration
│   ├── controllers/        # API route handlers
│   ├── middleware/         # Authentication & error handling
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── scripts/           # Database setup scripts
│   └── data/              # SQLite database files
├── frontend/              # React frontend application
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   └── services/      # API service layer
│   └── package.json
├── .gitignore            # Git ignore rules
├── env.example           # Environment variables template
└── README.md            # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration
- `GET /auth/me` - Get current user profile
- `PUT /auth/username` - Update username
- `PUT /auth/password` - Change password

### PDL Management
- `GET /pdls` - Get all PDLs
- `POST /pdls` - Create new PDL
- `PUT /pdls/:id` - Update PDL
- `DELETE /pdls/:id` - Delete PDL
- `DELETE /pdls` - Delete all PDLs

### Visitor Management
- `GET /api/pdls/:id/visitors` - Get visitors for a PDL
- `POST /api/pdls/:id/visitors` - Add visitor to PDL
- `PUT /api/visitors/:id` - Update visitor
- `DELETE /api/visitors/:id` - Delete visitor

### Logs & Reports
- `GET /api/logs` - Get all logs
- `DELETE /api/logs/all` - Delete all logs
- `DELETE /api/logs/date-range` - Delete logs by date range

## 🚀 Deployment

### Development
```bash
# Start both servers
npm run dev
```

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd ../backend
npm start
```

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt with salt rounds
- **CORS Protection** - Configured for specific origins
- **Input Validation** - Server-side validation for all inputs
- **SQL Injection Protection** - Parameterized queries

## 📊 Database Schema

### Tables
- **users** - User accounts and authentication
- **pdls** - Persons Deprived of Liberty records
- **visitors** - Visitor information and relationships
- **scanned_visitors** - Visit logs and tracking
- **cells** - Jail cell information
- **denied_visitors** - Denied visit records

## 🐛 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process on port 3001
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```

2. **Database Connection Issues**
   - Ensure SQLite file permissions
   - Check database path in configuration

3. **JWT Token Errors**
   - Verify JWT_SECRET is set in .env
   - Restart backend server after changing JWT_SECRET

4. **Import/Export Issues**
   - Check file format (Excel .xlsx)
   - Verify column headers match template

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions, please create an issue in the repository.

---

**⚠️ Security Notice**: Always change default credentials and use strong JWT secrets in production!
