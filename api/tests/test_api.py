"""The HTTP API against PostgreSQL (DESIGN §7)."""

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select, text

from app.repository.tables import report_checks
from tests.api_helpers import PROBLEM_JSON, post
from tests.conftest import Clock
from tests.drafts import draft


def test_section_7_2_a_valid_draft_is_filed_and_normalized(client: TestClient) -> None:
    response = post(client, draft(equipmentId=" tr-0142 ", inspectorName=" Inspector A "))
    assert response.status_code == 201
    body = response.json()
    assert body["id"] == "RPT-0001"
    assert body["equipmentId"] == "TR-0142"
    assert body["inspectorName"] == "Inspector A"
    assert body["severity"] == "ok"
    assert response.headers["location"] == "/api/reports/RPT-0001"


def test_section_7_2_every_failing_field_comes_back_as_a_message_key(client: TestClient) -> None:
    response = post(client, draft(equipmentId="", checks={}, inspectorName=""))
    assert response.status_code == 422
    assert response.headers["content-type"] == PROBLEM_JSON
    fields = {error["field"]: error["key"] for error in response.json()["errors"]}
    assert fields == {
        "equipmentId": "errors.equipmentId.required",
        "inspectorName": "errors.inspectorName.required",
        "checks.appearance": "errors.checks.required",
        "checks.abnormalSound": "errors.checks.required",
        "checks.temperature": "errors.checks.required",
        "checks.corrosion": "errors.checks.required",
        "checks.surroundings": "errors.checks.required",
    }


def test_section_7_2_a_rejected_draft_stores_nothing(client: TestClient) -> None:
    post(client, draft(equipmentId="nope"))
    assert client.get("/api/reports").json()["items"] == []


def test_section_7_8_the_future_is_judged_by_the_clock_in_the_users_zone(
    client: TestClient, clock: Clock
) -> None:
    # 23:30 UTC on the 22nd is 08:30 on the 23rd in Tokyo. A server that compared in UTC
    # would call 09:00 on the 23rd "the future" when it is not, and 07:00 "the past".
    clock.now = datetime(2026, 9, 22, 23, 30, tzinfo=UTC)
    assert post(client, draft(inspectedAt="2026-09-23T08:30")).status_code == 201
    future = post(client, draft(inspectedAt="2026-09-23T08:31"))
    assert future.status_code == 422
    assert future.json()["errors"] == [{"field": "inspectedAt", "key": "errors.inspectedAt.future"}]


def test_section_7_8_submitted_at_is_the_server_instant(client: TestClient, clock: Clock) -> None:
    clock.now = datetime(2026, 9, 23, 1, 2, 3, 456000, tzinfo=UTC)
    body = post(client, draft()).json()
    assert body["submittedAt"] == "2026-09-23T01:02:03.456Z"


def test_section_7_5_ids_come_from_a_sequence_and_widen_past_four_digits(
    client: TestClient, engine: Engine
) -> None:
    assert post(client, draft()).json()["id"] == "RPT-0001"
    with engine.begin() as connection:
        connection.execute(text("ALTER SEQUENCE report_seq RESTART WITH 9999"))
    assert post(client, draft()).json()["id"] == "RPT-9999"
    assert post(client, draft()).json()["id"] == "RPT-10000"


def test_section_7_5_concurrent_filings_never_share_an_id(client: TestClient) -> None:
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(post, client, draft()) for _ in range(16)]
        responses = [future.result() for future in futures]
    ids = [response.json()["id"] for response in responses]
    assert all(response.status_code == 201 for response in responses)
    assert len(set(ids)) == 16


def test_section_7_6_a_retry_returns_the_report_already_filed(client: TestClient) -> None:
    key = uuid.uuid4()
    first = post(client, draft(), key)
    retry = post(client, draft(), key)
    assert (first.status_code, retry.status_code) == (201, 200)
    assert retry.json() == first.json()
    assert len(client.get("/api/reports").json()["items"]) == 1


def test_section_7_6_a_retry_is_recognized_after_normalization(client: TestClient) -> None:
    key = uuid.uuid4()
    post(client, draft(equipmentId="TR-0142"), key)
    assert post(client, draft(equipmentId=" tr-0142"), key).status_code == 200


def test_section_7_6_simultaneous_retries_file_once(client: TestClient) -> None:
    key = uuid.uuid4()
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(post, client, draft(), key) for _ in range(6)]
        responses = [future.result() for future in futures]
    assert sorted(response.status_code for response in responses) == [200] * 5 + [201]
    assert len({response.json()["id"] for response in responses}) == 1


def test_section_7_6_the_same_key_for_a_different_draft_is_a_conflict(client: TestClient) -> None:
    key = uuid.uuid4()
    post(client, draft(), key)
    conflict = post(client, draft(remarks="something else"), key)
    assert conflict.status_code == 409
    assert conflict.headers["content-type"] == PROBLEM_JSON


