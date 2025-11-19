import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from '../services/api';
import './Settings.css';

const Modal = ({ children, onClose }) => {
  const overlayRef = React.useRef(null);
  
  // Prevent body scroll when modal is open and ensure overlay covers everything
  React.useEffect(() => {
    // Save current scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    // Calculate full document height to ensure overlay covers everything
    const documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    
    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBgColor = document.body.style.backgroundColor;
    const originalHtmlBgColor = document.documentElement.style.backgroundColor;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalLeft = document.body.style.left;
    const originalWidth = document.body.style.width;
    
    // Prevent scrolling on both body and html
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Lock body position to prevent scroll (keep current scroll position)
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.width = '100%';
    
    // Ensure background doesn't show white behind modal
    document.body.style.backgroundColor = '#f9fafb';
    document.documentElement.style.backgroundColor = '#f9fafb';
    
    // Set overlay height to cover full document
    if (overlayRef.current) {
      overlayRef.current.style.height = `${documentHeight}px`;
      overlayRef.current.style.minHeight = `${documentHeight}px`;
    }
    
    return () => {
      // Restore original styles
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.backgroundColor = originalBgColor;
      document.documentElement.style.backgroundColor = originalHtmlBgColor;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.left = originalLeft;
      document.body.style.width = originalWidth;
      
      // Reset overlay height
      if (overlayRef.current) {
        overlayRef.current.style.height = '';
        overlayRef.current.style.minHeight = '';
      }
      
      // Restore scroll position
      window.scrollTo(scrollX, scrollY);
    };
  }, []);

  // Render modal at document body level to ensure it covers everything
  return ReactDOM.createPortal(
    <div className="modal-overlay" ref={overlayRef} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>,
    document.body
  );
};

