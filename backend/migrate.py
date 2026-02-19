"""
Jalankan script ini SEKALI untuk menambah kolom yang kurang di database.
Usage: python migrate.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:
        # Tambah kolom engineer_id ke tabel reports jika belum ada
        conn.execute(db.text("""
            ALTER TABLE reports 
            ADD COLUMN IF NOT EXISTS engineer_id INTEGER REFERENCES engineers(id);
        """))

        # Tambah kolom created_by ke tabel reports jika belum ada (opsional, tidak wajib)
        conn.execute(db.text("""
            ALTER TABLE reports 
            ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);
        """))

        # Pastikan tabel engineers ada (jika belum)
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS engineers (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name VARCHAR(150) NOT NULL,
                employee_id VARCHAR(50) UNIQUE,
                position VARCHAR(100),
                department VARCHAR(100),
                specialization VARCHAR(200),
                email VARCHAR(120),
                phone VARCHAR(30),
                certification VARCHAR(300),
                years_experience INTEGER DEFAULT 0,
                signature_data TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        """))

        conn.commit()
        print("✅ Migration selesai!")
        print("   - Kolom engineer_id ditambah ke tabel reports")
        print("   - Kolom created_by ditambah ke tabel reports")
        print("   - Tabel engineers dibuat (jika belum ada)")
