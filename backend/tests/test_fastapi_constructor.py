"""Tests for the FastAPI constructor configuration in backend/app/main.py.

Validates: Requirements 3.1, 3.2, 3.6
"""

import re
from pathlib import Path

from app.main import app


MAIN_PY_PATH = Path(__file__).resolve().parent.parent / "app" / "main.py"


def test_fastapi_app_has_openapi_surface_disabled() -> None:
    """The live FastAPI app must have docs_url, redoc_url, and openapi_url set to None.

    Validates: Requirements 3.1, 3.2
    """
    assert app.docs_url is None, "FastAPI app.docs_url must be None to disable /docs"
    assert app.redoc_url is None, "FastAPI app.redoc_url must be None to disable /redoc"
    assert (
        app.openapi_url is None
    ), "FastAPI app.openapi_url must be None to disable /openapi.json"


def test_main_py_source_sets_openapi_kwargs_to_none() -> None:
    """The source of main.py must literally pass docs_url=None, redoc_url=None, openapi_url=None.

    Validates: Requirements 3.1, 3.2
    """
    source = MAIN_PY_PATH.read_text(encoding="utf-8")

    assert re.search(r"docs_url\s*=\s*None", source), (
        "backend/app/main.py must contain 'docs_url=None'"
    )
    assert re.search(r"redoc_url\s*=\s*None", source), (
        "backend/app/main.py must contain 'redoc_url=None'"
    )
    assert re.search(r"openapi_url\s*=\s*None", source), (
        "backend/app/main.py must contain 'openapi_url=None'"
    )


def test_main_py_has_rationale_comment_near_fastapi_constructor() -> None:
    """A comment near the FastAPI(...) constructor must explain why docs are disabled.

    Validates: Requirement 3.6
    """
    source = MAIN_PY_PATH.read_text(encoding="utf-8")
    lines = source.splitlines()

    # Locate the line containing `app = FastAPI(`.
    constructor_indices = [
        i for i, line in enumerate(lines) if re.search(r"\bapp\s*=\s*FastAPI\s*\(", line)
    ]
    assert constructor_indices, (
        "backend/app/main.py must contain an 'app = FastAPI(' constructor call"
    )

    constructor_line = constructor_indices[0]
    # Scan the constructor block: the constructor line itself plus the next
    # 15 lines, which is a generous window for the keyword arguments and
    # their inline comments.
    window_end = min(len(lines), constructor_line + 16)
    block = "\n".join(lines[constructor_line:window_end])

    rationale_pattern = re.compile(r"#.*(disable|avoid exposing)", re.IGNORECASE)
    assert rationale_pattern.search(block), (
        "backend/app/main.py must include an inline comment near the FastAPI "
        "constructor containing a rationale keyword ('disable' or 'avoid "
        "exposing') explaining why the OpenAPI surface is turned off. "
        f"Block inspected:\n{block}"
    )
