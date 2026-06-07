/**
 * Models — Tipos e interfaces do domínio
 *
 * Organize aqui os tipos compartilhados entre componentes e serviços.
 * Ex: User, Product, Order, etc.
 */

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
