import * as Sentry from "@sentry/nextjs";

/**
 * Tag helpers so every manual capture call carries the product identity.
 * Use these instead of raw Sentry.captureException / captureMessage.
 */
export function captureError(
  error: unknown,
  context?: Record<string, string>,
) {
  return Sentry.captureException(error, {
    tags: { product: "mcpserver-in", ...context },
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, string>,
) {
  return Sentry.captureMessage(message, {
    level,
    tags: { product: "mcpserver-in", ...context },
  });
}

/**
 * Wrap a server action with automatic error capture + rethrow.
 *
 *   export const submitForm = withActionCapture(
 *     async (data) => { ... },
 *     "submitForm",
 *   );
 */
export function withActionCapture<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  actionName: string,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    try {
      return await fn(...args);
    } catch (err) {
      captureError(err, { action: actionName, boundary: "server-action" });
      throw err;
    }
  };
}
