# 🎓 SGT Learning Management System - Comprehensive Codebase Index

## 📋 Project Overview
**Project Name:** SGT Learning Management System (SGT-LMS)
**Type:** Full-Stack Educational Platform
**Architecture:** Microservices with Real-time Features
**Last Updated:** October 6, 2025

---

## 🏗️ System Architecture

### **Technology Stack**
- **Frontend:** React.js 18.2.0 with Material-UI v5/v7
- **Backend:** Node.js with Express.js
- **Database:** MongoDB (Mongoose ODM) + PostgreSQL (Live Classes)
- **Real-time:** Socket.IO + Mediasoup (WebRTC)
- **Caching:** Redis
- **Containerization:** Docker + Docker Compose
- **Proxy:** Nginx with SSL/TLS
- **Security:** JWT Authentication, Helmet, CORS

### **Key Features**
- 🎥 Live Video Classes with WebRTC
- 🖊️ Interactive Whiteboard System
- 📊 Multi-role Dashboard (Student/Teacher/HOD/Dean/Admin)
- 📝 Quiz & Assessment System
- 📢 Announcement System
- 👥 Section & Course Management
- 🔐 Role-based Access Control
- 📈 Analytics & Progress Tracking
- 💬 Group Chat & Discussion Forums

---

## 📁 Directory Structure

```
deployment-sgtlms/
├── 📂 backend/                 # Node.js Express Backend
├── 📂 frontend/               # React.js Frontend
├── 📂 k8s/                   # Kubernetes Deployment
├── 📂 nginx/                 # Nginx Configuration
├── 📂 LEGACY_BACKUP/         # Legacy System Backups
├── 📂 Teacher and Student Dashboard/  # Dashboard Documentation
├── 🐳 docker-compose.yml     # Docker Orchestration
├── 🔧 package.json          # Root Dependencies
└── 📚 Documentation Files    # Various .md files
```

---

## 🔧 Backend Architecture (`/backend/`)

### **Core Configuration**
- `server.js` - Main HTTP server
- `server-https.js` - HTTPS server with SSL
- `server-production.js` - Production server
- `cluster.js` - Clustered server for scaling

### **Database Models** (`/models/`)
| Model | Purpose |
|-------|---------|
| `User.js` | User authentication & profile |
| `Course.js` | Course management |
| `Section.js` | Class sections |
| `Quiz.js` | Quiz system |
| `QuizPool.js` | Question banks |
| `Video.js` | Video content |
| `LiveClass.js` | Live session data |
| `Announcement.js` | Notifications |
| `Department.js` | Organizational structure |
| `Role.js` | Permission system |

### **API Controllers** (`/controllers/`)
| Controller | Functionality |
|------------|---------------|
| `authController.js` | Login/logout/JWT |
| `studentController.js` | Student operations |
| `teacherController.js` | Teacher management |
| `adminController.js` | Admin functions |
| `hodController.js` | HOD dashboard |
| `deanController.js` | Dean operations |
| `courseController.js` | Course CRUD |
| `quizController.js` | Quiz management |
| `liveClassController.js` | Live sessions |
| `videoController.js` | Video streaming |
| `announcementController.js` | Notifications |

### **API Routes** (`/routes/`)
- RESTful API endpoints organized by feature
- JWT-based authentication middleware
- Role-based authorization guards

### **Real-time Services** (`/socket/`)
- `liveClassSocket.js` - Live class WebRTC signaling
- `groupChatSocket.js` - Chat functionality
- `enhancedLiveClassSocket.js` - Advanced classroom features

### **Key Backend Features**
- 🔐 **Security:** JWT tokens, bcrypt password hashing, rate limiting
- 📊 **Analytics:** Quiz performance, video watch time tracking
- 🎥 **Live Classes:** Mediasoup SFU, WebRTC peer connections
- 📤 **File Upload:** Multer for PDF/video uploads
- 🔄 **Database:** MongoDB with Mongoose ODM
- ⚡ **Caching:** Redis for session management

