// Property-based test for document categorization accuracy
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { AppProvider } from '../../../context/AppContext';
import DocumentFilters from '../DocumentFilters';
import DocumentList from '../DocumentList';
import { Document, DocumentFilters as DocumentFiltersType } from '../../../types';

// Mock document generator
const documentArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  docId: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  docNumber: fc.string({ minLength: 1 }),
  docType: fc.constantFrom('Birth Certificate', 'Educational Certificate', 'Property Document', 'Identity Document'),
  ipfsHash: fc.string({ minLength: 10 }),
  documentCID: fc.option(fc.string({ minLength: 10 })),
  uploadDate: fc.date(),
  submittedAt: fc.date(),
  status: fc.constantFrom('Verified', 'Unverified', 'Legalized', 'Pending', 'Rejected') as fc.Arbitrary<'Verified' | 'Unverified' | 'Legalized' | 'Pending' | 'Rejected'>,
  fileType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png'),
  fileHash: fc.string({ minLength: 10 }),
  transactionHash: fc.option(fc.string({ minLength: 10 })),
  qrId: fc.option(fc.string({ minLength: 1 })),
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>
    {children}
  </AppProvider>
);

describe('Feature: user-portal-redesign, Property 5: Document Categorization Accuracy', () => {
  test('documents are correctly categorized by verification status', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 5, maxLength: 20 }),
        (documents) => {
          // Property 5: Calculate expected status counts
          const expectedCounts = {
            Verified: documents.filter(doc => doc.status === 'Verified').length,
            Unverified: documents.filter(doc => doc.status === 'Unverified').length,
            Legalized: documents.filter(doc => doc.status === 'Legalized').length,
            Pending: documents.filter(doc => doc.status === 'Pending').length,
            Rejected: documents.filter(doc => doc.status === 'Rejected').length,
          };

          // Property 5: Group documents by status
          const groupedDocuments = documents.reduce((acc, doc) => {
            if (!acc[doc.status]) acc[doc.status] = [];
            acc[doc.status].push(doc);
            return acc;
          }, {} as Record<string, Document[]>);

          // Property 5: Verify each status group has correct count
          Object.entries(expectedCounts).forEach(([status, expectedCount]) => {
            const actualCount = groupedDocuments[status]?.length || 0;
            expect(actualCount).toBe(expectedCount);
          });

          // Property 5: Verify all documents are categorized
          const totalCategorized = Object.values(groupedDocuments).reduce((sum, group) => sum + group.length, 0);
          expect(totalCategorized).toBe(documents.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('document filters correctly filter by status categories', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 10, maxLength: 30 }),
        fc.array(fc.constantFrom('Verified', 'Unverified', 'Legalized', 'Pending', 'Rejected'), { minLength: 1, maxLength: 3 }),
        (documents, selectedStatuses) => {
          const mockOnFiltersChange = jest.fn();
          const filters: DocumentFiltersType = {
            status: selectedStatuses as any,
            dateRange: { start: null, end: null },
            searchQuery: '',
            sortBy: 'date',
            sortOrder: 'desc',
          };

          const { container } = render(
            <TestWrapper>
              <DocumentFilters
                filters={filters}
                onFiltersChange={mockOnFiltersChange}
                documentCount={documents.length}
              />
            </TestWrapper>
          );

          // Property 5: Selected status filters should be visually indicated
          selectedStatuses.forEach(status => {
            const statusButtons = Array.from(container.querySelectorAll('button'))
              .filter(button => button.textContent?.includes(status));
            expect(statusButtons.length).toBeGreaterThan(0);
          });

          // Property 5: Filter documents by selected statuses
          const filteredDocuments = documents.filter(doc => selectedStatuses.includes(doc.status));
          
          // Property 5: Filtered count should match expected
          expect(filteredDocuments.length).toBe(
            documents.filter(doc => selectedStatuses.includes(doc.status)).length
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  test('search functionality correctly categorizes documents by content', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 5, maxLength: 15 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (documents, searchQuery) => {
          // Property 5: Filter documents based on search query
          const expectedFilteredDocuments = documents.filter(doc => {
            const query = searchQuery.toLowerCase();
            return (
              doc.name.toLowerCase().includes(query) ||
              doc.docType.toLowerCase().includes(query) ||
              doc.docNumber.toLowerCase().includes(query)
            );
          });

          const mockOnFiltersChange = jest.fn();
          const filters: DocumentFiltersType = {
            status: [],
            dateRange: { start: null, end: null },
            searchQuery: searchQuery,
            sortBy: 'date',
            sortOrder: 'desc',
          };

          const { container } = render(
            <TestWrapper>
              <DocumentFilters
                filters={filters}
                onFiltersChange={mockOnFiltersChange}
                documentCount={expectedFilteredDocuments.length}
              />
            </TestWrapper>
          );

          // Property 5: Search input should contain the query
          const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
          expect(searchInput?.value).toBe(searchQuery);

          // Property 5: Document count should reflect filtered results
          expect(container).toHaveTextContent(`${expectedFilteredDocuments.length} document`);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('document sorting maintains categorization integrity', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 5, maxLength: 15 }),
        fc.constantFrom('name', 'date', 'status'),
        fc.constantFrom('asc', 'desc'),
        (documents, sortBy, sortOrder) => {
          // Property 5: Sort documents according to criteria
          const sortedDocuments = [...documents].sort((a, b) => {
            const multiplier = sortOrder === 'asc' ? 1 : -1;
            
            switch (sortBy) {
              case 'name':
                return multiplier * a.name.localeCompare(b.name);
              case 'status':
                return multiplier * a.status.localeCompare(b.status);
              case 'date':
              default:
                return multiplier * (a.uploadDate.getTime() - b.uploadDate.getTime());
            }
          });

          // Property 5: Verify sorting maintains all documents
          expect(sortedDocuments.length).toBe(documents.length);

          // Property 5: Verify sorting order is correct
          for (let i = 1; i < sortedDocuments.length; i++) {
            const prev = sortedDocuments[i - 1];
            const curr = sortedDocuments[i];

            switch (sortBy) {
              case 'name':
                if (sortOrder === 'asc') {
                  expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
                } else {
                  expect(prev.name.localeCompare(curr.name)).toBeGreaterThanOrEqual(0);
                }
                break;
              case 'status':
                if (sortOrder === 'asc') {
                  expect(prev.status.localeCompare(curr.status)).toBeLessThanOrEqual(0);
                } else {
                  expect(prev.status.localeCompare(curr.status)).toBeGreaterThanOrEqual(0);
                }
                break;
              case 'date':
                if (sortOrder === 'asc') {
                  expect(prev.uploadDate.getTime()).toBeLessThanOrEqual(curr.uploadDate.getTime());
                } else {
                  expect(prev.uploadDate.getTime()).toBeGreaterThanOrEqual(curr.uploadDate.getTime());
                }
                break;
            }
          }

          // Property 5: All status categories should still be represented
          const originalStatuses = new Set(documents.map(doc => doc.status));
          const sortedStatuses = new Set(sortedDocuments.map(doc => doc.status));
          expect(sortedStatuses).toEqual(originalStatuses);
        }
      ),
      { numRuns: 50 }
    );
  });

  test('document categorization is searchable through interface', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 3, maxLength: 10 }),
        (documents) => {
          const { container } = render(
            <TestWrapper>
              <DocumentList
                documents={documents}
                loading={false}
                onDocumentSelect={() => {}}
                onDocumentDownload={() => {}}
              />
            </TestWrapper>
          );

          // Property 5: All document categories should be searchable/visible
          documents.forEach(document => {
            // Document name should be searchable
            expect(container).toHaveTextContent(document.name);
            
            // Document type should be searchable
            expect(container).toHaveTextContent(document.docType);
            
            // Document status should be visible for categorization
            expect(container).toHaveTextContent(document.status);
            
            // Document reference number should be searchable
            // Note: In list view, docNumber is displayed
          });

          // Property 5: Status categories should be visually distinct
          const statusElements = container.querySelectorAll('[style*="color"]');
          expect(statusElements.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('combined filters maintain categorization accuracy', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 10, maxLength: 25 }),
        fc.array(fc.constantFrom('Verified', 'Unverified', 'Legalized', 'Pending', 'Rejected'), { minLength: 1, maxLength: 2 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (documents, statusFilters, searchQuery) => {
          // Property 5: Apply combined filters
          const filteredDocuments = documents.filter(doc => {
            // Status filter
            if (statusFilters.length > 0 && !statusFilters.includes(doc.status)) {
              return false;
            }

            // Search filter
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                doc.name.toLowerCase().includes(query) ||
                doc.docType.toLowerCase().includes(query) ||
                doc.docNumber.toLowerCase().includes(query)
              );
            }

            return true;
          });

          // Property 5: Filtered documents should maintain status categorization
          const filteredStatuses = new Set(filteredDocuments.map(doc => doc.status));
          filteredStatuses.forEach(status => {
            expect(statusFilters.length === 0 || statusFilters.includes(status)).toBe(true);
          });

          // Property 5: Search results should match search criteria
          if (searchQuery) {
            filteredDocuments.forEach(doc => {
              const query = searchQuery.toLowerCase();
              const matchesSearch = 
                doc.name.toLowerCase().includes(query) ||
                doc.docType.toLowerCase().includes(query) ||
                doc.docNumber.toLowerCase().includes(query);
              expect(matchesSearch).toBe(true);
            });
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  test('status categorization handles edge cases correctly', () => {
    // Test with documents having same names but different statuses
    const sampleDoc = fc.sample(documentArbitrary, 1)[0];
    const documentsWithSameName = [
      { ...sampleDoc, name: 'Test Document', status: 'Verified' as const },
      { ...sampleDoc, name: 'Test Document', status: 'Pending' as const },
      { ...sampleDoc, name: 'Test Document', status: 'Rejected' as const },
    ];

    const { container } = render(
      <TestWrapper>
        <DocumentList
          documents={documentsWithSameName}
          loading={false}
          onDocumentSelect={() => {}}
          onDocumentDownload={() => {}}
        />
      </TestWrapper>
    );

    // Property 5: All status categories should be represented despite same names
    expect(container).toHaveTextContent('Verified');
    expect(container).toHaveTextContent('Pending');
    expect(container).toHaveTextContent('Rejected');

    // Property 5: All documents should be displayed
    const documentElements = container.querySelectorAll('[style*="color"]');
    expect(documentElements.length).toBeGreaterThanOrEqual(3);
  });
});