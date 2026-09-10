#!/usr/bin/env python3
"""
FastMCP — Production MCP Server Entrypoint

Provides MCP protocol compatibility via JSON-RPC over stdio or HTTP.
Exposes India enterprise tools (GST, UPI, PAN, IFSC) and multi-LLM gateway.
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add schemas and tools to path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent / "schemas"))
sys.path.insert(0, str(Path(__file__).parent / "tools"))

from auth.middleware import validate_bearer_token
from gateway.router import create_router
from tools.gst import validate_gstin
from tools.payments import validate_upi, initiate_upi_payment, get_upi_transaction_status
from tools.corporate import decode_pan, decode_cin
from tools.banking import decode_ifsc
from skills.web_search import search_web
from skills.doc_parser import parse_document
from skills.database import DatabaseConnector

# Configuration
PORT = int(os.environ.get("MCP_SERVER_PORT", "8000"))
HOST = os.environ.get("MCP_SERVER_HOST", "0.0.0.0")
DEBUG = os.environ.get("MCP_SERVER_DEBUG", "0") == "1"

# Initialize components
router = create_router()
db_connector = DatabaseConnector()


async def handle_request(method: str, params: dict) -> dict:
    """Route a JSON-RPC request to the appropriate handler."""
    
    # Authentication check for sensitive operations.
    # Read-only listing/health methods are exempt; tool invocation and
    # gateway completion are auth-gated.
    if method not in ("initialize", "tools/list", "server/info", "gateway.health"):
        token = params.get("token") or params.get("headers", {}).get("authorization")
        if not token or not await validate_bearer_token(token):
            return {"error": {"code": -32001, "message": "Unauthorized"}}
    
    # Route by method
    handlers = {
        "initialize": handle_initialize,
        "tools/list": handle_tools_list,
        "server/info": handle_server_info,
        "gst.validate": lambda p: validate_gstin(p.get("gstin", "")),
        "payments.validate": lambda p: validate_upi(p.get("vpa", "")),
        "upi.initiate": lambda p: initiate_upi_payment(
            p.get("vpa", ""),
            p.get("amount", 0.0),
            p.get("note", ""),
            p.get("transaction_id")
        ),
        "upi.status": lambda p: get_upi_transaction_status(p.get("transaction_id", "")),
        "corporate.decode_pan": lambda p: decode_pan(p.get("pan", "")),
        "corporate.decode_cin": lambda p: decode_cin(p.get("cin", "")),
        "banking.decode_ifsc": lambda p: decode_ifsc(p.get("ifsc", "")),
        "skills.search": lambda p: search_web(p.get("query", "")),
        "skills.doc_parse": lambda p: parse_document(p.get("path", "")),
        "database.query": lambda p: db_connector.query(p.get("statement", "")),
        "gateway.complete": lambda p: router.route_complete(p.get("prompt", ""), **(p.get("params") or {})),
        "gateway.health": lambda p: router.health_check_all(),
    }
    
    handler = handlers.get(method)
    if handler:
        result = handler(params)
        # route_complete / health_check_all are coroutines
        if asyncio.iscoroutine(result):
            result = await result
        return result
    
    return {"error": {"code": -32601, "message": f"Method not found: {method}"}}


async def handle_initialize(params: dict) -> dict:
    """MCP initialization handler."""
    return {
        "protocolVersion": "2024-11-05",
        "capabilities": {
            "tools": True,
            "resources": True,
            "prompts": True,
            "gst_validation": True,
            "upi_validation": True,
            "upi_initiation": True,
            "upi_status": True,
            "pan_cin_decoding": True,
            "ifsc_lookup": True,
            "web_search": True,
            "doc_parsing": True,
            "database_query": True,
        },
        "serverInfo": {
            "name": "FastMCP",
            "version": "0.1.0",
            "description": "MCP server with India enterprise tools and UPI payment capabilities (Razorpay Sandbox)",
            "toolsCount": 12,
            "supports": ["gst", "upi", "upi_initiation", "upi_status", "pan", "cin", "ifsc", "web_search", "doc_parse", "database", "gateway_complete", "gateway_health"],
        }
    }


async def handle_tools_list(params: dict) -> dict:
    """List available tools."""
    return {
        "tools": [
            {"name": "gst.validate", "description": "Validate GSTIN number"},
            {"name": "payments.validate", "description": "Validate UPI VPA"},
            {"name": "upi.initiate", "description": "Initiate UPI payment via Razorpay Sandbox"},
            {"name": "upi.status", "description": "Check UPI transaction status via Razorpay Sandbox"},
            {"name": "corporate.decode_pan", "description": "Decode PAN card number"},
            {"name": "corporate.decode_cin", "description": "Decode CIN number"},
            {"name": "banking.decode_ifsc", "description": "Decode IFSC code"},
            {"name": "skills.search", "description": "Web search for live context"},
            {"name": "skills.doc_parse", "description": "Document OCR and parsing"},
            {"name": "database.query", "description": "Database query execution"},
            {"name": "gateway.complete", "description": "Route a completion request through the multi-LLM fallback cascade"},
            {"name": "gateway.health", "description": "Read health snapshots for all configured LLM providers"},
        ]
    }


async def handle_server_info(params: dict) -> dict:
    """Return server metadata."""
    return {
        "name": "FastMCP",
        "version": "0.1.0",
        "description": "MCP server with India enterprise tools and UPI payment capabilities (Razorpay Sandbox)",
        "toolsCount": 12,
        "supports": ["gst", "upi", "upi_initiation", "upi_status", "pan", "cin", "ifsc", "web_search", "doc_parse", "database", "gateway_complete", "gateway_health"],
    }


# JSON-RPC message handling
async def process_message(message: dict) -> dict | None:
    """Process a single JSON-RPC message and return response."""
    if message.get("method"):
        result = await handle_request(message["method"], message.get("params", {}))
        return {
            "jsonrpc": "2.0",
            "id": message.get("id"),
            "result": result,
        }
    return None


def run_stdio():
    """Run server with stdio transport (default)."""
    import signal
    
    running = True
    
    def signal_handler(sig, frame):
        nonlocal running
        running = False
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    while running:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            message = json.loads(line.strip())
            response = asyncio.run(process_message(message))
            if response:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
        except json.JSONDecodeError:
            sys.stderr.write("Invalid JSON\n")
            sys.stderr.flush()
        except Exception as e:
            sys.stderr.write(f"Error: {e}\n")
            sys.stderr.flush()
    
    sys.exit(0)


def run_http(host: str = HOST, port: int = PORT):
    """Run server with HTTP transport."""
    import uvicorn
    from fastapi import FastAPI, Depends, HTTPException
    from fastapi.responses import JSONResponse
    
    app = FastAPI(title="FastMCP", version="0.1.0")
    
    @app.post("/v1/mcp/initialize")
    async def initialize():
        return await handle_initialize({})
    
    @app.post("/v1/mcp/tools/list")
    async def tools_list():
        return await handle_tools_list({})
    
    @app.post("/v1/mcp/gst/validate")
    async def gst_validate(gstin: str):
        result = validate_gstin(gstin)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    
    @app.post("/v1/mcp/payments/validate")
    async def payments_validate(vpa: str):
        result = validate_upi(vpa)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    
    @app.get("/v1/server/info")
    async def server_info():
        return await handle_server_info({})
    
    # ---- Gateway HTTP surface ----
    # The provider router (services/mcp-server/gateway/router.py) is exposed
    # over HTTP here so the TypeScript GatewayClient (services/gateway/) and
    # any other HTTP client can read health and request routed completions
    # without going through JSON-RPC stdio. Snake_case keys from the Python
    # router are normalized to camelCase on the wire for JS consumers.
    
    def _normalize_completion(result: dict) -> dict:
        if "latency_ms" in result:
            result["latencyMs"] = result.pop("latency_ms")
        return result
    
    def _normalize_provider_health(health: dict) -> dict:
        return {
            "status": health.get("status"),
            "successCount": health.get("success_count", 0),
            "errorCount": health.get("error_count", 0),
            "lastHealthCheck": health.get("last_health_check", 0),
        }
    
    @app.post("/v1/gateway/complete")
    async def gateway_complete(body: dict):
        from fastapi import HTTPException
        prompt = body.get("prompt", "")
        if not prompt:
            raise HTTPException(status_code=400, detail="prompt is required")
        params = body.get("params") or {k: v for k, v in body.items() if k != "prompt"}
        result = await router.route_complete(prompt, **params)
        return _normalize_completion(result)
    
    @app.get("/v1/gateway/health")
    async def gateway_health():
        health = router.health_check_all()
        return {name: _normalize_provider_health(snapshot) for name, snapshot in health.items()}
    
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    if os.environ.get("MCP_TRANSPORT", "stdio") == "http":
        run_http()
    else:
        run_stdio()