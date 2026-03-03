"""
Migration v2: Update onsite_reports table
- Rename equipment_tag -> equipment_description (TEXT, multiline support)
- client_name sekarang digunakan sebagai Contact Person / PIC
  (client_company untuk nama perusahaan)
- Hapus kolom materials_used dan contact_person
- Tambah kolom pdf_show_* untuk kontrol visibilitas field di PDF

Jalankan SEKALI: python migrate_onsite_v2.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from sqlalchemy import text

with app.app_context():
    with db.engine.connect() as conn:

        # 1. Tambah kolom equipment_description (pengganti equipment_tag)
        conn.execute(text("""
            ALTER TABLE onsite_reports
            ADD COLUMN IF NOT EXISTS equipment_description TEXT;
        """))

        # 2. Migrasi data dari equipment_tag ke equipment_description
        conn.execute(text("""
            UPDATE onsite_reports
            SET equipment_description = equipment_tag
            WHERE equipment_description IS NULL AND equipment_tag IS NOT NULL;
        """))

        # 3. Migrasi contact_person ke client_name jika client_name kosong
        #    (client_name sekarang = Contact Person / PIC)
        conn.execute(text("""
            UPDATE onsite_reports
            SET client_name = contact_person
            WHERE (client_name IS NULL OR client_name = '')
              AND contact_person IS NOT NULL AND contact_person != '';
        """))

        # 4. Tambah kolom pdf_show_* untuk kontrol PDF visibility
        conn.execute(text("""
            ALTER TABLE onsite_reports
            ADD COLUMN IF NOT EXISTS pdf_show_job_description BOOLEAN DEFAULT TRUE;
        """))
        conn.execute(text("""
            ALTER TABLE onsite_reports
            ADD COLUMN IF NOT EXISTS pdf_show_work_performed BOOLEAN DEFAULT TRUE;
        """))
        conn.execute(text("""
            ALTER TABLE onsite_reports
            ADD COLUMN IF NOT EXISTS pdf_show_findings BOOLEAN DEFAULT TRUE;
        """))
        conn.execute(text("""
            ALTER TABLE onsite_reports
            ADD COLUMN IF NOT EXISTS pdf_show_recommendations BOOLEAN DEFAULT TRUE;
        """))

        # 5. Set default TRUE untuk semua record yang sudah ada
        conn.execute(text("""
            UPDATE onsite_reports
            SET
                pdf_show_job_description = TRUE,
                pdf_show_work_performed = TRUE,
                pdf_show_findings = TRUE,
                pdf_show_recommendations = TRUE
            WHERE pdf_show_job_description IS NULL;
        """))

        conn.commit()

    print("✅ Migration onsite_reports v2 selesai!")
    print("   - Kolom equipment_description ditambahkan (data dari equipment_tag di-migrate)")
    print("   - Kolom contact_person di-merge ke client_name (jika client_name kosong)")
    print("   - Kolom pdf_show_job_description ditambahkan (default: TRUE)")
    print("   - Kolom pdf_show_work_performed ditambahkan (default: TRUE)")
    print("   - Kolom pdf_show_findings ditambahkan (default: TRUE)")
    print("   - Kolom pdf_show_recommendations ditambahkan (default: TRUE)")
    print()
    print("CATATAN: Kolom lama (equipment_tag, contact_person, materials_used) tidak dihapus")
    print("dari database untuk keamanan data. Model Python sudah tidak menggunakannya.")
