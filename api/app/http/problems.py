"""Every error leaves as `application/problem+json` (DESIGN §7.10)."""

from typing import Any, cast

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.domain import FieldError
from app.http.schemas import FieldErrorOut, Problem

PROBLEM_JSON = "application/problem+json"


class ProblemError(Exception):
    def __init__(self, problem: Problem) -> None:
        super().__init__(problem.title)
        self.problem = problem


def invalid_draft(errors: list[FieldError]) -> ProblemError:
    return ProblemError(
        Problem(
            title="The draft breaks one or more validity rules.",
            status=422,
            errors=[FieldErrorOut(field=error.path, key=error.key) for error in errors],
        )
    )


def not_found(report_id: str) -> ProblemError:
    return ProblemError(Problem(title="No such report.", status=404, detail=report_id))


def idempotency_conflict() -> ProblemError:
    return ProblemError(
        Problem(title="This idempotency key was used for a different draft.", status=409)
    )


def bad_request(detail: str) -> ProblemError:
    return ProblemError(Problem(title="The request cannot be read.", status=400, detail=detail))


def problem_responses(*statuses: int) -> dict[int | str, dict[str, object]]:
    """OpenAPI entries, so the generated web types know the error shape (DESIGN §7.4)."""
    return {
        status: {
            # `model` registers the schema; `content` names the media type it is sent as.
            "model": Problem,
            "content": {PROBLEM_JSON: {"schema": {"$ref": "#/components/schemas/Problem"}}},
            "description": "Problem",
        }
        for status in statuses
    }


def drop_plain_json_for_problems(document: dict[str, Any]) -> dict[str, Any]:
    """FastAPI lists every `model` response as `application/json` too; a problem is only
    ever sent as `application/problem+json`, and the document should say only that."""
    for operation in (op for path in document["paths"].values() for op in path.values()):
        for response in operation.get("responses", {}).values():
            content = response.get("content", {})
            if PROBLEM_JSON in content:
                content.pop("application/json", None)
    return document


def _respond(problem: Problem) -> JSONResponse:
    return JSONResponse(
        problem.model_dump(exclude_none=True), status_code=problem.status, media_type=PROBLEM_JSON
    )


def install(app: FastAPI) -> None:
    async def on_problem(_: Request, error: Exception) -> JSONResponse:
        assert isinstance(error, ProblemError)
        return _respond(error.problem)

    async def on_unreadable(_: Request, error: Exception) -> JSONResponse:
        # A body or parameter of the wrong shape is a client defect, not a draft a person
        # can correct, so it is 400 rather than the 422 of §7.2.
        assert isinstance(error, RequestValidationError)
        details = cast(list[dict[str, Any]], error.errors())
        first: dict[str, Any] = details[0] if details else {}
        location = ".".join(str(part) for part in first.get("loc", ()))
        return _respond(bad_request(f"{location}: {first.get('msg', 'invalid')}").problem)

    async def on_http(_: Request, error: Exception) -> JSONResponse:
        assert isinstance(error, HTTPException)
        return _respond(Problem(title=str(error.detail), status=error.status_code))

    app.add_exception_handler(ProblemError, on_problem)
    app.add_exception_handler(RequestValidationError, on_unreadable)
    app.add_exception_handler(HTTPException, on_http)
