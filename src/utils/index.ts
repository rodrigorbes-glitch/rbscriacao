/**
 * Utils — Funções utilitárias genéricas
 *
 * Organize aqui helpers reutilizáveis.
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
