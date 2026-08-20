import http from "node:http"

const service = process.env.SERVICE_NAME ?? "unknown-service"
const mode = process.env.SERVICE_MODE ?? "foundation"
const port = Number(process.env.PORT ?? 3000)

const server = http.createServer((req, res) => {
  if (req.url !== "/health") {
    res.writeHead(404, { "content-type": "application/json; charset=utf-8" })
    res.end(JSON.stringify({ error: "not_found" }))
    return
  }

  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  res.end(JSON.stringify({ status: "ok", service, mode }))
})

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(JSON.stringify({ level: "info", event: "service_started", service, mode, port }) + "\n")
})