---

## ⚛️ Frontend Architecture (`/frontend/`)

### **Core Structure** (`/src/`)
```
src/
├── components/          # Reusable React components
├── pages/              # Route-based page components
├── contexts/           # React Context providers
├── utils/              # Helper functions
├── api/                # API service layer
├── assets/             # Static assets
├── theme/              # Material-UI theming
└── routes/             # React Router configuration
```

### **Component Categories** (`/components/`)

#### **Role-based Components**
- `admin/` - Admin dashboard components
- `student/` - Student interface
- `teacher/` - Teacher tools
- `hod/` - HOD management
- `dean/` - Dean oversight
- `cc/` - Course Coordinator

#### **Feature Components**
- `whiteboard/` - Interactive whiteboard system
- `liveclass/` - Live classroom interface
- `common/` - Shared UI components

#### **Key Components**
| Component | Purpose |
|-----------|---------|
| `AdvancedWhiteboard.js` | Fabric.js-based whiteboard |
| `ScalableLiveClassroom.js` | WebRTC video conferencing |
| `RoleSwitcher.js` | Multi-role navigation |
| `AnnouncementBoard.js` | Notification display |
| `ProfileDialog.js` | User profile management |

### **Pages Structure** (`/pages/`)
- Dashboard pages for each user role
- Authentication pages (Login/Reset Password)
- Feature-specific pages (Announcements, etc.)

### **State Management**
- React Context for global state
- Local component state for UI
- API integration with Axios

---

## 🎨 Whiteboard System

### **Advanced Whiteboard** (`/components/whiteboard/`)
- **Technology:** Fabric.js Canvas Library
- **Features:**
  - Drawing tools (pen, shapes, text)
  - Real-time collaboration
  - Save/load whiteboard state
  - PDF export functionality
  - Undo/redo operations
  - Zoom and pan controls

### **Files:**
- `AdvancedWhiteboard.js` - Main whiteboard component
- `MinimalWhiteboard.js` - Simplified version
- `SimpleAdvancedWhiteboard.js` - Streamlined implementation

---

## 🎥 Live Classroom System

### **WebRTC Implementation**
- **SFU:** Mediasoup for scalable video routing
- **Signaling:** Socket.IO for peer coordination
- **Features:**
  - Multi-participant video calls
  - Screen sharing
  - Audio/video controls
  - Chat integration
  - Recording capabilities

### **Components:**
- `CodeTantraLiveClass.js` - Main live class interface
- `ModernLiveClassRoom.js` - Enhanced UI
- `ScalableLiveClassRoom.js` - Production-ready version
- `ScalableWebRTCManager.js` - WebRTC connection management

---

## 🔐 Authentication & Authorization

### **Multi-Role System**
| Role | Permissions |
|------|-------------|
| **SuperAdmin** | Full system access |
| **Admin** | Institution management |
| **Dean** | School-level oversight |
| **HOD** | Department management |
| **CC** | Course coordination |
| **Teacher** | Class management |
| **Student** | Learning access |

### **Security Features**
- JWT token-based authentication
- Role-based route protection
- Password encryption (bcrypt)
- Rate limiting
- CORS configuration
- Helmet security headers

---

## 📊 Database Schema

### **Core Entities**
- **Users:** Authentication and profile data
- **Courses:** Academic content structure
- **Sections:** Class organization
- **Videos:** Learning materials
- **Quizzes:** Assessment system
- **Live Classes:** Real-time sessions
- **Announcements:** Communication system

### **Relationships**
- Many-to-many: User ↔ Courses (via Sections)
- One-to-many: Course → Videos
- One-to-many: Course → Quizzes
- Hierarchical: School → Department → Courses

---

## 🚀 Deployment & DevOps

