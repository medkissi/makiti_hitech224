// Application constants
export const APP_NAME = "Makiti_Hitech224";
export const APP_DESCRIPTION = "Application de Gestion de Boutique de Vêtements";
export const CURRENCY = "GNF";
export const CURRENCY_SYMBOL = "GNF";

// Tailles disponibles
export const TAILLES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"] as const;
export type Taille = typeof TAILLES[number];

// Modes de paiement
export const MODES_PAIEMENT = [
  { value: "especes", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
  { value: "credit", label: "Crédit" },
] as const;
export type ModePaiement = typeof MODES_PAIEMENT[number]["value"];

// Rôles utilisateurs
export const ROLES = {
  PROPRIETAIRE: "proprietaire",
  EMPLOYE: "employe",
} as const;
export type AppRole = typeof ROLES[keyof typeof ROLES];

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-GN", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " " + CURRENCY;
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

// Format datetime
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}
