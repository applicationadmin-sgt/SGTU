import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { VideoStream } from './VideoStream';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';
import { ChatSystem } from './ChatSystem';
import { PollViewer } from './PollViewer';
import { 
  Hand, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageSquare, 
  BarChart3, 
  BookOpen,
  LogOut,
  Circle
} from 'lucide-react';

interface StudentDashboardProps {
  userName: string;
  onLogout: () => void;
}

export function StudentDashboard({ userName, onLogout }: StudentDashboardProps) {
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isAudioOn, setIsAudioOn] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Student Dashboard</h1>
          <Badge variant="secondary">Live Class</Badge>
          <Badge variant="outline" className="animate-pulse">
            <Circle className="h-2 w-2 mr-1 fill-green-500 text-green-500" />
            Recording
          </Badge>
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
          <div className="grid grid-cols-4 gap-6 h-full">
            {/* Teacher Video */}
            <div className="col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Teacher Stream</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={handRaised ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHandRaised(!handRaised)}
                        className={handRaised ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                      >
                        <Hand className="h-4 w-4 mr-2" />
                        {handRaised ? "Hand Raised" : "Raise Hand"}
                      </Button>
                      
                      {hasPermission && (
                        <>
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
                        </>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <VideoStream 
                    isVideoOn={true} 
                    isScreenSharing={false}
                    userName="Mr. Johnson"
                    role="teacher"
                  />
                </CardContent>
              </Card>
            </div>

            {/* My Video (when permitted) */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Your Video</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasPermission ? (
                    <VideoStream 
                      isVideoOn={isVideoOn} 
                      isScreenSharing={false}
                      userName={userName}
                      role="student"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <VideoOff className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Video disabled</p>
                        <p className="text-xs">Raise hand for permission</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Whiteboard View */}
            <div className="col-span-4">
              <Card className="h-96">
                <CardHeader>
                  <CardTitle>Whiteboard</CardTitle>
                </CardHeader>
                <CardContent className="h-full">
                  <InteractiveWhiteboard isTeacher={false} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 border-l bg-muted/10">
          <Tabs defaultValue="chat" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="polls">
                <BarChart3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="materials">
                <BookOpen className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 px-4 pb-4">
              <TabsContent value="chat" className="h-full">
                <ChatSystem role="student" />
              </TabsContent>
              
              <TabsContent value="polls" className="h-full">
                <PollViewer />
              </TabsContent>
              
              <TabsContent value="materials" className="h-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Class Materials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm">Chapter 5 - React Hooks.pdf</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm">Assignment 3.docx</span>
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="text-sm">Code Examples.zip</span>
                      </div>
                    </div>
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