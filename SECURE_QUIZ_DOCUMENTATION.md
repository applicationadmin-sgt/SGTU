# Secure Quiz System Documentation

## Overview

This comprehensive secure quiz system provides a robust anti-cheating environment for online examinations with full-screen mode, tab switching prevention, and extensive security monitoring.

## Features

### 🔒 Security Features

1. **Automatic Fullscreen Mode**
   - Quiz automatically enters fullscreen when started
   - Prevents students from accessing other applications
   - Warns when fullscreen is exited
   - Forces return to fullscreen mode

2. **Tab Switch Detection & Prevention**
   - Maximum 3 tab switches allowed
   - Each tab switch allows 15 seconds to return
   - Automatic quiz submission after exceeding limits
   - Real-time monitoring and warnings

3. **Keyboard Shortcuts Blocking**
   - F12 (Developer Tools)
   - Ctrl+C, Ctrl+V (Copy/Paste)
   - Ctrl+U (View Source)
   - Ctrl+S (Save Page)
   - Ctrl+Shift+I (Developer Tools)
   - F5, Ctrl+R (Refresh)
   - And many more...

4. **Context Menu Disabling**
   - Right-click is completely disabled
   - Prevents access to browser context menus

### 📊 Quiz Interface Features

1. **Question Navigation Sidebar**
   - Shows all questions with status indicators
   - Three status types:
     - ✅ **Answered**: Questions with selected answers
     - ⚠️ **Marked for Review**: Flagged questions
     - ⭕ **Unanswered**: Questions without answers
   - Click navigation to any question
   - Progress summary at the top

2. **Timer with Auto-Submit**
   - Countdown timer displayed prominently
   - Warning when time is running low (< 5 minutes)
   - Automatic submission when time expires
   - Time tracking for analytics

3. **Mark for Review System**
   - Students can flag questions for later review
   - Visual indicators in sidebar and question view
   - Helps with time management and strategy

### 🛡️ Security Monitoring

1. **Violation Tracking**
   - All security violations are logged
   - Timestamps and detailed information
   - Progressive penalty system
   - Audit trail for review

2. **Automatic Penalties**
   - Score reduction based on violation severity
   - Progressive warnings before penalties
   - Automatic submission for serious violations

3. **Security Audit System**
   - Database logging of all violations
   - Risk assessment for students
   - Administrative review capabilities

## Implementation

### Frontend Components

#### 1. QuizLauncher (`/frontend/src/pages/student/QuizLauncher.js`)
- Entry point for quiz system
- Shows security briefing before quiz starts
- Loads quiz information for briefing display

#### 2. QuizSecurityBriefing (`/frontend/src/components/student/QuizSecurityBriefing.js`)
- Comprehensive security rules explanation
- Quiz information display
- Acceptance confirmation before starting

#### 3. SecureQuizPage (`/frontend/src/pages/student/SecureQuizPage.js`)
- Main quiz interface with security features
- Full-screen mode management
- Tab switching detection
- Question navigation and answering
- Security violation handling

### Backend Implementation

#### 1. Enhanced Quiz Submission (`/backend/controllers/unitQuizController.js`)
- Security data processing
- Violation logging
- Penalty calculation
- Audit record creation

#### 2. Security Audit Model (`/backend/models/QuizSecurityAudit.js`)
- Violation storage and categorization
- Risk assessment calculations
- Administrative review support

#### 3. Quiz Attempt Model Updates (`/backend/models/QuizAttempt.js`)
- Security data fields added
- Violation tracking
- Enhanced submission information

#### 4. Security Routes (`/backend/routes/quizSecurity.js`)
- Administrative violation review
- Risk assessment endpoints
- Security analytics

## Usage Instructions

### For Students

1. **Starting a Quiz**
   - Click on quiz from course materials
   - Read security briefing carefully
   - Click "I Understand - Start Quiz"
   - Quiz enters fullscreen automatically

2. **Taking the Quiz**
   - Use sidebar to navigate questions
   - Mark questions for review if needed
   - Stay in fullscreen mode
   - Avoid switching tabs/applications

3. **Question Navigation**
   - Click question numbers in sidebar
   - Use Previous/Next buttons
   - Check progress summary
   - Review marked questions before submitting

### For Teachers

1. **Quiz Creation**
   - Create quizzes through teacher dashboard
   - All quizzes automatically use secure mode
   - Set time limits and passing scores

2. **Monitoring Results**
   - View quiz results with security information
   - Check violation reports
   - Review penalty applications

### For Administrators

1. **Security Monitoring**
   - Access `/api/quiz/security/violations/overview`
   - Review student risk assessments
   - Monitor high-risk courses

