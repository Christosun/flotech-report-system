"""
Migration: Tambah kolom visit_date_from dan visit_date_to ke onsite_reports
Jalankan sekali dari folder backend:
    python migrate_onsite_v4.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app import app
from extensions import db
from sqlalchemy import text

def run():
    with app.app_context():
        with db.engine.connect() as conn:
            print("▶ Menambahkan kolom visit_date_from ...")
            conn.execute(text("""
                ALTER TABLE onsite_reports
                ADD COLUMN IF NOT EXISTS visit_date_from DATE
            """))

            print("▶ Menambahkan kolom visit_date_to ...")
            conn.execute(text("""
                ALTER TABLE onsite_reports
                ADD COLUMN IF NOT EXISTS visit_date_to DATE
            """))

            print("▶ Backfill visit_date_from dari visit_date (data lama) ...")
            conn.execute(text("""
                UPDATE onsite_reports
                SET visit_date_from = visit_date
                WHERE visit_date_from IS NULL AND visit_date IS NOT NULL
            """))

            conn.commit()
            print("✅ Migration selesai!")

if __name__ == "__main__":
    run()
