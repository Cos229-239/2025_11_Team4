import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCodeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import { useCart } from '../hooks/useCart';
import Logo from '../components/Logo';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * QRScannerPage Component
 * Dine-in flow entry: scan table QR code only
 */
const QRScannerPage = () => {
  const navigate = useNavigate();
  const { setTableId } = useCart();

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
          fps: 15,
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA, Html5QrcodeScanType.SCAN_TYPE_FILE],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
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
  const onScanSuccess = async (decodedText) => {
    console.log('QR Code scanned:', decodedText);

    // Stop scanning
    stopScanning();

    // Extract table number from QR code
    // Assuming QR code format: "TABLE:5" or just "5" or full URL containing /menu/{tableId}
    let tableNum;

    if (decodedText.includes('TABLE:')) {
      tableNum = parseInt(decodedText.split('TABLE:')[1]);
    } else {
      const matches = decodedText.match(/\/menu\/(\d+)/);
      if (matches) {
        tableNum = parseInt(matches[1]);
      } else {
        tableNum = parseInt(decodedText);
      }
    }

    if (!tableNum || isNaN(tableNum)) {
      setError('Invalid QR code format');
      return;
    }

    // Validate table exists
    const validation = await validateTableNumber(tableNum);

    if (validation.valid) {
      setSuccess(`Table ${tableNum} found! Redirecting...`);
      setTableId(tableNum);

      // Get restaurant ID from table data
      const restaurantId = validation.table?.restaurant_id;

      // Navigate after brief delay to QR Check page
      setTimeout(() => {
        if (restaurantId) {
          navigate(`/qr-check?restaurant=${restaurantId}&table=${tableNum}`);
        } else {
          // Fallback if no restaurant ID
          navigate(`/qr-check?table=${tableNum}`);
        }
      }, 800);
    } else {
      setError(validation.message);
    }
  };

  /**
   * Handle QR code scan errors
   */
  const onScanError = () => {
    // We don't show per-frame errors to the user; just log if needed.
    // console.log('QR Scan error:', errorMessage);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#000000] flex flex-col px-4 py-6">
      {/* BACKGROUND GRADIENT */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at center,
              #E35504ff 0%,
              #E35504aa 15%,
              #000000 35%,
              #5F2F14aa 55%,
              #B5FF00ff 80%,
              #000000 100%
            )
          `,
          filter: "blur(40px)",
          backgroundSize: "180% 180%",
          opacity: 0.55,
        }}
      ></div>

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
            Scan Your Table QR
          </h1>
          <p className="text-text-secondary text-lg">
            Use your camera to scan the QR code at your table to start a new order.
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

        {success && (
          <div className="mb-6 bg-brand-lime/10 border border-brand-lime/50 rounded-2xl p-4 flex items-start gap-3">
            <CheckCircleIcon className="w-6 h-6 text-brand-lime flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-lime font-semibold">Success!</p>
              <p className="text-brand-lime/80 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Camera Scanner */}
        <div className="bg-dark-card rounded-3xl p-6 sm:p-8 border border-dark-surface">
          <h2 className="text-xl font-bold text-text-primary mb-4 text-center flex items-center justify-center gap-2">
            <CameraIcon className="w-6 h-6 text-brand-orange" />
            Scan QR Code
          </h2>

          <p className="text-text-secondary text-sm text-center mb-4">
            Point your camera at the QR code on your table to continue.
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

          <p className="text-text-secondary text-xs text-center mt-6">
            Note: Camera permissions are required for scanning.
          </p>

        </div>
      </div>
    </div>
  );
};

export default QRScannerPage;

