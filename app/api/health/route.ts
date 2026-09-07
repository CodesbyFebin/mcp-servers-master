import { NextResponse } from "next/server";

/**
 * /api/health — liveness probe.
 *
 * Returns 200 + a minimal JSON body. Intentionally does NOT include uptime,
 * memory, region, or other metrics that would invite dashboards that drift
 * from reality under the zero-fabrication contract.
 *
 * `sha` is the Vercel commit SHA at build time, or "dev" outside Vercel.
 * `now` is server time at request handling.
 */
export const dynamic = "force-dynamic";

export function GET() {
  // SHA priority for self-host identity:
  //   1. APP_VERSION          — injected by the multi-stage Dockerfile (build arg)
  //   2. VERCEL_GIT_COMMIT_SHA — present on Vercel preview/production
  //   3. "dev"                — local `next dev` fallback
  // The staging hard gate is `sha === NEW_SHA`; the deploy contract requires
  // compose to inject APP_VERSION=${APP_VERSION}.
  const sha =
    process.env.APP_VERSION ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    "dev";
  return NextResponse.json(
    {
      status: "ok",
      sha,
      now: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
