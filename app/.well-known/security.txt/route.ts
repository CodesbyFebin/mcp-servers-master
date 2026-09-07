import { NextResponse } from "next/server";

/**
 * /.well-known/security.txt — RFC 9116 crawler-friendly security contact.
 * Mirrors the root security.txt so the path resolves correctly under
 * app/.well-known/ in the Next.js App Router.
 */
const SECURITY_TXT = `# MCPserver.in Security Contact

## Security Contact

email: security@mcpserver.in
Expires: 2027-08-20

## Detection

Comprehensive security assessments can be conducted via:
- Automated vulnerability scanning (with prior authorization)
- Manual penetration testing (coordinated disclosure)
- Threat model review (SAFE-DEEP OS v5 framework)

## Policy

Security policies are maintained at:
- \`https://www.mcpserver.in/security\`
- \`https://app.mcpserver.in/security\`

## Supported Procedures

- Coordinate disclosures via security@mcpserver.in
- Encrypt submissions with PGP key available at \`https://www.mcpserver.in/security/pgp-key\`
- All reports acknowledged within 48 hours
- Severity classification: Critical (24h), High (48h), Medium (7d), Low (14d)

## Acknowledgements

Previous contributors recognized at:
- \`https://www.mcpserver.in/security/acknowledgements\`
`;

export function GET() {
  return new NextResponse(SECURITY_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
