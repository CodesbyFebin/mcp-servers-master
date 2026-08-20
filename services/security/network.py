"""Network policy primitives: protocol validation, SSRF checks and DNS rebinding defense."""

from __future__ import annotations

import ipaddress
import socket
from dataclasses import dataclass, field
from typing import Callable, Iterable
from urllib.parse import urlsplit


Resolver = Callable[[str], Iterable[str]]


def _default_resolver(hostname: str) -> list[str]:
    addresses: set[str] = set()
    for family, _, _, _, sockaddr in socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM):
        if family == socket.AF_INET:
            addresses.add(sockaddr[0])
        elif family == socket.AF_INET6:
            addresses.add(sockaddr[0])
    return sorted(addresses)


def _is_public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
    except ValueError:
        return False
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


@dataclass(frozen=True)
class ProtocolValidator:
    allowed_protocols: tuple[str, ...] = ("https",)

    def validate(self, url: str) -> bool:
        try:
            parsed = urlsplit(url)
        except ValueError:
            return False
        return (
            parsed.scheme.lower() in self.allowed_protocols
            and bool(parsed.hostname)
            and parsed.username is None
            and parsed.password is None
        )


@dataclass
class DNSRebindingPrevention:
    resolver: Resolver = _default_resolver
    _observed: dict[str, frozenset[str]] = field(default_factory=dict)

    def check(self, hostname: str) -> bool:
        try:
            current = frozenset(self.resolver(hostname))
        except (OSError, socket.gaierror):
            return False
        if not current or not all(_is_public_ip(address) for address in current):
            return False
        previous = self._observed.get(hostname)
        if previous is not None and previous != current:
            return False
        self._observed[hostname] = current
        return True

    def clear(self) -> None:
        self._observed.clear()


@dataclass
class SSRFProtection:
    protocol_validator: ProtocolValidator = field(default_factory=ProtocolValidator)
    dns_rebinding_prevention: DNSRebindingPrevention = field(default_factory=DNSRebindingPrevention)

    def is_safe_url(self, url: str) -> bool:
        if not self.protocol_validator.validate(url):
            return False
        parsed = urlsplit(url)
        hostname = parsed.hostname
        if hostname is None:
            return False

        try:
            ipaddress.ip_address(hostname)
        except ValueError:
            return self.dns_rebinding_prevention.check(hostname)
        return _is_public_ip(hostname)


protocol_validator = ProtocolValidator()
dns_rebinding_prevention = DNSRebindingPrevention()
ssrf_protection = SSRFProtection(protocol_validator, dns_rebinding_prevention)


def validate_url_protocol(url: str) -> bool:
    return protocol_validator.validate(url)


def check_dns_rebinding(hostname: str) -> bool:
    return dns_rebinding_prevention.check(hostname)


def is_safe_url(url: str) -> bool:
    return ssrf_protection.is_safe_url(url)
