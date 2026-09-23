"""The PostgreSQL schema (DESIGN §7.7). Migrations are the only way it changes (§7.11);
this module is what the adapter queries and what a migration is compared against."""

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    MetaData,
    PrimaryKeyConstraint,
    Sequence,
    Table,
    Text,
    Uuid,
)

from app.domain.model import CHECK_ITEMS, CHECK_RESULTS, EQUIPMENT_TYPES


def _one_of(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(value) for value in values)})"


metadata = MetaData()

# Ids come from a sequence, not from "highest plus one" (DESIGN §7.5).
report_seq = Sequence("report_seq", metadata=metadata)

reports = Table(
    "reports",
    metadata,
    Column("id", Text(), primary_key=True),
    # The number behind the id. Ordering by it, not by the id text, keeps RPT-10000 after
    # RPT-9999 (DESIGN §7.9).
    Column("seq", BigInteger, nullable=False, unique=True),
    Column("equipment_id", Text, nullable=False),
    Column("equipment_type", Text, nullable=False),
    Column("inspected_at", DateTime(timezone=False), nullable=False),
    Column("inspector_name", Text, nullable=False),
    Column("remarks", Text, nullable=False),
    Column("submitted_at", DateTime(timezone=True), nullable=False),
    Column("idempotency_key", Uuid(as_uuid=True), nullable=False, unique=True),
    # A digest of the normalized draft: tells a retry from a different draft sent under
    # the same key (DESIGN §7.6).
    Column("draft_digest", Text, nullable=False),
    CheckConstraint("id ~ '^RPT-[0-9]{4,}$'", name="reports_id_format"),
    CheckConstraint("equipment_id ~ '^[A-Z]{2}-[0-9]{4}$'", name="reports_equipment_id_format"),
    CheckConstraint(_one_of("equipment_type", EQUIPMENT_TYPES), name="reports_equipment_type"),
    # char_length counts code points, never more than the UTF-16 units the domain counts,
    # so these bounds hold for every draft the domain accepts.
    CheckConstraint(
        "char_length(inspector_name) BETWEEN 1 AND 32", name="reports_inspector_name_length"
    ),
    CheckConstraint("char_length(remarks) <= 200", name="reports_remarks_length"),
)

Index("reports_listing_order", reports.c.inspected_at.desc(), reports.c.seq.desc())

report_checks = Table(
    "report_checks",
    metadata,
    Column("report_id", Text, ForeignKey("reports.id", ondelete="CASCADE"), nullable=False),
    Column("item", Text, nullable=False),
    Column("result", Text, nullable=False),
    PrimaryKeyConstraint("report_id", "item"),
    CheckConstraint(_one_of("item", CHECK_ITEMS), name="report_checks_item"),
    CheckConstraint(_one_of("result", CHECK_RESULTS), name="report_checks_result"),
)
