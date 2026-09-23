"""Create reports and their per-item check results (DESIGN §7.7).

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EQUIPMENT_TYPES = "'transformer', 'pole', 'switchgear', 'insulator', 'meter'"
CHECK_ITEMS = "'appearance', 'abnormalSound', 'temperature', 'corrosion', 'surroundings'"
CHECK_RESULTS = "'ok', 'caution', 'abnormal'"


def upgrade() -> None:
    # Literal values rather than imports from the app: a migration records the schema as it
    # was, and must not change when the application's constants do later.
    op.execute(sa.schema.CreateSequence(sa.Sequence("report_seq")))
    op.create_table(
        "reports",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("seq", sa.BigInteger(), nullable=False, unique=True),
        sa.Column("equipment_id", sa.Text(), nullable=False),
        sa.Column("equipment_type", sa.Text(), nullable=False),
        sa.Column("inspected_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("inspector_name", sa.Text(), nullable=False),
        sa.Column("remarks", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.Uuid(), nullable=False, unique=True),
        sa.Column("draft_digest", sa.Text(), nullable=False),
        sa.CheckConstraint("id ~ '^RPT-[0-9]{4,}$'", name="reports_id_format"),
        sa.CheckConstraint(
            "equipment_id ~ '^[A-Z]{2}-[0-9]{4}$'", name="reports_equipment_id_format"
        ),
        sa.CheckConstraint(f"equipment_type IN ({EQUIPMENT_TYPES})", name="reports_equipment_type"),
        sa.CheckConstraint(
            "char_length(inspector_name) BETWEEN 1 AND 32",
            name="reports_inspector_name_length",
        ),
        sa.CheckConstraint("char_length(remarks) <= 200", name="reports_remarks_length"),
    )
    op.create_index(
        "reports_listing_order",
        "reports",
        [sa.text("inspected_at DESC"), sa.text("seq DESC")],
    )
    op.create_table(
        "report_checks",
        sa.Column(
            "report_id",
            sa.Text(),
            sa.ForeignKey("reports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("report_id", "item"),
        sa.CheckConstraint(f"item IN ({CHECK_ITEMS})", name="report_checks_item"),
        sa.CheckConstraint(f"result IN ({CHECK_RESULTS})", name="report_checks_result"),
    )


def downgrade() -> None:
    op.drop_table("report_checks")
    op.drop_index("reports_listing_order", table_name="reports")
    op.drop_table("reports")
    op.execute(sa.schema.DropSequence(sa.Sequence("report_seq")))
