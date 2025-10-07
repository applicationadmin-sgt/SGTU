import { useState } from 'react';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { GraduationCap, Users } from 'lucide-react';

type Role = 'teacher' | 'student' | null;

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [userName, setUserName] = useState('');

  if (role === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <GraduationCap className="h-6 w-6 text-blue-600" />
              CodeTantra Live Class
            </CardTitle>
            <CardDescription>
              Join as a teacher or student to start your live learning experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => userName && setRole('teacher')}
                  disabled={!userName}
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <GraduationCap className="h-6 w-6" />
                  Teacher
                </Button>
                
                <Button
                  onClick={() => userName && setRole('student')}
                  disabled={!userName}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 border-blue-200 hover:bg-blue-50"
                >
                  <Users className="h-6 w-6" />
                  Student
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {role === 'teacher' ? (
        <TeacherDashboard userName={userName} onLogout={() => setRole(null)} />
      ) : (
        <StudentDashboard userName={userName} onLogout={() => setRole(null)} />
      )}
    </div>
  );
}