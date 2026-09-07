"use client";

import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

// global-error.tsx MUST render <html> and <body> — it replaces the root layout.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { product: "mcpserver-in", boundary: "global-error" },
    });
  }, [error]);

  return (
    <html lang="en-IN">
      <body>
        {/* NextError is the default Next.js error page component. */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
