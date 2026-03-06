"""
Migration: Add equipment_items column to onsite_reports table.
Run ONCE: cd backend && python migrate_onsite_v3.py
"""
from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:
        # Add equipment_items column (JSONB for PostgreSQL)
        conn.execute(text("""
            ALTER TABLE onsite_reports
            ADD COLUMN IF NOT EXISTS equipment_items JSONB DEFAULT '[]'::jsonb;
        """))

        # Migrate existing single-equipment data into equipment_items
        conn.execute(text("""
            UPDATE onsite_reports
            SET equipment_items = jsonb_build_array(
                jsonb_build_object(
                    'description', COALESCE(equipment_tag, ''),
                    'model', COALESCE(equipment_model, ''),
                    'serial_number', COALESCE(serial_number, '')
                )
            )
            WHERE equipment_items IS NULL
               OR equipment_items = '[]'::jsonb
               AND (equipment_tag IS NOT NULL OR equipment_model IS NOT NULL OR serial_number IS NOT NULL);
        """))

        conn.commit()
        print("✅ Migration onsite_reports v3 selesai!")
        print("   - Kolom equipment_items (JSONB) ditambahkan")
        print("   - Data equipment lama di-migrate ke equipment_items")
