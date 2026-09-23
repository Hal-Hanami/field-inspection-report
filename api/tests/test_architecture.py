"""DESIGN §7.1: the server's dependency rule, read from the source itself."""

import ast
from pathlib import Path

DOMAIN = Path(__file__).resolve().parents[1] / "app" / "domain"
FORBIDDEN = ("fastapi", "sqlalchemy", "starlette", "pydantic", "app.repository", "app.http")


def imported_modules(path: Path) -> list[str]:
    tree = ast.parse(path.read_text())
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names += [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.append(node.module)
    return names


def test_section_7_1_the_domain_imports_no_framework_and_no_outer_layer() -> None:
    files = sorted(DOMAIN.glob("*.py"))
    assert files
    offenders = [
        f"{path.name} -> {name}"
        for path in files
        for name in imported_modules(path)
        if any(name == banned or name.startswith(f"{banned}.") for banned in FORBIDDEN)
    ]
    assert offenders == []
