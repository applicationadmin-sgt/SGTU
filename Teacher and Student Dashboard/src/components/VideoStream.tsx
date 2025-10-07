import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Video, VideoOff, Mic, MicOff } from 'lucide-react';

interface VideoStreamProps {
  isVideoOn: boolean;
  isScreenSharing: boolean;
  userName: string;
  role: 'teacher' | 'student';
  isAudioOn?: boolean;
}

export function VideoStream({ 
  isVideoOn, 
  isScreenSharing, 
  userName, 
  role,
  isAudioOn = true 
}: VideoStreamProps) {
  if (isScreenSharing) {
    return (
      <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
        {/* Mock screen share content */}
        <div className="h-full bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-white/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">📊</span>
            </div>
            <p className="text-lg">Screen Sharing Active</p>
            <p className="text-sm opacity-75">Presenting slides...</p>
          </div>
        </div>
        
        {/* Video overlay */}
        <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
          {isVideoOn ? (
            <div className="h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-white text-blue-600">
                  {userName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="h-full bg-gray-700 flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Audio indicator */}
        <div className="absolute bottom-4 left-4">
          <Badge variant={isAudioOn ? "default" : "destructive"}>
            {isAudioOn ? <Mic className="h-3 w-3 mr-1" /> : <MicOff className="h-3 w-3 mr-1" />}
            {userName}
          </Badge>
        </div>
      </div>
    );
  }

  if (!isVideoOn) {
    return (
      <div className="relative w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
        <div className="text-center text-white">
          <Avatar className="w-16 h-16 mx-auto mb-4">
            <AvatarFallback className="bg-gray-600 text-white text-xl">
              {userName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <p className="text-lg">{userName}</p>
          <p className="text-sm opacity-75 capitalize">{role}</p>
          <VideoOff className="h-6 w-6 mx-auto mt-2 opacity-50" />
        </div>
        
        {/* Audio indicator */}
        <div className="absolute bottom-4 left-4">
          <Badge variant={isAudioOn ? "default" : "destructive"}>
            {isAudioOn ? <Mic className="h-3 w-3 mr-1" /> : <MicOff className="h-3 w-3 mr-1" />}
            {isAudioOn ? "Audio On" : "Muted"}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden">
      {/* Mock video stream */}
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-white/30">
            <AvatarFallback className="bg-white/20 text-white text-2xl">
              {userName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <p className="text-xl">{userName}</p>
          <p className="text-sm opacity-75 capitalize">{role}</p>
        </div>
      </div>
      
      {/* Video indicator */}
      <div className="absolute top-4 left-4">
        <Badge variant="secondary" className="bg-black/50 text-white">
          <Video className="h-3 w-3 mr-1" />
          Live
        </Badge>
      </div>
      
      {/* Audio indicator */}
      <div className="absolute bottom-4 left-4">
        <Badge variant={isAudioOn ? "default" : "destructive"}>
          {isAudioOn ? <Mic className="h-3 w-3 mr-1" /> : <MicOff className="h-3 w-3 mr-1" />}
          {isAudioOn ? "Audio On" : "Muted"}
        </Badge>
      </div>
    </div>
  );
}