import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress
} from '@mui/material';
import {
  Business,
  LockOpen,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Info,
  Warning,
  CheckCircle,
  Person,
  Quiz,
  School,
  AccessTime,
  SupervisorAccount,
  AdminPanelSettings
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const HODQuizUnlockDashboard = ({ showAlert: propShowAlert }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [query, setQuery] = useState('');
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlockNote, setUnlockNote] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const token = localStorage.getItem('token');

  // Internal showAlert function if no prop provided
  const showAlert = propShowAlert || ((message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/quiz-unlock/hod-locked-students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setItems(response.data.data || []);
      } else {
        showAlert('Error loading HOD unlock requests', 'error');
      }
    } catch (error) {
      console.error('Error fetching HOD locked students:', error);
      const message = error.response?.data?.message || 'Error loading HOD unlock requests';
      showAlert(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getReasonText = (reason) => {
    switch (reason) {
      case 'BELOW_PASSING_SCORE':
        return 'Below Passing Score';
      case 'SECURITY_VIOLATION':
        return 'Security Violation';
      case 'TIME_EXCEEDED':
        return 'Time Exceeded';
      case 'MANUAL_LOCK':
        return 'Manual Lock';
      default:
        return reason;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(it =>
      (it.student?.name || '').toLowerCase().includes(q) ||
      (it.student?.regno || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.quiz?.title || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleHODUnlock = async (item) => {
    if (!item.lockInfo?.requiresHodUnlock) {
      showAlert('This quiz does not require HOD authorization', 'warning');
      return;
    }
    setSelectedLock(item);
    setUnlockReason('');
    setUnlockNote('');
    setUnlockDialogOpen(true);
  };

  const handleUnlockConfirm = async () => {
    if (!unlockReason.trim()) {
      showAlert('Please provide a reason for unlocking', 'warning');
      return;
    }

    try {
      setUnlocking(true);
      const response = await axios.post(
        `/api/quiz-unlock/hod-unlock/${selectedLock.lockId}`,
        {
          reason: unlockReason,
          notes: unlockNote
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        showAlert(
          `Successfully unlocked ${selectedLock.student.name} for ${selectedLock.quiz.title}`,
          'success'
        );
        setUnlockDialogOpen(false);
        await fetchData(); // Refresh the list
      } else {
        showAlert(response.data.message || 'Error unlocking student', 'error');
      }
    } catch (error) {
      console.error('Error unlocking student:', error);
      const message = error.response?.data?.message || 'Error unlocking student';
      showAlert(message, 'error');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, margin: '0 auto' }}>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert({ show: false, message: '', severity: 'info' })}>
          {alert.message}
        </Alert>
      )}
      
      <Card elevation={3}>
        <CardHeader
          avatar={<Business color="primary" sx={{ fontSize: 32 }} />}
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h5" fontWeight="bold">
                <Business sx={{ mr: 1, color: 'primary.main' }} />
                HOD Quiz Unlock Requests
              </Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Students who have exhausted teacher unlock limits and require HOD authorization."
        />
        <Divider />
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>HOD Authority:</strong> These students have exhausted their teacher unlock limit (3 unlocks). 
              As HOD, you can approve one unlock per student. After your unlock, future locks will require Dean authorization.
            </Typography>
          </Alert>

          {/* Search */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search by student name, registration number, course, or quiz..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
              sx={{ maxWidth: 600 }}
            />
          </Box>

          {/* Summary Cards */}
          {filtered.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {filtered.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending HOD Approvals
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    {filtered.filter(item => item.lockInfo?.teacherUnlockCount >= 3).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Teacher Limit Exhausted
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {Math.round(filtered.reduce((sum, item) => sum + (item.lockInfo?.lastFailureScore || 0), 0) / filtered.length || 0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell><strong>Student</strong></TableCell>
                  <TableCell><strong>Course & Quiz</strong></TableCell>
                  <TableCell><strong>Lock Reason</strong></TableCell>
                  <TableCell><strong>Score</strong></TableCell>
                  <TableCell><strong>Teacher Unlocks</strong></TableCell>
                  <TableCell><strong>Lock Date</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.lockId} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {item.student.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.student.regno || 'N/A'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {item.course.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.quiz.title}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getReasonText(item.lockInfo.reason)}
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {item.lockInfo.lastFailureScore}% / {item.lockInfo.passingScore}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(item.lockInfo.lastFailureScore / item.lockInfo.passingScore) * 100}
                          color={item.lockInfo.lastFailureScore < item.lockInfo.passingScore ? 'error' : 'success'}
                          sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" color="error.main" fontWeight="bold">
                          {item.lockInfo.teacherUnlockCount}/3 Used
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Limit Exhausted
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {format(new Date(item.lockInfo.lockTimestamp), 'MMM dd, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Approve HOD Unlock">
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            startIcon={<LockOpen />}
                            onClick={() => handleHODUnlock(item)}
                          >
                            Unlock
                          </Button>
                        </Tooltip>
                        <Tooltip title="View History">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => { setHistoryItem(item); setHistoryOpen(true); }}
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">No HOD unlock requests.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* HOD Unlock Confirmation Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Business sx={{ mr: 1, color: 'warning.main' }} />
            HOD Authorization - Unlock Quiz
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>HOD Authority Required:</strong> This student has exhausted all teacher unlock attempts.
                  Your authorization will grant them access to retake the quiz. After this unlock, future locks will require Dean approval.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.quiz?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regno || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Score: {selectedLock.lockInfo?.lastFailureScore}% (Required: {selectedLock.lockInfo?.passingScore}%)
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks Used: {selectedLock.lockInfo?.teacherUnlockCount}/3 (exhausted)
              </Typography>

              <TextField
                fullWidth
                label="Reason for Unlock"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                required
                multiline
                rows={3}
                placeholder="e.g., Student demonstrated understanding of concepts, technical issues during quiz, medical circumstances..."
                sx={{ mt: 2, mb: 2 }}
              />

              <TextField
                fullWidth
                label="Additional Notes (Optional)"
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                multiline
                rows={2}
                placeholder="Any additional context or conditions for this unlock..."
              />
            </Box>
          ) : (
            <Typography>No lock selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUnlockConfirm}
            variant="contained"
            color="warning"
            disabled={unlocking || !unlockReason.trim()}
            startIcon={unlocking ? <CircularProgress size={16} /> : <LockOpen />}
          >
            {unlocking ? 'Unlocking...' : 'Confirm HOD Unlock'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <HistoryIcon sx={{ mr: 1 }} />
            Unlock History
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {historyItem ? (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {historyItem.student?.name} - {historyItem.quiz?.title}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>Teacher Unlock History</Typography>
                {historyItem.teacherUnlockHistory && historyItem.teacherUnlockHistory.length > 0 ? (
                  <Box>
                    {historyItem.teacherUnlockHistory.map((unlock, index) => (
                      <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Teacher:</strong> {unlock.teacherId?.name}</Typography>
                        <Typography variant="body2"><strong>Date:</strong> {format(new Date(unlock.unlockTimestamp), 'MMM dd, yyyy HH:mm')}</Typography>
                        <Typography variant="body2"><strong>Reason:</strong> {unlock.reason}</Typography>
                        {unlock.notes && <Typography variant="body2"><strong>Notes:</strong> {unlock.notes}</Typography>}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No teacher unlock history</Typography>
                )}
              </Box>
            </Box>
          ) : (
            <Typography>No history selected</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HODQuizUnlockDashboard;