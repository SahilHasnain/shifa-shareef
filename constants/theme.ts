// Design System for Shifa Shareef App
// Based on devotional, premium aesthetic from idea.md

export const colors = {
  // Primary Palette
  primary: {
    deepGreen: "#173D31",
    forestGreen: "#20352D",
    sageGreen: "#2A4A3D",
  },

  // Secondary Palette
  secondary: {
    mutedGold: "#C9A961",
    warmGold: "#D4B76A",
    paleGold: "#E6D79C",
    lightGold: "#F1E0A4",
  },

  // Surface Colors
  surface: {
    warmIvory: "#FBF7EE",
    creamyWhite: "#F7F1E2",
    lightCream: "#F4ECD9",
    softBeige: "#F0E8D6",
  },

  // Text Colors
  text: {
    primary: "#173D31",
    secondary: "#274236",
    tertiary: "#55665D",
    muted: "#64756C",
    subtle: "#7A8A82",
    light: "#AFC4B8",
  },

  // Accent Colors
  accent: {
    sepia: "#E8D5B7",
    night: "#1A1A1A",
    success: "#5A9B6E",
    error: "#DC3545",
  },

  // Overlay Colors
  overlay: {
    dark: "rgba(23, 61, 49, 0.95)",
    darkLight: "rgba(23, 61, 49, 0.85)",
    light: "rgba(255, 249, 234, 0.2)",
    medium: "rgba(255, 249, 234, 0.1)",
  },
} as const;

export const typography = {
  // Font Sizes
  size: {
    xs: 12,
    sm: 13,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28,
    "5xl": 34,
  },

  // Font Weights
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.75,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 40,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  "2xl": 20,
  "3xl": 22,
  "4xl": 24,
  "5xl": 26,
  "6xl": 28,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Component-specific styles
export const components = {
  card: {
    primary: {
      backgroundColor: colors.primary.deepGreen,
      borderRadius: borderRadius["6xl"],
      padding: spacing["2xl"],
    },
    secondary: {
      backgroundColor: colors.surface.warmIvory,
      borderRadius: borderRadius["4xl"],
      padding: spacing.xl,
    },
    tertiary: {
      backgroundColor: colors.surface.creamyWhite,
      borderRadius: borderRadius["4xl"],
      padding: spacing.xl,
    },
  },

  button: {
    primary: {
      backgroundColor: colors.primary.deepGreen,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
    secondary: {
      backgroundColor: colors.secondary.lightGold,
      borderRadius: borderRadius.full,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    ghost: {
      backgroundColor: "transparent",
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
  },

  iconButton: {
    size: 40,
    borderRadius: 20,
    backgroundColor: colors.overlay.light,
  },

  badge: {
    backgroundColor: colors.primary.deepGreen,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
} as const;

// Helper function to create consistent gaps
export const gap = (size: keyof typeof spacing) => ({
  gap: spacing[size],
});

// Helper function for consistent padding
export const padding = (size: keyof typeof spacing) => ({
  padding: spacing[size],
});

export const paddingHorizontal = (size: keyof typeof spacing) => ({
  paddingHorizontal: spacing[size],
});

export const paddingVertical = (size: keyof typeof spacing) => ({
  paddingVertical: spacing[size],
});
