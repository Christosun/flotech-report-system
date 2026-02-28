"""
Migration script: Tambah kolom baru ke tabel quotations yang sudah ada.
Jalankan dari folder backend:
    python migrate_quotations.py
"""
import sys
import os

# Pastikan bisa import config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from sqlalchemy import text

MIGRATIONS = [
    # Kolom baru untuk fitur revision & auto-number
    ("base_number",    "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS base_number VARCHAR(30)"),
    ("revision",       "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision INTEGER DEFAULT 0"),
    # Kolom baru untuk form quotation
    ("sales_person",   "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100)"),
    ("ref_no",         "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ref_no VARCHAR(100)"),
    ("shipment_terms", "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipment_terms VARCHAR(200)"),
    ("delivery",       "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS delivery VARCHAR(200)"),
    ("payment_terms",  "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(200)"),
    ("vat_pct",        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_pct FLOAT DEFAULT 11"),
    ("vat_include",    "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS vat_include BOOLEAN DEFAULT FALSE"),
]

# Backfill base_number dari quotation_number yang sudah ada
BACKFILL = """
UPDATE quotations 
SET base_number = quotation_number, revision = 0
WHERE base_number IS NULL;
"""

with app.app_context():
    with db.engine.connect() as conn:
        print("=" * 50)
        print("Menjalankan migrasi tabel quotations...")
        print("=" * 50)
        
        for col_name, sql in MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"  ✅ Kolom '{col_name}' berhasil ditambahkan")
            except Exception as e:
                conn.rollback()
                print(f"  ⚠️  Kolom '{col_name}': {e}")
        
        # Backfill data lama
        try:
            conn.execute(text(BACKFILL))
            conn.commit()
            print("  ✅ Backfill base_number dari data lama berhasil")
        except Exception as e:
            conn.rollback()
            print(f"  ⚠️  Backfill: {e}")
        
        print("=" * 50)
        print("✅ Migrasi selesai! Silakan restart backend.")
        print("=" * 50)
