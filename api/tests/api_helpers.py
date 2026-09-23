import uuid
from typing import Any

from fastapi.testclient import TestClient
from httpx2 import Response

PROBLEM_JSON = "application/problem+json"


def post(client: TestClient, body: dict[str, Any], key: uuid.UUID | None = None) -> Response:
    return client.post(
        "/api/reports", json=body, headers={"Idempotency-Key": str(key or uuid.uuid4())}
    )
