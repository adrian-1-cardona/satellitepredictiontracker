"""Property test for compose service structural invariants.

Feature: backend-frontend-restructure, Property 4
Validates: Requirements 4.1, 4.3, 4.4, 4.5, 9.4

Property 4 states: for every Python service ``s`` in
``{"api", "celery_worker", "celery_beat"}`` defined in
``backend/docker-compose.yml``, after the restructure:

- ``s.env_file`` includes ``../.env``,
- ``s.volumes`` contains a bind mount whose host side resolves to ``../data``
  and whose container side begins with ``/app/data``,
- ``s.depends_on`` includes ``postgres`` and ``redis`` each with
  ``condition: service_healthy``,
- ``s.build.context`` is ``.`` and ``s.build.dockerfile`` is ``Dockerfile.api``.

A deterministic (non-Hypothesis) check also asserts the fixed host port map
for ``api``, ``postgres``, ``redis``, and ``pgadmin``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List

import pytest
import yaml
from hypothesis import given, settings
from hypothesis import strategies as st

from restructure_manifests import COMPOSE_SERVICE_EXPECTATIONS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# The test file lives at ``backend/tests/test_restructure_compose.py`` so the
# compose file sits one directory up.
_COMPOSE_PATH = Path(__file__).resolve().parent.parent / "docker-compose.yml"


def _load_compose() -> Dict[str, Any]:
    """Parse ``backend/docker-compose.yml`` with ``yaml.safe_load``."""
    with _COMPOSE_PATH.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    assert isinstance(data, dict), "docker-compose.yml must parse to a mapping"
    assert "services" in data, "docker-compose.yml must define a 'services' key"
    return data


def _as_list(value: Any) -> List[Any]:
    """Coerce a scalar or ``None`` into a list for uniform iteration.

    Compose accepts ``env_file`` as either a single string or a list of
    strings; this helper normalises both to a list without changing semantics.
    """
    if value is None:
        return []
    if isinstance(value, list):
        return list(value)
    return [value]


def _split_volume(entry: Any) -> tuple[str, str]:
    """Split a short-form volume string ``host:container`` into ``(host, container)``.

    Only short-form string entries are expected for the ``api``,
    ``celery_worker``, and ``celery_beat`` services; if Compose long-form
    dicts appear in the future, this helper intentionally fails loudly so the
    property test surfaces the drift rather than silently passing.
    """
    assert isinstance(entry, str), (
        f"Expected short-form volume string, got {type(entry).__name__}: {entry!r}"
    )
    host, _, container = entry.partition(":")
    return host, container


# ---------------------------------------------------------------------------
# Property 4: Compose Service Structural Invariants
# Feature: backend-frontend-restructure, Property 4
# Validates: Requirements 4.1, 4.3, 4.4, 4.5, 9.4
# ---------------------------------------------------------------------------
@settings(max_examples=100)
@given(service=st.sampled_from(COMPOSE_SERVICE_EXPECTATIONS["services"]))
def test_compose_service_structural_invariants(service: str) -> None:
    """Every api/celery service must satisfy the four structural invariants."""
    compose = _load_compose()
    services = compose["services"]
    assert service in services, f"service {service!r} missing from docker-compose.yml"

    svc = services[service]
    expectations = COMPOSE_SERVICE_EXPECTATIONS

    # --- env_file includes ../.env ----------------------------------------
    env_file_entries = _as_list(svc.get("env_file"))
    assert expectations["env_file"] in env_file_entries, (
        f"service {service!r} env_file {env_file_entries!r} must include "
        f"{expectations['env_file']!r}"
    )

    # --- volumes contains ../data:/app/data* ------------------------------
    host_suffix = expectations["volume_host_suffix"]
    container_prefix = expectations["volume_container_prefix"]
    matching_mounts = []
    for entry in _as_list(svc.get("volumes")):
        host, container = _split_volume(entry)
        # Suffix match on the host side accommodates future absolute paths
        # while still failing on missing ``../data`` mounts.
        if host.endswith(host_suffix) and container.startswith(container_prefix):
            matching_mounts.append(entry)
    assert matching_mounts, (
        f"service {service!r} volumes must include a mount whose host side "
        f"ends with {host_suffix!r} and whose container side begins with "
        f"{container_prefix!r}; got {svc.get('volumes')!r}"
    )

    # --- depends_on includes postgres & redis with service_healthy --------
    depends_on_raw = svc.get("depends_on")
    required_deps = expectations["depends_on"]

    if isinstance(depends_on_raw, dict):
        # Map form: {postgres: {condition: service_healthy}, ...}
        for dep_name, required_condition in required_deps.items():
            assert dep_name in depends_on_raw, (
                f"service {service!r} depends_on must include {dep_name!r}; "
                f"got {depends_on_raw!r}"
            )
            dep_spec = depends_on_raw[dep_name]
            assert isinstance(dep_spec, dict), (
                f"service {service!r} depends_on[{dep_name!r}] must be a "
                f"mapping with a 'condition' key when using map-form; "
                f"got {dep_spec!r}"
            )
            assert dep_spec.get("condition") == required_condition, (
                f"service {service!r} depends_on[{dep_name!r}].condition "
                f"must be {required_condition!r}; got {dep_spec!r}"
            )
    elif isinstance(depends_on_raw, list):
        # List form cannot express a condition, so it is insufficient on its
        # own for Requirement 4.5. Accept it only if every required dep is
        # present AND a sibling healthcheck ties them together -- but since
        # the condition cannot be expressed, we fail here to surface the
        # regression.
        pytest.fail(
            f"service {service!r} depends_on is in list form {depends_on_raw!r}; "
            f"map form with 'condition: service_healthy' is required for "
            f"postgres and redis"
        )
    else:
        pytest.fail(
            f"service {service!r} must declare depends_on; got {depends_on_raw!r}"
        )

    # --- build.context and build.dockerfile -------------------------------
    build_spec = svc.get("build")
    assert isinstance(build_spec, dict), (
        f"service {service!r} must declare a 'build' mapping; got {build_spec!r}"
    )
    assert build_spec.get("context") == expectations["build_context"], (
        f"service {service!r} build.context must be "
        f"{expectations['build_context']!r}; got {build_spec.get('context')!r}"
    )
    assert build_spec.get("dockerfile") == expectations["build_dockerfile"], (
        f"service {service!r} build.dockerfile must be "
        f"{expectations['build_dockerfile']!r}; got {build_spec.get('dockerfile')!r}"
    )


# ---------------------------------------------------------------------------
# Deterministic port-map check (non-Hypothesis)
# Feature: backend-frontend-restructure, Property 4
# Validates: Requirement 4.4
# ---------------------------------------------------------------------------
def test_compose_publishes_fixed_host_ports() -> None:
    """Fixed host ports: api=8000, postgres=5432, redis=6379, pgadmin=5050."""
    compose = _load_compose()
    services = compose["services"]
    port_map = COMPOSE_SERVICE_EXPECTATIONS["ports"]

    for service_name, expected_port in port_map.items():
        assert service_name in services, (
            f"service {service_name!r} missing from docker-compose.yml"
        )
        svc = services[service_name]
        port_entries = _as_list(svc.get("ports"))
        assert port_entries, (
            f"service {service_name!r} must publish ports; got {svc.get('ports')!r}"
        )

        host_ports: List[int] = []
        for entry in port_entries:
            # Short-form entries look like "8000:8000" (optionally with a
            # host IP prefix like "127.0.0.1:8000:8000"). The host side is
            # the second-to-last colon-delimited segment.
            if isinstance(entry, str):
                parts = entry.split(":")
                if len(parts) == 1:
                    # "8000" -> container-only, not a published host port.
                    continue
                host_side = parts[-2]
                try:
                    host_ports.append(int(host_side))
                except ValueError:
                    continue
            elif isinstance(entry, dict):
                # Long-form entry: {"published": 8000, "target": 8000, ...}
                published = entry.get("published")
                if isinstance(published, int):
                    host_ports.append(published)
                elif isinstance(published, str) and published.isdigit():
                    host_ports.append(int(published))

        assert expected_port in host_ports, (
            f"service {service_name!r} must publish host port {expected_port}; "
            f"parsed host ports {host_ports!r} from {port_entries!r}"
        )
