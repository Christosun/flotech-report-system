"""
Migration: Tambah tabel customers
Jalankan: python migrate_customers.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from extensions import db
from sqlalchemy import text

SQL = """
CREATE TABLE IF NOT EXISTS customers (
    id           SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    address      TEXT,
    phone        VARCHAR(50),
    email        VARCHAR(120),
    industry     VARCHAR(100),
    notes        TEXT,
    created_by   INTEGER REFERENCES users(id),
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);
"""

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
        print("✅ Tabel 'customers' berhasil dibuat!")
