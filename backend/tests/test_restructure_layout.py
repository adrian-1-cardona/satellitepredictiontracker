"""Property-based tests for the backend/frontend restructure layout.

Feature: backend-frontend-restructure
Property 1: Move Manifest Consistency

Validates: Requirements 1.2, 1.3

For every ``(src, dst)`` entry in the canonical :data:`FILE_MOVES` manifest,
after the restructure the path ``dst`` must exist at the workspace root with
the same kind (file vs directory) as the original source, and the path
``src`` must no longer exist at the workspace root. For every entry in
:data:`FILES_UNCHANGED_LOCATION`, the path must still exist at the workspace
root and no identically-named shadow copy may exist inside ``backend/``.
"""

from __future__ import annotations

from pathlib import Path

from hypothesis import given, settings
from hypothesis import strategies as st

from restructure_manifests import FILE_MOVES, FILES_UNCHANGED_LOCATION


# Resolve the workspace root from this file's location:
#   backend/tests/test_restructure_layout.py -> backend/tests -> backend -> workspace_root
WORKSPACE_ROOT: Path = Path(__file__).resolve().parent.parent.parent

# Source paths in ``FILE_MOVES`` whose basename is one of these names move as
# directories; everything else moves as a single file. This lets us verify the
# kind of the destination even though the source no longer exists after the
# restructure.
DIRECTORY_SRC_NAMES = {"app", "alembic", "tests"}


def _expected_kind_is_dir(src: str) -> bool:
    """Return True if the moved entry should be a directory at the destination."""
    return Path(src).name in DIRECTORY_SRC_NAMES


# Feature: backend-frontend-restructure, Property 1
@given(move=st.sampled_from(FILE_MOVES))
@settings(max_examples=100)
def test_file_move_lands_at_destination_and_clears_source(move: tuple[str, str]) -> None:
    """Every (src, dst) entry in FILE_MOVES moved to dst and vacated src."""
    src, dst = move

    dst_path = WORKSPACE_ROOT / dst
    src_path = WORKSPACE_ROOT / src

    assert dst_path.exists(), (
        f"Expected destination {dst!r} to exist at workspace root after the "
        f"restructure, but {dst_path} is missing."
    )

    if _expected_kind_is_dir(src):
        assert dst_path.is_dir(), (
            f"Expected {dst!r} to be a directory (source basename "
            f"{Path(src).name!r} is a known directory), but it is not."
        )
    else:
        assert dst_path.is_file(), (
            f"Expected {dst!r} to be a file (source basename "
            f"{Path(src).name!r} is not a known directory), but it is not."
        )

    assert not src_path.exists(), (
        f"Expected source {src!r} to no longer exist at the workspace root "
        f"after the restructure, but {src_path} still exists."
    )


# Feature: backend-frontend-restructure, Property 1
@given(entry=st.sampled_from(FILES_UNCHANGED_LOCATION))
@settings(max_examples=100)
def test_unchanged_entry_stays_at_root_without_backend_shadow(entry: str) -> None:
    """Entries in FILES_UNCHANGED_LOCATION stay at root and are not shadowed in backend/."""
    root_path = WORKSPACE_ROOT / entry
    shadow_path = WORKSPACE_ROOT / "backend" / entry

    assert root_path.exists(), (
        f"Expected {entry!r} to remain at the workspace root after the "
        f"restructure, but {root_path} is missing."
    )

    assert not shadow_path.exists(), (
        f"Expected no shadow copy of {entry!r} inside backend/, but "
        f"{shadow_path} exists."
    )
