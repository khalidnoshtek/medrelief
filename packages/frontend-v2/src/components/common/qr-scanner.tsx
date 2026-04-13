import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

/**
 * Full-screen camera QR scanner. Uses rear camera by default.
 * Decodes any QR (our bill QRs contain the bill UUID or URL).
 */
export function QrScanner({ onScan, onClose }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!divRef.current) return;
    const id = 'qr-reader';
    divRef.current.id = id;

    const scanner = new Html5Qrcode(id, { verbose: false });
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      (decoded) => {
        onScan(decoded);
        scanner.stop().catch(() => {});
      },
      () => {
        // Ignore per-frame decode failures
      }
    ).catch((err) => {
      setError(err?.message || 'Camera not available');
    });

    return () => {
      scanner.stop().then(() => scanner.clear()).catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="p-4 flex justify-between items-center text-white">
        <p className="font-semibold">Scan QR code</p>
        <button onClick={onClose} className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">×</button>
      </div>

      <div ref={divRef} className="flex-1" />

      {error && (
        <div className="p-4 bg-red-600 text-white text-sm">
          {error}
        </div>
      )}

      <div className="p-4 text-white text-center text-xs bg-black/80">
        Point the camera at the QR code on the patient's bill
      </div>
    </div>
  );
}
