// QR Scanner component with actual QR code scanning functionality
import React, { useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { verificationService } from '../../services/api';

const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-reader-hidden");
      
      const qrCodeMessage = await html5QrCode.scanFile(file, true);
      console.log('QR Code detected:', qrCodeMessage);
      
      if (qrCodeMessage) {
        await processQRCode(qrCodeMessage);
      } else {
        setError('No QR code found in image');
      }
      
      // Cleanup
      try {
        await html5QrCode.clear();
      } catch (e) {
        // Ignore clear errors
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('QR Scan error:', err);
      setError('Failed to read QR code from image. Please ensure the code is clear and well-lit.');
      setLoading(false);
    }
  };

  const processQRCode = async (qrData: string) => {
    try {
      // Extract QR ID from the URL
      // QR URLs are in format: http://localhost:5000/verify-qr?id=qrId
      const url = new URL(qrData);
      const qrId = url.searchParams.get('id');

      if (!qrId) {
        setError('Invalid QR code format');
        return;
      }

      // First, check the QR code
      const checkResponse = await verificationService.checkQRStatus(qrId);
      
      setResult({
        qrId,
        docType: checkResponse.docType,
        verificationStatus: checkResponse.verificationStatus,
        submittedAt: checkResponse.submittedAt,
        message: checkResponse.message,
        needsWalletVerification: true
      });

    } catch (err: any) {
      setError(err.message || 'Failed to verify QR code');
    }
  };

  const handleWalletVerification = async () => {
    if (!result?.qrId) return;

    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === 'undefined') {
        setError('MetaMask is required for wallet verification. Please install MetaMask extension.');
        return;
      }

      setLoading(true);
      setError(null);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];

      console.log('🔐 Using wallet address:', walletAddress);

      // Create a message to sign
      const message = `Verify document access for QR ID: ${result.qrId}`;

      // Sign the message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      console.log('✍️ Message signed successfully');

      // Verify the signature with the backend
      const verifyResponse = await verificationService.verifyQRSignature({
        qrId: result.qrId,
        walletAddress,
        signature,
        message
      });

      console.log('✅ Wallet verification successful');

      setResult({
        ...result,
        ...verifyResponse,
        walletVerified: true,
        needsWalletVerification: false
      });

    } catch (err: any) {
      console.error('❌ Wallet verification error:', err);
      
      // Handle specific error cases
      if (err.message.includes('signing wallet does not match')) {
        setError(`Access Denied: This document belongs to a different wallet owner. You need to use the wallet that was originally linked to this document, or link your current wallet to your account in the Profile section.`);
      } else if (err.message.includes('User rejected')) {
        setError('MetaMask signature was cancelled. Please try again and approve the signature request.');
      } else if (err.message.includes('not linked a wallet')) {
        setError('The document owner has not linked a wallet address. Wallet verification is not available for this document.');
      } else {
        setError(`Wallet verification failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanning = () => {
    setScanning(true);
    // Camera scanning would be implemented here with a QR library
    // For now, just show the interface
  };

  const stopScanning = () => {
    setScanning(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-slate-800">QR Code Scanner</h3>
          <p className="text-slate-500 mt-2">
            Scan a document QR code to validate its integrity
          </p>
        </div>

        <div className="space-y-6">
          <div id="qr-reader-hidden" className="hidden"></div>
          <div className="relative overflow-hidden rounded-xl bg-black aspect-video flex items-center justify-center">
            {scanning ? (
              <div className="text-white text-center">
                <div className="animate-pulse text-4xl mb-4">📷</div>
                <p>Camera is active - point at QR code</p>
                <p className="text-sm text-white/70 mt-2">
                  (Camera scanning not implemented - use Upload Image instead)
                </p>
              </div>
            ) : (
              <div className="text-white/50 text-center">
                <div className="text-4xl mb-4">📱</div>
                <p>Camera is off</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={scanning ? stopScanning : startScanning}
              className={`font-bold py-3 rounded-xl transition-colors ${
                scanning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}
            >
              {scanning ? 'Stop Camera' : 'Start Camera'}
            </button>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upload QR Image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              <p><strong>❌ Error:</strong> {error}</p>
              {error.includes('different wallet owner') && (
                <div className="mt-3 p-3 bg-red-100 rounded-lg">
                  <p className="text-sm font-semibold mb-2">💡 How to fix this:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Go to your Profile section and link your current MetaMask wallet</li>
                    <li>Or switch to the wallet that was originally used for this document</li>
                    <li>Contact the document owner if you need access</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <p className="font-medium text-lg mb-4 text-center">QR Code Verification Result</p>
              
              <div className="bg-white p-4 rounded-lg border border-slate-100 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Type:</span>
                  <span className="font-semibold">{result.docType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-bold ${
                    result.verificationStatus === 'Verified' ? 'text-emerald-600' : 'text-orange-600'
                  }`}>
                    {result.verificationStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted:</span>
                  <span className="font-medium">
                    {new Date(result.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                {result.needsWalletVerification && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-3">
                      🔐 Wallet verification required to view full document details
                    </p>
                    <div className="space-y-2">
                      <button
                        onClick={handleWalletVerification}
                        disabled={loading}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Verifying...' : 'Verify with MetaMask'}
                      </button>
                      <p className="text-xs text-slate-500 text-center">
                        Note: You need to use the wallet that was linked to this document's owner account.
                        If this is your document, go to Profile → Link MetaMask Wallet first.
                      </p>
                    </div>
                  </div>
                )}

                {result.walletVerified && (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-sm font-semibold text-emerald-600 mb-2">
                      ✅ Wallet Verified - Full Details:
                    </p>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Document Number:</span>
                      <span className="font-medium">{result.docNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">File Hash:</span>
                      <span className="font-mono text-xs">{result.fileHash?.substring(0, 20)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Blockchain TX:</span>
                      <span className="font-mono text-xs">{result.transactionHash?.substring(0, 20)}...</span>
                    </div>
                    {result.documentCID && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">IPFS CID:</span>
                        <span className="font-mono text-xs">{result.documentCID.substring(0, 20)}...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;