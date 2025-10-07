import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { VideoStream } from './VideoStream';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';
import { ChatSystem } from './ChatSystem';
import { PollCreator } from './PollCreator';
import { AttendanceTracker } from './AttendanceTracker';
import { StudentManager } from './StudentManager';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  Square, 
  Circle, 
  Users, 
  MessageSquare, 
  BarChart3, 
  ClipboardList,
  Settings,
  LogOut
} from 'lucide-react';

interface TeacherDashboardProps {
  userName: string;
  onLogout: () => void;
}

export function TeacherDashboard({ userName, onLogout }: TeacherDashboardProps) {
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Teacher Dashboard</h1>
          <Badge variant="secondary">Live Class</Badge>
          {isRecording && (
            <Badge variant="destructive" className="animate-pulse">
              <Circle className="h-2 w-2 mr-1 fill-current" />
              Recording
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Welcome, {userName}</span>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-3 gap-6 h-full">
            {/* Video Stream */}
            <div className="col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Live Stream</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isVideoOn ? "default" : "destructive"}
                        size="sm"
                        onClick={() => setIsVideoOn(!isVideoOn)}
                      >
                        {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant={isAudioOn ? "default" : "destructive"}
                        size="sm"
                        onClick={() => setIsAudioOn(!isAudioOn)}
                      >
                        {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant={isScreenSharing ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                      >
                        <Monitor className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        onClick={() => setIsRecording(!isRecording)}
                      >
                        {isRecording ? <Square className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <VideoStream 
                    isVideoOn={isVideoOn} 
                    isScreenSharing={isScreenSharing}
                    userName={userName}
                    role="teacher"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Student Management */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Students (12)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <StudentManager />
                </CardContent>
              </Card>
            </div>

            {/* Whiteboard */}
            <div className="col-span-3">
              <Card className="h-96">
                <CardHeader>
                  <CardTitle>Interactive Whiteboard</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <InteractiveWhiteboard />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l bg-muted/10">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 m-4">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="polls">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="attendance">
                <ClipboardList className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 px-4 pb-4">
              <TabsContent value="chat" className="h-full">
                <ChatSystem role="teacher" />
              </TabsContent>
              
              <TabsContent value="polls" className="h-full">
                <PollCreator />
              </TabsContent>
              
              <TabsContent value="attendance" className="h-full">
                <AttendanceTracker />
              </TabsContent>
              
              <TabsContent value="settings" className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Class Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm">Class Duration</label>
                      <input type="time" className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm">Max Students</label>
                      <input type="number" defaultValue="30" className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <Button className="w-full">Update Settings</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}