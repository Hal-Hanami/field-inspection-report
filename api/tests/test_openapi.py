"""DESIGN §7.4: the committed OpenAPI document is the one the code produces."""

from pathlib import Path

from app.openapi_export import document
from app.web_types import module

COMMITTED = Path(__file__).resolve().parents[1] / "openapi.json"


def test_section_7_4_the_committed_document_is_current() -> None:
    assert COMMITTED.read_text() == document(), (
        "api/openapi.json is stale: uv run python -m app.openapi_export > openapi.json"
    )


WEB_TYPES = Path(__file__).resolve().parents[2] / "src" / "data" / "api" / "schema.ts"


def test_section_7_4_the_web_types_are_generated_from_the_current_document() -> None:
    assert WEB_TYPES.read_text() == module(), (
        "src/data/api/schema.ts is stale: "
        "uv run python -m app.web_types > ../src/data/api/schema.ts"
    )
