"""`uvicorn app.asgi:app`. Kept apart from `app.main` so importing the factory opens nothing."""

from app.main import create_app

app = create_app()
