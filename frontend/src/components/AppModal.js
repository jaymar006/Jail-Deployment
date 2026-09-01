import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Slide from '@mui/material/Slide';

const TONES = {
  blue:   { text: '#1d4ed8', chipBg: '#eff6ff', chipBorder: '#bfdbfe', subtitle: '#6b7280' },
  green:  { text: '#047857', chipBg: '#ecfdf5', chipBorder: '#a7f3d0', subtitle: '#6b7280' },
  red:    { text: '#dc2626', chipBg: '#fef2f2', chipBorder: '#fecaca', subtitle: '#6b7280' },
  amber:  { text: '#b45309', chipBg: '#fffbeb', chipBorder: '#fde68a', subtitle: '#6b7280' },
  slate:  { text: '#111827', chipBg: '#f1f5f9', chipBorder: '#e2e8f0', subtitle: '#6b7280' },
  teal:   { text: '#0f766e', chipBg: '#f0fdfa', chipBorder: '#99f6e4', subtitle: '#6b7280' },
};

// Smooth fade + rise entrance
const Transition = React.forwardRef(function Transition(props, ref) {
  return (
    <Slide direction="up" ref={ref} {...props} />
  );
});

const AppModal = ({
  open = false,
  onClose,
  title,
  subtitle,
  titleIcon,
  titleColor = '#111827',
  tone = 'slate',
  maxWidth = 'sm',
  fullWidth = true,
  maxContentWidth = 600,
  radius = 14,
  hideHeader = false,
  header = null,
  actions = null,
  hideCloseButton = false,
  disableEscapeKeyDown = false,
  iconSize = 22,
  children,
  ...rest
}) => {
  const palette = TONES[tone] || TONES.slate;
  const accentColor = (tone !== 'slate') ? palette.text : titleColor;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      scroll="paper"
      disableEscapeKeyDown={disableEscapeKeyDown}
      TransitionComponent={Transition}
      transitionDuration={{ enter: 320, exit: 200 }}
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: `${radius}px`,
          overflow: 'hidden',
          maxWidth: maxContentWidth,
          width: '100%',
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.28), 0 10px 20px rgba(15, 23, 42, 0.1)',
          border: '1px solid rgba(15, 23, 42, 0.05)',
          backgroundImage: 'linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)',
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
          },
        },
      }}
      {...rest}
    >
      {header
        ? header
        : !hideHeader && (
            <DialogTitle
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 2,
                px: 3,
                py: 2.5,
                borderBottom: '1px solid #eef0f3',
                background:
                  tone !== 'slate'
                    ? `linear-gradient(180deg, ${palette.chipBg} 0%, #ffffff 100%)`
                    : 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
                flexShrink: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, minWidth: 0 }}>
                {titleIcon && (
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: palette.chipBg,
                      border: `1px solid ${palette.chipBorder}`,
                      color: accentColor,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                  >
                    {titleIcon}
                  </Box>
                )}
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, color: accentColor, lineHeight: 1.25, letterSpacing: '-0.01em' }}
                  >
                    {title}
                  </Typography>
                  {subtitle && (
                    <Typography
                      variant="body2"
                      sx={{ color: palette.subtitle, mt: 0.35, lineHeight: 1.4 }}
                    >
                      {subtitle}
                    </Typography>
                  )}
                </Box>
              </Box>
              {!hideCloseButton && (
                <IconButton
                  aria-label="Close"
                  onClick={onClose}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    color: '#6b7280',
                    bgcolor: 'rgba(107, 114, 128, 0.06)',
                    '&:hover': {
                      bgcolor: 'rgba(107, 114, 128, 0.16)',
                      color: '#111827',
                      transform: 'rotate(90deg)',
                    },
                    transition: 'transform 0.25s ease, background-color 0.2s ease, color 0.2s ease',
                    width: 32,
                    height: 32,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </IconButton>
              )}
            </DialogTitle>
          )}

      <DialogContent
        dividers={!hideHeader}
        sx={{
          px: 3,
          py: 3,
          '&.MuiDialogContent-root': { paddingTop: 3 },
          '&.MuiDialogContent-dividers': {
            borderTop: hideHeader ? 'none' : '1px solid #eef0f3',
            borderBottom: 'none',
          },
        }}
      >
        {children}
      </DialogContent>

      {actions && (
        <>
          <Divider sx={{ borderColor: '#eef0f3' }} />
          <DialogActions
            sx={{
              px: 3,
              py: 2,
              justifyContent: 'flex-end',
              gap: 1,
              bgcolor: '#fbfbfc',
              flexShrink: 0,
            }}
          >
            {actions}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default AppModal;
