import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Videocam as VideocamIcon,
  Mic as MicIcon,
  Chat as ChatIcon,
  PanTool as HandRaiseIcon,
  Dashboard as WhiteboardIcon,
  FiberManualRecord as RecordIcon,
  People as PeopleIcon,
  Wifi as NetworkIcon,
  VolumeUp as VolumeIcon,
  ExpandMore as ExpandMoreIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  Schedule as ScheduleIcon,
  Link as LinkIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

const EnhancedClassSettings = ({ 
  open, 
  onClose, 
  classData, 
  classSettings, 
  onSettingsUpdate,
  participants,
  userRole,
  onParticipantAction,
  webrtcManager
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [localSettings, setLocalSettings] = useState(classSettings);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedVideoInput, setSelectedVideoInput] = useState('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState('');
  const [networkStats, setNetworkStats] = useState({});
  
  useEffect(() => {
    if (open) {
      setLocalSettings(classSettings);
      loadMediaDevices();
      if (webrtcManager?.current) {
        loadNetworkStats();
      }
    }
  }, [open, classSettings]);
  
  const loadMediaDevices = async () => {
    try {
      if (webrtcManager?.current) {
        const devices = await webrtcManager.current.getMediaDevices();
        setAudioDevices(devices.audioInputs);
        setVideoDevices(devices.videoInputs);
        setAudioOutputDevices(devices.audioOutputs);
      }
    } catch (error) {
      console.error('Error loading media devices:', error);
    }
  };
  
  const loadNetworkStats = async () => {
    try {
      const stats = {};
      for (const [userId, pc] of webrtcManager.current.peerConnections) {
        const pcStats = await pc.getStats();
        stats[userId] = pcStats;
      }
      setNetworkStats(stats);
    } catch (error) {
      console.error('Error loading network stats:', error);
    }
  };
  
  const handleSettingChange = (setting, value) => {
    const newSettings = { ...localSettings, [setting]: value };
    setLocalSettings(newSettings);
    
    // Apply immediately for better UX
    if (onSettingsUpdate) {
      onSettingsUpdate(newSettings);
    }
  };
  
  const handleMediaDeviceChange = async (deviceType, deviceId) => {
    try {
      if (!webrtcManager?.current) return;
      
      switch (deviceType) {
        case 'audioInput':
          await webrtcManager.current.switchMicrophone(deviceId);
          setSelectedAudioInput(deviceId);
          break;
        case 'videoInput':
          await webrtcManager.current.switchCamera(deviceId);
          setSelectedVideoInput(deviceId);
          break;
        case 'audioOutput':
          webrtcManager.current.setAudioOutput(deviceId);
          setSelectedAudioOutput(deviceId);
          break;
      }
    } catch (error) {
      console.error('Error changing media device:', error);
    }
  };
  
  const copyJoinLink = () => {
    const joinUrl = `${window.location.origin}/live-class/join/${classData?.accessToken}`;
    navigator.clipboard.writeText(joinUrl);
  };
  
  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ padding: '20px 0' }}>
      {value === index && children}
    </div>
  );
  
  // Class Controls Tab
  const renderClassControlsTab = () => (
    <Box>
      {userRole === 'teacher' ? (
        <>
          <Typography variant="h6" gutterBottom>
            Student Permissions
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <MicIcon />
              </ListItemIcon>
              <ListItemText
                primary="Allow Student Microphones"
                secondary="Students can unmute their microphones"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.allowStudentMic}
                  onChange={(e) => handleSettingChange('allowStudentMic', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <VideocamIcon />
              </ListItemIcon>
              <ListItemText
                primary="Allow Student Cameras"
                secondary="Students can turn on their cameras"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.allowStudentCamera}
                  onChange={(e) => handleSettingChange('allowStudentCamera', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <ChatIcon />
              </ListItemIcon>
              <ListItemText
                primary="Allow Chat"
                secondary="Students can send chat messages"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.allowChat}
                  onChange={(e) => handleSettingChange('allowChat', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <HandRaiseIcon />
              </ListItemIcon>
              <ListItemText
                primary="Enable Hand Raising"
                secondary="Students can raise hands to ask questions"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.enableHandRaise}
                  onChange={(e) => handleSettingChange('enableHandRaise', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <WhiteboardIcon />
              </ListItemIcon>
              <ListItemText
                primary="Enable Whiteboard"
                secondary="Allow collaborative whiteboard access"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.enableWhiteboard}
                  onChange={(e) => handleSettingChange('enableWhiteboard', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
            
            <ListItem>
              <ListItemIcon>
                <SecurityIcon />
              </ListItemIcon>
              <ListItemText
                primary="Waiting Room"
                secondary="Require teacher approval for joining"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.waitingRoomEnabled}
                  onChange={(e) => handleSettingChange('waitingRoomEnabled', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Recording Settings
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <RecordIcon />
              </ListItemIcon>
              <ListItemText
                primary="Auto-Record Classes"
                secondary="Automatically start recording when class begins"
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={localSettings.autoRecord}
                  onChange={(e) => handleSettingChange('autoRecord', e.target.checked)}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Class Information
          </Typography>
          
          <Card variant="outlined" sx={{ mt: 1 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon />
                    <Typography variant="body2">Join Link:</Typography>
                    <Button
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={copyJoinLink}
                    >
                      Copy Link
                    </Button>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Access Token: {classData?.accessToken?.substring(0, 8)}...
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Room ID: {classData?.roomId}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="info">
          Only teachers can modify class settings.
        </Alert>
      )}
    </Box>
  );
  
  // Participants Tab
  const renderParticipantsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Participants ({participants.size + 1})
      </Typography>
      
      <List>
        {/* Current user */}
        <ListItem>
          <ListItemIcon>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText
            primary={`You (${userRole})`}
            secondary="Host"
          />
          <Chip label="Host" size="small" color="primary" />
        </ListItem>
        
        {/* Other participants */}
        {Array.from(participants.values()).map((participant) => (
          <ListItem key={participant.userId}>
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText
              primary={participant.userName}
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption">
                    {participant.isTeacher ? 'Teacher' : 'Student'}
                  </Typography>
                  {participant.status === 'hand-raised' && (
                    <Chip 
                      label="Hand Raised" 
                      size="small" 
                      color="warning" 
                      icon={<HandRaiseIcon />}
                    />
                  )}
                  {participant.connectionState && (
                    <Chip 
                      label={participant.connectionState} 
                      size="small" 
                      color={participant.connectionState === 'connected' ? 'success' : 'warning'}
                    />
                  )}
                </Box>
              }
            />
            {userRole === 'teacher' && !participant.isTeacher && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  size="small"
                  color="error"
                  title="Remove participant"
                  onClick={() => onParticipantAction?.(participant.userId, 'remove')}
                >
                  <BlockIcon />
                </IconButton>
              </Box>
            )}
          </ListItem>
        ))}
      </List>
    </Box>
  );
  
  // Audio/Video Tab
  const renderAudioVideoTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Media Devices
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Microphone</InputLabel>
          <Select
            value={selectedAudioInput}
            onChange={(e) => handleMediaDeviceChange('audioInput', e.target.value)}
            label="Microphone"
          >
            {audioDevices.map((device) => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Camera</InputLabel>
          <Select
            value={selectedVideoInput}
            onChange={(e) => handleMediaDeviceChange('videoInput', e.target.value)}
            label="Camera"
          >
            {videoDevices.map((device) => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.substring(0, 8)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Speakers</InputLabel>
          <Select
            value={selectedAudioOutput}
            onChange={(e) => handleMediaDeviceChange('audioOutput', e.target.value)}
            label="Speakers"
          >
            {audioOutputDevices.map((device) => (
              <MenuItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Speakers ${device.deviceId.substring(0, 8)}`}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="h6" gutterBottom>
        Audio Settings
      </Typography>
      
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography gutterBottom>Microphone Volume</Typography>
        <Slider
          defaultValue={80}
          valueLabelDisplay="auto"
          step={10}
          marks
          min={0}
          max={100}
        />
      </Box>
      
      <Box sx={{ px: 2, mb: 2 }}>
        <Typography gutterBottom>Speaker Volume</Typography>
        <Slider
          defaultValue={70}
          valueLabelDisplay="auto"
          step={10}
          marks
          min={0}
          max={100}
        />
      </Box>
      
      <List>
        <ListItem>
          <ListItemText
            primary="Noise Suppression"
            secondary="Reduce background noise"
          />
          <ListItemSecondaryAction>
            <Switch defaultChecked />
          </ListItemSecondaryAction>
        </ListItem>
        
        <ListItem>
          <ListItemText
            primary="Echo Cancellation"
            secondary="Prevent audio feedback"
          />
          <ListItemSecondaryAction>
            <Switch defaultChecked />
          </ListItemSecondaryAction>
        </ListItem>
        
        <ListItem>
          <ListItemText
            primary="Auto Gain Control"
            secondary="Automatically adjust microphone level"
          />
          <ListItemSecondaryAction>
            <Switch defaultChecked />
          </ListItemSecondaryAction>
        </ListItem>
      </List>
    </Box>
  );
  
  // Network Tab
  const renderNetworkTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Connection Status
      </Typography>
      
      {Object.entries(networkStats).map(([userId, stats]) => {
        const participant = participants.get(userId);
        return (
          <Accordion key={userId}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {participant?.userName || 'Unknown User'}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2">Connection Type:</Typography>
                  <Typography variant="caption" color="text.secondary">
                    WebRTC P2P
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Quality:</Typography>
                  <Typography variant="caption" color="success.main">
                    Good
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Latency:</Typography>
                  <Typography variant="caption" color="text.secondary">
                    ~45ms
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Bandwidth:</Typography>
                  <Typography variant="caption" color="text.secondary">
                    1.2 Mbps
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
      
      {Object.keys(networkStats).length === 0 && (
        <Alert severity="info">
          No active connections to display statistics.
        </Alert>
      )}
    </Box>
  );
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '500px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon />
          <Typography variant="h6">Class Settings</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Class Controls" icon={<SettingsIcon />} />
            <Tab label="Participants" icon={<PeopleIcon />} />
            <Tab label="Audio/Video" icon={<VideocamIcon />} />
            <Tab label="Network" icon={<NetworkIcon />} />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {renderClassControlsTab()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderParticipantsTab()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {renderAudioVideoTab()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          {renderNetworkTab()}
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {userRole === 'teacher' && (
          <Button 
            variant="contained" 
            onClick={() => {
              onSettingsUpdate?.(localSettings);
              onClose();
            }}
          >
            Apply Settings
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedClassSettings;