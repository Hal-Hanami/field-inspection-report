"""Write the OpenAPI document the web's types are generated from (DESIGN §7.4).

uv run python -m app.openapi_export > openapi.json
"""

import json
import sys
from typing import cast
from unittest.mock import Mock

from app.main import create_app
from app.repository.port import ReportRepository


def document() -> str:
    # The document describes routes, not data; no database is opened to produce it.
    app = create_app(repository=cast(ReportRepository, Mock()))
    return json.dumps(app.openapi(), indent=2, ensure_ascii=True) + "\n"


if __name__ == "__main__":
    sys.stdout.write(document())
