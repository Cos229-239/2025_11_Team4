import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  QrCodeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import Logo from '../components/Logo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * QRScannerPage Component
 * Allows users to scan QR codes or manually enter table numbers
 * Manual input is the primary/prominent option
 */
const QRScannerPage = () => {
  const navigate = useNavigate();
  const { setTableId } = useCart();

  // State management
  const [tableNumber, setTableNumber] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const scannerRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  /**
   * Validate table number with API
   */
  const validateTableNumber = async (tableNum) => {
    try {
      const response = await fetch(`${API_URL}/api/tables/${tableNum}`);
      const data = await response.json();

      if (response.ok && data.success) {
        return { valid: true, table: data.data };
      } else {
        return { valid: false, message: data.message || 'Table not found' };
      }
    } catch (err) {
      console.error('Error validating table:', err);
      return { valid: false, message: 'Unable to connect to server' };
    }
  };

  /**
   * Handle manual table number submission
   */
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!tableNumber || tableNumber.trim() === '') {
      setError('Please enter a table number');
      return;
    }

    const tableNum = parseInt(tableNumber);
    if (isNaN(tableNum) || tableNum < 1) {
      setError('Please enter a valid table number');
      return;
    }

    setIsValidating(true);

    // Validate table exists
    const validation = await validateTableNumber(tableNum);

    setIsValidating(false);

    if (validation.valid) {
      setSuccess(`Table ${tableNum} found! Redirecting...`);
      setTableId(tableNum);

      // Navigate after brief delay
      setTimeout(() => {
        navigate(`/menu/${tableNum}`);
      }, 1000);
    } else {
      setError(validation.message);
    }
  };

  /**
   * Initialize QR code scanner
   */
  const startScanning = () => {
    if (isScanning) return;

    setShowScanner(true);
    setIsScanning(true);
    setError('');
    setSuccess('');

    // Wait for DOM to update
    setTimeout(() => {
      if (!scannerRef.current) return;

      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scanner.render(onScanSuccess, onScanError);
      qrScannerRef.current = scanner;
    }, 100);
  };

  /**
   * Stop QR code scanner
   */
  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(console.error);
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setShowScanner(false);
  };

  /**
   * Handle successful QR code scan
   */
  const onScanSuccess = async (decodedText, decodedResult) => {
    console.log('QR Code scanned:', decodedText);

    // Stop scanning
    stopScanning();

    // Extract table number from QR code
    // Assuming QR code format: "TABLE:5" or just "5" or full URL
    let tableNum;

    if (decodedText.includes('TABLE:')) {
      tableNum = parseInt(decodedText.split('TABLE:')[1]);
    } else if (decodedText.includes('/menu/')) {
      const matches = decodedText.match(/\/menu\/(\d+)/);
      tableNum = matches ? parseInt(matches[1]) : null;
    } else {
      tableNum = parseInt(decodedText);
    }

    if (!tableNum || isNaN(tableNum)) {
      setError('Invalid QR code format');
      return;
    }

    setTableNumber(tableNum.toString());
    setIsValidating(true);

    // Validate table exists
    const validation = await validateTableNumber(tableNum);

    setIsValidating(false);

    if (validation.valid) {
      setSuccess(`Table ${tableNum} found! Redirecting...`);
      setTableId(tableNum);

      // Navigate after brief delay
      setTimeout(() => {
        navigate(`/menu/${tableNum}`);
      }, 1000);
    } else {
      setError(validation.message);
    }
  };

  /**
   * Handle QR code scan errors
   */
  const onScanError = (errorMessage) => {
    // Don't show errors for every frame - only log
    // console.log('QR Scan error:', errorMessage);
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col px-4 py-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-lime/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-brand-orange/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-text-secondary hover:text-brand-lime transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back</span>
        </button>
        <Logo size="sm" />
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-2xl w-full mx-auto flex-grow flex flex-col justify-center">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-brand-lime/10 p-6 rounded-3xl">
              <QrCodeIcon className="w-16 h-16 text-brand-lime" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Welcome!
          </h1>
          <p className="text-text-secondary text-lg">
            Enter your table number to get started
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3">
            <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-500 font-semibold">Error</p>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-brand-lime/10 border border-brand-lime/50 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-brand-lime flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-lime font-semibold">Success!</p>
              <p className="text-brand-lime/80 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Manual Input Form - PRIMARY METHOD */}
        <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface mb-6">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center">
            Enter Table Number
          </h2>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label htmlFor="tableNumber" className="block text-text-secondary text-sm mb-2">
                Table Number
              </label>
              <input
                id="tableNumber"
                type="number"
                min="1"
                placeholder="e.g., 5"
                value={tableNumber}
                onChange={(e) => {
                  setTableNumber(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                disabled={isValidating}
                className="
                  w-full
                  bg-dark-surface
                  text-text-primary text-center text-2xl
                  border-2 border-dark-surface
                  focus:border-brand-lime
                  rounded-xl
                  px-6 py-4
                  outline-none
                  transition-colors
                  disabled:opacity-50
                "
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isValidating || !tableNumber}
              className="
                w-full
                bg-brand-lime text-dark-bg
                px-8 py-4 rounded-full
                text-lg font-bold uppercase tracking-wide
                hover:bg-brand-lime/90
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-105 active:scale-95
                transition-all duration-200
                shadow-xl shadow-brand-lime/30 hover:shadow-brand-lime/50
                flex items-center justify-center gap-2
              "
            >
              {isValidating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5" />
                  Continue to Menu
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div className="mt-6 pt-6 border-t border-dark-surface">
            <p className="text-text-secondary text-sm text-center mb-3">
              Quick Demo Access:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setTableNumber(num.toString());
                    setError('');
                    setSuccess('');
                  }}
                  className="
                    bg-dark-surface
                    text-text-primary
                    hover:bg-brand-lime hover:text-dark-bg
                    px-3 py-2 rounded-lg
                    font-semibold text-sm
                    transition-all
                    transform hover:scale-105
                  "
                >
                  Table {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-dark-surface"></div>
          <span className="text-text-secondary text-sm uppercase tracking-wider">
            Or
          </span>
          <div className="flex-1 h-px bg-dark-surface"></div>
        </div>

        {/* Camera Scanner - OPTIONAL/ADVANCED */}
        <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center flex items-center justify-center gap-2">
            <CameraIcon className="w-6 h-6 text-brand-orange" />
            Scan QR Code
          </h2>

          <p className="text-text-secondary text-sm text-center mb-4">
            Use your device camera to scan the QR code at your table
          </p>

          {!showScanner ? (
            <button
              onClick={startScanning}
              disabled={isScanning}
              className="
                w-full
                bg-brand-orange text-white
                px-8 py-4 rounded-full
                text-lg font-bold uppercase tracking-wide
                hover:bg-brand-orange/90
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-105 active:scale-95
                transition-all duration-200
                shadow-xl shadow-brand-orange/30 hover:shadow-brand-orange/50
                flex items-center justify-center gap-2
              "
            >
              <CameraIcon className="w-5 h-5" />
              Start Camera Scanning
            </button>
          ) : (
            <div>
              {/* QR Scanner Container */}
              <div
                id="qr-reader"
                ref={scannerRef}
                className="rounded-2xl overflow-hidden mb-4"
              ></div>

              <button
                onClick={stopScanning}
                className="
                  w-full
                  bg-dark-surface text-text-primary
                  px-6 py-3 rounded-full
                  font-semibold
                  hover:bg-red-500 hover:text-white
                  transition-all
                "
              >
                Stop Scanning
              </button>
            </div>
          )}

          <p className="text-text-secondary text-xs text-center mt-4">
            Note: Camera permissions are required for scanning
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;
