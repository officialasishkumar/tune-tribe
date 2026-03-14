from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260314_0002"
down_revision = "20260314_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "friendships",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
    )
    # Existing friendships were implicitly accepted; update them accordingly
    op.execute("UPDATE friendships SET status = 'accepted' WHERE status = 'pending'")


def downgrade() -> None:
    op.drop_column("friendships", "status")
