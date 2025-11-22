import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRCodeScanner = ({ onScan, resetTrigger }) => {
  const qrCodeRegionId = 'html5qr-code-full-region';
  const html5QrcodeScannerRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRunning, setIsRunning] = useState(false); // State to track if scanner is running (for re-renders)
  const startAttemptRef = useRef(false);

  const startScanner = useCallback(async (isRetry = false) => {
    // Prevent multiple simultaneous start attempts
    if (startAttemptRef.current) {
      console.log('QRScanner: Start attempt already in progress, skipping');
      return;
    }
    
    const element = document.getElementById(qrCodeRegionId);
    if (!element) {
      setError('QR code scanner element not found');
      startAttemptRef.current = false;
      return;
    }

    if (!html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current = new Html5Qrcode(qrCodeRegionId);
    }

    // Check if scanner is already running or in transition
    if (html5QrcodeScannerRef.current.getState) {
      try {
        const state = html5QrcodeScannerRef.current.getState();
        // Don't start if already started or in transition
        if (state === Html5Qrcode.STATE.STARTED || state === Html5Qrcode.STATE.SCANNING) {
          console.log('QRScanner: Already running or scanning');
          isScannerRunningRef.current = true;
          setIsRunning(true);
          setError(null);
          startAttemptRef.current = false;
          return;
        }
        // Wait if in transition
        if (state === Html5Qrcode.STATE.PAUSED) {
          console.log('QRScanner: In transition, waiting...');
          startAttemptRef.current = false;
          return;
        }
      } catch (e) {
        // If we can't check state, continue with starting
        console.log('QRScanner: Could not check state, continuing');
      }
    }

    startAttemptRef.current = true;

    // Optimize config for mobile devices with 2-second scan interval
    const config = { 
      fps: 0.5, // 0.5 FPS = 1 scan every 2 seconds (2000ms interval)
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        // Make qrbox responsive to the viewfinder size
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minEdge * 0.7); // 70% of the smaller dimension
        return {
          width: qrboxSize,
          height: qrboxSize
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
        return;
      }

      console.log('QRScanner: Starting camera...');
      
      await html5QrcodeScannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          // Only process scan if scanner is running and we haven't recently processed this QR
          if (isScannerRunningRef.current) {
            console.log('QRScanner: QR detected! Full text:', decodedText);
            console.log('QRScanner: Calling onScan callback...');
            onScan(decodedText);
          } else {
            console.log('QRScanner: QR detected but scanner is not running, ignoring');
          }
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
      console.log('QRScanner: Camera started successfully');
    } catch (err) {
      console.error('QRScanner: Start error:', err);
      
      // Only show error if it's not a scanner already running error
      if (err.message && err.message.includes('Scanner is already running')) {
        // Scanner is already running, which is fine
        isScannerRunningRef.current = true;
        setIsRunning(true);
        setError(null);
        startAttemptRef.current = false;
        console.log('QRScanner: Already running (caught in error)');
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
          console.log('QRScanner: Stopping camera...');
          await html5QrcodeScannerRef.current.stop();
          console.log('QRScanner: Camera stopped');
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
          console.error('QRScanner: Stop error:', err);
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
    if (isRetrying) return;
    
    setIsRetrying(true);
    setError(null);
    
    // Stop the current scanner first
    await stopScanner();
    
    // Wait a bit before retrying
    setTimeout(async () => {
      await startScanner(true);
    }, 1000);
  }, [isRetrying, stopScanner, startScanner]);

  useEffect(() => {
    console.log('QRScanner: Component mounted, starting scanner');
    let mounted = true;
    
    const initScanner = async () => {
      if (mounted) {
        await startScanner();
      }
    };
    
    initScanner();

    return () => {
      console.log('QRScanner: Component unmounting, stopping scanner');
      mounted = false;
      stopScanner();
    };
  }, []); // Empty deps to run only once on mount/unmount

  useEffect(() => {
    if (resetTrigger !== null && resetTrigger !== undefined) {
      console.log('QRScanner: Reset trigger activated');
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