2. **Violation Review**
   - Mark violations as resolved
   - Add notes for administrative records
   - Track patterns across courses

## API Endpoints

### Student Endpoints
- `GET /api/student/quiz/attempt/:attemptId` - Get quiz data
- `POST /api/student/quiz-attempt/:attemptId/submit` - Submit with security data

### Security Monitoring (Admin/Teacher)
- `GET /api/quiz/security/violations/overview` - Violation overview
- `GET /api/quiz/security/student/:studentId/risk` - Student risk assessment
- `GET /api/quiz/security/quiz-attempt/:attemptId` - Quiz security summary
- `PATCH /api/quiz/security/violations/:violationId/resolve` - Mark violation resolved

## Security Violation Types

| Type | Description | Severity | Penalty |
|------|-------------|----------|---------|
| TAB_SWITCH | Switching browser tabs | LOW-HIGH | Progressive |
| FULLSCREEN_EXIT | Exiting fullscreen mode | MEDIUM | Warning |
| KEYBOARD_SHORTCUT | Using blocked shortcuts | MEDIUM | Warning |
| DEVELOPER_TOOLS | Attempting to open dev tools | HIGH | 5-10% |
| COPY_PASTE_ATTEMPT | Trying to copy/paste | HIGH | 5-10% |
| CONTEXT_MENU | Right-click attempts | LOW | Warning |
| TIME_MANIPULATION | Suspicious timing | CRITICAL | 20% |

## Configuration

### Environment Variables
```env
# Add to your .env file
QUIZ_SECURITY_ENABLED=true
MAX_TAB_SWITCHES=3
TAB_SWITCH_TIMEOUT=15000
SECURITY_PENALTY_RATE=5
```

### Security Settings
- **Max Tab Switches**: 3 (configurable)
- **Tab Switch Timeout**: 15 seconds
- **Passing Score**: 70% (configurable per quiz)
- **Security Penalty**: Up to 20% score reduction

## Database Schema

### QuizAttempt Security Fields
```javascript
securityData: {
  violations: [{
    type: String,
    timestamp: Date,
    message: String,
    key: String,
    count: Number
  }],
  tabSwitchCount: Number,
  isAutoSubmit: Boolean,
  securityPenalty: Number,
  originalScore: Number,
  originalPercentage: Number
}
```

### QuizSecurityAudit Collection
```javascript
{
  student: ObjectId,
  course: ObjectId,
  quizAttempt: ObjectId,
  violationType: String,
  severity: String,
  description: String,
  penaltyApplied: Number,
  action: String,
  timestamp: Date
}
```

## Testing

### Manual Testing Checklist
- [ ] Quiz enters fullscreen on start
- [ ] Tab switching triggers warnings
- [ ] Keyboard shortcuts are blocked
- [ ] Right-click is disabled
- [ ] Timer counts down correctly
- [ ] Auto-submit works on time expiry
- [ ] Violations are logged correctly
- [ ] Penalties are calculated properly

### Security Testing
- [ ] Try opening developer tools (should be blocked)
- [ ] Attempt copy/paste operations
- [ ] Switch tabs multiple times
- [ ] Exit fullscreen mode
- [ ] Try keyboard shortcuts

## Troubleshooting

### Common Issues

1. **Fullscreen Not Working**
   - Check browser compatibility
   - Ensure HTTPS connection
   - Verify browser permissions

2. **Tab Detection Issues**
   - Check Page Visibility API support
   - Verify event listeners are attached
   - Test in different browsers

3. **Violations Not Logging**
   - Check database connection
   - Verify QuizSecurityAudit model
   - Check API endpoint responses

## Browser Compatibility

| Browser | Fullscreen | Tab Detection | Keyboard Blocking | Status |
|---------|------------|---------------|-------------------|---------|
| Chrome 90+ | ✅ | ✅ | ✅ | Full Support |
| Firefox 88+ | ✅ | ✅ | ✅ | Full Support |
| Safari 14+ | ✅ | ✅ | ⚠️ | Limited |
| Edge 90+ | ✅ | ✅ | ✅ | Full Support |

## Future Enhancements

1. **Camera Monitoring** - Face detection and proctoring
2. **Screen Sharing Detection** - Block screen sharing applications
3. **Mobile App Support** - Dedicated mobile quiz application
4. **AI-Powered Analysis** - Machine learning for suspicious behavior
5. **Advanced Biometrics** - Keystroke analysis and mouse patterns

## Support

For technical support or questions:
1. Check this documentation
2. Review API responses for error messages
3. Check browser console for security violations
4. Contact system administrator for violation reviews

## License

This secure quiz system is part of the SGT E-Learning Platform and follows the same licensing terms.
