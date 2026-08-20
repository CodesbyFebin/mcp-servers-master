"""Deterministic fail-closed policy engine for MCPserver.in services."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable


class Decision(str, Enum):
    ALLOW = "ALLOW"
    DENY = "DENY"
    REQUIRE_APPROVAL = "REQUIRE_APPROVAL"


@dataclass(frozen=True)
class PolicyRequest:
    org_id: str
    subject: str
    action: str
    resource: str
    is_admin: bool = False
    rate_exceeded: bool = False
    approval_required: bool = False


@dataclass(frozen=True)
class PolicyResult:
    decision: Decision
    stage: str
    reason: str


Rule = tuple[str, str]


@dataclass
class PolicyConfig:
    org_id: str
    explicit_denies: set[Rule] = field(default_factory=set)
    explicit_allows: set[Rule] = field(default_factory=set)

    @classmethod
    def from_rules(
        cls,
        org_id: str,
        *,
        explicit_denies: Iterable[Rule] = (),
        explicit_allows: Iterable[Rule] = (),
    ) -> "PolicyConfig":
        return cls(org_id=org_id, explicit_denies=set(explicit_denies), explicit_allows=set(explicit_allows))


class PolicyEngine:
    """Seven-stage policy evaluation.

    Order is intentionally fixed:
    1. organization boundary
    2. explicit deny
    3. admin override candidate
    4. explicit allow candidate
    5. rate constraint
    6. approval requirement
    7. default deny

    Allow/admin candidates still pass through rate and approval constraints.
    """

    def __init__(self, config: PolicyConfig):
        self.config = config

    def evaluate(self, request: PolicyRequest) -> PolicyResult:
        if request.org_id != self.config.org_id:
            return PolicyResult(Decision.DENY, "org-boundary", "organization boundary mismatch")

        rule = (request.action, request.resource)
        wildcard_action = (request.action, "*")
        wildcard_resource = ("*", request.resource)
        global_rule = ("*", "*")
        candidates = {rule, wildcard_action, wildcard_resource, global_rule}

        if candidates.intersection(self.config.explicit_denies):
            return PolicyResult(Decision.DENY, "explicit-deny", "explicit deny rule matched")

        allowed = request.is_admin
        allow_stage = "admin-override" if request.is_admin else "default-deny"
        if not allowed and candidates.intersection(self.config.explicit_allows):
            allowed = True
            allow_stage = "explicit-allow"

        if request.rate_exceeded:
            return PolicyResult(Decision.DENY, "rate-constraint", "rate constraint exceeded")

        if request.approval_required:
            return PolicyResult(
                Decision.REQUIRE_APPROVAL,
                "approval-requirement",
                "action requires explicit approval",
            )

        if allowed:
            return PolicyResult(Decision.ALLOW, allow_stage, "policy granted access")

        return PolicyResult(Decision.DENY, "default-deny", "no allow rule matched")
