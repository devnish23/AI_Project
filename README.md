# Infra Tracker - Infrastructure Management System

A comprehensive MERN stack application for tracking and managing infrastructure applications, vendor data, and security vulnerabilities.

## Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [UI/UX Design System](#-uiux-design-system)
- [Security Features](#-security-features)
- [Performance Optimizations](#-performance-optimizations)
- [Testing](#-testing)
- [Monitoring & Logging](#-monitoring--logging)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)
- [Documentation](#documentation)

## Documentation
- [Architecture](docs/Architecture.md)
- [Frontend](docs/Frontend.md)
- [Backend](docs/Backend.md)
- [API Reference](docs/API.md)
- [Data Model](docs/DataModel.md)
- [Scripts](docs/Scripts.md)
- [Deployment](docs/Deployment.md)
- [Troubleshooting](docs/Troubleshooting.md)

## 🚀 Features

### Core Functionality
- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Application Management**: CRUD operations for infrastructure applications
- **Vendor Data Integration**: Automated fetching of vendor portal data with retry mechanisms
- **File Upload**: Support for Excel and CSV file uploads with validation
- **Reporting**: Generate Excel and PowerPoint reports with customizable templates
- **Security Tracking**: Monitor CVEs, EOL dates, and security risk scores

### UI/UX Features
- **Modern Design**: Clean, minimalist interface with dark/light theme support
- **Responsive Layout**: Mobile-first design with responsive components
- **Real-time Updates**: Live data updates with optimistic UI
- **Interactive Charts**: Data visualization with Recharts
- **Drag & Drop**: File upload with drag-and-drop support

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)
```
server/
├── models/           # MongoDB schemas
├── routes/           # API endpoints
├── middleware/       # Authentication & validation
├── services/         # Business logic
└── index.js         # Server entry point
```

### Frontend (React + TypeScript + Redux)
```
client/src/
├── components/       # Reusable UI components
├── pages/           # Page components
├── contexts/        # React contexts
├── store/           # Redux store & slices
└── styles/          # Global styles
```

### Main Components

#### Frontend Pages
- Applications: Applications.tsx, ApplicationDetail.tsx, BulkUploadTab.tsx
- VendorPortals: VendorPortals.tsx
- Settings: Settings.tsx
- Reports: Reports.tsx
- Upload: Upload.tsx
- Auth: Login.tsx, Register.tsx
- Dashboard: Dashboard.tsx
- PatchMgmt: PatchMgmt.tsx
- Schedule: ScheduleTab.tsx

#### Layout Components
- Header.tsx, Sidebar.tsx, Layout.tsx

#### Contexts
- AuthContext.tsx, ThemeContext.tsx

#### State Management
- applicationsSlice.ts, uiSlice.ts

#### API Service
- api.ts

#### Backend Routes
- applications.js, auth.js, bulkUpload.js, dashboard.js, patches.js, reports.js, schedule.js, upload.js, vendorPortals.js

#### Models
- Application.js, Schedule.js, User.js, VendorPortal.js

#### Middleware
- auth.js

#### Services
- vendorService.js

#### Scheduler
- scheduler.js

#### Scripts
- fetchRedHatData.js, scrapeRedHatAdvisories.js, scrapeRedHatRHEL.js

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Multer** - File uploads
- **XLSX** - Excel processing
- **Axios** - HTTP client

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Query** - Data fetching
- **React Hook Form** - Form handling

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd infra-tracker
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Create .env file in root directory
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/infra-tracker
   JWT_SECRET=your-secret-key-here
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the application**
   ```bash
   # Development mode (both frontend and backend)
   npm run dev
   
   # Or start separately:
   # Backend only
   npm run server
   
   # Frontend only
   cd client && npm start
   ```

## 🗄️ Database Schema

### User Model
- Authentication details
- Role-based permissions
- User preferences

### Application Model
- Application metadata
- Vendor information
- Security data (CVEs, EOL dates)
- Patch history

### Vendor Portal Model
- Portal configurations
- API endpoints
- Authentication settings
- Rate limiting

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application
- `POST /api/applications/:id/fetch-vendor-data` - Fetch vendor data

### File Upload
- `POST /api/upload/applications` - Upload applications file
- `GET /api/upload/template` - Download template
- `POST /api/upload/validate` - Validate file before upload

### Reports
- `POST /api/reports/excel` - Generate Excel report
- `POST /api/reports/powerpoint` - Generate PowerPoint report
- `GET /api/reports/templates` - Get report templates

## 🎨 UI/UX Design System

### Color Palette
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Neutral**: Gray scale

### Typography
- **Font**: Inter
- **Weights**: 400, 500, 600, 700
- **Sizes**: 12px, 14px, 16px, 18px, 20px, 24px, 32px

### Components
- Cards with subtle shadows
- Rounded corners (8px)
- Smooth transitions (200ms)
- Responsive grid layouts

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet security headers

## 📊 Performance Optimizations

- Database indexing for efficient queries
- Pagination for large datasets
- Lazy loading of components
- Image optimization
- Code splitting
- Caching strategies

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test
```

## 📈 Monitoring & Logging

- Request logging with Morgan
- Error tracking
- Performance monitoring
- Health check endpoints

## 🚀 Deployment

### Backend Deployment
1. Set environment variables
2. Build the application
3. Deploy to your preferred platform (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy the `build` folder to your hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please open an issue in the repository.

---

**Built with ❤️ using the MERN stack** 