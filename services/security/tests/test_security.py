import unittest

from services.security.middleware import (
    AuthError,
    create_hs256_token,
    redact_sensitive_text,
    validate_bearer,
    verify_hs256_token,
)
from services.security.network import DNSRebindingPrevention, ProtocolValidator, SSRFProtection
from services.security.policy import Decision, PolicyConfig, PolicyEngine, PolicyRequest


SECRET = "0123456789abcdef0123456789abcdef"


class JwtTests(unittest.TestCase):
    def test_create_and_verify_hs256(self):
        token = create_hs256_token(
            "user-1",
            SECRET,
            ttl_seconds=60,
            issuer="mcpserver.in",
            audience="api",
            now=1_000,
            extra={"role": "reader"},
        )
        payload = verify_hs256_token(
            token,
            SECRET,
            issuer="mcpserver.in",
            audience="api",
            now=1_030,
        )
        self.assertEqual(payload["sub"], "user-1")
        self.assertEqual(payload["role"], "reader")

    def test_expired_and_tampered_tokens_fail(self):
        token = create_hs256_token("user-1", SECRET, ttl_seconds=10, now=1_000)
        with self.assertRaises(AuthError):
            verify_hs256_token(token, SECRET, now=1_011)
        replacement = "A" if token[-1] != "A" else "B"
        tampered = token[:-1] + replacement
        with self.assertRaises(AuthError):
            verify_hs256_token(tampered, SECRET, now=1_001)

    def test_bearer_optional_and_required(self):
        self.assertIsNone(validate_bearer(None, SECRET, required=False, now=1_000))
        with self.assertRaises(AuthError):
            validate_bearer(None, SECRET, required=True, now=1_000)


class RedactionTests(unittest.TestCase):
    def test_redacts_india_pii_and_email(self):
        text = "PAN ABCDE1234F GSTIN 32ABCDE1234F1Z5 email person@example.com phone +91 9876543210"
        redacted = redact_sensitive_text(text)
        self.assertNotIn("ABCDE1234F", redacted)
        self.assertNotIn("person@example.com", redacted)
        self.assertNotIn("9876543210", redacted)
        self.assertIn("[REDACTED:PAN]", redacted)
        self.assertIn("[REDACTED:GSTIN]", redacted)


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.engine = PolicyEngine(
            PolicyConfig.from_rules(
                "org-1",
                explicit_denies=[("delete", "*")],
                explicit_allows=[("read", "registry"), ("write", "registry")],
            )
        )

    def test_allow_deny_and_approval(self):
        allowed = self.engine.evaluate(PolicyRequest("org-1", "u", "read", "registry"))
        denied = self.engine.evaluate(PolicyRequest("org-1", "u", "delete", "registry", is_admin=True))
        approval = self.engine.evaluate(
            PolicyRequest("org-1", "u", "write", "registry", approval_required=True)
        )
        self.assertEqual(allowed.decision, Decision.ALLOW)
        self.assertEqual(denied.decision, Decision.DENY)
        self.assertEqual(approval.decision, Decision.REQUIRE_APPROVAL)

    def test_org_boundary_and_rate_constraint_fail_closed(self):
        self.assertEqual(
            self.engine.evaluate(PolicyRequest("org-2", "u", "read", "registry")).stage,
            "org-boundary",
        )
        self.assertEqual(
            self.engine.evaluate(PolicyRequest("org-1", "u", "read", "registry", rate_exceeded=True)).stage,
            "rate-constraint",
        )


class NetworkTests(unittest.TestCase):
    def test_protocol_validator_rejects_credentials_and_http(self):
        validator = ProtocolValidator()
        self.assertTrue(validator.validate("https://example.com/path"))
        self.assertFalse(validator.validate("http://example.com/path"))
        self.assertFalse(validator.validate("https://user:pass@example.com/path"))

    def test_ssrf_rejects_private_addresses_and_dns_rebinding(self):
        values = {
            "public.example": ["93.184.216.34"],
            "private.example": ["127.0.0.1"],
        }
        dns = DNSRebindingPrevention(resolver=lambda host: values[host])
        protection = SSRFProtection(ProtocolValidator(), dns)
        self.assertTrue(protection.is_safe_url("https://public.example/path"))
        self.assertFalse(protection.is_safe_url("https://private.example/path"))
        self.assertFalse(protection.is_safe_url("https://127.0.0.1/path"))
        values["public.example"] = ["93.184.216.35"]
        self.assertFalse(protection.is_safe_url("https://public.example/path"))


if __name__ == "__main__":
    unittest.main()
