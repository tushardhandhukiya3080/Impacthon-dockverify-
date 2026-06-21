// Document preview component with MetaMask authentication
import React, { useState, useEffect } from 'react';
import { Document } from '../../types';
import { useWallet } from '../../context/AppContext';
import { getStatusColor, getStatusIcon } from '../../config/theme';

interface DocumentPreviewProps {
  document: Document;
  onClose: () => void;
  onDownload: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  onClose,
  onDownload,
}) => {
  const wallet = useWallet();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [documentContent, setDocumentContent] = useState<string | null>(null);

  useEffect(() => {
    // Reset authentication state when document changes
    setIsAuthenticated(false);
    setDocumentContent(null);
    setAuthError(null);
  }, [document.id]);

  const authenticateWithMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      setAuthError('MetaMask is not installed. Please install MetaMask to view documents.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];

      // Create signature message
      const message = `Verify Document Access for ID: ${document.id}`;
      
      // Request signature
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      // In a real implementation, this would verify the signature on the backend
      // For now, we'll simulate successful authentication
      setIsAuthenticated(true);
      
      // Simulate loading document content
      setTimeout(() => {
        setDocumentContent('Document content would be loaded from IPFS here...');
      }, 1000);

    } catch (error: any) {
      console.error('Authentication failed:', error);
      setAuthError(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="text-3xl">📄</div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{document.name}</h2>
              <p className="text-slate-600">{document.docType}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Document Info Sidebar */}
          <div className="w-80 border-r border-slate-200 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Status</h3>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium`}
                  style={{
                    backgroundColor: `${getStatusColor(document.status)}20`,
                    color: getStatusColor(document.status),
                  }}
                >
                  {getStatusIcon(document.status)} {document.status}
                </span>
              </div>

              {/* Document Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Document Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Reference Number</label>
                    <p className="text-sm font-mono text-slate-800">{document.docNumber}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Upload Date</label>
                    <p className="text-sm text-slate-800">{formatDate(document.uploadDate)}</p>
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">File Type</label>
                    <p className="text-sm text-slate-800">{document.fileType}</p>
                  </div>
                </div>
              </div>

              {/* Blockchain Info */}
              {document.transactionHash && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Blockchain Verification</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wider">Transaction Hash</label>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-slate-800 truncate">{document.transactionHash}</p>
                        <button
                          onClick={() => copyToClipboard(document.transactionHash!)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy to clipboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-500 uppercase tracking-wider">File Hash</label>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-mono text-slate-800 truncate">{document.fileHash}</p>
                        <button
                          onClick={() => copyToClipboard(document.fileHash)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy to clipboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* IPFS Info */}
              {document.documentCID && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">IPFS Storage</h3>
                  <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider">Content ID (CID)</label>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-slate-800 truncate">{document.documentCID}</p>
                      <button
                        onClick={() => copyToClipboard(document.documentCID!)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={onDownload}
                  className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download Document
                </button>
              </div>
            </div>
          </div>

          {/* Document Content Area */}
          <div className="flex-1 flex flex-col">
            {!isAuthenticated ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="text-6xl mb-6">🔐</div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-4">
                    Authentication Required
                  </h3>
                  <p className="text-slate-600 mb-6">
                    To view this document, please authenticate with your MetaMask wallet to verify ownership.
                  </p>
                  
                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {authError}
                    </div>
                  )}
                  
                  <button
                    onClick={authenticateWithMetaMask}
                    disabled={isAuthenticating}
                    className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {isAuthenticating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                        Authenticate with MetaMask
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 p-6">
                {documentContent ? (
                  <div className="h-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📄</div>
                      <p className="text-slate-600">Document Preview</p>
                      <p className="text-sm text-slate-500 mt-2">
                        {documentContent}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading document from IPFS...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;