# 📚 SGT Online Learning Platform - Codebase Index

## 🏗️ Project Overview

**SGT Online Learning Platform** is a comprehensive educational management system built with Node.js/Express backend and React frontend. It serves as a complete e-learning solution for educational institutions with role-based access control, secure quiz systems, video streaming, and analytics.

---

## 🎯 System Architecture

### **Technology Stack**
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Frontend**: React 18, Material-UI (MUI), React Router DOM
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: MongoDB Atlas
- **File Handling**: Multer, CSV parsing
- **Security**: Helmet, CORS, bcryptjs, rate limiting

### **Deployment Structure**
```
SGT-ONLINE-LEARNING/
├── backend/          # Node.js/Express API server
├── frontend/         # React application
├── *.md             # Documentation files
└── package.json     # Root dependencies
```

---

## 🔧 Backend Architecture (`/backend`)

### **Core Server Configuration**
- **Entry Point**: `server.js` (206 lines)
- **Database**: MongoDB Atlas connection
- **Security**: Helmet, CORS, compression, rate limiting
- **File Uploads**: Static file serving from `/public` and `/uploads`

### **🗄️ Database Models** (`/models`)
```
User.js                 # User accounts & authentication
Course.js              # Course information
Section.js             # Course sections
Unit.js                # Course units/chapters
Video.js               # Video content
Quiz.js                # Quiz definitions
QuizPool.js            # Quiz question pools
QuizAttempt.js         # Student quiz attempts
QuizLock.js            # Quiz unlock system
StudentProgress.js     # Learning progress tracking
Announcement.js        # System announcements
Department.js          # Academic departments
School.js              # School/college info
Role.js                # User roles & permissions
Setting.js             # System settings
Discussion.js          # Forum discussions
Notification.js        # Push notifications
TeacherRequest.js      # Teacher approval requests
```

### **🎮 Controllers** (`/controllers`)
```
authController.js           # Authentication & login
adminController.js          # Admin dashboard operations
studentController.js        # Student-specific features
teacherController.js        # Teacher management
hodController.js            # HOD (Head of Dept) functions
deanController.js           # Dean administration
ccController.js             # Course Coordinator
courseController.js         # Course management
quizController.js           # Quiz operations
quizPoolController.js       # Quiz pool management
secureQuizController.js     # Anti-cheating quiz system
videoController.js          # Video streaming & tracking
sectionController.js        # Section management
unitController.js           # Unit/chapter management
announcementController.js   # Announcements system
analyticsController.js      # Data analytics
```

### **🛣️ API Routes** (`/routes`)
```
auth.js                # Authentication endpoints
admin.js               # Admin panel APIs
student.js             # Student dashboard APIs
teacher.js             # Teacher functionality
hod.js                 # HOD management
dean.js                # Dean administration
cc.js                  # Course coordinator
course.js              # Course operations
quiz.js                # Quiz system
quizPool.js            # Quiz pool management
secureQuiz.js          # Secure quiz features
quizUnlock.js          # Quiz unlock system
section.js             # Section management
unit.js                # Unit operations
announcement.js        # Announcements
notification.js        # Push notifications
```

### **🔧 Utilities & Configuration**
```
config/rbac.js         # Role-Based Access Control
middleware/            # Custom middleware functions
utils/                 # Helper utilities
.env                   # Environment variables
```

### **🧪 Testing & Debugging** (100+ files)
```
test-*.js              # API endpoint tests
check-*.js             # Data integrity checks
debug-*.js             # Debugging utilities
fix-*.js               # Data migration scripts
verify-*.js            # Verification scripts
```

---

## 🎨 Frontend Architecture (`/frontend`)

### **Application Structure**
- **Entry Point**: `src/index.js` → `App.js`
- **Theme**: Material-UI theme configuration
- **Routing**: React Router DOM with protected routes
- **State Management**: React hooks & context

### **📱 Pages** (`/src/pages`)
```
LoginPage.js              # User authentication
AdminDashboard.js         # Admin control panel
StudentDashboard.js       # Student portal
TeacherDashboard.js       # Teacher interface
HODDashboard.js           # HOD management
DeanDashboard.js          # Dean administration
CCDashboard.js            # Course coordinator
ForgotPasswordPage.js     # Password recovery
ResetPasswordPage.js      # Password reset
UnauthorizedPage.js       # Access denied
```

### **🧩 Components** (`/src/components`)
```
admin/                    # Admin-specific components
student/                  # Student portal components
teacher/                  # Teacher interface components
hod/                      # HOD management components
dean/                     # Dean administration components
PrivateRoute.js           # Protected route wrapper
Sidebar.js                # Navigation sidebar
AnnouncementBoard.js      # Announcement display
TeacherProfile.js         # Teacher profile management
```

