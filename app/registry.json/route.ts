import { buildPublicRegistrySnapshot } from "@/src/lib/public-feed"

export function GET() {
  return new Response(JSON.stringify(buildPublicRegistrySnapshot(), null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
    },
  })
}
