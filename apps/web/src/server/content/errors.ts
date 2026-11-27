/** Expected failures that are safe to show to the CMS user. Anything else is a 500. */
export class DomainError extends Error {
  constructor(
    public readonly code: 'not_found' | 'forbidden' | 'conflict' | 'invalid' | 'stale',
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const e = (error as { cause?: unknown })?.cause ?? error;
  if (typeof e !== 'object' || e === null) return false;
  const pg = e as { code?: string; constraint_name?: string };
  return pg.code === '23505' && (!constraint || pg.constraint_name === constraint);
}
