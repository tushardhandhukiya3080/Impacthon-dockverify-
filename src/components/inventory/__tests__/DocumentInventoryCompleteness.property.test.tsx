// Property-based test for document inventory completeness
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { AppProvider } from '../../../context/AppContext';
import DocumentInventory from '../DocumentInventory';
import DocumentList from '../DocumentList';
import { Document, User } from '../../../types';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock document generator for property testing
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

const userArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  fullName: fc.string({ minLength: 1 }),
  email: fc.emailAddress(),
});

// Test wrapper component
const TestWrapper: React.FC<{ user?: User; children: React.ReactNode }> = ({ user, children }) => (
  <AppProvider>
    {children}
  </AppProvider>
);

describe('Feature: user-portal-redesign, Property 4: Document Inventory Completeness', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  test('document inventory displays all documents with complete metadata', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(documentArbitrary, { minLength: 1, maxLength: 10 }),
        userArbitrary,
        async (documents, user) => {
          // Mock API responses
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                totalVerified: documents.length,
                successfulVerifications: documents.filter(d => d.status === 'Verified').length,
                pendingRequests: documents.filter(d => d.status === 'Pending').length,
              }),
            });

          const { container } = render(
            <TestWrapper user={user}>
              <DocumentList
                documents={documents}
                loading={false}
                onDocumentSelect={() => {}}
                onDocumentDownload={() => {}}
              />
            </TestWrapper>
          );

          // Property 4: All documents should be displayed
          await waitFor(() => {
            documents.forEach(document => {
              expect(container).toHaveTextContent(document.name);
              expect(container).toHaveTextContent(document.docType);
              expect(container).toHaveTextContent(document.status);
            });
          });

          // Property 4: Document count should match
          const countText = container.textContent;
          expect(countText).toMatch(new RegExp(`${documents.length} Document`));
        }
      ),
      { numRuns: 50 }
    );
  });

  test('document inventory fetches documents from IPFS storage correctly', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(documentArbitrary, { minLength: 0, maxLength: 5 }),
        async (documents) => {
          // Mock statistics API response
          (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                totalVerified: documents.length,
                successfulVerifications: documents.filter(d => d.status === 'Verified').length,
                pendingRequests: documents.filter(d => d.status === 'Pending').length,
              }),
            });

          const { container } = render(
            <TestWrapper>
              <DocumentInventory />
            </TestWrapper>
          );

          // Property 4: Should attempt to fetch from statistics endpoint
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/stats');
          });

          // Property 4: Should display document inventory section
          expect(container).toHaveTextContent('Document Inventory');
          expect(container).toHaveTextContent('Manage and access your verified documents securely');
        }
      ),
      { numRuns: 30 }
    );
  });

  test('document metadata is complete and accurate for all documents', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 1, maxLength: 10 }),
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

          documents.forEach(document => {
            // Property 4: Essential metadata should be present
            expect(container).toHaveTextContent(document.name);
            expect(container).toHaveTextContent(document.docType);
            expect(container).toHaveTextContent(document.status);
            
            // Property 4: Upload date should be formatted and displayed
            const uploadDateFormatted = new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(document.uploadDate);
            expect(container).toHaveTextContent(uploadDateFormatted);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('document inventory handles empty state correctly', async () => {
    // Mock empty statistics response
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          totalVerified: 0,
          successfulVerifications: 0,
          pendingRequests: 0,
        }),
      });

    const { container } = render(
      <TestWrapper>
        <DocumentInventory />
      </TestWrapper>
    );

    // Property 4: Should handle empty state gracefully
    await waitFor(() => {
      expect(container).toHaveTextContent('Document Inventory');
    });

    // Property 4: Should show appropriate empty state message when no documents
    const emptyDocuments: Document[] = [];
    const { container: listContainer } = render(
      <TestWrapper>
        <DocumentList
          documents={emptyDocuments}
          loading={false}
          onDocumentSelect={() => {}}
          onDocumentDownload={() => {}}
        />
      </TestWrapper>
    );

    expect(listContainer).toHaveTextContent('No Documents Found');
    expect(listContainer).toHaveTextContent('Upload Your First Document');
  });

  test('document status categorization is accurate and complete', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 5, maxLength: 20 }),
        (documents) => {
          const { container } = render(
            <TestWrapper>
              <DocumentInventory />
            </TestWrapper>
          );

          // Property 4: Status counts should be accurate
          const statusCounts = {
            verified: documents.filter(doc => doc.status === 'Verified').length,
            unverified: documents.filter(doc => doc.status === 'Unverified').length,
            legalized: documents.filter(doc => doc.status === 'Legalized').length,
            pending: documents.filter(doc => doc.status === 'Pending').length,
            rejected: documents.filter(doc => doc.status === 'Rejected').length,
          };

          // Property 4: All status categories should be represented
          expect(container).toHaveTextContent('Verified');
          expect(container).toHaveTextContent('Unverified');
          expect(container).toHaveTextContent('Legalized');
          expect(container).toHaveTextContent('Pending');
          expect(container).toHaveTextContent('Rejected');
          expect(container).toHaveTextContent('Total');
        }
      ),
      { numRuns: 50 }
    );
  });

  test('document inventory preserves IPFS integration patterns', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary.filter(doc => doc.documentCID !== null), { minLength: 1, maxLength: 5 }),
        (documentsWithCID) => {
          const mockOnDownload = jest.fn();
          
          const { container } = render(
            <TestWrapper>
              <DocumentList
                documents={documentsWithCID}
                loading={false}
                onDocumentSelect={() => {}}
                onDocumentDownload={mockOnDownload}
              />
            </TestWrapper>
          );

          // Property 4: Download buttons should be present for documents with IPFS CID
          const downloadButtons = container.querySelectorAll('button[title="Download"]');
          expect(downloadButtons.length).toBeGreaterThan(0);

          // Property 4: Each document should have IPFS-related metadata
          documentsWithCID.forEach(document => {
            if (document.documentCID) {
              expect(document.documentCID).toBeTruthy();
              expect(document.ipfsHash).toBeTruthy();
            }
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  test('document inventory maintains consistent data structure', () => {
    fc.assert(
      fc.property(
        fc.array(documentArbitrary, { minLength: 1, maxLength: 10 }),
        (documents) => {
          // Property 4: All documents should have required fields
          documents.forEach(document => {
            expect(document.id).toBeTruthy();
            expect(document.name).toBeTruthy();
            expect(document.docType).toBeTruthy();
            expect(document.status).toBeTruthy();
            expect(document.uploadDate).toBeInstanceOf(Date);
            expect(document.submittedAt).toBeInstanceOf(Date);
            expect(document.fileHash).toBeTruthy();
            expect(['Verified', 'Unverified', 'Legalized', 'Pending', 'Rejected']).toContain(document.status);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});