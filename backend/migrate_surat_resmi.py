"""
backend/migrate_surat_resmi.py
Run ONCE to create surat_resmi table.
Usage: cd backend && python migrate_surat_resmi.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS surat_resmi (
                id SERIAL PRIMARY KEY,
                nomor VARCHAR(100),
                surat_type VARCHAR(30) DEFAULT 'rekomendasi',
                perihal VARCHAR(500),
                lampiran VARCHAR(300),
                surat_date DATE,
                kepada_nama VARCHAR(200),
                kepada_jabatan VARCHAR(200),
                kepada_perusahaan VARCHAR(300),
                kepada_alamat TEXT,
                content_html TEXT,
                engineer_id INTEGER REFERENCES engineers(id),
                include_signature BOOLEAN DEFAULT TRUE,
                status VARCHAR(20) DEFAULT 'draft',
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))
        conn.commit()
        print("✅ Tabel surat_resmi berhasil dibuat!")
