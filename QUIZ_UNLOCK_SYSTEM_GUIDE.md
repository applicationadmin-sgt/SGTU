# Quiz Unlock System - Implementation Guide

## 🚀 System Overview

The Quiz Unlock System implements a graduated authorization process for students who fail quizzes:

1. **Student fails quiz** (score below passing threshold) → Quiz automatically locks
2. **Teacher can unlock** up to 3 times per student per quiz
3. **After 3 teacher unlocks** → Dean authorization required for further unlocks

## 📚 Components Implemented

### Backend Components

#### 1. Database Schema (`models/QuizLock.js`)
- Tracks quiz locks, unlock counts, and authorization levels
- Maintains complete unlock history with timestamps and reasons
- Supports both teacher and dean unlock tracking

#### 2. API Routes (`routes/quizUnlock.js`)
- `GET /api/quiz-unlock/locked-students` - Teacher dashboard data
- `GET /api/quiz-unlock/dean-locked-students` - Dean dashboard data
- `POST /api/quiz-unlock/teacher-unlock/:lockId` - Teacher unlock action
- `POST /api/quiz-unlock/dean-unlock/:lockId` - Dean unlock action
- `GET /api/quiz-unlock/lock-status/:studentId/:quizId` - Check lock status
- `POST /api/quiz-unlock/check-and-lock` - Auto-lock failed quizzes

### Frontend Components

#### 1. Teacher Dashboard (`components/teacher/QuizUnlockDashboard.js`)
- View all locked students in teacher's courses
- Unlock students (max 3 times per quiz)
- View unlock history and remaining unlock count
- User-friendly unlock reason form

#### 2. Dean Dashboard (`components/dean/DeanQuizUnlockDashboard.js`)
- View students requiring dean authorization
- Unlimited unlock capability after teacher limit exceeded
- Complete unlock history with teacher attempts
- Dean authorization workflow

#### 3. Student Lock Status (`components/student/QuizLockStatus.js`)
- Shows students when their quiz is locked
- Displays unlock authorization level (teacher/dean)
- Provides help and contact information
- Real-time status updates

#### 4. Integrated Quiz Failure Detection
- Automatic lock checking in `SecureQuizPage.js`
- Seamless redirect to appropriate dashboards
- Clear messaging about unlock requirements

## 🔧 How to Use

### For Teachers

1. **Access the Quiz Unlock Dashboard:**
   ```javascript
   // Add to teacher routes
   import QuizUnlockDashboard from '../components/teacher/QuizUnlockDashboard';
   
   // In teacher dashboard/menu
   <Route path="/teacher/quiz-unlocks" component={QuizUnlockDashboard} />
   ```

2. **View Locked Students:**
   - Dashboard shows students who failed quizzes in your courses
   - Shows remaining unlock attempts (max 3 per student per quiz)
   - Clear indicators when dean authorization is required

3. **Unlock a Student:**
   - Click "Unlock" button on student card
   - Provide reason for unlock (required)
   - Add optional notes for context
   - System tracks all unlock attempts

### For Deans

1. **Access the Dean Dashboard:**
   ```javascript
   // Add to dean routes
   import DeanQuizUnlockDashboard from '../components/dean/DeanQuizUnlockDashboard';
   
   // In dean dashboard/menu
   <Route path="/dean/quiz-unlocks" component={DeanQuizUnlockDashboard} />
   ```

2. **View Escalated Cases:**
   - Shows students who exhausted teacher unlock limit
   - Complete history of teacher unlock attempts
   - Unlimited dean unlock authority

3. **Authorize Unlocks:**
   - Review teacher unlock history
   - Provide dean authorization reason
   - Add administrative notes

### For Students

1. **Quiz Lock Notification:**
   - Automatic detection when quiz is submitted with failing score
   - Clear messaging about lock reason and authorization level
   - Contact information for unlock requests

2. **Check Lock Status:**
   ```javascript
   // Add to student quiz page
   import QuizLockStatus from '../components/student/QuizLockStatus';
   
   // In quiz component
   {isQuizLocked && (
     <QuizLockStatus 
       quizId={quizId} 
       studentId={studentId}
       onUnlockUpdate={handleUnlockUpdate}
     />
   )}
   ```

## 🔄 Integration Steps

### 1. Database Setup
```javascript
// The QuizLock model is already created
// No additional database setup required
// Indexes are automatically created for performance
```

### 2. Backend Routes
```javascript
// Already added to server.js:
app.use('/api/quiz-unlock', quizUnlockRoutes);
```

### 3. Frontend Integration

#### Teacher Dashboard Menu Item:
```javascript
// Add to teacher navigation
{
  label: 'Quiz Unlocks',
  path: '/teacher/quiz-unlocks',
  icon: <LockOpen />,
  component: QuizUnlockDashboard
}
```

#### Dean Dashboard Menu Item:
```javascript
// Add to dean navigation
{
  label: 'Quiz Unlocks',
  path: '/dean/quiz-unlocks', 
  icon: <AdminPanelSettings />,
  component: DeanQuizUnlockDashboard
}
```

#### Student Quiz Integration:
```javascript
// In SecureQuizPage.js (already implemented)
// Automatic lock checking after quiz submission
// Redirect to dashboard with lock notification
```

## 📊 System Behavior

### Quiz Failure Flow
1. Student submits quiz with score < passing threshold
2. System calls `/api/quiz-unlock/check-and-lock`
3. Quiz lock record created/updated
4. Student sees lock notification and redirect

### Teacher Unlock Flow
1. Teacher accesses unlock dashboard
2. Views locked students in their courses
3. Clicks unlock → provides reason → confirms
4. Student can immediately retake quiz
5. Unlock count incremented (max 3)

### Dean Escalation Flow
1. After 3 teacher unlocks → authorization level changes to DEAN
2. Dean dashboard shows escalated cases
3. Dean reviews teacher unlock history
4. Dean provides authorization → unlimited unlocks

### Student Experience
1. Quiz automatically locks on failure
2. Clear messaging about authorization level
3. Contact information for unlock requests
4. Real-time status checking capability

## 🛡️ Security Features

- **Audit Trail:** Complete history of all unlock attempts
- **Authorization Levels:** Graduated escalation from teacher to dean
- **Reason Requirements:** All unlocks must include justification
- **Usage Limits:** Teachers limited to 3 unlocks per student per quiz
- **Access Control:** Teachers can only unlock students in their courses

## 📈 Monitoring and Analytics

The system provides comprehensive tracking:
- Total quiz attempts per student
- Unlock patterns and reasons
- Authorization escalation rates
- Teacher vs dean unlock ratios

## 🚨 Error Handling

- Graceful fallbacks for API failures
- Clear error messages for users
- Logging for system administrators
- Retry mechanisms for network issues

## 🔮 Future Enhancements

Potential additions:
- Email notifications for unlock requests
- Bulk unlock operations for teachers
- Appeal process workflow
- Integration with LMS grade books
- Analytics dashboard for administrators

---

The system is now fully implemented and ready for production use. All components work together to provide a seamless quiz unlock experience with proper authorization controls.