import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Chip,
  Avatar,
  TextField,
  InputAdornment,
  Stack,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import HistoryIcon from '@mui/icons-material/History';
import { format } from 'date-fns';
import axios from 'axios';
import { parseJwt } from '../../utils/jwt';

const QuizUnlockDashboard = () => {
  const token = localStorage.getItem('token');
  const currentUser = parseJwt(token);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);
  const [unlockNote, setUnlockNote] = useState('');
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const fetchData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get('/api/quiz-unlock/locked-students', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Transform data to match admin table format
        const transformedData = response.data.data.map(lock => ({
          student: {
            _id: lock.student.id,
            name: lock.student.name,
            email: lock.student.email,
            regNo: lock.student.regno
          },
          course: {
            _id: lock.course.id,
            name: lock.course.name,
            code: lock.course.code
          },
          unit: {
            _id: lock.quiz.id,
            title: lock.quiz.title
          },
          type: 'attemptsExhausted',
          reason: getReasonText(lock.lockInfo.reason),
          violationCount: 0,
          attemptsTaken: lock.lockInfo.totalAttempts,
          attemptLimit: lock.lockInfo.maxAttempts || 3,
          lockedAt: lock.lockInfo.lockTimestamp,
          unlockHistory: [],
          lockId: lock.lockId,
          lockInfo: lock.lockInfo,
          canTeacherUnlock: lock.lockInfo.canTeacherUnlock,
          remainingTeacherUnlocks: lock.lockInfo.remainingTeacherUnlocks
        }));
        setItems(transformedData);
      } else {
        showAlert('Error fetching locked students', 'error');
      }
    } catch (err) {
      console.error('Failed to load locks:', err);
      showAlert('Error fetching locked students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
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
      (it.student?.regNo || '').toLowerCase().includes(q) ||
      (it.course?.name || '').toLowerCase().includes(q) ||
      (it.unit?.title || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const handleTeacherUnlock = async (item) => {
    if (!item.canTeacherUnlock) {
      showAlert('Teacher unlock limit exceeded. Dean authorization required.', 'warning');
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
        `/api/quiz-unlock/teacher-unlock/${selectedLock.lockId}`,
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
          `Successfully unlocked ${selectedLock.student.name} for ${selectedLock.unit.title}`,
          'success'
        );
        setUnlockDialogOpen(false);
        await fetchData(); // Refresh the list
      } else {
        if (response.data.requiresDeanUnlock) {
          showAlert('Teacher unlock limit exceeded. Dean authorization required.', 'warning');
        } else {
          showAlert(response.data.message || 'Error unlocking student', 'error');
        }
      }
    } catch (error) {
      console.error('Error unlocking student:', error);
      const message = error.response?.data?.message || 'Error unlocking student';
      showAlert(message, 'error');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <Box>
      {alert.show && (
        <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert({ show: false, message: '', severity: 'info' })}>
          {alert.message}
        </Alert>
      )}

      <Card elevation={2}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Teacher Quiz Unlock Requests</Typography>
              <Box>
                <Tooltip title="Refresh">
                  <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          }
          subheader="Students in your sections who need quiz unlock authorization (max 3 teacher unlocks per student)."
        />
        <Divider />
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by name, reg no, course, or unit"
              value={query}
              onChange={e => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ maxWidth: 420, width: '100%' }}
            />
            <Chip label={`Total: ${items.length}`} />
          </Stack>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Reg No</TableCell>
                  <TableCell>Course</TableCell>
                  <TableCell>Unit</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Violations</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Locked/Last Unlock</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((it, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Chip size="small" color="warning" label="Failed Quiz" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28 }}>{(it.student?.name || '?').slice(0,1)}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{it.student?.name || 'Unknown'}</Typography>
                          <Typography variant="caption" color="text.secondary">{it.student?.email}</Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{it.student?.regNo || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{it.course?.name || '-'}</Typography>
                      <Typography variant="caption" color="text.secondary">({it.course?.code})</Typography>
                    </TableCell>
                    <TableCell>{it.unit?.title || '-'}</TableCell>
                    <TableCell>
                      <Chip size="small" color="warning" variant="outlined" label={it.reason || '-'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color="default" label="0" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{it.attemptsTaken}/{it.attemptLimit}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Teacher unlocks: {(it.lockInfo?.teacherUnlockCount || 0)}/3
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2">{it.lockedAt ? new Date(it.lockedAt).toLocaleString() : '-'}</Typography>
                        {it.lockInfo?.lastTeacherUnlock && (
                          <Typography variant="caption" color="text.secondary">
                            Last unlock: {new Date(it.lockInfo.lastTeacherUnlock).toLocaleString()}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={it.canTeacherUnlock ? "Unlock Student" : "Teacher limit exceeded - Dean required"}>
                        <span>
                          <Button
                            size="small"
                            variant="contained"
                            color={it.canTeacherUnlock ? "primary" : "secondary"}
                            startIcon={<LockResetIcon />}
                            onClick={() => handleTeacherUnlock(it)}
                            disabled={!it.canTeacherUnlock}
                          >
                            {it.canTeacherUnlock ? `Unlock (${it.remainingTeacherUnlocks})` : 'Dean Required'}
                          </Button>
                          <IconButton 
                            size="small" 
                            sx={{ ml: 1 }} 
                            onClick={() => { setHistoryItem(it); setHistoryOpen(true); }}
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary">No unlock requests.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Unlock Confirmation Dialog */}
      <Dialog open={unlockDialogOpen} onClose={() => setUnlockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Unlock Quiz for Student</DialogTitle>
        <DialogContent dividers>
          {selectedLock ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {selectedLock.student?.name} • {selectedLock.course?.name} • {selectedLock.unit?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reg No: {selectedLock.student?.regNo || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Current Attempts: {selectedLock.attemptsTaken}/{selectedLock.attemptLimit}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks Used: {(selectedLock.lockInfo?.teacherUnlockCount || 0)}/3
              </Typography>
              <Typography variant="body2" gutterBottom>
                Remaining Teacher Unlocks: {selectedLock.remainingTeacherUnlocks}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Alert severity="info" sx={{ mb: 2 }}>
                This will be unlock #{(selectedLock.lockInfo?.teacherUnlockCount || 0) + 1} of 3 allowed teacher unlocks.
                {(selectedLock.lockInfo?.teacherUnlockCount || 0) === 2 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Warning:</strong> This is the final teacher unlock. Further unlocks will require Dean authorization.
                  </Typography>
                )}
              </Alert>
              <TextField
                autoFocus
                margin="dense"
                label="Reason for Unlock *"
                fullWidth
                variant="outlined"
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Technical issue during quiz, Student appeal approved"
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Additional Notes (Optional)"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={unlockNote}
                onChange={(e) => setUnlockNote(e.target.value)}
                placeholder="Any additional context or instructions..."
              />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnlockDialogOpen(false)} disabled={unlocking}>
            Close
          </Button>
          {selectedLock && (
            <Button 
              variant="contained" 
              onClick={handleUnlockConfirm}
              disabled={unlocking || !unlockReason.trim()}
              startIcon={unlocking ? <CircularProgress size={20} /> : <LockResetIcon />}
            >
              {unlocking ? 'Unlocking...' : 'Confirm Unlock'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Unlock History</DialogTitle>
        <DialogContent dividers>
          {historyItem ? (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {historyItem.student?.name} • {historyItem.course?.name} • {historyItem.unit?.title}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Locked At: {historyItem.lockedAt ? new Date(historyItem.lockedAt).toLocaleString() : '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Reason: {historyItem.reason || '-'}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Teacher Unlocks: {(historyItem.lockInfo?.teacherUnlockCount || 0)}/3
              </Typography>
              <Typography variant="body2" gutterBottom>
                Dean Unlocks: {(historyItem.lockInfo?.deanUnlockCount || 0)}
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>History</Typography>
              {(historyItem.unlockHistory && historyItem.unlockHistory.length > 0) ? (
                <List dense>
                  {historyItem.unlockHistory.map((h, i) => (
                    <ListItem key={i}>
                      <ListItemText
                        primary={`Unlocked by ${h.unlockedBy?.name || 'Teacher/Dean'} on ${new Date(h.unlockedAt).toLocaleString()}`}
                        secondary={h.note || h.reason || ''}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">No unlock history available.</Typography>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizUnlockDashboard;