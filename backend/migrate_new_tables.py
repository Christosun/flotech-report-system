"""
Run ONCE to create new tables for Onsite Reports and Surat Serah Terima.
Usage: cd backend && python migrate_new_tables.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:
        # Onsite Reports
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS onsite_reports (
                id SERIAL PRIMARY KEY,
                report_number VARCHAR(50),
                visit_date DATE,
                client_name VARCHAR(150),
                client_company VARCHAR(200),
                client_address TEXT,
                site_location VARCHAR(200),
                contact_person VARCHAR(150),
                contact_phone VARCHAR(30),
                engineer_id INTEGER REFERENCES engineers(id),
                job_description TEXT,
                equipment_tag VARCHAR(100),
                equipment_model VARCHAR(150),
                serial_number VARCHAR(100),
                work_performed TEXT,
                findings TEXT,
                recommendations TEXT,
                materials_used TEXT,
                customer_signature TEXT,
                status VARCHAR(20) DEFAULT 'draft',
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))

        # Surat Serah Terima
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS surat_serah_terima (
                id SERIAL PRIMARY KEY,
                surat_number VARCHAR(50),
                surat_type VARCHAR(20) DEFAULT 'serah',
                surat_date DATE,
                perihal VARCHAR(300),
                pihak_pertama_nama VARCHAR(150),
                pihak_pertama_jabatan VARCHAR(100),
                pihak_pertama_perusahaan VARCHAR(200),
                pihak_pertama_alamat TEXT,
                pihak_pertama_signature TEXT,
                pihak_kedua_nama VARCHAR(150),
                pihak_kedua_jabatan VARCHAR(100),
                pihak_kedua_perusahaan VARCHAR(200),
                pihak_kedua_alamat TEXT,
                pihak_kedua_signature TEXT,
                barang_items JSONB,
                catatan TEXT,
                status VARCHAR(20) DEFAULT 'draft',
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))

        conn.commit()
        print("✅ Migration selesai!")
        print("   - Tabel onsite_reports dibuat")
        print("   - Tabel surat_serah_terima dibuat")
