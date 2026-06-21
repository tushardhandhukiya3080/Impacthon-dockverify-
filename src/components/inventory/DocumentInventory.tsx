// Main Document Inventory component with IPFS integration
import React, { useState, useEffect } from 'react';
import { useAppContext, useDocuments, useUser } from '../../context/AppContext';
import { Document, DocumentFilters as DocumentFiltersType } from '../../types';
import { documentService, statisticsService } from '../../services/api';
import { getStatusColor, getStatusIcon } from '../../config/theme';
import DocumentList from './DocumentList';
import DocumentFilters from './DocumentFilters';
import DocumentPreview from './DocumentPreview';

const DocumentInventory: React.FC = () => {
  const { dispatch } = useAppContext();
  const documents = useDocuments();
  const user = useUser();
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filters, setFilters] = useState<DocumentFiltersType>({
    status: [],
    dateRange: { start: null, end: null },
    searchQuery: '',
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      console.log("🔄 Loading documents from API...");
      // Fetch real documents from the database
      const userDocuments = await documentService.getUserDocuments() as Document[];
      console.log("📊 Received documents:", userDocuments.length, userDocuments);
      
      // Convert date strings to Date objects
      const documentsWithDates = userDocuments.map(doc => ({
        ...doc,
        uploadDate: new Date(doc.uploadDate),
        submittedAt: new Date(doc.submittedAt)
      }));
      
      console.log("📊 Documents with dates:", documentsWithDates.length);
      dispatch({ type: 'SET_DOCUMENTS', payload: documentsWithDates });
    } catch (error) {
      console.error('Failed to load documents:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load documents' });
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
    setShowPreview(true);
  };

  const handleDocumentDownload = async (document: Document) => {
    try {
      if (document.documentCID) {
        const response = await documentService.getDocumentFromIPFS(document.documentCID);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = document.name || 'document';
          window.document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          window.document.body.removeChild(a);
        }
      }
    } catch (error) {
      console.error('Failed to download document:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to download document' });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(doc.status)) {
      return false;
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        doc.name.toLowerCase().includes(query) ||
        doc.docType.toLowerCase().includes(query) ||
        doc.docNumber.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (filters.dateRange.start && doc.uploadDate < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && doc.uploadDate > filters.dateRange.end) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const multiplier = filters.sortOrder === 'asc' ? 1 : -1;
    
    switch (filters.sortBy) {
      case 'name':
        return multiplier * a.name.localeCompare(b.name);
      case 'status':
        return multiplier * a.status.localeCompare(b.status);
      case 'date':
      default:
        return multiplier * (a.uploadDate.getTime() - b.uploadDate.getTime());
    }
  });

  const getStatusCounts = () => {
    return {
      total: documents.length,
      verified: documents.filter(doc => doc.status === 'Verified').length,
      rejected: documents.filter(doc => doc.status === 'Rejected').length,
      pending: documents.filter(doc => doc.status === 'Pending').length,
      // Legacy status names for compatibility
      unverified: documents.filter(doc => doc.status === 'Rejected').length, // Map rejected to unverified
      legalized: 0, // Not used in current system
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            📂 Document Inventory
          </h1>
          <p className="text-slate-600 mt-1">
            Manage and access your verified documents securely
          </p>
        </div>
        
        <button
          onClick={loadDocuments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', count: statusCounts.total, color: 'slate', icon: '📄' },
          { label: 'Verified', count: statusCounts.verified, color: 'emerald', icon: '✅' },
          { label: 'Rejected', count: statusCounts.rejected, color: 'red', icon: '❌' },
          { label: 'Pending', count: statusCounts.pending, color: 'orange', icon: '⏳' },
          { label: 'IPFS Stored', count: documents.filter(doc => doc.documentCID).length, color: 'blue', icon: '🌐' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`bg-white p-4 rounded-xl border border-${stat.color}-200 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-${stat.color}-600 text-sm font-medium`}>{stat.label}</p>
                <p className={`text-2xl font-bold text-${stat.color}-700`}>{stat.count}</p>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <DocumentFilters
        filters={filters}
        onFiltersChange={setFilters}
        documentCount={filteredDocuments.length}
      />

      {/* Document List */}
      <DocumentList
        documents={filteredDocuments}
        loading={loading}
        onDocumentSelect={handleDocumentSelect}
        onDocumentDownload={handleDocumentDownload}
      />

      {/* Document Preview Modal */}
      {showPreview && selectedDocument && (
        <DocumentPreview
          document={selectedDocument}
          onClose={() => {
            setShowPreview(false);
            setSelectedDocument(null);
          }}
          onDownload={() => handleDocumentDownload(selectedDocument)}
        />
      )}
    </div>
  );
};

export default DocumentInventory;