const Settings = () => {
  const [modalOpen, setModalOpen] = useState(null); // 'username', 'password', 'telegram', 'cell', 'editCell', 'deleteAllPdls', 'deleteLogs', 'selectLogs', 'registrationCodes', 'systemInfo' or null
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newTelegramUsername, setNewTelegramUsername] = useState('');
  const [username, setUsername] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
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
  
  // Schedule duration setting
  const [scheduleDuration, setScheduleDuration] = useState(() => {
    const saved = localStorage.getItem('scheduleDuration');
    return saved !== null ? parseInt(saved, 10) : 12; // Default 12 hours
  });
  
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

  // Handle Schedule Duration change
  const handleScheduleDurationChange = (value) => {
    const numValue = value === '' ? 12 : parseInt(value, 10);
    if (!isNaN(numValue) && (numValue === -1 || numValue > 0)) {
      setScheduleDuration(numValue);
      localStorage.setItem('scheduleDuration', numValue.toString());
    }
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
        <h2>Settings</h2>
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

          <div className="settings-card" onClick={() => openModal('systemInfo')}>
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </div>
            <div className="settings-card-content">
              <h3>System Information</h3>
              <p>View app version and system details</p>
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
                  height: 0
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

        {/* Schedule Duration Setting */}
        <div style={{
          marginTop: '24px',
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
              Schedule Cell Visits Duration
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
              How long should scheduled cell visits persist? (in hours)
            </p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min="1"
                step="1"
                value={scheduleDuration === -1 ? '' : scheduleDuration}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    handleScheduleDurationChange('');
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue) && numValue > 0) {
                      handleScheduleDurationChange(numValue);
                    }
                  }
                }}
                placeholder="12"
                style={{
                  width: '100px',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                disabled={scheduleDuration === -1}
              />
              <span style={{ fontSize: '14px', color: '#6b7280' }}>hours</span>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}>
                <input
                  type="checkbox"
                  checked={scheduleDuration === -1}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleScheduleDurationChange(-1);
                    } else {
                      handleScheduleDurationChange(12);
                    }
                  }}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>Indefinitely (never expire)</span>
              </label>
            </div>
            <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
              {scheduleDuration === -1 
                ? 'Scheduled cells will persist until manually cleared.' 
                : `Scheduled cells will persist for ${scheduleDuration} hour(s) after being set.`}
            </p>
          </div>
        </div>

        {modalOpen === 'username' && (
          <Modal onClose={closeModal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4b5563' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3 style={{ margin: 0 }}>Change Username</h3>
            </div>
            <form onSubmit={handleUsernameSubmit} className="settings-form">
              <label htmlFor="username">New Username:</label>
              <input
                type="text"
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
              <button type="submit">Change Username</button>
            </form>
          </Modal>
        )}

        {modalOpen === 'password' && (
          <Modal onClose={closeModal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#4b5563' }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h3 style={{ margin: 0 }}>Change Password</h3>
            </div>
            <form onSubmit={handlePasswordSubmit} className="settings-form">
              <label htmlFor="currentPassword">Current Password:</label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <label htmlFor="newPassword">New Password:</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength="6"
              />
              <button type="submit">Change Password</button>
            </form>
          </Modal>
        )}

        {modalOpen === 'telegram' && (
          <Modal onClose={closeModal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#0088cc' }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <h3 style={{ margin: 0 }}>Telegram Recovery Account</h3>
            </div>
            <form onSubmit={handleTelegramUsernameSubmit} className="settings-form">
              <label htmlFor="telegramUsername">
                Telegram Username (for password recovery):
                {telegramUsername && (
                  <span style={{ fontSize: '0.85em', color: '#6b7280', marginLeft: '8px' }}>
                    Current: @{telegramUsername}
                  </span>
                )}
              </label>
              <input
                type="text"
                id="telegramUsername"
                value={newTelegramUsername}
                onChange={(e) => setNewTelegramUsername(e.target.value)}
                placeholder={telegramUsername ? `@${telegramUsername}` : 'Enter Telegram username (optional)'}
              />
              <p style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '-10px', marginBottom: '20px' }}>
                {telegramUsername 
                  ? 'Leave empty to remove your Telegram username, or enter a new one to update it.'
                  : 'Add your Telegram username to enable password recovery via Telegram. Leave empty to skip.'}
              </p>
              <button type="submit">{telegramUsername ? 'Update Telegram Username' : 'Add Telegram Username'}</button>
            </form>
          </Modal>
        )}

        {modalOpen === 'cell' && (
          <Modal onClose={closeModal}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #93c5fd'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2563eb' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                Manage Cells
              </h3>
              <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                Add, edit, or remove cell configurations
              </p>
            </div>

            <div style={{ 
              marginBottom: '20px', 
              display: 'flex', 
              justifyContent: 'center' 
            }}>
              <button 
                className="add-cell-btn"
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
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add New Cell
              </button>
            </div>
            
            <div style={{ 
              maxHeight: '450px', 
              overflowY: 'auto',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              {cells.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: '#9ca3af'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                    <line x1="3" y1="9" x2="21" y2="9"/>
                  </svg>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '500' }}>
                    No cells found
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.7 }}>
                    Click "Add New Cell" to create your first cell
                  </p>
                </div>
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
            </div>
          </Modal>
        )}

        {modalOpen === 'editCell' && (
          <Modal onClose={closeModal}>
            <h3>{editingCell ? 'Edit Cell' : 'Add New Cell'}</h3>
            <form onSubmit={handleCellSubmit} className="settings-form">
              <label htmlFor="cell_number">Cell Number *:</label>
              <input
                type="text"
                id="cell_number"
                value={cellForm.cell_number}
                onChange={(e) => setCellForm({ ...cellForm, cell_number: e.target.value })}
                required
                placeholder="e.g., C1, C2, etc."
              />
              
              <label htmlFor="cell_name">Cell Name:</label>
              <select
                id="cell_name"
                value={cellForm.cell_name}
                onChange={(e) => {
                  setCellForm({ ...cellForm, cell_name: e.target.value });
                  // Clear custom name when switching away from "Other"
                  if (e.target.value !== 'Other') {
                    setCustomCellName('');
                  }
                }}
              >
                <option value="">Select Cell Type</option>
                <option value="Quarantine">Quarantine</option>
                <option value="Cell">Cell</option>
                <option value="Other">Other</option>
              </select>
              
              {cellForm.cell_name === 'Other' && (
                <>
                  <label htmlFor="custom_cell_name">Custom Cell Name:</label>
                  <input
                    type="text"
                    id="custom_cell_name"
                    value={customCellName}
                    onChange={(e) => setCustomCellName(e.target.value)}
                    placeholder="Enter custom cell name"
                    required
                  />
                </>
              )}
              
              <label htmlFor="capacity">Capacity:</label>
              <input
                type="number"
                id="capacity"
                value={cellForm.capacity}
                onChange={(e) => setCellForm({ ...cellForm, capacity: parseInt(e.target.value) || 1 })}
                min="1"
              />
              
              <label htmlFor="status">Status:</label>
              <select
                id="status"
                value={cellForm.status}
                onChange={(e) => setCellForm({ ...cellForm, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" style={{ flex: 1 }}>
                  {editingCell ? 'Update Cell' : 'Add Cell'}
                </button>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  style={{ 
                    flex: 1, 
                    background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #4b5563 0%, #374151 100%)';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(75, 85, 99, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {modalOpen === 'deleteAllPdls' && (
          <Modal onClose={closeModal}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fca5a5'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#dc2626' }}>
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                Delete All PDLs
              </h3>
            </div>
            
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ marginBottom: '15px', fontSize: '16px', color: '#374151' }}>
                Are you sure you want to delete <strong>ALL PDLs</strong>?
              </p>
              <p style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
                This action will permanently remove all PDL records from the database.
              </p>
              <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: '600', marginBottom: '20px' }}>
                This action cannot be undone!
              </p>
              
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  textAlign: 'left'
                }}>
                  Type <strong>"Yes Delete All"</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteAllPdlsConfirmation}
                  onChange={(e) => setDeleteAllPdlsConfirmation(e.target.value)}
                  placeholder="Yes Delete All"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#dc2626';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={handleDeleteAllPdls}
                disabled={deleteAllPdlsConfirmation !== 'Yes Delete All'}
                style={{
                  background: deleteAllPdlsConfirmation === 'Yes Delete All' 
                    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                    : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleteAllPdlsConfirmation === 'Yes Delete All' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: deleteAllPdlsConfirmation === 'Yes Delete All' ? 1 : 0.6
                }}
              >
                Yes, Delete All
              </button>
              <button
                onClick={closeModal}
                style={{
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}

        {modalOpen === 'deleteLogs' && (
          <Modal onClose={closeModal}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fca5a5'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#dc2626' }}>
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                Delete Logs
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Choose a deletion method below
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* Delete All Logs Card */}
              <div
                onClick={() => setModalOpen('deleteAllLogsConfirm')}
                style={{
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  border: '2px solid #fca5a5',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.2)';
                  e.currentTarget.style.borderColor = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.1)';
                  e.currentTarget.style.borderColor = '#fca5a5';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
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
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#991b1b' }}>
                    Delete All Logs
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#7f1d1d', lineHeight: '1.5' }}>
                  Permanently remove all log records from the database
                </p>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(220, 38, 38, 0.1)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#991b1b',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Irreversible action
                </div>
              </div>

              {/* Delete by Specific Date Card */}
              <div style={{ 
                padding: '20px', 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                border: '2px solid #93c5fd',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
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
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                    Delete by Date
                  </h4>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
                  Remove logs for a specific date
                </p>
                <input
                  type="date"
                  id="deleteDate"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #93c5fd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '12px',
                    background: 'white',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#93c5fd';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={() => {
                    const date = document.getElementById('deleteDate').value;
                    if (date) {
                      handleDeleteLogsByDate(date);
                    } else {
                      alert('Please select a date');
                    }
                  }}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                  }}
                >
                  Delete Logs
                </button>
              </div>

              {/* Delete by Date Range Card */}
              <div style={{ 
                padding: '20px', 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                border: '2px solid #93c5fd',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
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
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                    Delete by Range
                  </h4>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
                  Remove logs within a date range
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 calc(50% - 4px)', minWidth: '120px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: '500' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '2px solid #93c5fd',
                        borderRadius: '6px',
                        fontSize: '13px',
                        background: 'white',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#93c5fd';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                  <div style={{ flex: '1 1 calc(50% - 4px)', minWidth: '120px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#1e40af', marginBottom: '4px', fontWeight: '500' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '2px solid #93c5fd',
                        borderRadius: '6px',
                        fontSize: '13px',
                        background: 'white',
                        transition: 'border-color 0.2s ease',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#93c5fd';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>
                <button
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
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                  }}
                >
                  Delete Logs
                </button>
              </div>

              {/* Select Specific Logs Card */}
              <div
                onClick={openLogsSelectionModal}
                style={{ 
                  padding: '20px', 
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  border: '2px solid #93c5fd',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
                  e.currentTarget.style.borderColor = '#60a5fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.borderColor = '#93c5fd';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
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
                  </div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e40af' }}>
                    Select Logs
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#1e3a8a', lineHeight: '1.5' }}>
                  Choose specific logs from a list to delete
                </p>
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#1e40af',
                  fontWeight: '500'
                }}>
                  Click to open selection
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <button
                onClick={closeModal}
                style={{
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e5e7eb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}

        {modalOpen === 'deleteAllLogsConfirm' && (
          <Modal onClose={closeModal}>
            <h3 style={{ color: '#dc2626', textAlign: 'center' }}>⚠️ Delete All Logs</h3>
            
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ marginBottom: '15px', fontSize: '16px', color: '#374151' }}>
                Are you sure you want to delete <strong>ALL LOGS</strong>?
              </p>
              <p style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
                This action will permanently remove all log records from the database.
              </p>
              <p style={{ fontSize: '14px', color: '#dc2626', fontWeight: '600', marginBottom: '20px' }}>
                This action cannot be undone!
              </p>
              
              <div style={{ marginTop: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  textAlign: 'left'
                }}>
                  Type <strong>"Yes Delete All"</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteAllLogsConfirmation}
                  onChange={(e) => setDeleteAllLogsConfirmation(e.target.value)}
                  placeholder="Yes Delete All"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#dc2626';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={handleDeleteAllLogs}
                disabled={deleteAllLogsConfirmation !== 'Yes Delete All'}
                style={{
                  background: deleteAllLogsConfirmation === 'Yes Delete All' 
                    ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' 
                    : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: deleteAllLogsConfirmation === 'Yes Delete All' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: deleteAllLogsConfirmation === 'Yes Delete All' ? 1 : 0.6
                }}
              >
                Yes, Delete All
              </button>
              <button
                onClick={closeModal}
                style={{
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
            </div>
          </Modal>
        )}

        {modalOpen === 'selectLogs' && (
          <Modal onClose={closeModal}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fca5a5'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#dc2626' }}>
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: '#111827' }}>
                Select Logs to Delete
              </h3>
            </div>
            
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ marginBottom: '15px', fontSize: '16px', color: '#374151' }}>
                Select the logs you want to delete:
              </p>
              <p style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
                {selectedLogs.length} of {logs.length} logs selected
              </p>
            </div>

            {loadingLogs ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading logs...</div>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>No logs found</div>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                <div style={{ 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="checkbox"
                    id="selectAll"
                    checked={selectedLogs.length === logs.length && logs.length > 0}
                    onChange={(e) => handleSelectAllLogs(e.target.checked)}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <label htmlFor="selectAll" style={{ fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
                    Select All ({logs.length} logs)
                  </label>
                </div>

                {/* Logs List */}
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}>
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backgroundColor: selectedLogs.includes(log.id) ? '#fef2f2' : 'white',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLogs.includes(log.id)}
                        onChange={(e) => handleLogSelection(log.id, e.target.checked)}
                        style={{ transform: 'scale(1.1)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '4px'
                        }}>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>
                            ID: {log.id} | {log.visitor_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {new Date(log.scan_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
                          PDL: {log.pdl_name} | Cell: {log.cell}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Time In: {log.time_in ? new Date(log.time_in).toLocaleTimeString() : 'N/A'} | 
                          Time Out: {log.time_out ? new Date(log.time_out).toLocaleTimeString() : 'Open'}
                        </div>
                        {log.relationship && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Relationship: {log.relationship}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '20px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px'
                }}>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    {selectedLogs.length} log(s) selected
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={closeModal}
                      style={{
                        background: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSelectedLogs}
                      disabled={selectedLogs.length === 0}
                      style={{
                        background: selectedLogs.length === 0 
                          ? '#d1d5db' 
                          : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: selectedLogs.length === 0 ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: selectedLogs.length === 0 ? 0.6 : 1
                      }}
                    >
                      Delete Selected ({selectedLogs.length})
                    </button>
                  </div>
                </div>
              </>
            )}
          </Modal>
        )}

        {/* Registration Codes Modal */}
        {modalOpen === 'registrationCodes' && (
          <Modal onClose={closeModal}>
            <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#111827' }}>Registration Codes</h2>
            
            {/* Create New Code Form */}
            <div style={{
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '8px',
              marginBottom: '24px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', color: '#111827' }}>Create New Code</h3>
              <form onSubmit={handleCreateRegistrationCode} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Code (leave empty to auto-generate)
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="e.g., STAFF2024"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ flex: '0 1 120px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Valid for (days)
                  </label>
                  <input
                    type="number"
                    value={newCodeDays}
                    onChange={(e) => setNewCodeDays(e.target.value)}
                    min="1"
                    placeholder="90"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Generate Code
                </button>
              </form>
            </div>

            {/* Codes List */}
            {loadingCodes ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>Loading codes...</div>
              </div>
            ) : registrationCodes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ fontSize: '16px', color: '#6b7280' }}>No registration codes found</div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '8px' }}>Create your first code above</div>
              </div>
            ) : (
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
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
                    <div
                      key={codeRow.id || index}
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isUsed ? '#f9fafb' : 'white'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <div style={{
                            fontWeight: '600',
                            fontSize: '16px',
                            color: '#111827',
                            fontFamily: 'monospace',
                            letterSpacing: '1px'
                          }}>
                            {codeRow.code}
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: statusColor + '20',
                            color: statusColor
                          }}>
                            {status}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Created: {new Date(codeRow.created_at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          Usage: {codeRow.used_count || 0} / {codeRow.use_limit || 1}
                        </div>
                        {expiresAt && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Expires: {expiresAt.toLocaleString()}
                            {expiresAt < now && <span style={{ color: '#ef4444', marginLeft: '8px' }}>(EXPIRED)</span>}
                          </div>
                        )}
                        {usedAt && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Used: {usedAt.toLocaleString()}
                          </div>
                        )}
                      </div>
                      {!isUsed && expiresAt && expiresAt > now && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(codeRow.code);
                            alert(`Code "${codeRow.code}" copied to clipboard!`);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer'
                          }}
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Close Button */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 24px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </Modal>
        )}

        {/* System Information Modal */}
        {modalOpen === 'systemInfo' && (
          <Modal onClose={closeModal}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#f59e0b' }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <h3 style={{ margin: 0 }}>System Information</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Application Name:</span>
                  <span style={{ color: '#6b7280' }}>Jail Visitation Management System</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Environment:</span>
                  <span style={{ color: '#6b7280' }}>{process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Database Type:</span>
                  <span style={{ color: '#6b7280' }}>SQLite and PostgreSQL (Neon)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Frontend URL:</span>
                  <span style={{ color: '#6b7280', fontSize: '0.85em', wordBreak: 'break-all' }}>{process.env.REACT_APP_API_URL || window.location.origin}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Current User:</span>
                  <span style={{ color: '#6b7280' }}>{username || 'Not logged in'}</span>
                </div>
              </div>
              <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Browser:</span>
                  <span style={{ color: '#6b7280', fontSize: '0.85em' }}>{navigator.userAgent.split(' ').slice(-2).join(' ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Screen Resolution:</span>
                  <span style={{ color: '#6b7280' }}>{window.screen.width} × {window.screen.height}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '600', color: '#374151' }}>Viewport Size:</span>
                  <span style={{ color: '#6b7280' }}>{window.innerWidth} × {window.innerHeight}</span>
                </div>
              </div>
              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <p style={{ margin: 0, fontSize: '0.85em', color: '#1e40af', textAlign: 'center' }}>
                  <strong>Version:</strong> 1.0.0 | Last Updated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 24px',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
};

export default Settings;
