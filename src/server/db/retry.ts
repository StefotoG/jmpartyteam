/**
 * An exclusion constraint guarantees correctness but does not make conflicts painless.
 * Two transactions can each insert their tuple and then each wait for the other's to
 * resolve, which PostgreSQL breaks by aborting one with a deadlock error. The winner
 * commits, so a retry sees a plain constraint violation and gets a definite answer.
 */
export const PG_EXCLUSION_VIOLATION = '23P01';

const RETRYABLE = new Set([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
]);

export function errorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}

export async function withRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !RETRYABLE.has(errorCode(error) ?? '')) throw error;

      // Jittered backoff, so retries of the same collision do not line up again.
      const backoffMs = 2 ** attempt * 5 * (0.5 + Math.random());
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}
