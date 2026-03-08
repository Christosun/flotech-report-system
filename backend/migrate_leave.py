"""
migrate_leave.py  (FIXED)
Run ONCE to create leave management tables.
Usage: cd backend && python migrate_leave.py
"""
from app import app
from extensions import db

with app.app_context():
    with db.engine.connect() as conn:

        # ── LeaveEntitlements ────────────────────────────────────────────────
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS leave_entitlements (
                id               SERIAL PRIMARY KEY,
                user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                year             INTEGER NOT NULL,
                entitlement_days INTEGER NOT NULL DEFAULT 12,
                joint_leave_days INTEGER NOT NULL DEFAULT 0,
                created_at       TIMESTAMP DEFAULT NOW(),
                updated_at       TIMESTAMP DEFAULT NOW()
            );
        """))

        # Add unique constraint if not already present
        conn.execute(db.text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'uq_leave_entitlements_user_year'
                ) THEN
                    ALTER TABLE leave_entitlements
                    ADD CONSTRAINT uq_leave_entitlements_user_year
                    UNIQUE (user_id, year);
                END IF;
            END $$;
        """))

        # ── LeaveRequests ────────────────────────────────────────────────────
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS leave_requests (
                id               SERIAL PRIMARY KEY,
                request_number   VARCHAR(50) UNIQUE,
                user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                leave_type       VARCHAR(50),
                reason           VARCHAR(500),
                start_date       DATE NOT NULL,
                end_date         DATE,
                total_days       INTEGER DEFAULT 1,
                status           VARCHAR(20) DEFAULT 'pending',
                approved_by      INTEGER REFERENCES users(id),
                approved_at      TIMESTAMP,
                rejection_reason VARCHAR(500),
                is_joint_leave   BOOLEAN DEFAULT FALSE,
                notes            TEXT,
                created_at       TIMESTAMP DEFAULT NOW(),
                updated_at       TIMESTAMP DEFAULT NOW()
            );
        """))

        # ── JointLeaveSchedule ───────────────────────────────────────────────
        conn.execute(db.text("""
            CREATE TABLE IF NOT EXISTS joint_leave_schedules (
                id         SERIAL PRIMARY KEY,
                year       INTEGER NOT NULL,
                name       VARCHAR(200) NOT NULL,
                leave_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        """))

        # Add unique constraint safely (idempotent)
        conn.execute(db.text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'uq_joint_leave_year_date'
                ) THEN
                    ALTER TABLE joint_leave_schedules
                    ADD CONSTRAINT uq_joint_leave_year_date
                    UNIQUE (year, leave_date);
                END IF;
            END $$;
        """))

        # Commit table + constraint creation BEFORE insert (so ON CONFLICT works)
        conn.commit()

        # ── Seed default joint leave 2026 ────────────────────────────────────
        seeds = [
            (2026, 'Cuti Bersama Idul Fitri', '2026-03-20'),
            (2026, 'Cuti Bersama Idul Fitri', '2026-03-23'),
            (2026, 'Cuti Bersama Idul Fitri', '2026-03-24'),
            (2026, 'Cuti Bersama Natal',       '2026-12-24'),
        ]
        for yr, name, leave_date in seeds:
            existing = conn.execute(db.text(
                "SELECT id FROM joint_leave_schedules WHERE year = :y AND leave_date = :d"
            ), {"y": yr, "d": leave_date}).fetchone()
            if not existing:
                conn.execute(db.text(
                    "INSERT INTO joint_leave_schedules (year, name, leave_date) VALUES (:y, :n, :d)"
                ), {"y": yr, "n": name, "d": leave_date})

        conn.commit()

    print("✅ Leave management tables created successfully!")
    print("   - leave_entitlements  (+ unique constraint uq_leave_entitlements_user_year)")
    print("   - leave_requests")
    print("   - joint_leave_schedules  (+ unique constraint uq_joint_leave_year_date)")
    print("   - Seeded 4 joint leave entries for 2026")
    print()
    print("Next: set a user as admin in psql:")
    print("  UPDATE users SET role = 'admin' WHERE email = 'your@email.com';")