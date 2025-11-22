import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import logger from '../utils/logger';

const QRCodeScanner = ({ onScan, resetTrigger, scanLocked = false }) => {
  const qrCodeRegionId = 'html5qr-code-full-region';
  const html5QrcodeScannerRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRunning, setIsRunning] = useState(false); // State to track if scanner is running (for re-renders)
  const startAttemptRef = useRef(false);
  const lastScannedTextRef = useRef(null); // Track last scanned text to prevent duplicates

  const startScanner = useCallback(async (isRetry = false) => {
    // Prevent multiple simultaneous start attempts
    if (startAttemptRef.current) {
      logger.debug('QRScanner: Start attempt already in progress, skipping');
      return;
    }
    
    const element = document.getElementById(qrCodeRegionId);
    if (!element) {
      setError('QR code scanner element not found');
      startAttemptRef.current = false;
      return;
    }

    // Always create a fresh instance on retry to avoid state issues
    if (!html5QrcodeScannerRef.current || isRetry) {
      // Clear any existing instance
      if (html5QrcodeScannerRef.current) {
        try {
          const element = document.getElementById(qrCodeRegionId);
          if (element) {
            element.innerHTML = '';
          }
        } catch (e) {
          logger.debug('QRScanner: Error clearing element:', e);
        }
      }
      html5QrcodeScannerRef.current = new Html5Qrcode(qrCodeRegionId);
      logger.debug('QRScanner: Created new Html5Qrcode instance');
    }

    // Check if scanner is already running or in transition
    if (html5QrcodeScannerRef.current.getState) {
      try {
        const state = html5QrcodeScannerRef.current.getState();
        // Don't start if already started or in transition
        if (state === Html5Qrcode.STATE.STARTED || state === Html5Qrcode.STATE.SCANNING) {
          logger.debug('QRScanner: Already running or scanning');
          isScannerRunningRef.current = true;
          setIsRunning(true);
          setError(null);
          startAttemptRef.current = false;
          return;
        }
        // Wait if in transition
        if (state === Html5Qrcode.STATE.PAUSED) {
          logger.debug('QRScanner: In transition, waiting...');
          startAttemptRef.current = false;
          return;
        }
      } catch (e) {
        // If we can't check state, continue with starting
        logger.debug('QRScanner: Could not check state, continuing');
      }
    }

    startAttemptRef.current = true;

    // Optimize config for fast scanning without system overload
    const config = { 
      fps: 10, // 10 FPS = very fast scanning for immediate response (scans 10 times per second)
      // Remove qrbox restriction - scan entire viewfinder instead of a restricted box
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        // Return full viewfinder dimensions to scan entire area (no restricted box)
        return {
          width: viewfinderWidth,
          height: viewfinderHeight
        };
      },
      aspectRatio: 1.0, // Square aspect ratio works better on mobile
      disableFlip: false // Allow flipping to try both orientations
    };

    try {
      // Check if camera is available before starting
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setError('No camera found. Please connect a camera to use QR scanning.');
        startAttemptRef.current = false;
        setIsRetrying(false);
        return;
      }

      logger.debug('QRScanner: Available cameras:', cameras.length);
      
      // Determine camera constraints based on device type
      // On mobile, prefer back camera (environment), on desktop use any available camera
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const cameraConfig = isMobile 
        ? { facingMode: 'environment' } // Back camera on mobile
        : { facingMode: 'user' }; // Front camera on desktop (or let browser choose)
      
      logger.debug('QRScanner: Using camera config:', cameraConfig, 'isMobile:', isMobile);
      
      await html5QrcodeScannerRef.current.start(
        cameraConfig,
        config,
        (decodedText) => {
          // Only process scan if scanner is running and not locked
          if (!isScannerRunningRef.current) {
            logger.debug('QRScanner: QR detected but scanner is not running, ignoring');
            return;
          }
          
          // Check if scanning is locked (passed from parent)
          if (scanLocked) {
            logger.debug('QRScanner: QR detected but scanning is locked, ignoring');
            return;
          }
          
          // Prevent duplicate scans of the same QR code within 500ms (very short debounce)
          const now = Date.now();
          if (lastScannedTextRef.current?.text === decodedText && 
              now - lastScannedTextRef.current?.timestamp < 500) {
            logger.debug('QRScanner: Duplicate QR code detected within 500ms, ignoring');
            return;
          }
          
          // Update last scanned text
          lastScannedTextRef.current = {
            text: decodedText,
            timestamp: now
          };
          
          logger.debug('QRScanner: QR detected! Full text:', decodedText);
          logger.debug('QRScanner: Calling onScan callback...');
          onScan(decodedText);
        },
        (errorMessage) => {
          // Scan error callback - don't log every frame error
          // This is called for every frame that doesn't contain a QR code
          // We silently ignore these to avoid console spam
        }
      );
      
      isScannerRunningRef.current = true;
      setIsRunning(true);
      setError(null);
      setRetryCount(0);
      setIsRetrying(false);
      startAttemptRef.current = false;
      logger.debug('QRScanner: Camera started successfully');
    } catch (err) {
      logger.error('QRScanner: Start error:', err);
      
      // Only show error if it's not a scanner already running error
      if (err.message && err.message.includes('Scanner is already running')) {
        // Scanner is already running, which is fine
        isScannerRunningRef.current = true;
        setIsRunning(true);
        setError(null);
        startAttemptRef.current = false;
        logger.debug('QRScanner: Already running (caught in error)');
        return;
      }
      
      // Provide more user-friendly error messages
      let errorMessage = 'Error starting QR code scanner';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please connect a camera.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints cannot be satisfied.';
      } else if (err.name === 'SecurityError') {
        errorMessage = 'Camera access blocked due to security restrictions.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      isScannerRunningRef.current = false;
      setIsRunning(false);
      startAttemptRef.current = false;
      setIsRetrying(false); // Reset retry flag on error so user can retry again
      
      // If this is a retry attempt, increment retry count
      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }
    }
  }, [onScan]);

  const stopScanner = useCallback(async () => {
    if (
      html5QrcodeScannerRef.current &&
      typeof html5QrcodeScannerRef.current.stop === 'function'
    ) {
      try {
        // Check if scanner is actually running before trying to stop it
        let isRunning = false;
        
        if (html5QrcodeScannerRef.current.getState && Html5Qrcode.STATE) {
          try {
            isRunning = html5QrcodeScannerRef.current.getState() === Html5Qrcode.STATE.STARTED;
          } catch (stateErr) {
            // Fallback: use our internal state tracking
            isRunning = isScannerRunningRef.current;
          }
        } else {
          // Fallback: use our internal state tracking
          isRunning = isScannerRunningRef.current;
        }
        
        if (isRunning) {
          logger.debug('QRScanner: Stopping camera...');
          await html5QrcodeScannerRef.current.stop();
          logger.debug('QRScanner: Camera stopped');
        }
        isScannerRunningRef.current = false;
        setIsRunning(false);
        startAttemptRef.current = false; // Reset start attempt flag

        // Clear the scanner region DOM to prevent visual artifacts
        const element = document.getElementById(qrCodeRegionId);
        if (element) element.innerHTML = '';
      } catch (err) {
        // Only log error if it's not the common "scanner not running" error
        if (!err.message || !err.message.includes('Cannot stop, scanner is not running')) {
          logger.error('QRScanner: Stop error:', err);
        }
        // Always reset the running state even if stop fails
        isScannerRunningRef.current = false;
        setIsRunning(false);
        startAttemptRef.current = false;
      }
    } else {
      // No scanner instance, just reset states
      isScannerRunningRef.current = false;
      setIsRunning(false);
      startAttemptRef.current = false;
    }
  }, []);

  const retryCamera = useCallback(async () => {
    if (isRetrying) {
      logger.debug('QRScanner: Retry already in progress, skipping');
      return;
    }
    
    logger.debug('QRScanner: Starting camera retry...');
    setIsRetrying(true);
    setError(null);
    
    try {
      // Stop the current scanner first and wait for it to fully stop
      await stopScanner();
      
      // Clear the scanner instance to force a fresh start
      if (html5QrcodeScannerRef.current) {
        try {
          // Try to stop again to ensure it's fully stopped
          if (html5QrcodeScannerRef.current.getState) {
            const state = html5QrcodeScannerRef.current.getState();
            if (state !== Html5Qrcode.STATE.NOT_STARTED) {
              await html5QrcodeScannerRef.current.stop();
            }
          }
        } catch (stopErr) {
          logger.debug('QRScanner: Error during stop (may already be stopped):', stopErr.message);
        }
        
        // Clear the scanner instance
        html5QrcodeScannerRef.current = null;
      }
      
      // Clear the DOM element
      const element = document.getElementById(qrCodeRegionId);
      if (element) {
        element.innerHTML = '';
      }
      
      // Reset all state flags
      isScannerRunningRef.current = false;
      setIsRunning(false);
      startAttemptRef.current = false;
      
      // Wait longer on mobile to ensure camera is fully released (3 seconds for mobile)
      // Mobile devices need more time to release camera resources
      const waitTime = 3000;
      logger.debug(`QRScanner: Waiting ${waitTime}ms before retrying (mobile-friendly delay)...`);
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Verify element still exists before starting
      const elementAfterWait = document.getElementById(qrCodeRegionId);
      if (!elementAfterWait) {
        logger.error('QRScanner: Element not found after wait, cannot retry');
        setError('Scanner element not found. Please refresh the page.');
        setIsRetrying(false);
        return;
      }
      
      // Now start fresh with a new instance
      logger.debug('QRScanner: Attempting to start scanner after retry wait...');
      
      // Reset start attempt flag to allow new start
      startAttemptRef.current = false;
      
      // Start the scanner
      try {
        await startScanner(true);
        // Reset retry flag after successful start
        setTimeout(() => {
          setIsRetrying(false);
          logger.debug('QRScanner: Retry process completed successfully');
        }, 500);
      } catch (startError) {
        logger.error('QRScanner: Failed to start after retry:', startError);
        setError(startError.message || 'Failed to start camera after retry. Please try again.');
        setIsRetrying(false);
      }
    } catch (retryError) {
      logger.error('QRScanner: Retry error:', retryError);
      setError(retryError.message || 'Failed to retry camera. Please refresh the page.');
      setIsRetrying(false);
    }
  }, [isRetrying, stopScanner, startScanner]);

  useEffect(() => {
    logger.debug('QRScanner: Component mounted, starting scanner');
    let mounted = true;
    
    const initScanner = async () => {
      if (mounted) {
        await startScanner();
      }
    };
    
    initScanner();

    return () => {
      logger.debug('QRScanner: Component unmounting, stopping scanner');
      mounted = false;
      stopScanner();
    };
  }, []); // Empty deps to run only once on mount/unmount

  useEffect(() => {
    if (resetTrigger !== null && resetTrigger !== undefined) {
      logger.debug('QRScanner: Reset trigger activated');
      (async () => {
        await stopScanner();
        // Wait a bit before restarting to ensure camera is released
        setTimeout(async () => {
          await startScanner();
        }, 500);
      })();
    }
  }, [resetTrigger]); // Only depend on resetTrigger to avoid infinite loops

  return (
    <>
      {/* Camera Scanner Container */}
      <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto' }}>
        <div id={qrCodeRegionId} style={{ width: '100%', maxWidth: '320px', height: '240px', minHeight: '200px' }} />
      </div>
      
      {/* Error/Retry Message - Separated into its own container */}
      {/* Only show error/retry button if there's an error AND scanner is NOT running */}
      {error && !isRunning && (
        <div style={{ 
          width: '100%',
          maxWidth: '320px',
          margin: '12px auto 0',
          textAlign: 'center',
          padding: '12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px'
        }}>
          <p style={{ 
            color: '#dc2626', 
            margin: '0 0 8px 0',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {error}
          </p>
          <button
            onClick={retryCamera}
            disabled={isRetrying}
            style={{
              background: isRetrying ? '#9ca3af' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: isRetrying ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: '0 auto'
            }}
          >
            {isRetrying ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                Retrying...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
                Retry Camera
              </>
            )}
          </button>
          {retryCount > 0 && (
            <p style={{ 
              color: '#6b7280', 
              margin: '8px 0 0 0',
              fontSize: '12px'
            }}>
              Retry attempts: {retryCount}
            </p>
          )}
        </div>
      )}
    </>
  );
};

export default QRCodeScanner;
