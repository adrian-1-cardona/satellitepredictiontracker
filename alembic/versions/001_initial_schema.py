"""initial schema

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa


revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
    op.create_index("uq_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "locations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("elevation_m", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "name", name="uq_locations_user_name"),
    )
    op.create_index("idx_locations_user_id", "locations", ["user_id"])

    op.create_table(
        "passes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("satellite_name", sa.String(length=160), nullable=False),
        sa.Column("rise_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("culmination_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("set_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("max_elevation", sa.Float(), nullable=False),
        sa.Column("brightness", sa.Float()),
        sa.Column("pass_quality", sa.String(length=32), nullable=False, server_default="fair"),
        sa.Column("predicted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("location_id", "satellite_name", "rise_time", name="uq_passes_location_satellite_rise"),
    )
    op.create_index("idx_passes_location_id", "passes", ["location_id"])
    op.create_index("idx_passes_rise_time", "passes", ["rise_time"])
    op.create_index("idx_passes_satellite_name", "passes", ["satellite_name"])
    op.create_index("idx_passes_location_rise", "passes", ["location_id", "rise_time"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_id", sa.Integer(), sa.ForeignKey("locations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("satellite_name", sa.String(length=160)),
        sa.Column("min_elevation", sa.Float(), nullable=False, server_default="10"),
        sa.Column("max_brightness", sa.Float()),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notification_method", sa.String(length=32), nullable=False, server_default="email"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_alerts_user_id", "alerts", ["user_id"])
    op.create_index("idx_alerts_location_id", "alerts", ["location_id"])
    op.create_index("idx_alerts_enabled", "alerts", ["enabled"])

    op.create_table(
        "alert_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("alert_id", sa.Integer(), sa.ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pass_id", sa.Integer(), sa.ForeignKey("passes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivery_status", sa.String(length=32), nullable=False, server_default="sent"),
        sa.Column("message", sa.Text()),
    )
    op.create_index("idx_alert_history_alert_id", "alert_history", ["alert_id"])
    op.create_index("idx_alert_history_delivered_at", "alert_history", ["delivered_at"])

    op.create_table(
        "api_keys",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_hash", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
    )
    op.create_index("idx_api_keys_user_id", "api_keys", ["user_id"])
    op.create_index("uq_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)

    op.create_table(
        "job_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("task_id", sa.String(length=128), nullable=False),
        sa.Column("job_type", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result", sa.Text()),
        sa.Column("error", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_job_history_task_id", "job_history", ["task_id"], unique=True)
    op.create_index("idx_job_history_status", "job_history", ["status"])


def downgrade() -> None:
    op.drop_table("job_history")
    op.drop_table("api_keys")
    op.drop_table("alert_history")
    op.drop_table("alerts")
    op.drop_table("passes")
    op.drop_table("locations")
    op.drop_table("refresh_tokens")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