### **🔌 API Integration** (`/src/api`)
- Axios-based API client
- Authentication interceptors
- Error handling

### **🛡️ Security Utils** (`/src/utils`)
```
authService.js            # Authentication utilities
securityUtils.js          # Security functions (current file)
```

---

## 🎓 Key Features & Systems

### **1. 👥 User Role Management**
```
Roles: Admin, Dean, HOD, Course Coordinator, Teacher, Student
- Hierarchical permission system
- Role-based dashboard access
- Dynamic menu generation
```

### **2. 📚 Course Management**
```
- Course creation & editing
- Section-based organization
- Video content management
- Unit/chapter structure
- Student enrollment
- Progress tracking
```

### **3. 🎯 Quiz System**
```
- Multiple choice questions
- Quiz pools for randomization
- Anti-cheating mechanisms:
  * Fullscreen enforcement
  * Tab switch detection
  * Keyboard shortcut blocking
  * Time tracking
- Automated grading
- Unlock system (Teacher → Dean escalation)
```

### **4. 📹 Video Learning**
```
- Video streaming
- Watch time tracking
- Playback rate monitoring
- Progress saving
- Duration verification
```

### **5. 📊 Analytics & Reporting**
```
- Student progress analytics
- Quiz performance metrics
- Video engagement statistics
- HOD dashboard analytics
- Course completion rates
```

### **6. 📢 Communication System**
```
- Hierarchical announcements
- Notification system
- Discussion forums
- Teacher-student messaging
```

### **7. 🔒 Security Features**
```
- JWT authentication
- Role-based access control
- Secure quiz environment
- Session management
- Input validation & sanitization
```

---

## 📋 Database Schema Overview

### **Core Entities**
1. **Users** → **Roles** (Many-to-Many)
2. **Schools** → **Departments** → **Courses** (Hierarchy)
3. **Courses** → **Sections** → **Students** (Enrollment)
4. **Courses** → **Units** → **Videos/Quizzes** (Content)
5. **QuizPools** → **Quizzes** → **QuizAttempts** (Assessment)

### **Tracking & Analytics**
- StudentProgress (video watching, quiz scores)
- QuizLocks (unlock authorization system)
- Announcements (hierarchical messaging)
- Notifications (push notifications)

---

## 🔧 Configuration & Setup

### **Environment Variables** (`.env`)
```
MONGODB_URI          # MongoDB Atlas connection
JWT_SECRET           # Authentication secret
ADMIN_EMAIL/PASSWORD # Default admin credentials
EMAIL_USER/PASS      # SMTP configuration
```

### **Scripts & Automation**
```
fix-quiz.bat         # Quiz system repair script
Multiple .js files   # Data migration & fixes
```

---

## 📈 Development & Maintenance

### **Testing Strategy**
- API endpoint testing (100+ test files)
- Data integrity verification
- Performance monitoring
- Security auditing

### **Documentation**
```
COURSE_DETAILS_ENHANCEMENT_REPORT.md
QUIZ_UNLOCK_SYSTEM_GUIDE.md
SECURE_QUIZ_DOCUMENTATION.md
SECTION_MANAGEMENT_ENHANCEMENT.md
HOD_ANALYTICS_REAL_DATA_COMPLETE.md
FRONTEND_IMPLEMENTATION_SUMMARY.md
```

### **Key Maintenance Scripts**
- Student data integrity fixes
- Quiz pool link repairs
- Video duration corrections
- Database cleanup utilities

---

## 🚀 Deployment Information

### **Backend Deployment**
- Node.js server on port 5000
- MongoDB Atlas cloud database
- Static file serving
- Environment-based configuration

### **Frontend Deployment**
- React build process
- Material-UI components
- Responsive design
- Progressive Web App features

---

## 📞 System Integration Points

### **External Services**
- MongoDB Atlas (Database)
- Email service (Nodemailer)
- File upload handling
- JWT token management

### **API Endpoints** (50+ routes)
- REST API architecture
- JSON request/response
- Authentication middleware
- Error handling & validation

---

## 🎯 Current Development Status

The system appears to be in **active development/maintenance** with:
- Extensive testing infrastructure
- Regular bug fixes and enhancements
- Comprehensive documentation
- Robust security implementations
- Scalable architecture design

**Primary Focus Areas:**
1. Quiz system security & unlock mechanisms
2. Analytics & reporting enhancements
3. User role management improvements
4. Video learning optimizations
5. Data integrity maintenance