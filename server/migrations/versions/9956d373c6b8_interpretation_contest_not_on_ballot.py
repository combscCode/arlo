# pylint: disable=invalid-name
"""Interpretation.CONTEST_NOT_ON_BALLOT

Revision ID: 9956d373c6b8
Revises: b5fcf654c681
Create Date: 2020-11-03 01:02:56.245187+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9956d373c6b8"
down_revision = "b5fcf654c681"
branch_labels = None
depends_on = None


def upgrade():
    # Alembic doesn't support changing enums, so we have to swap out the
    # existing enum with a new enum.
    # https://markrailton.com/blog/creating-migrations-when-changing-an-enum-in-python-using-sql-alchemy

    op.execute("ALTER TYPE interpretation RENAME TO interpretation_old")

    new_intepretation_enum = sa.dialects.postgresql.ENUM(
        "BLANK", "CANT_AGREE", "CONTEST_NOT_ON_BALLOT", "VOTE", name="interpretation"
    )
    new_intepretation_enum.create(op.get_bind())

    op.execute(
        "ALTER TABLE ballot_interpretation ALTER COLUMN interpretation TYPE interpretation USING interpretation::text::interpretation"
    )

    op.execute("DROP TYPE interpretation_old")


def downgrade():  # pragma: no cover
    # ### commands auto generated by Alembic - please adjust! ###
    pass
    # ### end Alembic commands ###
