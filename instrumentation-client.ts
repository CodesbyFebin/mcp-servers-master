import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development",

    // 100 % in dev so every local error is captured; dial back in prod.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    profilesSampleRate: 0.1,

    // Tag every event with product identity.
    initialScope: (scope) => {
      scope.setTag("product", "mcpserver-in");
      scope.setTag("runtime", "client");
      return scope;
    },

    // Redact PII from query strings before sending.
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url);
          url.searchParams.forEach((_, key) => {
            if (/token|key|secret|password|auth/i.test(key)) {
              url.searchParams.set(key, "[REDACTED]");
            }
          });
          event.request.url = url.toString();
        } catch {
          // Leave URL untouched if parsing fails.
        }
      }
      return event;
    },

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
  });
}
