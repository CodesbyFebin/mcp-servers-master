#!/usr/bin/env python3
"""MCPServer.in production ingestion pipeline.

Sources:
  1. Official MCP Registry (authoritative identity/version source)
  2. RenatoMarinho/mcp-registry on Hugging Face (enrichment/discovery)

Safety model:
  * dry-run by default; --live is required for database writes
  * Hugging Face-only rows never become verified canonical servers
  * deterministic joins: official name -> repository -> package identifier
  * ambiguous matches are quarantined, never guessed from a name/slug
  * all raw source records and version history are retained
  * generated content is written atomically
"""

from __future__ import annotations

import argparse
import dataclasses
import hashlib
import html
import json
import os
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Iterator

OFFICIAL_URL = "https://registry.modelcontextprotocol.io/v0.1/servers"
HF_DATASET = "RenatoMarinho/mcp-registry"
SOURCE_OFFICIAL = "official-mcp-registry"
SOURCE_HF = "huggingface-renatomarinho-mcp-registry"
USER_AGENT = "MCPServer.in registry sync/1.0 (+https://www.mcpserver.in/editorial-policy)"


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or hashlib.sha256(value.encode()).hexdigest()[:16]


def norm_repo(value: Any) -> str | None:
    if isinstance(value, dict):
        value = value.get("url")
    if not isinstance(value, str) or not value.strip():
        return None
    value = value.strip().replace("git@github.com:", "https://github.com/")
    value = re.sub(r"\.git$", "", value).rstrip("/")
    try:
        parsed = urllib.parse.urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return None
        return urllib.parse.urlunparse(("https", parsed.netloc.lower(), parsed.path, "", "", "")).lower()
    except ValueError:
        return None


def package_keys(packages: Any) -> set[str]:
    out: set[str] = set()
    if isinstance(packages, dict):
        packages = [packages]
    if not isinstance(packages, list):
        return out
    for package in packages:
        if not isinstance(package, dict):
            continue
        registry = str(package.get("registryType") or package.get("registry") or "").lower().strip()
        identifier = str(package.get("identifier") or package.get("name") or "").lower().strip()
        if registry and identifier:
            out.add(f"{registry}:{identifier}")
    return out


def first_value(row: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = row.get(key)
        if value not in (None, "", [], {}):
            return value
    return None


def as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def as_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def fetch_json(url: str, retries: int = 4) -> dict[str, Any]:
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=45) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            if attempt + 1 == retries:
                raise RuntimeError(f"failed to fetch {url}: {exc}") from exc
            time.sleep(min(8, 2**attempt))
    raise AssertionError("unreachable")


def fetch_official(start_cursor: str | None, checkpoint: Path) -> tuple[list[dict[str, Any]], str | None]:
    records: list[dict[str, Any]] = []
    cursor = start_cursor
    seen: set[str] = set()
    while True:
        query = {"limit": "100"}
        if cursor:
            query["cursor"] = cursor
        page = fetch_json(f"{OFFICIAL_URL}?{urllib.parse.urlencode(query)}")
        batch = page.get("servers", [])
        if not isinstance(batch, list):
            raise RuntimeError("Official Registry returned a non-list servers field")
        records.extend(x for x in batch if isinstance(x, dict))
        next_cursor = page.get("metadata", {}).get("nextCursor")
        atomic_json(checkpoint, {"cursor": next_cursor, "fetched": len(records), "updated_at": utcnow()})
        print(f"official: fetched {len(records)} versions; cursor={next_cursor}")
        if not next_cursor or next_cursor in seen:
            return records, next_cursor
        seen.add(next_cursor)
        cursor = str(next_cursor)
        time.sleep(0.2)


def fetch_huggingface(split: str, revision: str | None) -> list[dict[str, Any]]:
    try:
        from datasets import load_dataset  # type: ignore
    except ImportError as exc:
        raise RuntimeError("Hugging Face ingestion requires: pip install datasets==4.0.0") from exc
    kwargs: dict[str, Any] = {"path": HF_DATASET, "split": split, "trust_remote_code": False}
    if revision:
        kwargs["revision"] = revision
    dataset = load_dataset(**kwargs)
    return [dict(row) for row in dataset]


@dataclasses.dataclass
class Canonical:
    name: str
    title: str
    description: str
    website: str | None
    repository: str | None
    repository_source: str | None
    latest_version: str
    status: str
    first_published_at: str | None
    source_updated_at: str | None
    raw_latest: dict[str, Any]
    packages: set[str]
    versions: list[dict[str, Any]]
    enrichment: dict[str, Any] = dataclasses.field(default_factory=dict)


