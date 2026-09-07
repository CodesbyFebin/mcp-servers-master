"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { product: "mcpserver-in", boundary: "route-error" },
    });
  }, [error]);

  return (
    <div style={{ maxWidth: 640, margin: "6rem auto", padding: "0 1.5rem" }}>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        We&apos;ve been notified and are looking into it. If this keeps
        happening, please try again or contact support.
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            background: "#0891b2",
            color: "white",
            border: 0,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
        <a
          href="/"
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            color: "#374151",
            textDecoration: "none",
          }}
        >
          Go home
        </a>
      </div>
    </div>
  );
}
