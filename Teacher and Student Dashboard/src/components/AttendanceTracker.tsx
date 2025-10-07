import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Input } from './ui/input';
import { 
  Users, 
  Clock, 
  Download, 
  Search, 
  CheckCircle, 
  XCircle,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  joinTime: Date;
  leaveTime?: Date;
  duration: number; // in minutes
  status: 'present' | 'absent' | 'late';
  participationScore: number;
}

const mockAttendance: AttendanceRecord[] = [
  {
    studentId: '1',
    studentName: 'Alice Johnson',
    joinTime: new Date(Date.now() - 900000), // 15 mins ago
    duration: 15,
    status: 'present',
    participationScore: 85
  },
  {
    studentId: '2',
    studentName: 'Bob Smith',
    joinTime: new Date(Date.now() - 850000), // 14 mins ago
    duration: 14,
    status: 'present',
    participationScore: 92
  },
  {
    studentId: '3',
    studentName: 'Charlie Brown',
    joinTime: new Date(Date.now() - 600000), // 10 mins ago
    duration: 10,
    status: 'late',
    participationScore: 76
  },
  {
    studentId: '4',
    studentName: 'Diana Prince',
    joinTime: new Date(Date.now() - 750000), // 12.5 mins ago
    duration: 12,
    status: 'present',
    participationScore: 88
  },
  {
    studentId: '5',
    studentName: 'Edward Norton',
    joinTime: new Date(),
    duration: 0,
    status: 'absent',
    participationScore: 0
  },
  {
    studentId: '6',
    studentName: 'Fiona Green',
    joinTime: new Date(Date.now() - 500000), // 8 mins ago
    duration: 8,
    status: 'late',
    participationScore: 71
  }
];

export function AttendanceTracker() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const filteredAttendance = attendance.filter(record =>
    record.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentStudents = attendance.filter(record => record.status === 'present').length;
  const lateStudents = attendance.filter(record => record.status === 'late').length;
  const absentStudents = attendance.filter(record => record.status === 'absent').length;
  const totalStudents = attendance.length;

  const averageParticipation = attendance
    .filter(record => record.status !== 'absent')
    .reduce((sum, record) => sum + record.participationScore, 0) / 
    attendance.filter(record => record.status !== 'absent').length || 0;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-3 w-3" />;
      case 'late': return <Clock className="h-3 w-3" />;
      case 'absent': return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(attendance.map(record =>
      record.studentId === studentId
        ? { ...record, status }
        : record
    ));
  };

  const exportAttendance = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Student Name,Join Time,Duration,Status,Participation Score\n"
      + attendance.map(record => 
          `${record.studentName},${formatTime(record.joinTime)},${formatDuration(record.duration)},${record.status},${record.participationScore}%`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Present</p>
                <p className="font-semibold">{presentStudents}/{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Engagement</p>
                <p className="font-semibold">{averageParticipation.toFixed(0)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={exportAttendance} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Attendance List */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {filteredAttendance.map((record) => (
          <Card 
            key={record.studentId}
            className={`cursor-pointer transition-colors ${
              selectedStudent === record.studentId ? 'bg-blue-50 border-blue-200' : 'hover:bg-muted/50'
            }`}
            onClick={() => setSelectedStudent(
              selectedStudent === record.studentId ? null : record.studentId
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {record.studentName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{record.studentName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Joined: {formatTime(record.joinTime)}</span>
                    <span>•</span>
                    <span>Duration: {formatDuration(record.duration)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStatusColor(record.status)}`}>
                    {getStatusIcon(record.status)}
                    <span className="ml-1 capitalize">{record.status}</span>
                  </Badge>
                  
                  {record.status !== 'absent' && (
                    <div className="text-xs text-muted-foreground">
                      {record.participationScore}%
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed controls when selected */}
              {selectedStudent === record.studentId && (
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <Button
                    size="sm"
                    variant={record.status === 'present' ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAttendance(record.studentId, 'present');
                    }}
                  >
                    Present
                  </Button>
                  <Button
                    size="sm"
                    variant={record.status === 'late' ? 'default' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAttendance(record.studentId, 'late');
                    }}
                  >
                    Late
                  </Button>
                  <Button
                    size="sm"
                    variant={record.status === 'absent' ? 'destructive' : 'outline'}
                    onClick={(e) => {
                      e.stopPropagation();
                      markAttendance(record.studentId, 'absent');
                    }}
                  >
                    Absent
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Present</p>
            <p className="font-semibold text-green-600">{presentStudents}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Late</p>
            <p className="font-semibold text-yellow-600">{lateStudents}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Absent</p>
            <p className="font-semibold text-red-600">{absentStudents}</p>
          </div>
        </div>
      </div>
    </div>
  );
}