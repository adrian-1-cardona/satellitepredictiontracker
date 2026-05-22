"""Filesystem assertion tests for env and shared asset locations.

Feature: backend-frontend-restructure
Validates: Requirements 1.3, 9.1, 9.4

These tests confirm the restructure preserved the env template and shared
assets at the workspace root and did not create shadow copies inside
``backend/``:

* ``.env.example`` remains at the workspace root (Req 9.1).
* ``.env`` is gitignored so local copies are never committed.
* ``data/``, ``docs/``, ``instructions/``, and ``.vscode/`` remain at the
  workspace root and are not duplicated inside ``backend/`` (Req 1.3, 9.4).
* ``backend/.env`` is listed in the top-level ``.gitignore`` so a locally
  created symlink or copy is never committed (Req 9.1).
"""

from __future__ import annotations

from pathlib import Path

# backend/tests/<this file> -> backend/tests -> backend -> workspace root
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent

# Shared assets that must live at the workspace root and must NOT have a
# shadow copy inside backend/ after the restructure.
SHARED_ROOT_ENTRIES = ["data", "docs", "instructions", ".vscode"]


def test_env_template_at_root() -> None:
    """``.env.example`` exists at the workspace root."""
    env_example_path = WORKSPACE_ROOT / ".env.example"

    assert env_example_path.exists(), (
        f"expected .env.example at workspace root {env_example_path} "
        "but it was not found"
    )


def test_shared_dirs_not_duplicated_in_backend() -> None:
    """Shared asset directories live at the root with no shadow copy in backend/."""
    backend_dir = WORKSPACE_ROOT / "backend"

    for name in SHARED_ROOT_ENTRIES:
        root_path = WORKSPACE_ROOT / name
        shadow_path = backend_dir / name

        assert root_path.exists(), (
            f"expected shared asset {name!r} at workspace root {root_path} "
            "but it was not found"
        )
        assert not shadow_path.exists(), (
            f"shadow copy of shared asset {name!r} found at {shadow_path}; "
            "shared assets must live only at the workspace root"
        )


def test_env_files_in_gitignore() -> None:
    """``.gitignore`` contains env file entries as own lines."""
    gitignore_path = WORKSPACE_ROOT / ".gitignore"
    assert gitignore_path.is_file(), (
        f"expected .gitignore at workspace root {gitignore_path} "
        "but it was not found"
    )

    content = gitignore_path.read_text(encoding="utf-8")
    lines = [line.strip() for line in content.splitlines()]

    for entry in (".env", "backend/.env"):
        assert entry in lines, (
            f"expected {entry!r} to appear as its own line in .gitignore; "
            f"found lines: {lines!r}"
        )
