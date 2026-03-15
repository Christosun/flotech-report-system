"""
backend/migrate_notification.py
Jalankan SEKALI untuk membuat tabel notifications.
Usage: python migrate_notification.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id         SERIAL PRIMARY KEY,
                user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
                type       VARCHAR(50),
                title      VARCHAR(200),
                message    VARCHAR(500),
                link       VARCHAR(200),
                is_read    BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))

        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id
            ON notifications(user_id);
        """))

        conn.execute(db.text("""
            CREATE INDEX IF NOT EXISTS idx_notifications_unread
            ON notifications(user_id, is_read);
        """))

        conn.commit()
        print("✅ Migration selesai!")
        print("   - Tabel notifications dibuat")
        print("   - Index user_id & is_read dibuat")
