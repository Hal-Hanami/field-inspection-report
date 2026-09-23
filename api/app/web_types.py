"""Generate the web's wire types from the OpenAPI document (DESIGN §7.4).

    uv run python -m app.web_types > ../src/data/api/schema.ts

Only the component schemas are emitted, and only the JSON Schema this API uses: objects,
strings with enums, integers, arrays, maps of strings and nullable references. Anything
else fails loudly rather than being typed as `unknown`.
"""

import json
import sys
from typing import Any

from app.openapi_export import document

HEADER = """\
// Generated from api/openapi.json by `uv run python -m app.web_types` (DESIGN §7.4).
// Do not edit: change the server's schemas and regenerate; CI fails on a stale copy.
"""


_SCALARS = {"string": "string", "integer": "number", "null": "null"}


def typescript(schema: dict[str, Any]) -> str:
    kind = schema.get("type")
    if "$ref" in schema:
        result = schema["$ref"].rsplit("/", 1)[-1]
    elif "anyOf" in schema:
        result = " | ".join(typescript(option) for option in schema["anyOf"])
    elif "enum" in schema:
        result = " | ".join(json.dumps(value) for value in schema["enum"])
    elif kind in _SCALARS:
        result = _SCALARS[kind]
    elif kind == "array":
        result = f"{typescript(schema['items'])}[]"
    elif kind == "object" and "properties" not in schema:
        result = f"Record<string, {typescript(schema.get('additionalProperties', {}))}>"
    else:
        raise ValueError(f"unsupported schema: {schema}")
    return result


def declaration(name: str, schema: dict[str, Any]) -> str:
    required = set(schema.get("required", []))
    lines = [f"export type {name} = {{"]
    for prop, spec in schema["properties"].items():
        optional = "" if prop in required else "?"
        lines.append(f"  {prop}{optional}: {typescript(spec)};")
    lines.append("};")
    return "\n".join(lines)


def module() -> str:
    schemas = json.loads(document())["components"]["schemas"]
    body = "\n\n".join(
        declaration(name, schemas[name])
        for name in sorted(schemas)
        if not name.startswith(("HTTPValidationError", "ValidationError"))
    )
    return f"{HEADER}\n{body}\n"


if __name__ == "__main__":
    sys.stdout.write(module())