def test_section_7_6_a_rejected_draft_does_not_use_up_its_key(client: TestClient) -> None:
    key = uuid.uuid4()
    assert post(client, draft(equipmentId=""), key).status_code == 422
    assert post(client, draft(), key).status_code == 201


def test_section_7_6_the_key_is_required(client: TestClient) -> None:
    response = client.post("/api/reports", json=draft())
    assert response.status_code == 400
    assert response.headers["content-type"] == PROBLEM_JSON


def test_section_7_7_every_check_is_a_row_and_severity_is_derived(
    client: TestClient, engine: Engine
) -> None:
    checks = {**draft()["checks"], "temperature": "abnormal", "corrosion": "caution"}
    body = post(client, draft(checks=checks, remarks="hot to the touch")).json()
    with engine.connect() as connection:
        rows = connection.execute(
            select(func.count()).where(report_checks.c.report_id == body["id"])
        ).scalar_one()
    assert rows == 5
    assert body["severity"] == "abnormal"
    assert client.get(f"/api/reports/{body['id']}").json()["checks"] == checks


def test_section_7_7_the_database_refuses_what_the_domain_refuses(engine: Engine) -> None:
    # Defence in depth: a write that bypasses the domain still meets the constraints.
    with engine.begin() as connection:
        connection.execute(text("TRUNCATE reports, report_checks"))
    statements = [
        "INSERT INTO reports VALUES ('RPT-0001', 1, 'tr-0142', 'pole', now(), 'a', '',"
        " now(), gen_random_uuid(), 'x')",
        "INSERT INTO reports VALUES ('RPT-0001', 1, 'TR-0142', 'boiler', now(), 'a', '',"
        " now(), gen_random_uuid(), 'x')",
        "INSERT INTO reports VALUES ('RPT-1', 1, 'TR-0142', 'pole', now(), 'a', '',"
        " now(), gen_random_uuid(), 'x')",
    ]
    for statement in statements:
        try:
            with engine.begin() as connection:
                connection.execute(text(statement))
        except Exception:  # any refusal is the pass condition
            continue
        raise AssertionError(f"accepted: {statement}")


def test_section_7_9_newest_inspection_first_then_by_id(client: TestClient) -> None:
    post(client, draft(inspectedAt="2026-09-20T10:00"))
    post(client, draft(inspectedAt="2026-09-22T10:00"))
    post(client, draft(inspectedAt="2026-09-22T10:00"))
    items = client.get("/api/reports").json()["items"]
    assert [item["id"] for item in items] == ["RPT-0003", "RPT-0002", "RPT-0001"]


def test_section_7_9_pages_neither_skip_nor_repeat_when_a_report_arrives(
    client: TestClient,
) -> None:
    start = datetime(2026, 9, 1, 8, 0)
    for day in range(5):
        post(client, draft(inspectedAt=(start + timedelta(days=day)).strftime("%Y-%m-%dT%H:%M")))
    first = client.get("/api/reports", params={"limit": 2}).json()
    # Filed between the two page requests, and newer than everything listed so far.
    post(client, draft(inspectedAt="2026-09-10T08:00"))
    seen = [item["id"] for item in first["items"]]
    cursor = first["nextCursor"]
    while cursor:
        page = client.get("/api/reports", params={"limit": 2, "cursor": cursor}).json()
        seen += [item["id"] for item in page["items"]]
        cursor = page["nextCursor"]
    assert seen == ["RPT-0005", "RPT-0004", "RPT-0003", "RPT-0002", "RPT-0001"]


def test_section_7_9_the_limit_is_bounded(client: TestClient) -> None:
    assert client.get("/api/reports", params={"limit": 201}).status_code == 400
    assert client.get("/api/reports", params={"limit": 0}).status_code == 400


def test_section_7_10_an_unknown_report_is_a_404_problem(client: TestClient) -> None:
    response = client.get("/api/reports/RPT-0404")
    assert response.status_code == 404
    assert response.headers["content-type"] == PROBLEM_JSON
    assert response.json()["status"] == 404


def test_section_7_10_a_cursor_this_server_never_issued_is_a_400(client: TestClient) -> None:
    response = client.get("/api/reports", params={"cursor": "not-a-cursor"})
    assert response.status_code == 400
    assert response.headers["content-type"] == PROBLEM_JSON


def test_section_7_10_a_body_that_is_not_a_draft_is_a_400(client: TestClient) -> None:
    response = client.post(
        "/api/reports",
        json={"checks": "all fine"},
        headers={"Idempotency-Key": str(uuid.uuid4())},
    )
    assert response.status_code == 400


def test_section_7_9_ties_are_ordered_by_number_not_by_id_text(
    client: TestClient, engine: Engine
) -> None:
    # As text, "RPT-10000" sorts before "RPT-9999"; as filed, it came after.
    with engine.begin() as connection:
        connection.execute(text("ALTER SEQUENCE report_seq RESTART WITH 9999"))
    post(client, draft())
    post(client, draft())
    items = client.get("/api/reports").json()["items"]
    assert [item["id"] for item in items] == ["RPT-10000", "RPT-9999"]
