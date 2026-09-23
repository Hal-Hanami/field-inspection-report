from typing import Any


def draft(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "equipmentId": "TR-0142",
        "equipmentType": "transformer",
        "inspectedAt": "2026-09-23T09:30",
        "inspectorName": "Inspector A",
        "checks": {
            "appearance": "ok",
            "abnormalSound": "ok",
            "temperature": "ok",
            "corrosion": "ok",
            "surroundings": "ok",
        },
        "remarks": "",
    }
    return {**base, **overrides}