def map_official(rows: Iterable[dict[str, Any]]) -> dict[str, Canonical]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for wrapper in rows:
        server = as_dict(wrapper.get("server"))
        name = str(server.get("name") or "").strip()
        version = str(server.get("version") or "").strip()
        if name and version:
            grouped[name].append(wrapper)
    output: dict[str, Canonical] = {}
    for name, versions in grouped.items():
        def rank(item: dict[str, Any]) -> tuple[int, str]:
            meta = as_dict(item.get("_meta")).get("io.modelcontextprotocol.registry/official", {})
            return (1 if isinstance(meta, dict) and meta.get("isLatest") is True else 0, str(meta.get("updatedAt") or ""))
        latest_wrapper = max(versions, key=rank)
        latest = as_dict(latest_wrapper["server"])
        official = as_dict(latest_wrapper.get("_meta")).get("io.modelcontextprotocol.registry/official", {})
        official = official if isinstance(official, dict) else {}
        repo_obj = as_dict(latest.get("repository"))
        output[name] = Canonical(
            name=name,
            title=str(latest.get("title") or name.split("/")[-1]),
            description=str(latest.get("description") or ""),
            website=str(latest.get("websiteUrl")) if latest.get("websiteUrl") else None,
            repository=norm_repo(repo_obj),
            repository_source=str(repo_obj.get("source")) if repo_obj.get("source") else None,
            latest_version=str(latest["version"]),
            status=str(official.get("status") or "active"),
            first_published_at=str(official.get("publishedAt")) if official.get("publishedAt") else None,
            source_updated_at=str(official.get("updatedAt")) if official.get("updatedAt") else None,
            raw_latest=latest,
            packages=set().union(*(package_keys(as_dict(v.get("server")).get("packages")) for v in versions)),
            versions=versions,
        )
    return output


def hf_identity(row: dict[str, Any]) -> tuple[str | None, str | None, set[str]]:
    name = first_value(row, "official_registry_id", "officialId", "server_id", "name", "slug")
    repo = norm_repo(first_value(row, "repository_url", "repositoryUrl", "repository", "repo_url", "github_url"))
    packages = package_keys(first_value(row, "packages", "package", "package_info"))
    registry = first_value(row, "package_registry", "registry_type")
    identifier = first_value(row, "package_identifier", "package_id", "npm_package", "pypi_package")
    if registry and identifier:
        packages.add(f"{str(registry).lower()}:{str(identifier).lower()}")
    return (str(name).strip() if name else None, repo, packages)


