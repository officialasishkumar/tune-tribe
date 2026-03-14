from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260314_0003"
down_revision = "20260314_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "track_metadata_cache",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("cache_key", sa.String(length=64), nullable=False),
        sa.Column("lookup_url", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("source_identifier", sa.String(length=255), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("artist", sa.String(length=255), nullable=False),
        sa.Column("album", sa.String(length=255), nullable=True),
        sa.Column("genre", sa.String(length=120), nullable=False, server_default="Unknown"),
        sa.Column("album_art_url", sa.String(length=500), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("provider_name", sa.String(length=64), nullable=False),
        sa.Column("hit_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refreshed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_track_metadata_cache_cache_key", "track_metadata_cache", ["cache_key"], unique=True)
    op.create_index("ix_track_metadata_cache_source", "track_metadata_cache", ["source"], unique=False)
    op.create_index("ix_track_metadata_cache_expires_at", "track_metadata_cache", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_track_metadata_cache_expires_at", table_name="track_metadata_cache")
    op.drop_index("ix_track_metadata_cache_source", table_name="track_metadata_cache")
    op.drop_index("ix_track_metadata_cache_cache_key", table_name="track_metadata_cache")
    op.drop_table("track_metadata_cache")
