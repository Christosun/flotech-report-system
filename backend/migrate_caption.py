"""
Migration: Add caption column to report_images table
Jalankan script ini SEKALI setelah update.
Usage: python migrate_caption.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:
        # Add caption column to report_images
        conn.execute(db.text("""
            ALTER TABLE report_images 
            ADD COLUMN IF NOT EXISTS caption VARCHAR(500) DEFAULT '';
        """))

        conn.commit()
        print("✅ Migration selesai!")
        print("   - Kolom 'caption' ditambah ke tabel report_images")