def enrich(canonicals: dict[str, Canonical], hf_rows: Iterable[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    repo_index: dict[str, set[str]] = defaultdict(set)
    package_index: dict[str, set[str]] = defaultdict(set)
    for name, server in canonicals.items():
        if server.repository:
            repo_index[server.repository].add(name)
        for package in server.packages:
            package_index[package].add(name)
    candidates: list[dict[str, Any]] = []
    conflicts: list[dict[str, Any]] = []
    for row in hf_rows:
        claimed_name, repo, packages = hf_identity(row)
        matches: set[str] = set()
        reasons: list[str] = []
        if claimed_name in canonicals:
            matches.add(claimed_name)
            reasons.append("official-name")
        if repo and repo in repo_index:
            matches |= repo_index[repo]
            reasons.append("repository")
        for package in packages:
            if package in package_index:
                matches |= package_index[package]
                reasons.append(f"package:{package}")
        if len(matches) == 1:
            name = next(iter(matches))
            canonicals[name].enrichment = {
                "source": SOURCE_HF, "matched_by": sorted(set(reasons)), "retrieved_at": utcnow(),
                "tools_count": first_value(row, "tools_count", "tool_count"),
                "debugger_grade": first_value(row, "debugger_grade", "quality_grade"),
                "reliability_score": first_value(row, "reliability_score", "reliability"),
                "prompt_examples": first_value(row, "prompt_examples", "prompts"),
                "raw": row,
            }
        elif len(matches) > 1:
            conflicts.append({"matches": sorted(matches), "reasons": sorted(set(reasons)), "raw": row})
        else:
            candidates.append({"candidate_name": claimed_name, "repository": repo, "packages": sorted(packages), "raw": row})
    return candidates, conflicts


def require_psycopg():
    try:
        import psycopg  # type: ignore
        return psycopg
    except ImportError as exc:
        raise RuntimeError("Live ingestion requires: pip install 'psycopg[binary]==3.2.9'") from exc


SCHEMA_SQL = """
create extension if not exists pgcrypto;
create table if not exists public.registry_candidates(
  id uuid primary key default gen_random_uuid(), source_key text not null,
  candidate_fingerprint text not null, candidate_name text, repository_url text,
  package_keys jsonb not null default '[]'::jsonb, raw_record jsonb not null,
  review_state text not null default 'pending' check(review_state in ('pending','approved','rejected','merged')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(source_key,candidate_fingerprint)
);
alter table public.registry_candidates enable row level security;
revoke all on public.registry_candidates from anon, authenticated;
create index if not exists registry_candidates_review_idx on public.registry_candidates(review_state,created_at);
alter table public.mcp_servers add column if not exists enrichment jsonb not null default '{}'::jsonb;
"""


def upsert_database(dsn: str, canonicals: dict[str, Canonical], candidates: list[dict[str, Any]], conflicts: list[dict[str, Any]]) -> dict[str, int]:
    psycopg = require_psycopg()
    from psycopg.types.json import Jsonb  # type: ignore
    stats = {"servers": 0, "versions": 0, "candidates": 0, "conflicts": len(conflicts)}
    with psycopg.connect(dsn) as connection, connection.cursor() as cur:
        cur.execute(SCHEMA_SQL)
        cur.execute("select id from public.registry_sources where key=%s", (SOURCE_OFFICIAL,))
        source = cur.fetchone()
        if not source:
            raise RuntimeError("registry_sources is missing official-mcp-registry")
        official_source_id = source[0]
        for server in canonicals.values():
            cur.execute("""
              insert into public.mcp_servers(canonical_name,slug,title,description,website_url,repository_url,
                repository_source,latest_version,status,is_published,first_published_at,source_updated_at,
                source_id,raw_latest,enrichment)
              values(%s,%s,%s,%s,%s,%s,%s,%s,%s,true,%s,%s,%s,%s,%s)
              on conflict(canonical_name) do update set title=excluded.title,description=excluded.description,
                website_url=excluded.website_url,repository_url=excluded.repository_url,
                repository_source=excluded.repository_source,latest_version=excluded.latest_version,
                status=excluded.status,source_updated_at=excluded.source_updated_at,raw_latest=excluded.raw_latest,
                enrichment=excluded.enrichment,updated_at=now()
              returning id
            """, (server.name,slugify(server.name),server.title,server.description,server.website,server.repository,
                    server.repository_source,server.latest_version,server.status,server.first_published_at,
                    server.source_updated_at,official_source_id,Jsonb(server.raw_latest),Jsonb(server.enrichment)))
            server_id = cur.fetchone()[0]
            stats["servers"] += 1
            for wrapper in server.versions:
                raw = as_dict(wrapper["server"])
                meta = as_dict(wrapper.get("_meta")).get("io.modelcontextprotocol.registry/official", {})
                meta = meta if isinstance(meta, dict) else {}
                cur.execute("""
                  insert into public.mcp_server_versions(server_id,source_id,version,is_latest,status,schema_url,
                    published_at,source_updated_at,packages,remotes,icons,publisher_meta,raw_record)
                  values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                  on conflict(server_id,source_id,version) do update set is_latest=excluded.is_latest,
                    status=excluded.status,source_updated_at=excluded.source_updated_at,packages=excluded.packages,
                    remotes=excluded.remotes,icons=excluded.icons,publisher_meta=excluded.publisher_meta,
                    raw_record=excluded.raw_record,ingested_at=now()
                """, (server_id,official_source_id,str(raw["version"]),bool(meta.get("isLatest")),
                        str(meta.get("status") or "active"),raw.get("$schema"),meta.get("publishedAt"),
                        meta.get("updatedAt"),Jsonb(as_list(raw.get("packages"))),Jsonb(as_list(raw.get("remotes"))),
                        Jsonb(as_list(raw.get("icons"))),Jsonb(as_dict(raw.get("_meta")).get("io.modelcontextprotocol.registry/publisher-provided", {})),Jsonb(wrapper)))
                stats["versions"] += 1
        for candidate in candidates:
            fingerprint = hashlib.sha256(json.dumps(candidate, sort_keys=True, default=str).encode()).hexdigest()
            cur.execute("""
              insert into public.registry_candidates(source_key,candidate_fingerprint,candidate_name,repository_url,package_keys,raw_record)
              values(%s,%s,%s,%s,%s,%s) on conflict(source_key,candidate_fingerprint)
              do update set raw_record=excluded.raw_record,updated_at=now()
            """, (SOURCE_HF,fingerprint,candidate.get("candidate_name"),candidate.get("repository"),
                    Jsonb(candidate.get("packages",[])),Jsonb(candidate.get("raw",{}))))
            stats["candidates"] += 1
        connection.commit()
    return stats


def atomic_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(text)
        temp = Path(handle.name)
    temp.replace(path)


def atomic_json(path: Path, value: Any) -> None:
    atomic_text(path, json.dumps(value, ensure_ascii=False, indent=2, default=str) + "\n")


def generate_content(canonicals: dict[str, Canonical], output: Path, site_url: str) -> None:
    servers_dir = output / "servers"
    servers_dir.mkdir(parents=True, exist_ok=True)
    urls: list[str] = []
    llms: list[str] = ["# MCPServer.in — Verified MCP Server Index", "", f"> Generated {utcnow()}", ""]
    manifest: list[dict[str, Any]] = []
    for server in sorted(canonicals.values(), key=lambda item: item.name):
        slug = slugify(server.name)
        url = f"{site_url.rstrip('/')}/servers/{slug}"
        urls.append(url)
        record = dataclasses.asdict(server)
        record["packages"] = sorted(server.packages)
        record["slug"] = slug
        record["canonical_url"] = url
        record["evidence_tier"] = "canonical-registry"
        atomic_json(servers_dir / f"{slug}.json", record)
        manifest.append({k: record[k] for k in ("name","title","description","latest_version","slug","canonical_url","evidence_tier")})
        llms.extend([f"## {server.title}", f"- Canonical ID: {server.name}", f"- Version: {server.latest_version}", f"- URL: {url}", f"- Description: {server.description}", ""])
    atomic_json(output / "server-manifest.json", manifest)
    atomic_text(output / "llms-servers.txt", "\n".join(llms))
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sitemap.extend(f"  <url><loc>{html.escape(url)}</loc><lastmod>{datetime.now(timezone.utc).date()}</lastmod></url>" for url in urls)
    sitemap.append("</urlset>")
    atomic_text(output / "sitemap-servers.xml", "\n".join(sitemap) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Commit upserts to PostgreSQL; otherwise dry-run")
    parser.add_argument("--skip-huggingface", action="store_true")
    parser.add_argument("--hf-split", default="train")
    parser.add_argument("--hf-revision", help="Pin a Hugging Face commit for reproducibility")
    parser.add_argument("--resume-cursor")
    parser.add_argument("--state-dir", type=Path, default=Path(".ingest-state"))
    parser.add_argument("--output", type=Path, default=Path("generated/registry"))
    parser.add_argument("--site-url", default="https://www.mcpserver.in")
    parser.add_argument("--dsn", default=os.getenv("DATABASE_URL"), help="Supabase Postgres DSN; prefer DATABASE_URL")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.state_dir.mkdir(parents=True, exist_ok=True)
    official_rows, final_cursor = fetch_official(args.resume_cursor, args.state_dir / "official-checkpoint.json")
    canonicals = map_official(official_rows)
    hf_rows: list[dict[str, Any]] = []
    if not args.skip_huggingface:
        hf_rows = fetch_huggingface(args.hf_split, args.hf_revision)
    candidates, conflicts = enrich(canonicals, hf_rows)
    atomic_json(args.state_dir / "conflicts.json", conflicts)
    atomic_json(args.state_dir / "candidates.json", candidates)
    generate_content(canonicals, args.output, args.site_url)
    report: dict[str, Any] = {
        "mode": "live" if args.live else "dry-run", "generated_at": utcnow(),
        "official_versions": len(official_rows), "canonical_servers": len(canonicals),
        "hf_rows": len(hf_rows), "hf_candidates": len(candidates), "conflicts": len(conflicts),
        "final_cursor": final_cursor, "database": None,
    }
    if args.live:
        if not args.dsn:
            raise RuntimeError("--live requires --dsn or DATABASE_URL; never place it in frontend variables")
        report["database"] = upsert_database(args.dsn, canonicals, candidates, conflicts)
    atomic_json(args.output / "ingestion-report.json", report)
    print(json.dumps(report, indent=2))
    if conflicts:
        print(f"warning: {len(conflicts)} ambiguous rows quarantined", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("interrupted; checkpoint retained", file=sys.stderr)
        raise SystemExit(130)
    except Exception as exc:
        print(f"fatal: {exc}", file=sys.stderr)
        raise SystemExit(1)
