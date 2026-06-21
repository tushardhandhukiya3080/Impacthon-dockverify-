// Document list component with grid and list views
import React, { useState } from 'react';
import { Document } from '../../types';
import { getStatusColor, getStatusIcon } from '../../config/theme';

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  onDocumentSelect: (document: Document) => void;
  onDocumentDownload: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading,
  onDocumentSelect,
  onDocumentDownload,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    return '📄';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          <span className="ml-3 text-slate-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
        <div className="text-6xl mb-4">📂</div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">No Documents Found</h3>
        <p className="text-slate-600 mb-6">
          You haven't uploaded any documents yet, or no documents match your current filters.
        </p>
        <button
          onClick={() => window.location.hash = '#verify'}
          className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors"
        >
          Upload Your First Document
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* View Controls */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          {documents.length} Document{documents.length !== 1 ? 's' : ''}
        </h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Document Grid View */}
      {viewMode === 'grid' && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((document) => (
            <div
              key={document.id}
              className="group relative bg-slate-50 rounded-lg border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => onDocumentSelect(document)}
            >
              {/* Document Preview */}
              <div className="aspect-[3/4] bg-white rounded-t-lg border-b border-slate-200 flex items-center justify-center text-4xl">
                {getFileTypeIcon(document.fileType)}
              </div>

              {/* Document Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-800 text-sm truncate flex-1">
                    {document.name}
                  </h4>
                  <span
                    className={`ml-2 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0`}
                    style={{
                      backgroundColor: `${getStatusColor(document.status)}20`,
                      color: getStatusColor(document.status),
                    }}
                  >
                    {getStatusIcon(document.status)} {document.status}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 mb-1">{document.docType}</p>
                <p className="text-xs text-slate-400">{formatDate(document.uploadDate)}</p>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDocumentDownload(document);
                  }}
                  className="p-1.5 bg-white rounded-full shadow-md hover:bg-slate-50 transition-colors"
                  title="Download"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document List View */}
      {viewMode === 'list' && (
        <div className="divide-y divide-slate-200">
          {documents.map((document) => (
            <div
              key={document.id}
              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onDocumentSelect(document)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl">{getFileTypeIcon(document.fileType)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{document.name}</h4>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-slate-500">{document.docType}</span>
                      <span className="text-sm text-slate-400">{formatDate(document.uploadDate)}</span>
                      <span className="text-sm text-slate-400">#{document.docNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium`}
                    style={{
                      backgroundColor: `${getStatusColor(document.status)}20`,
                      color: getStatusColor(document.status),
                    }}
                  >
                    {getStatusIcon(document.status)} {document.status}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDocumentDownload(document);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentList;