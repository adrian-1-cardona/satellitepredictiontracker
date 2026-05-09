"""Smoke test: `alembic upgrade head` succeeds from backend/ against a fresh DB.

Feature: backend-frontend-restructure
Validates: Requirements 2.6, 10.3

This test confirms that running the migration from the relocated
`backend/` directory applies the existing `001_initial_schema` migration
cleanly to a fresh database. The test uses a throwaway SQLite file so it
can run without Postgres on the host.

Alembic resolves its database URL through `app.config.get_settings()`,
which in turn reads the `DATABASE_URL` environment variable
(`pydantic-settings` gives env vars precedence over any `.env` file), so
overriding `DATABASE_URL` in the subprocess environment is enough to
point the migration at the temp SQLite file.

If the `alembic` CLI is not on PATH (for example on a minimal CI image),
the test skips cleanly rather than failing so the wider suite stays
green on environments that do not ship alembic.
"""

from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import tempfile
from pathlib import Path

import pytest

# backend/tests/<this file> -> backend/tests -> backend
BACKEND_DIR = Path(__file__).resolve().parent.parent


def test_alembic_upgrade_head_creates_expected_schema() -> None:
    """`alembic upgrade head` exits 0 and creates the expected tables.

    Validates: Requirements 2.6, 10.3
    """
    if shutil.which("alembic") is None:
        pytest.skip("alembic CLI not available on PATH")

    # Create a temp SQLite DB file. We use delete=False so the alembic
    # subprocess can open it by path; we clean it up in a finally block.
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    db_path = Path(tmp.name)

    try:
        env = os.environ.copy()
        # alembic/env.py reads the URL from get_settings().database_url,
        # which pydantic-settings sources from the DATABASE_URL env var
        # before any .env file.
        env["DATABASE_URL"] = f"sqlite:///{db_path}"

        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=str(BACKEND_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )

        assert result.returncode == 0, (
            "alembic upgrade head failed with exit code "
            f"{result.returncode}.\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )

        # Verify at least one expected table from 001_initial_schema exists.
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name='users'"
            )
            row = cursor.fetchone()

        assert row is not None and row[0] == "users", (
            "expected 'users' table to exist after alembic upgrade head, "
            f"but it was not found in {db_path}"
        )
    finally:
        # Best-effort cleanup of the temp DB file. On some platforms the
        # file may already be gone if the test harness removed it, so we
        # swallow FileNotFoundError.
        try:
            db_path.unlink()
        except FileNotFoundError:
            pass
