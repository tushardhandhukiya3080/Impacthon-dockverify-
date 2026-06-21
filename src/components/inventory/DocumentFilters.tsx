// Document filters component for search and filtering
import React from 'react';
import { DocumentFilters as DocumentFiltersType } from '../../types';

interface DocumentFiltersProps {
  filters: DocumentFiltersType;
  onFiltersChange: (filters: DocumentFiltersType) => void;
  documentCount: number;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  filters,
  onFiltersChange,
  documentCount,
}) => {
  const statusOptions = [
    { value: 'Verified', label: 'Verified', color: 'emerald' },
    { value: 'Pending', label: 'Pending', color: 'orange' },
    { value: 'Legalized', label: 'Legalized', color: 'blue' },
    { value: 'Unverified', label: 'Unverified', color: 'yellow' },
    { value: 'Rejected', label: 'Rejected', color: 'red' },
  ];

  const handleStatusToggle = (status: string) => {
    const newStatus = filters.status.includes(status as any)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status as any];
    
    onFiltersChange({ ...filters, status: newStatus });
  };

  const handleSearchChange = (searchQuery: string) => {
    onFiltersChange({ ...filters, searchQuery });
  };

  const handleSortChange = (sortBy: 'name' | 'date' | 'status', sortOrder: 'asc' | 'desc') => {
    onFiltersChange({ ...filters, sortBy, sortOrder });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: [],
      dateRange: { start: null, end: null },
      searchQuery: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = 
    filters.status.length > 0 || 
    filters.searchQuery || 
    filters.dateRange.start || 
    filters.dateRange.end;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
            <input
              type="text"
              placeholder="Search documents by name, type, or reference number..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Sort by:</label>
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-') as ['name' | 'date' | 'status', 'asc' | 'desc'];
              handleSortChange(sortBy, sortOrder);
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          >
            <option value="date-desc">Date (Newest)</option>
            <option value="date-asc">Date (Oldest)</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="status-asc">Status (A-Z)</option>
            <option value="status-desc">Status (Z-A)</option>
          </select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Status Filters */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700 mr-2">Filter by status:</span>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusToggle(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filters.status.includes(option.value as any)
                  ? `bg-${option.color}-100 text-${option.color}-700 border-2 border-${option.color}-300`
                  : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
              }`}
            >
              {option.label}
              {filters.status.includes(option.value as any) && (
                <span className="ml-1">×</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          Showing <span className="font-semibold">{documentCount}</span> document{documentCount !== 1 ? 's' : ''}
          {hasActiveFilters && (
            <span className="text-slate-500"> (filtered)</span>
          )}
        </p>
      </div>
    </div>
  );
};

export default DocumentFilters;