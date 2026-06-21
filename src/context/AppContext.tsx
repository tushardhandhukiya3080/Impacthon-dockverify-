// React Context for global state management
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, User, Document, UserStatistics } from '../types';

// Initial state
const initialState: AppState = {
  user: null,
  documents: [],
  statistics: null,
  ui: {
    sidebarOpen: false,
    currentView: 'home',
    loading: false,
    error: null,
  },
  wallet: {
    connected: false,
    address: null,
    network: null,
  },
};

// Action types
export type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'ADD_DOCUMENT'; payload: Document }
  | { type: 'UPDATE_DOCUMENT'; payload: { id: string; updates: Partial<Document> } }
  | { type: 'SET_STATISTICS'; payload: UserStatistics }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_VIEW'; payload: string }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_WALLET_STATUS'; payload: { connected: boolean; address: string | null; network: string | null } }
  | { type: 'RESET_STATE' };

// Reducer function
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_DOCUMENTS':
      return { ...state, documents: action.payload };
    
    case 'ADD_DOCUMENT':
      return { ...state, documents: [...state.documents, action.payload] };
    
    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        documents: state.documents.map(doc =>
          doc.id === action.payload.id ? { ...doc, ...action.payload.updates } : doc
        ),
      };
    
    case 'SET_STATISTICS':
      return { ...state, statistics: action.payload };
    
    case 'SET_LOADING':
      return { ...state, ui: { ...state.ui, loading: action.payload } };
    
    case 'SET_ERROR':
      return { ...state, ui: { ...state.ui, error: action.payload } };
    
    case 'SET_CURRENT_VIEW':
      return { ...state, ui: { ...state.ui, currentView: action.payload } };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } };
    
    case 'SET_WALLET_STATUS':
      return { ...state, wallet: action.payload };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Selector hooks for specific state slices
export function useUser() {
  const { state } = useAppContext();
  return state.user;
}

export function useDocuments() {
  const { state } = useAppContext();
  return state.documents;
}

export function useStatistics() {
  const { state } = useAppContext();
  return state.statistics;
}

export function useUI() {
  const { state } = useAppContext();
  return state.ui;
}

export function useWallet() {
  const { state } = useAppContext();
  return state.wallet;
}