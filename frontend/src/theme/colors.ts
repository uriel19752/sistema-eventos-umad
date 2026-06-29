export const COLORS = {
  // Marca — Paleta Institucional UMAD
  primary: "#1E3A8A", // Azul Marino Institucional
  secondary: "#E11D48", // Rojo Tigre
  accent: "#2563EB", // Azul tecnológico
  gold: "#D97706", // Dorado institucional

  // Superficies
  background: "#F1F5F9",
  surface: "#FFFFFF",

  // Texto
  textPrimary: "#0F172A",
  textSecondary: "#64748B",

  // Estados
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",

  // UI
  border: "#CBD5E1",

  white: "#FFFFFF",

  pending: "#f59e0b",
  approved: "#1e3a8a",
  completed: "#16a34a",
  cancelled: "#dc2626",
} as const;

export type ColorKey = keyof typeof COLORS;
