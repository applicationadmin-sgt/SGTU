import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  PlayArrow as JoinIcon,
  Settings
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const JoinContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(3),
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white'
}));

const PreviewCard = styled(Card)(({ theme }) => ({
  maxWidth: 600,
  width: '100%',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(10px)',
  borderRadius: theme.spacing(2)
}));

const VideoPreview = styled(Box)({
  position: 'relative',
  width: '100%',
  height: 300,
  backgroundColor: '#1e293b',
  borderRadius: 8,
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
});

const LiveClassJoinPage = ({ classData, user, onJoin, onCancel }) => {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    // Initialize media preview
    initializeMedia();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeMedia = async () => {
    try {
      setLoading(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: classData?.allowStudentCamera !== false,
        audio: classData?.allowStudentMic !== false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setCameraEnabled(classData?.allowStudentCamera !== false);
      setMicEnabled(classData?.allowStudentMic !== false);
      
    } catch (error) {
      console.error('Media initialization failed:', error);
      setMediaError('Camera/microphone access denied. You can still join with audio/video disabled.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraEnabled;
        setCameraEnabled(!cameraEnabled);
      }
    }
  };

  const toggleMicrophone = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
      }
    }
  };

  const handleJoin = () => {
    onJoin({
      stream,
      cameraEnabled,
      micEnabled
    });
  };

  return (
    <JoinContainer>
      <PreviewCard>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
              Join Live Class
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {classData?.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {classData?.section?.name} • {classData?.course?.name}
            </Typography>
          </Box>

          {/* Video Preview */}
          <VideoPreview mb={3}>
            {loading ? (
              <Box textAlign="center" color="white">
                <CircularProgress color="inherit" />
                <Typography variant="body2" mt={2}>
                  Initializing camera and microphone...
                </Typography>
              </Box>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraEnabled ? 'block' : 'none'
                  }}
                />
                {!cameraEnabled && (
                  <Box textAlign="center" color="white">
                    <Avatar 
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        mx: 'auto', 
                        mb: 2,
                        bgcolor: 'primary.main'
                      }}
                    >
                      <Typography variant="h3">
                        {user?.name?.[0] || 'S'}
                      </Typography>
                    </Avatar>
                    <Typography variant="h6">
                      {user?.name || 'Student'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      Camera Off
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </VideoPreview>

          {/* Error Alert */}
          {mediaError && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {mediaError}
            </Alert>
          )}

          {/* Media Controls */}
          <Box display="flex" justifyContent="center" gap={2} mb={3}>
            <Tooltip title={micEnabled ? 'Mute' : 'Unmute'}>
              <IconButton
                onClick={toggleMicrophone}
                disabled={!stream || loading}
                sx={{
                  backgroundColor: micEnabled ? 'success.light' : 'error.light',
                  color: micEnabled ? 'success.contrastText' : 'error.contrastText',
                  '&:hover': { 
                    backgroundColor: micEnabled ? 'success.main' : 'error.main' 
                  },
                  '&:disabled': {
                    backgroundColor: 'grey.300'
                  }
                }}
              >
                {micEnabled ? <Mic /> : <MicOff />}
              </IconButton>
            </Tooltip>

            <Tooltip title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
              <IconButton
                onClick={toggleCamera}
                disabled={!stream || loading}
                sx={{
                  backgroundColor: cameraEnabled ? 'success.light' : 'error.light',
                  color: cameraEnabled ? 'success.contrastText' : 'error.contrastText',
                  '&:hover': { 
                    backgroundColor: cameraEnabled ? 'success.main' : 'error.main' 
                  },
                  '&:disabled': {
                    backgroundColor: 'grey.300'
                  }
                }}
              >
                {cameraEnabled ? <Videocam /> : <VideocamOff />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* Class Permissions Info */}
          <Box mb={3}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Class Permissions:
            </Typography>
            <Stack direction="row" spacing={2}>
              <Box display="flex" alignItems="center" gap={1}>
                {classData?.allowStudentMic ? <Mic color="success" /> : <MicOff color="disabled" />}
                <Typography variant="body2">
                  Microphone {classData?.allowStudentMic ? 'Allowed' : 'Disabled'}
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                {classData?.allowStudentCamera ? <Videocam color="success" /> : <VideocamOff color="disabled" />}
                <Typography variant="body2">
                  Camera {classData?.allowStudentCamera ? 'Allowed' : 'Disabled'}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              onClick={onCancel}
              size="large"
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleJoin}
              disabled={loading}
              startIcon={<JoinIcon />}
              size="large"
            >
              Join Live Class
            </Button>
          </Stack>
        </CardContent>
      </PreviewCard>
    </JoinContainer>
  );
};

export default LiveClassJoinPage;