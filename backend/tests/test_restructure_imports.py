"""Property test for backend module import health.

Feature: backend-frontend-restructure, Property 5
Validates: Requirements 2.1, 2.6, 2.7, 8.4

Property 5: Backend Module Import Health
  For any Python module path ``m`` under ``backend/app/`` (every ``.py`` file
  in the package, including ``app``, ``app.routers.*``, and sibling modules),
  invoking ``importlib.import_module(m)`` with CWD set to ``backend/`` and
  ``backend/`` on ``sys.path`` completes without raising ``ImportError`` or
  ``ModuleNotFoundError``.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from restructure_manifests import backend_app_modules


# Pre-compute the list of modules once so Hypothesis's ``sampled_from`` has a
# stable finite pool to draw from.
_BACKEND_APP_MODULES = backend_app_modules()


@pytest.fixture(autouse=True, scope="module")
def _ensure_backend_on_sys_path() -> None:
    """Guarantee ``backend/`` is on ``sys.path``.

    ``pytest.ini`` already sets ``pythonpath = .`` and pytest is invoked from
    ``backend/``, so this is normally a no-op. We insert explicitly as a
    safety net for test runners that launch from a different CWD.
    """
    backend_dir = Path(__file__).resolve().parent.parent  # backend/
    backend_path = str(backend_dir)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)


# Feature: backend-frontend-restructure, Property 5
@settings(max_examples=100, deadline=None)
@given(module_name=st.sampled_from(_BACKEND_APP_MODULES))
def test_backend_app_module_imports_cleanly(module_name: str) -> None:
    """Every module discovered under ``backend/app/`` imports without error.

    ``importlib.import_module`` is a no-op for modules already imported by
    pytest during conftest setup, which is acceptable: the goal is that the
    import call itself never raises ``ImportError`` or ``ModuleNotFoundError``.
    """
    try:
        module = importlib.import_module(module_name)
    except (ImportError, ModuleNotFoundError) as exc:  # pragma: no cover
        pytest.fail(f"Failed to import {module_name!r}: {exc}")

    assert module is not None
    assert module.__name__ == module_name


def test_backend_app_modules_manifest_is_populated() -> None:
    """Sanity check: the manifest must list at least the ``app`` package and
    its known submodules, otherwise Property 5 would be vacuously true.
    """
    assert "app" in _BACKEND_APP_MODULES
    # Pick a handful of known submodules that must appear in the walk.
    expected_submodules = {
        "app.main",
        "app.config",
        "app.database",
        "app.models",
        "app.routers",
    }
    missing = expected_submodules - set(_BACKEND_APP_MODULES)
    assert not missing, f"Expected modules missing from manifest: {missing}"