### **Docker Configuration**
- **Frontend:** Nginx-served React build
- **Backend:** Node.js application
- **Database:** MongoDB + PostgreSQL
- **Cache:** Redis cluster
- **Proxy:** Nginx load balancer

### **Production Features**
- HTTPS/SSL termination
- Load balancing
- Auto-scaling capabilities
- Health monitoring
- Log aggregation

### **Scripts & Automation**
- `start-production-backend.bat` - Production startup
- `restart-servers-https.bat` - Server restart
- `backup-legacy-files.ps1` - Data backup
- Various fix and debug scripts

---

## 🧪 Testing & Quality Assurance

### **Testing Files**
- Unit tests for controllers
- API endpoint testing
- Frontend component tests
- Integration testing scripts

### **Debug Tools**
- Extensive debug scripts for each feature
- API testing utilities
- Database verification tools
- Performance monitoring

---

## 📈 Analytics & Monitoring

### **Analytics Features**
- Student progress tracking
- Video watch time analytics
- Quiz performance metrics
- System usage statistics
- HOD/Dean dashboard analytics

### **Monitoring Stack**
- Prometheus metrics collection
- Grafana visualization
- Application performance monitoring
- Error tracking and alerting

---

## 🔧 Development Tools

### **Code Quality**
- ESLint configuration
- Prettier formatting
- Git hooks and workflows
- Automated testing pipelines

### **Development Scripts**
- Hot reload for development
- Build optimization
- Asset compression
- SSL certificate generation

---

## 📚 Documentation Files

### **Implementation Guides**
- `DEPLOYMENT_GUIDE.md` - Production setup
- `MULTI_ROLE_SYSTEM_GUIDE.md` - Role management
- `QUIZ_UNLOCK_SYSTEM_GUIDE.md` - Assessment system
- `LIVE_CLASS_IMPLEMENTATION_COMPLETE.md` - WebRTC setup

### **Fix Documentation**
- `FIXES_APPLIED.md` - Bug fix history
- `HOD_DASHBOARD_FIX_COMPLETE.md` - Dashboard issues
- `NAVIGATION_FIX_COMPLETE.md` - UI improvements
- Various feature-specific fix documents

### **Feature Documentation**
- `ADVANCED_WHITEBOARD_DOCUMENTATION.md` - Whiteboard features
- `SECURE_QUIZ_DOCUMENTATION.md` - Assessment security
- `WEBRTC_HTTPS_SOLUTION.md` - Video streaming setup

---

## 🌟 Recent Enhancements

### **Latest Features (2025)**
- Enhanced whiteboard with advanced tools
- Scalable live classroom system
- Multi-role announcement filtering
- Improved HOD analytics dashboard
- Deadline enforcement system
- HTTPS production deployment
- Redis-based session management

### **Performance Optimizations**
- Database query optimization
- Frontend bundle splitting
- Image and asset optimization
- Caching strategies
- WebRTC connection improvements

---

## 🚀 Future Roadmap

### **Planned Features**
- Mobile application development
- AI-powered content recommendations
- Advanced analytics dashboard
- Blockchain-based certification
- Enhanced accessibility features
- Microservices architecture migration

### **Technical Debt**
- Legacy code cleanup
- Database schema optimization
- API versioning implementation
- Comprehensive test coverage
- Security audit and hardening

---

## 🤝 Contributing

### **Development Workflow**
1. Feature branch development
2. Code review process
3. Automated testing
4. Staging deployment
5. Production release

### **Code Standards**
- ESLint/Prettier enforcement
- Component documentation
- API documentation
- Git commit conventions
- Security best practices

---

## 📞 Support & Maintenance

### **Monitoring**
- Real-time error tracking
- Performance monitoring
- User analytics
- System health checks
- Automated alerting

### **Backup Strategy**
- Regular database backups
- Code repository backups
- Configuration backups
- Disaster recovery procedures

---

*This index provides a comprehensive overview of the SGT-LMS codebase. For specific implementation details, refer to individual component documentation and inline code comments.*