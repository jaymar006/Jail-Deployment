import React from 'react';
import Chip from '@mui/material/Chip';

const STATUS_MAP = {
  active: { label: 'Active', tone: 'success' },
  allowed: { label: 'Allowed', tone: 'success' },
  approved: { label: 'Approved', tone: 'success' },
  success: { label: 'Success', tone: 'success' },
  inside: { label: 'Inside', tone: 'success' },
  time_in: { label: 'Inside', tone: 'success' },
  verified: { label: 'Verified', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  scheduled: { label: 'Scheduled', tone: 'warning' },
  warning: { label: 'Warning', tone: 'warning' },
  maintenance: { label: 'Maintenance', tone: 'warning' },
  denied: { label: 'Denied', tone: 'error' },
  declined: { label: 'Declined', tone: 'error' },
  rejected: { label: 'Rejected', tone: 'error' },
  error: { label: 'Error', tone: 'error' },
  restricted: { label: 'Restricted', tone: 'error' },
  inactive: { label: 'Inactive', tone: 'error' },
  disabled: { label: 'Disabled', tone: 'default' },
  removed: { label: 'Removed', tone: 'default' },
  none: { label: 'None', tone: 'default' },
  empty: { label: 'None', tone: 'default' },
};

const TONE_STYLES = {
  success: { bgcolor: 'success.light', color: 'success.dark' },
  warning: { bgcolor: 'warning.light', color: 'warning.dark' },
  error: { bgcolor: 'error.light', color: 'error.dark' },
  info: { bgcolor: 'info.light', color: 'info.dark' },
  default: { bgcolor: 'grey.100', color: 'grey.700' },
};

const StatusChip = ({ status, label, size = 'small' }) => {
  const normalized = String(status ?? '').toLowerCase();
  const config = STATUS_MAP[normalized] || {
    label: label || status || 'Unknown',
    tone: 'default',
  };
  const tone = config.tone || 'default';
  const style = TONE_STYLES[tone] || TONE_STYLES.default;

  return (
    <Chip size={size} label={config.label} sx={{ fontWeight: 600, ...style }} />
  );
};

export default StatusChip;
