import React, { useState, useEffect } from 'react';
import axios from '../services/api';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import './Settings.css';

const WEEK_DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
];

const getCurrentWeekDayKey = () => {
  const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return keys[new Date().getDay()];
};

const createEmptyWeeklySchedule = () =>
  WEEK_DAYS.reduce((acc, day) => {
    acc[day.key] = [];
    return acc;
  }, {});

const SettingsDialog = ({ open, onClose, maxWidth = 'sm', fullWidth = true, children }) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth={fullWidth}
    PaperProps={{
      sx: {
        borderRadius: '16px',
        boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
      },
    }}
  >
    {children}
  </Dialog>
);

const SettingsDialogHeader = ({ icon, title, subtitle, titleColor = '#111827' }) => (
  <Box sx={{ textAlign: 'center', pt: 1.5, pb: 1 }}>
    {icon && (
      <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>{icon}</Box>
    )}
    <Typography variant="h6" sx={{ fontWeight: 700, color: titleColor }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" sx={{ color: '#6b7280', mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

const Settings = () => {
  const [modalOpen, setModalOpen] = useState(null); // 'username', 'password', 'telegram', 'cell', 'editCell', 'deleteAllPdls', 'deleteLogs', 'selectLogs', 'registrationCodes', 'weeklySchedule', 'systemInfo' or null
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTelegramUsername, setNewTelegramUsername] = useState('');
  const [username, setUsername] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Cell management state
  const [cells, setCells] = useState([]);
  const [cellForm, setCellForm] = useState({
    cell_number: '',
    cell_name: '',
    capacity: 1,
    status: 'active'
  });
  const [customCellName, setCustomCellName] = useState('');
  const [editingCell, setEditingCell] = useState(null);

  // Logs management state
  const [logs, setLogs] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // QR Upload setting
  const [qrUploadEnabled, setQrUploadEnabled] = useState(() => {
    const saved = localStorage.getItem('qrUploadEnabled');
    return saved !== null ? saved === 'true' : true; // Default to enabled
  });
  const [selectedScheduleDay, setSelectedScheduleDay] = useState(getCurrentWeekDayKey());
  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('weeklyCellSchedule');
      if (!saved) return createEmptyWeeklySchedule();
      const parsed = JSON.parse(saved);
      const normalized = createEmptyWeeklySchedule();
      WEEK_DAYS.forEach(({ key }) => {
        normalized[key] = Array.isArray(parsed?.[key])
          ? parsed[key].map(id => Number(id)).filter(id => !Number.isNaN(id))
          : [];
      });
      return normalized;
    } catch (error) {
      console.error('Error loading weekly schedule:', error);
      return createEmptyWeeklySchedule();
    }
  });
  const [weeklyScheduleLoading, setWeeklyScheduleLoading] = useState(false);
  
  // Delete confirmation text
  const [deleteAllPdlsConfirmation, setDeleteAllPdlsConfirmation] = useState('');
  const [deleteAllLogsConfirmation, setDeleteAllLogsConfirmation] = useState('');
  
  // Registration codes state
  const [registrationCodes, setRegistrationCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newCodeDays, setNewCodeDays] = useState('90');
  const [newCodeLimit, setNewCodeLimit] = useState('1');

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token:', token);
        if (!token) {
          setUsername('');
          setLoading(false);
          return;
        }
        const response = await axios.get('/auth/me');
        console.log('Response status:', response.status);
        console.log('Username data:', response.data);
        setUsername(response.data.username);
        setTelegramUsername(response.data.telegramUsername || '');
        setIsAdmin(response.data.role === 'admin');
      } catch (error) {
        console.error('Error fetching username:', error);
        setUsername('');
      } finally {
        setLoading(false);
      }
    };

    const fetchCells = async () => {
      try {
        const response = await axios.get('/api/cells');
        setCells(response.data);
      } catch (error) {
        console.error('Error fetching cells:', error);
      }
    };

    fetchUsername();
    fetchCells();
  }, []);

  // Load shared weekly schedule from server (global for all users)
  useEffect(() => {
    const loadServerWeeklySchedule = async () => {
      setWeeklyScheduleLoading(true);
      try {
        const res = await axios.get('/api/schedule/weekly-cells');
        const serverSchedule = res?.data?.schedule;
        if (serverSchedule && typeof serverSchedule === 'object') {
          const normalized = createEmptyWeeklySchedule();
          WEEK_DAYS.forEach(({ key }) => {
            normalized[key] = Array.isArray(serverSchedule?.[key])
              ? serverSchedule[key].map(id => Number(id)).filter(id => !Number.isNaN(id))
              : [];
          });
          setWeeklySchedule(normalized);
          localStorage.setItem('weeklyCellSchedule', JSON.stringify(normalized));
        }
      } catch (error) {
        // Fallback to localStorage schedule already loaded above
        console.error('Error loading weekly schedule from server:', error);
      } finally {
        setWeeklyScheduleLoading(false);
      }
    };

    loadServerWeeklySchedule();
  }, []);

  // Fetch registration codes
  const fetchRegistrationCodes = async () => {
    setLoadingCodes(true);
    try {
      const response = await axios.get('/auth/registration-codes');
      setRegistrationCodes(response.data);
    } catch (error) {
      console.error('Error fetching registration codes:', error);
      alert('Failed to load registration codes: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingCodes(false);
    }
  };

  // Open registration codes modal
  const openRegistrationCodesModal = async () => {
    await fetchRegistrationCodes();
    setNewCode('');
    setNewCodeDays('90');
    setNewCodeLimit('1');
    setModalOpen('registrationCodes');
  };

  // Create new registration code
  const handleCreateRegistrationCode = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/auth/registration-codes', {
        code: newCode || undefined, // Let backend generate if empty
        daysValid: parseInt(newCodeDays) || 90,
        useLimit: parseInt(newCodeLimit) || 1
      });
      
      alert(`Registration code created: ${response.data.code}\nExpires: ${new Date(response.data.expiresAt).toLocaleDateString()}\nUse Limit: ${response.data.useLimit}`);
      setNewCode('');
      setNewCodeDays('90');
      setNewCodeLimit('1');
      await fetchRegistrationCodes(); // Refresh list
    } catch (error) {
      console.error('Error creating registration code:', error);
      alert('Failed to create registration code: ' + (error.response?.data?.message || error.message));
    }
  };

  const openModal = (type) => {
    setModalOpen(type);
    if (type === 'telegram') {
      setNewTelegramUsername(telegramUsername);
    }
  };

  const closeModal = () => {
    setModalOpen(null);
    setNewUsername('');
    setCurrentPassword('');
    setNewPassword('');
    setNewTelegramUsername('');
    setCellForm({
      cell_number: '',
      cell_name: '',
      capacity: 1,
      status: 'active'
    });
    setCustomCellName('');
    setEditingCell(null);
    setDeleteAllPdlsConfirmation('');
    setDeleteAllLogsConfirmation('');
    setNewCode('');
    setNewCodeDays('90');
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to change your username');
        return;
      }

      const response = await axios.put('/auth/username', { newUsername });

      if (response.data.message === 'Username updated successfully') {
        setUsername(newUsername);
        alert('Username updated successfully!');
        closeModal();
      }
    } catch (error) {
      console.error('Error updating username:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update username';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to change your password');
        return;
      }

      if (!currentPassword || !newPassword) {
        alert('Please fill in both current and new password fields');
        return;
      }

      if (newPassword.length < 6) {
        alert('New password must be at least 6 characters long');
        return;
      }

      const response = await axios.put('/auth/password', { currentPassword, newPassword });

      if (response.data.message === 'Password changed successfully') {
        alert('Password changed successfully!');
        closeModal();
      }
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 'Failed to change password';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleTelegramUsernameSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You must be logged in to update your Telegram username');
        return;
      }

      const response = await axios.put('/auth/telegram-username', { 
        telegramUsername: newTelegramUsername.trim() || null 
      });

      if (response.data.message) {
        setTelegramUsername(response.data.telegramUsername || '');
        alert(response.data.message);
        closeModal();
      }
    } catch (error) {
      console.error('Error updating Telegram username:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update Telegram username';
      alert(`Error: ${errorMessage}`);
    }
  };

  // Cell management functions
  const handleCellSubmit = async (e) => {
    e.preventDefault();
    
    // Validate that if "Other" is selected, a custom name is provided
    if (cellForm.cell_name === 'Other' && !customCellName.trim()) {
      alert('Please enter a custom cell name when "Other" is selected.');
      return;
    }
    
    try {
      // Use custom cell name if "Other" is selected and custom name is provided
      const cellData = {
        ...cellForm,
        cell_name: cellForm.cell_name === 'Other' && customCellName.trim() 
          ? customCellName.trim() 
          : cellForm.cell_name
      };

      if (editingCell) {
        await axios.put(`/api/cells/${editingCell.id}`, cellData);
        alert('Cell updated successfully!');
      } else {
        await axios.post('/api/cells', cellData);
        alert('Cell added successfully!');
      }
      
      // Refresh cells list
      const response = await axios.get('/api/cells');
      setCells(response.data);
      closeModal();
    } catch (error) {
      console.error('Error saving cell:', error);
      alert('Error saving cell: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditCell = (cell) => {
    setEditingCell(cell);
    setCellForm({
      cell_number: cell.cell_number,
      cell_name: cell.cell_name || '',
      capacity: cell.capacity || 1,
      status: cell.status || 'active'
    });
    
    // Check if the cell name is not one of the predefined options
    const predefinedNames = ['Quarantine', 'Cell', 'Other'];
    if (cell.cell_name && !predefinedNames.includes(cell.cell_name)) {
      setCellForm(prev => ({ ...prev, cell_name: 'Other' }));
      setCustomCellName(cell.cell_name);
    } else {
      setCustomCellName('');
    }
    
    setModalOpen('editCell');
  };

  const handleDeleteCell = async (cellId) => {
    if (!window.confirm('Are you sure you want to delete this cell?')) return;
    
    try {
      await axios.delete(`/api/cells/${cellId}`);
      alert('Cell deleted successfully!');
      
      // Refresh cells list
      const response = await axios.get('/api/cells');
      setCells(response.data);
    } catch (error) {
      console.error('Error deleting cell:', error);
      alert('Error deleting cell: ' + (error.response?.data?.error || error.message));
    }
  };

  // Delete all PDLs function
  const handleDeleteAllPdls = async () => {
    try {
      const response = await axios.delete('/pdls');
      if (response.data.message === 'All PDLs deleted successfully') {
        alert(`All PDLs deleted successfully. ${response.data.deletedCount} records removed.`);
      }
    } catch (err) {
      console.error('Failed to delete all PDLs:', err);
      alert(`Failed to delete all PDLs: ${err.response?.data?.error || err.message}`);
    }
    setModalOpen(null);
  };

  // Delete logs functions
  const handleDeleteAllLogs = async () => {
    try {
      const response = await axios.delete('/api/logs/all');
      if (response.data.message === 'All logs deleted successfully') {
        alert(`All logs deleted successfully. ${response.data.deletedCount} records removed.`);
      }
    } catch (err) {
      console.error('Failed to delete all logs:', err);
      alert(`Failed to delete all logs: ${err.response?.data?.error || err.message}`);
    }
    setModalOpen(null);
  };

  const handleDeleteLogsByDate = async (date) => {
    try {
      const response = await axios.delete('/api/logs/date', { data: { date } });
      if (response.data.message === 'Logs deleted successfully for the specified date') {
        alert(`Logs deleted successfully for ${date}. ${response.data.deletedCount} records removed.`);
      }
    } catch (err) {
      console.error('Failed to delete logs by date:', err);
      alert(`Failed to delete logs: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteLogsByDateRange = async (startDate, endDate) => {
    try {
      const response = await axios.delete('/api/logs/date-range', { 
        data: { startDate, endDate } 
      });
      if (response.data.message === 'Logs deleted successfully for the specified date range') {
        alert(`Logs deleted successfully from ${startDate} to ${endDate}. ${response.data.deletedCount} records removed.`);
      }
    } catch (err) {
      console.error('Failed to delete logs by date range:', err);
      alert(`Failed to delete logs: ${err.response?.data?.error || err.message}`);
    }
  };


  // Fetch all logs for selection
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await axios.get('/api/scanned_visitors');
      setLogs(response.data);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      alert(`Failed to fetch logs: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Open logs selection modal
  const openLogsSelectionModal = async () => {
    await fetchLogs();
    setSelectedLogs([]);
    setModalOpen('selectLogs');
  };

  // Handle log selection
  const handleLogSelection = (logId, isSelected) => {
    if (isSelected) {
      setSelectedLogs([...selectedLogs, logId]);
    } else {
      setSelectedLogs(selectedLogs.filter(id => id !== logId));
    }
  };

  // Handle select all logs
  const handleSelectAllLogs = (isSelected) => {
    if (isSelected) {
      setSelectedLogs(logs.map(log => log.id));
    } else {
      setSelectedLogs([]);
    }
  };

  // Handle QR Upload setting toggle
  const handleQrUploadToggle = () => {
    const newValue = !qrUploadEnabled;
    setQrUploadEnabled(newValue);
    localStorage.setItem('qrUploadEnabled', newValue.toString());
  };

  const persistWeeklySchedule = async (nextSchedule) => {
    setWeeklySchedule(nextSchedule);
    localStorage.setItem('weeklyCellSchedule', JSON.stringify(nextSchedule));
    try {
      await axios.put('/api/schedule/weekly-cells', { schedule: nextSchedule });
    } catch (error) {
      console.error('Error saving weekly schedule to server:', error);
      // Keep local changes but warn user
      alert('Schedule saved locally, but failed to sync to server. Please try again.');
    }
  };

  const toggleCellForSelectedDay = (cellId) => {
    const normalizedId = Number(cellId);
    const current = weeklySchedule[selectedScheduleDay] || [];
    const hasCell = current.includes(normalizedId);
    const nextDayCells = hasCell
      ? current.filter(id => id !== normalizedId)
      : [...current, normalizedId];
    persistWeeklySchedule({
      ...weeklySchedule,
      [selectedScheduleDay]: nextDayCells
    });
  };

  const setAllCellsForSelectedDay = (selectAll) => {
    const allIds = cells.map(cell => Number(cell.id)).filter(id => !Number.isNaN(id));
    persistWeeklySchedule({
      ...weeklySchedule,
      [selectedScheduleDay]: selectAll ? allIds : []
    });
  };

  const isCellScheduledForSelectedDay = (cellId) => {
    const dayCells = weeklySchedule[selectedScheduleDay] || [];
    return dayCells.includes(Number(cellId));
  };

  // Delete selected logs
  const handleDeleteSelectedLogs = async () => {
    if (selectedLogs.length === 0) {
      alert('Please select at least one log to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedLogs.length} selected log(s)?`)) {
      return;
    }

    try {
      let deletedCount = 0;
      let failedCount = 0;

      for (const logId of selectedLogs) {
        try {
          await axios.delete(`/api/scanned_visitors/${logId}`);
          deletedCount++;
        } catch (err) {
          console.error(`Failed to delete log ${logId}:`, err);
          failedCount++;
        }
      }

      if (deletedCount > 0) {
        alert(`Successfully deleted ${deletedCount} log(s).${failedCount > 0 ? ` ${failedCount} log(s) failed to delete.` : ''}`);
        await fetchLogs(); // Refresh the logs list
        setSelectedLogs([]);
      } else {
        alert('Failed to delete any logs.');
      }
    } catch (err) {
      console.error('Failed to delete selected logs:', err);
      alert(`Failed to delete logs: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="settings-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4b5563',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="settings-container">
        {username && (
          <div className="username-card">
            <strong>Username:</strong> {username}
          </div>
        )}
        <div className="settings-chooser">
          <div className="settings-card" onClick={() => openModal('username')}>
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
                <path d="M12 11v6"/>
                <path d="M9 14h6"/>
              </svg>
            </div>
            <div className="settings-card-content">
              <h3>Change Username</h3>
              <p>Update your account username</p>
            </div>
            <div className="settings-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <div className="settings-card" onClick={() => openModal('password')}>
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="settings-card-content">
              <h3>Change Password</h3>
              <p>Update your account password</p>
            </div>
            <div className="settings-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <div className="settings-card" onClick={() => openModal('telegram')}>
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #0088cc 0%, #006699 100%)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className="settings-card-content">
              <h3>Telegram Recovery</h3>
              <p>{telegramUsername ? `Current: @${telegramUsername}` : 'Add Telegram username for password recovery'}</p>
            </div>
            <div className="settings-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <div className="settings-card" onClick={() => openModal('cell')}>
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="3" y1="15" x2="21" y2="15"/>
              </svg>
            </div>
            <div className="settings-card-content">
              <h3>Manage Cells</h3>
              <p>Add, edit, or remove cells</p>
            </div>
            <div className="settings-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          {isAdmin && (
            <div className="settings-card" onClick={() => openModal('deleteLogs')}>
              <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <div className="settings-card-content">
                <h3>Delete Logs</h3>
                <p>Remove visitor log records</p>
              </div>
              <div className="settings-card-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="settings-card" onClick={() => openModal('deleteAllPdls')}>
              <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <div className="settings-card-content">
                <h3>Delete All PDLs</h3>
                <p>Permanently remove all PDL records</p>
              </div>
              <div className="settings-card-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="settings-card" onClick={openRegistrationCodesModal}>
              <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  <circle cx="12" cy="16" r="1"/>
                </svg>
              </div>
              <div className="settings-card-content">
                <h3>Registration Codes</h3>
                <p>Generate and manage registration codes</p>
              </div>
              <div className="settings-card-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          )}

          <div className="settings-card" onClick={() => openModal('weeklySchedule')}>
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="settings-card-content">
              <h3>Weekly Cell Visit Schedules</h3>
              <p>Set allowed cells for each day (Monday to Sunday)</p>
            </div>
            <div className="settings-card-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>

        {/* QR Upload Setting Toggle */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                QR Code Upload Feature
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Enable or disable the ability to upload/drop QR code images for scanning
              </p>
            </div>
            <label style={{
              position: 'relative',
              display: 'inline-block',
              width: '52px',
              height: '28px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={qrUploadEnabled}
                onChange={handleQrUploadToggle}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                  minHeight: 0,
                  position: 'absolute'
                }}
              />
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: qrUploadEnabled ? '#10b981' : '#d1d5db',
                borderRadius: '28px',
                transition: 'background-color 0.3s ease',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '22px',
                  width: '22px',
                  left: '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'transform 0.3s ease',
                  transform: qrUploadEnabled ? 'translateX(24px)' : 'translateX(0)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }} />
              </span>
            </label>
          </div>
        </div>

        {/* System Information (moved from card/modal to bottom section) */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b' }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>System Information</h3>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: '600', color: '#374151' }}>Application:</span>
              <span style={{ color: '#6b7280', textAlign: 'right' }}>Jail Visitation Management System</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: '600', color: '#374151' }}>Environment:</span>
              <span style={{ color: '#6b7280', textAlign: 'right' }}>{process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: '600', color: '#374151' }}>Current User:</span>
              <span style={{ color: '#6b7280', textAlign: 'right' }}>{username || 'Not logged in'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: '600', color: '#374151' }}>Version:</span>
              <span style={{ color: '#6b7280', textAlign: 'right' }}>1.0.0</span>
            </div>
          </div>
        </div>
        {modalOpen === 'weeklySchedule' && (
          <SettingsDialog open onClose={closeModal} maxWidth="md">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <Box sx={{ color: '#d97706', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Weekly Cell Visit Schedules</Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', mb: 2 }}>
                Select a day and choose which cells are allowed for scanning.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="schedule-day-label">Day</InputLabel>
                  <Select
                    labelId="schedule-day-label"
                    value={selectedScheduleDay}
                    onChange={(e) => setSelectedScheduleDay(e.target.value)}
                    label="Day"
                  >
                    {WEEK_DAYS.map((day) => (
                      <MenuItem key={day.key} value={day.key}>
                        {day.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button variant="contained" color="success" onClick={() => setAllCellsForSelectedDay(true)}>
                  Select All
                </Button>
                <Button variant="outlined" color="error" onClick={() => setAllCellsForSelectedDay(false)}>
                  Clear Day
                </Button>
              </Box>
              <Box sx={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', p: 1 }}>
                {cells.length === 0 ? (
                  <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', py: 1 }}>
                    No cells found. Add cells first to configure schedules.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'grid', gap: 1 }}>
                    {cells.map((cell) => {
                      const scheduled = isCellScheduledForSelectedDay(cell.id);
                      return (
                        <FormControlLabel
                          key={cell.id}
                          control={
                            <Checkbox
                              checked={scheduled}
                              onChange={() => toggleCellForSelectedDay(cell.id)}
                            />
                          }
                          label={cell.cell_name ? `${cell.cell_name} - ${cell.cell_number}` : cell.cell_number}
                          sx={{
                            mx: 0,
                            px: 1.25,
                            py: 0.75,
                            borderRadius: '8px',
                            border: scheduled ? '2px solid #10b981' : '1px solid #e5e7eb',
                            backgroundColor: scheduled ? '#ecfdf5' : '#fff',
                          }}
                        />
                      );
                    })}
                  </Box>
                )}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1.5, fontStyle: 'italic', color: '#6b7280' }}>
                {`${(weeklySchedule[selectedScheduleDay] || []).length} cell(s) scheduled for ${WEEK_DAYS.find(d => d.key === selectedScheduleDay)?.label || selectedScheduleDay}.`}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeModal} color="inherit">Done</Button>
            </DialogActions>
          </SettingsDialog>
        )}


        {modalOpen === 'username' && (
          <SettingsDialog open onClose={closeModal} maxWidth="xs">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <Box sx={{ color: '#4b5563', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Change Username</Typography>
            </DialogTitle>
            <DialogContent>
              <Box component="form" onSubmit={handleUsernameSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="New Username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                />
                <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' } }}>
                  Change Username
                </Button>
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'password' && (
          <SettingsDialog open onClose={closeModal} maxWidth="xs">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <Box sx={{ color: '#4b5563', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Change Password</Typography>
            </DialogTitle>
            <DialogContent>
              <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { minLength: 6 } }}
                />
                <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' } }}>
                  Change Password
                </Button>
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'telegram' && (
          <SettingsDialog open onClose={closeModal} maxWidth="sm">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <Box sx={{ color: '#0088cc', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Telegram Recovery Account</Typography>
            </DialogTitle>
            <DialogContent>
              <Box component="form" onSubmit={handleTelegramUsernameSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="Telegram Username"
                  value={newTelegramUsername}
                  onChange={(e) => setNewTelegramUsername(e.target.value)}
                  placeholder={telegramUsername ? `@${telegramUsername}` : 'Enter Telegram username (optional)'}
                  fullWidth
                  helperText={
                    telegramUsername
                      ? `Current: @${telegramUsername} — Leave empty to remove it, or enter a new one to update it.`
                      : 'Add your Telegram username to enable password recovery via Telegram. Leave empty to skip.'
                  }
                />
                <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' } }}>
                  {telegramUsername ? 'Update Telegram Username' : 'Add Telegram Username'}
                </Button>
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'cell' && (
          <SettingsDialog open onClose={closeModal} maxWidth="md">
            <DialogContent sx={{ pt: 3 }}>
              <SettingsDialogHeader
                icon={
                  <Box sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    border: '2px solid #93c5fd',
                    color: '#2563eb',
                    mx: 'auto',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="9" y1="3" x2="9" y2="21"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                      <line x1="3" y1="15" x2="21" y2="15"/>
                      <line x1="15" y1="3" x2="15" y2="21"/>
                    </svg>
                  </Box>
                }
                title="Manage Cells"
                subtitle="Add, edit, or remove cell configurations"
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  }
                  onClick={() => {
                    setEditingCell(null);
                    setCellForm({
                      cell_number: '',
                      cell_name: '',
                      capacity: 1,
                      status: 'active'
                    });
                    setCustomCellName('');
                    setModalOpen('editCell');
                  }}
                  sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' } }}
                >
                  Add New Cell
                </Button>
              </Box>
              <Box sx={{ maxHeight: 450, overflowY: 'auto', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)' }}>
                {cells.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6, color: '#9ca3af' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.5 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="9" y1="3" x2="9" y2="21"/>
                      <line x1="3" y1="9" x2="21" y2="9"/>
                    </svg>
                    <Typography sx={{ fontSize: 16, fontWeight: 500, color: '#9ca3af' }}>No cells found</Typography>
                    <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>Click "Add New Cell" to create your first cell</Typography>
                  </Box>
                ) : (
                  <table className="cell-management-table">
                    <thead>
                      <tr>
                        <th>Cell Name</th>
                        <th>Cell Number</th>
                        <th>Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cells.map((cell) => (
                        <tr key={cell.id}>
                          <td style={{ fontWeight: '500', color: '#111827' }}>
                            {cell.cell_name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>}
                          </td>
                          <td style={{ fontWeight: '600', color: '#374151' }}>{cell.cell_number}</td>
                          <td style={{ color: '#4b5563' }}>{cell.capacity}</td>
                          <td>
                            <span className={`status-badge ${cell.status}`}>
                              {cell.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-buttons">
                              <button 
                                className="edit-btn"
                                onClick={() => handleEditCell(cell)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                              </button>
                              <button 
                                className="delete-btn"
                                onClick={() => handleDeleteCell(cell.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"/>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'editCell' && (
          <SettingsDialog open onClose={closeModal} maxWidth="xs">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <Box sx={{ color: '#2563eb', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{editingCell ? 'Edit Cell' : 'Add New Cell'}</Typography>
            </DialogTitle>
            <DialogContent>
              <Box component="form" onSubmit={handleCellSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label="Cell Number *"
                  value={cellForm.cell_number}
                  onChange={(e) => setCellForm({ ...cellForm, cell_number: e.target.value })}
                  required
                  fullWidth
                  placeholder="e.g., C1, C2, etc."
                  autoFocus
                />
                <FormControl fullWidth>
                  <InputLabel>Cell Name</InputLabel>
                  <Select
                    label="Cell Name"
                    value={cellForm.cell_name}
                    onChange={(e) => {
                      setCellForm({ ...cellForm, cell_name: e.target.value });
                      if (e.target.value !== 'Other') {
                        setCustomCellName('');
                      }
                    }}
                  >
                    <MenuItem value="">Select Cell Type</MenuItem>
                    <MenuItem value="Quarantine">Quarantine</MenuItem>
                    <MenuItem value="Cell">Cell</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
                {cellForm.cell_name === 'Other' && (
                  <TextField
                    label="Custom Cell Name *"
                    value={customCellName}
                    onChange={(e) => setCustomCellName(e.target.value)}
                    required
                    fullWidth
                    placeholder="Enter custom cell name"
                  />
                )}
                <TextField
                  label="Capacity"
                  type="number"
                  value={cellForm.capacity}
                  onChange={(e) => setCellForm({ ...cellForm, capacity: parseInt(e.target.value) || 1 })}
                  fullWidth
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    label="Status"
                    value={cellForm.status}
                    onChange={(e) => setCellForm({ ...cellForm, status: e.target.value })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="maintenance">Maintenance</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                  <Button type="submit" variant="contained" fullWidth sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' } }}>
                    {editingCell ? 'Update Cell' : 'Add Cell'}
                  </Button>
                  <Button type="button" onClick={closeModal} variant="outlined" color="inherit" fullWidth>
                    Cancel
                  </Button>
                </Box>
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'deleteAllPdls' && (
          <SettingsDialog open onClose={closeModal} maxWidth="xs">
            <DialogContent sx={{ pt: 3 }}>
              <SettingsDialogHeader
                icon={
                  <Box sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #fca5a5',
                    color: '#dc2626',
                    mx: 'auto',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </Box>
                }
                title="Delete All PDLs"
              />
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography sx={{ fontSize: 16, color: '#374151', mb: 1.5 }}>
                  Are you sure you want to delete <strong>ALL PDLs</strong>?
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5 }}>
                  This action will permanently remove all PDL records from the database.
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#dc2626', fontWeight: 600, mb: 2.5 }}>
                  This action cannot be undone!
                </Typography>
              </Box>
              <TextField
                label='Type "Yes Delete All" to confirm'
                value={deleteAllPdlsConfirmation}
                onChange={(e) => setDeleteAllPdlsConfirmation(e.target.value)}
                placeholder="Yes Delete All"
                fullWidth
                sx={{ mb: 2.5 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                <Button
                  onClick={handleDeleteAllPdls}
                  disabled={deleteAllPdlsConfirmation !== 'Yes Delete All'}
                  variant="contained"
                  color="error"
                  sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                >
                  Yes, Delete All
                </Button>
                <Button onClick={closeModal} variant="outlined" color="inherit">
                  Cancel
                </Button>
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'deleteLogs' && (
          <SettingsDialog open onClose={closeModal} maxWidth="md">
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
              <Box sx={{ color: '#dc2626', display: 'flex' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Delete Logs</Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>Choose a deletion method below</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                {/* Delete All Logs Card */}
                <Box
                  onClick={() => setModalOpen('deleteAllLogsConfirm')}
                  sx={{
                    p: 2.5,
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #fca5a5',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)',
                      borderColor: '#f87171'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#991b1b' }}>Delete All Logs</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.5, mb: 1.5 }}>
                    Permanently remove all log records from the database
                  </Typography>
                  <Box sx={{
                    p: 1,
                    background: 'rgba(220, 38, 38, 0.1)',
                    borderRadius: '6px',
                    fontSize: 12,
                    color: '#991b1b',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Irreversible action
                  </Box>
                </Box>

                {/* Delete by Specific Date Card */}
                <Box sx={{
                  p: 2.5,
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  border: '2px solid #93c5fd',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1e40af' }}>Delete by Date</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.5, mb: 2 }}>
                    Remove logs for a specific date
                  </Typography>
                  <TextField
                    type="date"
                    id="deleteDate"
                    size="small"
                    fullWidth
                    sx={{ mb: 1.5, bgcolor: 'white' }}
                  />
                  <Button
                    onClick={() => {
                      const date = document.getElementById('deleteDate').value;
                      if (date) {
                        handleDeleteLogsByDate(date);
                      } else {
                        alert('Please select a date');
                      }
                    }}
                    variant="contained"
                    fullWidth
                    sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' }, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
                  >
                    Delete Logs
                  </Button>
                </Box>

                {/* Delete by Date Range Card */}
                <Box sx={{
                  p: 2.5,
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  border: '2px solid #93c5fd',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                        <path d="M8 14h.01"/>
                        <path d="M12 14h.01"/>
                        <path d="M16 14h.01"/>
                        <path d="M8 18h.01"/>
                        <path d="M12 18h.01"/>
                        <path d="M16 18h.01"/>
                      </svg>
                    </Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1e40af' }}>Delete by Range</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.5, mb: 2 }}>
                    Remove logs within a date range
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 11, color: '#1e40af', mb: 0.5, fontWeight: 500 }}>Start Date</Typography>
                      <TextField type="date" id="startDate" size="small" fullWidth sx={{ bgcolor: 'white' }} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 11, color: '#1e40af', mb: 0.5, fontWeight: 500 }}>End Date</Typography>
                      <TextField type="date" id="endDate" size="small" fullWidth sx={{ bgcolor: 'white' }} />
                    </Box>
                  </Box>
                  <Button
                    onClick={() => {
                      const startDate = document.getElementById('startDate').value;
                      const endDate = document.getElementById('endDate').value;
                      if (startDate && endDate) {
                        if (new Date(startDate) <= new Date(endDate)) {
                          handleDeleteLogsByDateRange(startDate, endDate);
                        } else {
                          alert('Start date must be before or equal to end date');
                        }
                      } else {
                        alert('Please select both start and end dates');
                      }
                    }}
                    variant="contained"
                    fullWidth
                    sx={{ bgcolor: '#2563eb', '&:hover': { bgcolor: '#1e40af' }, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
                  >
                    Delete Logs
                  </Button>
                </Box>

                {/* Select Specific Logs Card */}
                <Box
                  onClick={openLogsSelectionModal}
                  sx={{
                    p: 2.5,
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    border: '2px solid #93c5fd',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                      borderColor: '#60a5fa'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box sx={{
                      width: 40,
                      height: 40,
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                    </Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#1e40af' }}>Select Logs</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.5, mb: 1.5 }}>
                    Choose specific logs from a list to delete
                  </Typography>
                  <Box sx={{
                    p: 1,
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '6px',
                    fontSize: 12,
                    color: '#1e40af',
                    fontWeight: 500
                  }}>
                    Click to open selection
                  </Box>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', borderTop: '1px solid #e5e7eb', px: 3, py: 2 }}>
              <Button onClick={closeModal} variant="outlined" color="inherit">
                Cancel
              </Button>
            </DialogActions>
          </SettingsDialog>
        )}

        {modalOpen === 'deleteAllLogsConfirm' && (
          <SettingsDialog open onClose={closeModal} maxWidth="xs">
            <DialogContent sx={{ pt: 3 }}>
              <SettingsDialogHeader
                icon={
                  <Box sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #fca5a5',
                    color: '#dc2626',
                    mx: 'auto',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </Box>
                }
                title="Delete All Logs"
              />
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography sx={{ fontSize: 16, color: '#374151', mb: 1.5 }}>
                  Are you sure you want to delete <strong>ALL LOGS</strong>?
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280', mb: 1.5 }}>
                  This action will permanently remove all log records from the database.
                </Typography>
                <Typography sx={{ fontSize: 14, color: '#dc2626', fontWeight: 600, mb: 2.5 }}>
                  This action cannot be undone!
                </Typography>
              </Box>
              <TextField
                label='Type "Yes Delete All" to confirm'
                value={deleteAllLogsConfirmation}
                onChange={(e) => setDeleteAllLogsConfirmation(e.target.value)}
                placeholder="Yes Delete All"
                fullWidth
                sx={{ mb: 2.5 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
                <Button
                  onClick={handleDeleteAllLogs}
                  disabled={deleteAllLogsConfirmation !== 'Yes Delete All'}
                  variant="contained"
                  color="error"
                  sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                >
                  Yes, Delete All
                </Button>
                <Button onClick={closeModal} variant="outlined" color="inherit">
                  Cancel
                </Button>
              </Box>
            </DialogContent>
          </SettingsDialog>
        )}

        {modalOpen === 'selectLogs' && (
          <SettingsDialog open onClose={closeModal} maxWidth="sm">
            <DialogContent sx={{ pt: 3 }}>
              <SettingsDialogHeader
                icon={
                  <Box sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                    border: '2px solid #fca5a5',
                    color: '#dc2626',
                    mx: 'auto',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </Box>
                }
                title="Select Logs to Delete"
              />
              <Typography sx={{ fontSize: 16, color: '#374151', textAlign: 'center', mb: 1 }}>
                Select the logs you want to delete:
              </Typography>
              <Typography variant="body2" sx={{ color: '#6b7280', textAlign: 'center', mb: 2 }}>
                {selectedLogs.length} of {logs.length} logs selected
              </Typography>

              {loadingLogs ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <CircularProgress size={28} sx={{ color: '#2563eb' }} />
                  <Typography sx={{ fontSize: 16, color: '#6b7280', mt: 2 }}>Loading logs...</Typography>
                </Box>
              ) : logs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography sx={{ fontSize: 16, color: '#6b7280' }}>No logs found</Typography>
                </Box>
              ) : (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedLogs.length === logs.length && logs.length > 0}
                        onChange={(e) => handleSelectAllLogs(e.target.checked)}
                      />
                    }
                    label={`Select All (${logs.length} logs)`}
                    sx={{
                      px: 2,
                      py: 1,
                      m: 0,
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb',
                      '& .MuiTypography-root': { fontWeight: 600, color: '#374151' }
                    }}
                  />

                  <Box sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    {logs.map((log) => (
                      <Box
                        key={log.id}
                        sx={{
                          p: '12px 16px',
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                          backgroundColor: selectedLogs.includes(log.id) ? '#fef2f2' : 'white',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <Checkbox
                          checked={selectedLogs.includes(log.id)}
                          onChange={(e) => handleLogSelection(log.id, e.target.checked)}
                          sx={{ pt: 0 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                            <Typography sx={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>
                              ID: {log.id} | {log.visitor_name}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                              {new Date(log.scan_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 12, color: '#6b7280', mb: 0.25 }}>
                            PDL: {log.pdl_name} | Cell: {log.cell}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                            Time In: {log.time_in ? new Date(log.time_in).toLocaleTimeString() : 'N/A'} |
                            Time Out: {log.time_out ? new Date(log.time_out).toLocaleTimeString() : 'Open'}
                          </Typography>
                          {log.relationship && (
                            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                              Relationship: {log.relationship}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2.5,
                    p: 2,
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <Typography sx={{ fontSize: 14, color: '#374151' }}>
                      {selectedLogs.length} log(s) selected
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button onClick={closeModal} variant="outlined" color="inherit">
                        Cancel
                      </Button>
                      <Button
                        onClick={handleDeleteSelectedLogs}
                        disabled={selectedLogs.length === 0}
                        variant="contained"
                        color="error"
                        sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                      >
                        Delete Selected ({selectedLogs.length})
                      </Button>
                    </Box>
                  </Box>
                </>
              )}
            </DialogContent>
          </SettingsDialog>
        )}

        {/* Registration Codes Modal */}
        {modalOpen === 'registrationCodes' && (
          <SettingsDialog open onClose={closeModal} maxWidth="md">
            <DialogContent sx={{ pt: 3 }}>
              <SettingsDialogHeader
                icon={
                  <Box sx={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%)',
                    border: '2px solid #67e8f9',
                    color: '#0891b2',
                    mx: 'auto',
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </Box>
                }
                title="Registration Codes"
                subtitle="Generate and manage registration codes"
              />

              {/* Create New Code Form */}
              <Box component="form" onSubmit={handleCreateRegistrationCode} sx={{
                p: 2.5,
                background: '#f9fafb',
                borderRadius: '8px',
                mb: 3,
                border: '1px solid #e5e7eb'
              }}>
                <Typography sx={{ fontSize: 16, color: '#111827', mb: 2, fontWeight: 600 }}>Create New Code</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <TextField
                    label="Code (leave empty to auto-generate)"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g., STAFF2024"
                    size="small"
                    sx={{ flex: '1 1 200px', minWidth: 180 }}
                  />
                  <TextField
                    label="Valid for (days)"
                    type="number"
                    value={newCodeDays}
                    onChange={(e) => setNewCodeDays(e.target.value)}
                    size="small"
                    slotProps={{ htmlInput: { min: 1 } }}
                    placeholder="90"
                    sx={{ flex: '0 1 120px' }}
                  />
                  <TextField
                    label="Usage limit"
                    type="number"
                    value={newCodeLimit}
                    onChange={(e) => setNewCodeLimit(e.target.value)}
                    size="small"
                    slotProps={{ htmlInput: { min: 1 } }}
                    placeholder="1"
                    sx={{ flex: '0 1 120px' }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{ bgcolor: '#0891b2', '&:hover': { bgcolor: '#0e7490' } }}
                  >
                    Generate Code
                  </Button>
                </Box>
              </Box>

              {/* Codes List */}
              {loadingCodes ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <CircularProgress size={28} sx={{ color: '#0891b2' }} />
                  <Typography sx={{ fontSize: 16, color: '#6b7280', mt: 2 }}>Loading codes...</Typography>
                </Box>
              ) : registrationCodes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography sx={{ fontSize: 16, color: '#6b7280' }}>No registration codes found</Typography>
                  <Typography sx={{ fontSize: 14, color: '#9ca3af', mt: 1 }}>Create your first code above</Typography>
                </Box>
              ) : (
                <Box sx={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                  {registrationCodes.map((codeRow, index) => {
                    const isUsed = codeRow.is_used === 1 || codeRow.is_used === true;
                    const expiresAt = codeRow.expires_at ? new Date(codeRow.expires_at) : null;
                    const usedAt = codeRow.used_at ? new Date(codeRow.used_at) : null;
                    const now = new Date();

                    let status = 'Available';
                    let statusColor = '#10b981';
                    if (isUsed) {
                      status = 'Used';
                      statusColor = '#6b7280';
                    } else if (expiresAt && expiresAt < now) {
                      status = 'Expired';
                      statusColor = '#ef4444';
                    }

                    return (
                      <Box
                        key={codeRow.id || index}
                        sx={{
                          p: 2,
                          borderBottom: '1px solid #f3f4f6',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: isUsed ? '#f9fafb' : 'white'
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Typography sx={{
                              fontWeight: 600,
                              fontSize: 16,
                              color: '#111827',
                              fontFamily: 'monospace',
                              letterSpacing: '1px'
                            }}>
                              {codeRow.code}
                            </Typography>
                            <Typography sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: '12px',
                              fontSize: 12,
                              fontWeight: 600,
                              backgroundColor: statusColor + '20',
                              color: statusColor
                            }}>
                              {status}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                            Created: {new Date(codeRow.created_at).toLocaleString()}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                            Usage: {codeRow.used_count || 0} / {codeRow.use_limit || 1}
                          </Typography>
                          {expiresAt && (
                            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                              Expires: {expiresAt.toLocaleString()}
                              {expiresAt < now && <Box component="span" sx={{ color: '#ef4444', ml: 1 }}>(EXPIRED)</Box>}
                            </Typography>
                          )}
                          {usedAt && (
                            <Typography sx={{ fontSize: 12, color: '#6b7280' }}>
                              Used: {usedAt.toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                        {!isUsed && expiresAt && expiresAt > now && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="inherit"
                            onClick={() => {
                              navigator.clipboard.writeText(codeRow.code);
                              alert(`Code "${codeRow.code}" copied to clipboard!`);
                            }}
                            sx={{ ml: 2 }}
                          >
                            Copy
                          </Button>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'flex-end', px: 3, py: 2 }}>
              <Button onClick={closeModal} variant="outlined" color="inherit">
                Close
              </Button>
            </DialogActions>
          </SettingsDialog>
        )}

      </div>
    </>
  );
};

export default Settings;
