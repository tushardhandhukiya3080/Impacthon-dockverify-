// Document verification component (preserved from original system)
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { verificationService } from '../../services/api';

const DocumentVerification: React.FC = () => {
  const { dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    formData.append('document', selectedFile);

    try {
      const response = await verificationService.verifyDocument(formData);
      setResult(response);
      
      // Only redirect to inventory if user wants to see their documents
      // Don't auto-redirect - let user see the verification result first
    } catch (error: any) {
      setResult({ error: error.message || 'Verification failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold text-slate-800">Verify Document</h3>
          <p className="text-slate-500 mt-2">
            Upload your document to verify its authenticity on the blockchain
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Document Type
              </label>
              <select
                name="docType"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                required
              >
                <option value="Birth Certificate">Birth Certificate</option>
                <option value="Educational Certificate">Educational Certificate</option>
                <option value="Property Document">Property Document</option>
                <option value="Identity Document">Identity Document</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                name="docNumber"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="e.g. BC-2023-001"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Upload Document
            </label>
            <label
              htmlFor="document-file"
              className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50 hover:bg-brand-50 hover:border-brand-400 transition-all"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-10 h-10 mb-3 text-slate-400 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="mb-2 text-sm text-slate-500 font-medium">
                  <span className="font-bold text-brand-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">PDF, PNG, JPG (MAX. 5MB)</p>
              </div>
              <input
                id="document-file"
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.png"
                onChange={handleFileSelect}
                required
              />
            </label>
            
            {selectedFile && (
              <div className="mt-2 text-sm text-slate-600 font-medium flex items-center gap-2">
                <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span>{selectedFile.name}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying Document...' : 'Securely Verify Document'}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-xl border ${
            result.error 
              ? 'border-red-200 bg-red-50 text-red-700' 
              : 'border-green-200 bg-green-50 text-green-700'
          }`}>
            {result.error ? (
              <p><strong>❌ Verification Failed:</strong> {result.error}</p>
            ) : (
              <div>
                <p><strong>✅ Document Verified Successfully!</strong></p>
                <p className="text-sm mt-2">Hash: {result.fileHash?.substring(0, 20)}...</p>
                {result.documentCID && (
                  <p className="text-sm mt-1">IPFS CID: {result.documentCID.substring(0, 20)}...</p>
                )}
                {result.transactionHash && (
                  <p className="text-sm mt-1">Blockchain TX: {result.transactionHash.substring(0, 20)}...</p>
                )}
                {result.qrCodeDataUrl && (
                  <div className="mt-4 text-center">
                    <img src={result.qrCodeDataUrl} alt="QR Code" className="mx-auto w-32 h-32" />
                    <p className="text-sm mt-2">QR Code for verification</p>
                  </div>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => dispatch({ type: 'SET_CURRENT_VIEW', payload: 'inventory' })}
                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
                  >
                    View My Documents
                  </button>
                  <button
                    onClick={() => setResult(null)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-all"
                  >
                    Verify Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentVerification;