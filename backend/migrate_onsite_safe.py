"""
migrate_onsite_safe.py
Migration AMAN — hanya menambah kolom baru, tidak menghapus kolom lama.
Jalankan SEKALI:
  cd backend
  python migrate_onsite_safe.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:

        # Kolom baru yang dibutuhkan model baru
        migrations = [
            ("equipment_description", "VARCHAR(300)", None),
            ("pdf_show_job_description", "BOOLEAN", "TRUE"),
            ("pdf_show_work_performed",  "BOOLEAN", "TRUE"),
            ("pdf_show_findings",        "BOOLEAN", "TRUE"),
            ("pdf_show_recommendations", "BOOLEAN", "TRUE"),
            # Pastikan kolom lama yang masih ada di model juga ada di DB
            ("client_company", "VARCHAR(200)", None),
            ("materials_used", "TEXT", None),
            ("equipment_tag",  "VARCHAR(100)", None),
        ]

        for col, col_type, default in migrations:
            try:
                if default is not None:
                    conn.execute(db.text(f"""
                        ALTER TABLE onsite_reports
                        ADD COLUMN IF NOT EXISTS {col} {col_type} DEFAULT {default};
                    """))
                else:
                    conn.execute(db.text(f"""
                        ALTER TABLE onsite_reports
                        ADD COLUMN IF NOT EXISTS {col} {col_type};
                    """))
                print(f"   ✓ {col}")
            except Exception as e:
                print(f"   ! {col}: {e}")

        # Copy equipment_tag → equipment_description jika belum ada isinya
        try:
            conn.execute(db.text("""
                UPDATE onsite_reports
                SET equipment_description = equipment_tag
                WHERE equipment_description IS NULL AND equipment_tag IS NOT NULL;
            """))
            print("   ✓ Data equipment_tag di-copy ke equipment_description")
        except Exception as e:
            print(f"   ! copy equipment_tag: {e}")

        conn.commit()

    print("\n✅ Migration selesai! Restart backend sekarang.")
