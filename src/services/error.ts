/**
 * Error de dominio de la capa de servicios.
 *
 * Extiende Error para no romper a los consumidores que hacen
 * `err instanceof Error` o leen `err.message`. Además conserva de forma
 * segura el código y la causa original de Supabase, sin exponer valores
 * privados, tokens ni mensajes crudos en la UI.
 */
export class ServiceError extends Error {
  code?: string;
  cause?: unknown;

  constructor(message: string, options?: { code?: string; cause?: unknown }) {
    super(message);
    this.name = 'ServiceError';
    this.code = options?.code;
    this.cause = options?.cause;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
