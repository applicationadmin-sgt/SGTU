import { useState } from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { 
  Hand, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  UserX, 
  Crown,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  isOnline: boolean;
  handRaised: boolean;
  audioOn: boolean;
  videoOn: boolean;
  joinTime: Date;
}

const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    isOnline: true,
    handRaised: true,
    audioOn: false,
    videoOn: false,
    joinTime: new Date(Date.now() - 900000)
  },
  {
    id: '2',
    name: 'Bob Smith',
    isOnline: true,
    handRaised: false,
    audioOn: false,
    videoOn: false,
    joinTime: new Date(Date.now() - 850000)
  },
  {
    id: '3',
    name: 'Charlie Brown',
    isOnline: true,
    handRaised: true,
    audioOn: false,
    videoOn: false,
    joinTime: new Date(Date.now() - 800000)
  },
  {
    id: '4',
    name: 'Diana Prince',
    isOnline: true,
    handRaised: false,
    audioOn: true,
    videoOn: false,
    joinTime: new Date(Date.now() - 750000)
  },
  {
    id: '5',
    name: 'Edward Norton',
    isOnline: false,
    handRaised: false,
    audioOn: false,
    videoOn: false,
    joinTime: new Date(Date.now() - 600000)
  },
  {
    id: '6',
    name: 'Fiona Green',
    isOnline: true,
    handRaised: false,
    audioOn: false,
    videoOn: true,
    joinTime: new Date(Date.now() - 500000)
  }
];

export function StudentManager() {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const toggleStudentAudio = (studentId: string) => {
    setStudents(students.map(student => 
      student.id === studentId 
        ? { ...student, audioOn: !student.audioOn }
        : student
    ));
  };

  const toggleStudentVideo = (studentId: string) => {
    setStudents(students.map(student => 
      student.id === studentId 
        ? { ...student, videoOn: !student.videoOn }
        : student
    ));
  };

  const handleHandRaise = (studentId: string) => {
    setStudents(students.map(student => 
      student.id === studentId 
        ? { ...student, handRaised: false }
        : student
    ));
  };

  const removeStudent = (studentId: string) => {
    setStudents(students.filter(student => student.id !== studentId));
  };

  const muteAll = () => {
    setStudents(students.map(student => ({ ...student, audioOn: false })));
  };

  const formatDuration = (joinTime: Date) => {
    const duration = Math.floor((Date.now() - joinTime.getTime()) / 60000);
    return `${duration}m`;
  };

  const onlineStudents = students.filter(s => s.isOnline);
  const raisedHands = students.filter(s => s.handRaised);

  return (
    <div className="h-full flex flex-col">
      {/* Header with controls */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {onlineStudents.length} online
          </div>
          <Button onClick={muteAll} variant="outline" size="sm">
            <VolumeX className="h-3 w-3 mr-1" />
            Mute All
          </Button>
        </div>

        {raisedHands.length > 0 && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <Hand className="h-4 w-4" />
              <span>{raisedHands.length} hand(s) raised</span>
            </div>
          </div>
        )}
      </div>

      {/* Students list */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {students.map((student) => (
            <div
              key={student.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedStudent === student.id 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-muted/50'
              } ${!student.isOnline ? 'opacity-60' : ''}`}
              onClick={() => setSelectedStudent(
                selectedStudent === student.id ? null : student.id
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {student.isOnline ? `Online • ${formatDuration(student.joinTime)}` : 'Offline'}
                  </p>
                </div>
                
                {/* Status indicators */}
                <div className="flex items-center gap-1">
                  {student.handRaised && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Hand className="h-3 w-3" />
                    </Badge>
                  )}
                  {student.audioOn && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Mic className="h-3 w-3" />
                    </Badge>
                  )}
                  {student.videoOn && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Video className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </div>

              {/* Controls (shown when selected) */}
              {selectedStudent === student.id && student.isOnline && (
                <div className="flex items-center gap-1 pt-2 border-t">
                  {student.handRaised && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleHandRaise(student.id);
                      }}
                      className="text-xs"
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      Allow
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant={student.audioOn ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStudentAudio(student.id);
                    }}
                  >
                    {student.audioOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant={student.videoOn ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStudentVideo(student.id);
                    }}
                  >
                    {student.videoOn ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStudent(student.id);
                    }}
                  >
                    <UserX className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}