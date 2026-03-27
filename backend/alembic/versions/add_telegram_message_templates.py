"""Add telegram_message_templates table

Revision ID: add_telegram_templates
Revises: 
Create Date: 2026-03-27

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_telegram_templates'
down_revision = None  # Будет обновлено при деплое
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'telegram_message_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('template_text', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'name', name='uq_telegram_template_company_name')
    )
    op.create_index(op.f('ix_telegram_message_templates_id'), 'telegram_message_templates', ['id'], unique=False)
    op.create_index(op.f('ix_telegram_message_templates_company_id'), 'telegram_message_templates', ['company_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_telegram_message_templates_company_id'), table_name='telegram_message_templates')
    op.drop_index(op.f('ix_telegram_message_templates_id'), table_name='telegram_message_templates')
    op.drop_table('telegram_message_templates')
