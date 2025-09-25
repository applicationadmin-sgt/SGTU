# Comprehensive Endpoint Testing Script

## Course Details Enhancement & API Testing

### 1. Core Course Endpoints Testing

#### Test Authentication First
```powershell
# Test login to get token
$loginData = @{
    email = "admin@admin.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $loginResponse.token
Write-Host "Token: $token"
```

#### Test Course Endpoints
```powershell
# Test get all courses (admin)
$headers = @{ Authorization = "Bearer $token" }
$courses = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/courses" -Method GET -Headers $headers
Write-Host "Courses Count: $($courses.Count)"

# Test get course details  
$courseId = $courses[0]._id
$courseDetails = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/course/$courseId/details" -Method GET -Headers $headers
Write-Host "Course Details: $($courseDetails.title)"

# Test get course videos
$courseVideos = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/course/$courseId/videos" -Method GET -Headers $headers
Write-Host "Course Videos Count: $($courseVideos.Count)"

# Test get course students
$courseStudents = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/course/$courseId/students" -Method GET -Headers $headers
Write-Host "Course Students Count: $($courseStudents.Count)"
```

#### Test Direct Course API
```powershell
# Test direct course API (non-admin)
$directCourses = Invoke-RestMethod -Uri "http://localhost:5000/api/courses" -Method GET -Headers $headers
Write-Host "Direct API Courses Count: $($directCourses.Count)"

# Test get course by ID
$directCourse = Invoke-RestMethod -Uri "http://localhost:5000/api/courses/$courseId" -Method GET -Headers $headers
Write-Host "Direct Course Title: $($directCourse.title)"
```

### 2. Hierarchy and Dropdown Endpoints

#### Test School/Department/Section Endpoints
```powershell
# Test schools
$schools = Invoke-RestMethod -Uri "http://localhost:5000/api/schools" -Method GET -Headers $headers
Write-Host "Schools Count: $($schools.Count)"

# Test departments
$departments = Invoke-RestMethod -Uri "http://localhost:5000/api/departments" -Method GET -Headers $headers
Write-Host "Departments Count: $($departments.Count)"

# Test courses by department
$departmentId = $departments[0]._id
$deptCourses = Invoke-RestMethod -Uri "http://localhost:5000/api/hierarchy/courses-by-department/$departmentId" -Method GET -Headers $headers
Write-Host "Department Courses Count: $($deptCourses.Count)"

# Test sections
$sections = Invoke-RestMethod -Uri "http://localhost:5000/api/sections" -Method GET -Headers $headers
Write-Host "Sections Count: $($sections.Count)"
```

### 3. Teacher and Student Management

#### Test Teacher Endpoints
```powershell
# Test get all teachers
$teachers = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/teachers" -Method GET -Headers $headers
Write-Host "Teachers Count: $($teachers.Count)"

# Test teacher search
$teacherSearch = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/teachers/search?q=test" -Method GET -Headers $headers
Write-Host "Teacher Search Results: $($teacherSearch.Count)"
```

#### Test Student Endpoints
```powershell
# Test get all students
$students = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/students" -Method GET -Headers $headers
Write-Host "Students Count: $($students.Count)"
```

### 4. Course Creation Testing

#### Test Course Creation
```powershell
# Create new course
$newCourse = @{
    title = "Test Course Enhanced"
    description = "Testing enhanced course creation"
    school = $schools[0]._id
    department = $departments[0]._id
    credits = 3
    semester = "Fall 2025"
    academicYear = "2025-2026"
} | ConvertTo-Json

try {
    $createdCourse = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/course" -Method POST -Body $newCourse -ContentType "application/json" -Headers $headers
    Write-Host "Course Created: $($createdCourse.title)"
    
    # Test course update
    $updateData = @{
        description = "Updated description for enhanced testing"
    } | ConvertTo-Json
    
    $updatedCourse = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/course/$($createdCourse._id)" -Method PATCH -Body $updateData -ContentType "application/json" -Headers $headers
    Write-Host "Course Updated: $($updatedCourse.description)"
    
} catch {
    Write-Host "Course Creation Failed: $($_.Exception.Message)"
}
```

### 5. Analytics and Video Endpoints

#### Test Analytics
```powershell
# Test admin analytics
$analytics = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/analytics/overview" -Method GET -Headers $headers
Write-Host "Analytics Overview: $($analytics.totalStudents) students"

# Test video analytics if videos exist
if ($courseVideos.Count -gt 0) {
    $videoId = $courseVideos[0]._id
    $videoAnalytics = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/video/$videoId/analytics" -Method GET -Headers $headers
    Write-Host "Video Analytics: $($videoAnalytics.title)"
}
```

## Expected Results:
- All endpoints should return 200 status
- Data should be properly structured with populated relationships
- Authentication should be required for all protected endpoints
- CRUD operations should work properly
- Error handling should be consistent

## Common Issues to Check:
1. Token expiration handling
2. CORS configuration
3. Populated object relationships (school, department, etc.)
4. File upload endpoints for videos
5. Pagination for large datasets
6. Error response formats
7. Data validation on create/update operations