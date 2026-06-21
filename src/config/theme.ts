// Theme configuration and responsive breakpoints
export const theme = {
  colors: {
    brand: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
      950: '#082f49',
    },
    accent: {
      500: '#10b981', // Emerald
      600: '#059669',
    },
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    status: {
      verified: '#10b981',
      unverified: '#f59e0b',
      legalized: '#3b82f6',
      pending: '#f59e0b',
      rejected: '#ef4444',
    }
  },
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    widescreen: '1440px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  },
};

export const responsiveConfig = {
  mobile: {
    columns: 1,
    spacing: theme.spacing.sm,
    hideOnMobile: true,
  },
  tablet: {
    columns: 2,
    spacing: theme.spacing.md,
    hideOnMobile: false,
  },
  desktop: {
    columns: 3,
    spacing: theme.spacing.lg,
    hideOnMobile: false,
  },
  widescreen: {
    columns: 4,
    spacing: theme.spacing.xl,
    hideOnMobile: false,
  },
};

// CSS-in-JS helper functions
export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'verified':
      return theme.colors.status.verified;
    case 'unverified':
      return theme.colors.status.unverified;
    case 'legalized':
      return theme.colors.status.legalized;
    case 'pending':
      return theme.colors.status.pending;
    case 'rejected':
      return theme.colors.status.rejected;
    default:
      return theme.colors.slate[400];
  }
};

export const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'verified':
      return '✅';
    case 'unverified':
      return '⏳';
    case 'legalized':
      return '🏛️';
    case 'pending':
      return '⏳';
    case 'rejected':
      return '❌';
    default:
      return '📄';
  }
};