"""add no_plan to kpi_types

Revision ID: add_no_plan_kpi
Revises: 
Create Date: 2026-03-26

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_no_plan_kpi'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Добавляем поле no_plan в таблицу kpi_types
    op.add_column('kpi_types', sa.Column('no_plan', sa.Boolean(), nullable=True))
    
    # Устанавливаем значение по умолчанию False для существующих записей
    op.execute("UPDATE kpi_types SET no_plan = FALSE WHERE no_plan IS NULL")
    
    # Делаем поле NOT NULL
    op.alter_column('kpi_types', 'no_plan', nullable=False, server_default=sa.false())


def downgrade():
    # Удаляем поле no_plan
    op.drop_column('kpi_types', 'no_plan')
