// Optional: tunnel endpoint to bypass ad-blockers.
// Enable by setting tunnel: "/api/errors" in next.config.mjs Sentry options.

export const runtime = "edge";

export async function POST(request: Request): Promise<Response> {
  try {
    const envelope = await request.text();
    const piece = envelope.split("\n")[0];
    const header = JSON.parse(piece) as { dsn?: string };
    const dsn = new URL(header.dsn ?? "");
    const { host } = dsn;
    const projectId = dsn.pathname.split("/").pop();

    const url = `https://${host}/api/${projectId}/envelope/`;

    await fetch(url, {
      method: "POST",
      body: envelope,
    });

    return new Response("OK", { status: 200 });
  } catch {
    return new Response("Bad Request", { status: 400 });
  }
}
