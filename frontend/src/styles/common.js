// Common styles for premium SaaS design
// Use these constants throughout the application for consistency

export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: {
    light: '#dcfce7',
    main: '#16a34a',
    dark: '#15803d',
  },
  warning: {
    light: '#fffbeb',
    main: '#d97706',
    dark: '#b45309',
  },
  danger: {
    light: '#fef2f2',
    main: '#dc2626',
    dark: '#b91c1c',
  },
  info: {
    light: '#eff6ff',
    main: '#2563eb',
    dark: '#1e40af',
  },
  white: '#ffffff',
  black: '#000000',
}

export const typography = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
}

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
}

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
}

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  base: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  full: '9999px',
}

// Common style objects
export const commonStyles = {
  pageContainer: {
    padding: '24px',
    minHeight: 'calc(100vh - 64px)',
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.base,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.gray[200]}`,
  },
  cardBody: {
    padding: '24px',
  },
  button: {
    primary: {
      padding: '10px 20px',
      backgroundColor: colors.primary[600],
      color: colors.white,
      border: 'none',
      borderRadius: borderRadius.base,
      cursor: 'pointer',
      fontWeight: typography.fontWeight.medium,
      fontSize: typography.fontSize.sm,
      transition: 'all 0.2s',
    },
    secondary: {
      padding: '10px 20px',
      backgroundColor: colors.white,
      color: colors.gray[700],
      border: `1px solid ${colors.gray[300]}`,
      borderRadius: borderRadius.base,
      cursor: 'pointer',
      fontWeight: typography.fontWeight.medium,
      fontSize: typography.fontSize.sm,
      transition: 'all 0.2s',
    },
    danger: {
      padding: '10px 20px',
      backgroundColor: colors.danger.main,
      color: colors.white,
      border: 'none',
      borderRadius: borderRadius.base,
      cursor: 'pointer',
      fontWeight: typography.fontWeight.medium,
      fontSize: typography.fontSize.sm,
      transition: 'all 0.2s',
    },
  },
  input: {
    padding: '10px 14px',
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: borderRadius.base,
    fontSize: typography.fontSize.sm,
    width: '100%',
    transition: 'all 0.2s',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    border: `1px solid ${colors.gray[300]}`,
    borderRadius: borderRadius.base,
    fontSize: typography.fontSize.sm,
    backgroundColor: colors.white,
    cursor: 'pointer',
    outline: 'none',
  },
  badge: {
    padding: '4px 10px',
    borderRadius: borderRadius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: typography.fontWeight.semibold,
    color: colors.gray[600],
    fontSize: typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    backgroundColor: colors.gray[50],
  },
  tableCell: {
    padding: '16px',
    borderBottom: `1px solid ${colors.gray[200]}`,
    fontSize: typography.fontSize.sm,
    color: colors.gray[800],
  },
}

// Responsive breakpoints helper
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}

// Media query helper function
export const mediaQuery = (breakpoint) => `@media (min-width: ${breakpoints[breakpoint]})`

// Status badge colors
export const getStatusColor = (status) => {
  const statusColors = {
    active: { bg: colors.success.light, text: colors.success.main },
    inactive: { bg: colors.danger.light, text: colors.danger.main },
    suspended: { bg: colors.warning.light, text: colors.warning.main },
    pending: { bg: colors.warning.light, text: colors.warning.main },
    completed: { bg: colors.success.light, text: colors.success.main },
    failed: { bg: colors.danger.light, text: colors.danger.main },
  }
  return statusColors[status?.toLowerCase()] || { bg: colors.gray[100], text: colors.gray[600] }
}

// Animation styles
export const animations = {
  fadeIn: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `,
  slideUp: `
    @keyframes slideUp {
      from { transform: translateY(10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `,
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
}