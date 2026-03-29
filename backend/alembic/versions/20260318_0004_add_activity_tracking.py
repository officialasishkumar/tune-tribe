from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260318_0004"
down_revision = "20260314_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("login_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("profile_updated_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column(
        "groups",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("subject_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="SET NULL"), nullable=True),
        sa.Column("track_share_id", sa.Integer(), sa.ForeignKey("track_shares.id", ondelete="SET NULL"), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_activity_events_event_type", "activity_events", ["event_type"], unique=False)
    op.create_index("ix_activity_events_actor_user_id", "activity_events", ["actor_user_id"], unique=False)
    op.create_index("ix_activity_events_subject_user_id", "activity_events", ["subject_user_id"], unique=False)
    op.create_index("ix_activity_events_group_id", "activity_events", ["group_id"], unique=False)
    op.create_index("ix_activity_events_track_share_id", "activity_events", ["track_share_id"], unique=False)
    op.create_index("ix_activity_events_occurred_at", "activity_events", ["occurred_at"], unique=False)
    op.create_index(
        "ix_activity_events_type_occurred_at",
        "activity_events",
        ["event_type", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_activity_events_group_occurred_at",
        "activity_events",
        ["group_id", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_activity_events_actor_occurred_at",
        "activity_events",
        ["actor_user_id", "occurred_at"],
        unique=False,
    )
    op.create_index(
        "ix_activity_events_subject_occurred_at",
        "activity_events",
        ["subject_user_id", "occurred_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_activity_events_subject_occurred_at", table_name="activity_events")
    op.drop_index("ix_activity_events_actor_occurred_at", table_name="activity_events")
    op.drop_index("ix_activity_events_group_occurred_at", table_name="activity_events")
    op.drop_index("ix_activity_events_type_occurred_at", table_name="activity_events")
    op.drop_index("ix_activity_events_occurred_at", table_name="activity_events")
    op.drop_index("ix_activity_events_track_share_id", table_name="activity_events")
    op.drop_index("ix_activity_events_group_id", table_name="activity_events")
    op.drop_index("ix_activity_events_subject_user_id", table_name="activity_events")
    op.drop_index("ix_activity_events_actor_user_id", table_name="activity_events")
    op.drop_index("ix_activity_events_event_type", table_name="activity_events")
    op.drop_table("activity_events")

    op.drop_column("groups", "updated_at")

    op.drop_column("users", "profile_updated_at")
    op.drop_column("users", "login_count")
    op.drop_column("users", "last_login_at")
