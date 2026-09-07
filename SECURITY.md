# Security

Coordinated disclosure: **security@mcpserver.in** (PGP key at
[`/security/pgp-key`](https://www.mcpserver.in/security/pgp-key)).
Acknowledgement within 48 hours. See `security.txt` for the full policy.

## Severity classification

| Severity | Response SLA |
| --- | --- |
| Critical | 24 hours |
| High     | 48 hours |
| Medium   | 7 days   |
| Low      | 14 days  |

## Reporting scope

- Cross-site scripting or content injection in any published page
- Server-side request forgery, SSRF, or remote code execution
- Authentication / authorization bypass on any `/api/*` endpoint
- TLS or HSTS misconfiguration
- Dependency vulnerabilities with a working exploit against this stack
- Data exfiltration from the server-registry or evidence ledger

## Out of scope

- Rate-limit-only findings without a demonstrated impact
- Theoretical issues without a working PoC
- Findings against third-party services we do not operate (npm, PyPI, etc.)
- Spam or content-quality complaints (use the editorial-policy form instead)

## Recognition

Previous reporters are listed at
[`/security/acknowledgements`](https://www.mcpserver.in/security/acknowledgements).

The full methodology and threat model is at
[`/methodology`](https://www.mcpserver.in/methodology).
