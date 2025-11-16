import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRCodeScanner = ({ onScan, resetTrigger }) => {
  const qrCodeRegionId = 'html5qr-code-full-region';
  const html5QrcodeScannerRef = useRef(null);
  const isScannerRunningRef = useRef(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const startAttemptRef = useRef(false);

  const startScanner = useCallback(async (isRetry = false) => {
    // Prevent multiple simultaneous start attempts
    if (startAttemptRef.current) {
      return;
    }
    
    const element = document.getElementById(qrCodeRegionId);
    if (!element) {
      setError('QR code scanner element not found');
      return;
    }

    if (!html5QrcodeScannerRef.current) {
      html5QrcodeScannerRef.current = new Html5Qrcode(qrCodeRegionId);
    }

    // Check if scanner is already running
    if (isScannerRunningRef.current && html5QrcodeScannerRef.current.getState) {
      try {
        const state = html5QrcodeScannerRef.current.getState();
        if (state === Html5Qrcode.STATE.STARTED) {
          // Scanner is already running, no need to start again
          setError(null);
          return;
        }
      } catch (e) {
        // If we can't check state, continue with starting
      }
    }

    startAttemptRef.current = true;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
      // Check if camera is available before starting
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setError('No camera found. Please connect a camera to use QR scanning.');
        return;
      }

      await html5QrcodeScannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (isScannerRunningRef.current) {
            // Don't set to false here - let the scanner continue running
            onScan(decodedText);
          }
        }
      );
      isScannerRunningRef.current = true;
      setError(null);
      setRetryCount(0); // Reset retry count on successful start
      setIsRetrying(false);
      startAttemptRef.current = false;
    } catch (err) {
      // Only show error if it's not a scanner already running error
      if (err.message && err.message.includes('Scanner is already running')) {
        // Scanner is already running, which is fine
        isScannerRunningRef.current = true;
        setError(null);
        startAttemptRef.current = false;
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
          isRunning = html5QrcodeScannerRef.current.getState() === Html5Qrcode.STATE.STARTED;
        } else {
          // Fallback: use our internal state tracking
          isRunning = isScannerRunningRef.current;
        }
        
        if (isRunning) {
          await html5QrcodeScannerRef.current.stop();
        }
        isScannerRunningRef.current = false;

        // Clear the scanner region DOM
        const element = document.getElementById(qrCodeRegionId);
        if (element) element.innerHTML = '';
      } catch (err) {
        // Only log error if it's not the common "scanner not running" error
        if (!err.message || !err.message.includes('Cannot stop, scanner is not running')) {
          console.error('Failed to stop scanner:', err);
        }
        // Always reset the running state even if stop fails
        isScannerRunningRef.current = false;
      }
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
    startScanner();

    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  useEffect(() => {
    if (resetTrigger !== null) {
      (async () => {
        await stopScanner();
        await startScanner();
      })();
    }
  }, [resetTrigger, startScanner, stopScanner]);

  return (
    <div>
      <div id={qrCodeRegionId} style={{ width: '320px', height: '240px' }} />
      {error && (
        <div style={{ 
          marginTop: '12px', 
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
    </div>
  );
};

export default QRCodeScanner;
