import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN;

if (!SENTRY_DSN) {
  void SENTRY_DSN;
} else {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development",

    // 100 % in dev so every local error is captured; dial back in prod.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    sampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Tag every event with product identity.
    initialScope: (scope) => {
      scope.setTag("product", "mcpserver-in");
      scope.setTag("runtime", "edge");
      return scope;
    },
  });
}
