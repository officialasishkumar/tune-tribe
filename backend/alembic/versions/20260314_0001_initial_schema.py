from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260314_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("bio", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("favorite_genre", sa.String(length=120), nullable=True),
        sa.Column("favorite_artist", sa.String(length=120), nullable=True),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_groups_name", "groups", ["name"], unique=False)
    op.create_index("ix_groups_owner_id", "groups", ["owner_id"], unique=False)

    op.create_table(
        "friendships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("friend_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "friend_id", name="uq_friendship_pair"),
    )
    op.create_index("ix_friendships_user_id", "friendships", ["user_id"], unique=False)
    op.create_index("ix_friendships_friend_id", "friendships", ["friend_id"], unique=False)

    op.create_table(
        "group_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
    )
    op.create_index("ix_group_memberships_group_id", "group_memberships", ["group_id"], unique=False)
    op.create_index("ix_group_memberships_user_id", "group_memberships", ["user_id"], unique=False)

    op.create_table(
        "track_shares",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("source_identifier", sa.String(length=120), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("artist", sa.String(length=255), nullable=False),
        sa.Column("album", sa.String(length=255), nullable=True),
        sa.Column("genre", sa.String(length=120), nullable=False),
        sa.Column("album_art_url", sa.String(length=500), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("track_signature", sa.String(length=255), nullable=False),
        sa.Column("shared_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_track_shares_group_id", "track_shares", ["group_id"], unique=False)
    op.create_index("ix_track_shares_shared_by_id", "track_shares", ["shared_by_id"], unique=False)
    op.create_index("ix_track_shares_source", "track_shares", ["source"], unique=False)
    op.create_index("ix_track_shares_source_identifier", "track_shares", ["source_identifier"], unique=False)
    op.create_index("ix_track_shares_title", "track_shares", ["title"], unique=False)
    op.create_index("ix_track_shares_track_signature", "track_shares", ["track_signature"], unique=False)
    op.create_index("ix_track_shares_shared_at", "track_shares", ["shared_at"], unique=False)
    op.create_index("ix_track_shares_group_shared_at", "track_shares", ["group_id", "shared_at"], unique=False)
    op.create_index(
        "ix_track_shares_shared_by_shared_at",
        "track_shares",
        ["shared_by_id", "shared_at"],
        unique=False,
    )
    op.create_index(
        "ix_track_shares_group_signature",
        "track_shares",
        ["group_id", "track_signature"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_track_shares_group_signature", table_name="track_shares")
    op.drop_index("ix_track_shares_shared_by_shared_at", table_name="track_shares")
    op.drop_index("ix_track_shares_group_shared_at", table_name="track_shares")
    op.drop_index("ix_track_shares_shared_at", table_name="track_shares")
    op.drop_index("ix_track_shares_track_signature", table_name="track_shares")
    op.drop_index("ix_track_shares_title", table_name="track_shares")
    op.drop_index("ix_track_shares_source_identifier", table_name="track_shares")
    op.drop_index("ix_track_shares_source", table_name="track_shares")
    op.drop_index("ix_track_shares_shared_by_id", table_name="track_shares")
    op.drop_index("ix_track_shares_group_id", table_name="track_shares")
    op.drop_table("track_shares")

    op.drop_index("ix_group_memberships_user_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_group_id", table_name="group_memberships")
    op.drop_table("group_memberships")

    op.drop_index("ix_friendships_friend_id", table_name="friendships")
    op.drop_index("ix_friendships_user_id", table_name="friendships")
    op.drop_table("friendships")

    op.drop_index("ix_groups_owner_id", table_name="groups")
    op.drop_index("ix_groups_name", table_name="groups")
    op.drop_table("groups")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
