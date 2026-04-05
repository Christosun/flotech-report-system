"""
backend/routes/notification.py
Notification & Activity Feed — PT Flotech Controls Indonesia
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User
from datetime import datetime

notification_bp = Blueprint("notification", __name__)

# ── Model (tambahkan ke backend/models.py) ────────────────────────────────────
"""
TAMBAHKAN CLASS INI KE backend/models.py:

class Notification(db.Model):
    __tablename__ = "notifications"

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    actor_id     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    type         = db.Column(db.String(50))   # quotation_created, quotation_updated,
                                               # report_created, leave_approved, leave_rejected,
                                               # onsite_created, onsite_approved, general
    title        = db.Column(db.String(200))
    message      = db.Column(db.String(500))
    link         = db.Column(db.String(200))   # e.g. /quotations/123
    is_read      = db.Column(db.Boolean, default=False)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
"""


def _notif_to_dict(n, actor=None):
    return {
        "id":         n.id,
        "user_id":    n.user_id,
        "actor_id":   n.actor_id,
        "actor_name": actor.name if actor else None,
        "type":       n.type,
        "title":      n.title,
        "message":    n.message,
        "link":       n.link,
        "is_read":    n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }


def create_notification(user_id, type, title, message, link=None, actor_id=None):
    """
    Helper function — panggil dari route lain untuk membuat notifikasi.

    Contoh penggunaan di route quotation saat create:
        from routes.notification import create_notification
        create_notification(
            user_id=target_user_id,
            type="quotation_created",
            title="Quotation Baru Dibuat",
            message=f"SQ2603001 untuk PT Freeport Indonesia",
            link="/quotations/123",
            actor_id=current_user_id
        )
    """
    from models import Notification
    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        title=title,
        message=message,
        link=link,
        is_read=False,
    )
    db.session.add(notif)
    db.session.commit()
    return notif


def broadcast_notification(exclude_user_id, type, title, message, link=None, actor_id=None):
    """Kirim notifikasi ke semua user kecuali actor sendiri."""
    from models import Notification
    users = User.query.filter(User.id != exclude_user_id).all()
    for u in users:
        notif = Notification(
            user_id=u.id,
            actor_id=actor_id,
            type=type,
            title=title,
            message=message,
            link=link,
            is_read=False,
        )
        db.session.add(notif)
    db.session.commit()


# ── GET semua notifikasi milik user yang login ────────────────────────────────
@notification_bp.route("/list", methods=["GET"])
@jwt_required()
def get_notifications():
    from models import Notification
    user_id = int(get_jwt_identity())
    limit   = request.args.get("limit", 30, type=int)

    notifs = (
        Notification.query
        .filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for n in notifs:
        actor = User.query.get(n.actor_id) if n.actor_id else None
        result.append(_notif_to_dict(n, actor))

    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return jsonify({
        "notifications": result,
        "unread_count":  unread_count,
    }), 200


# ── GET hanya unread count (polling ringan) ───────────────────────────────────
@notification_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def get_unread_count():
    from models import Notification
    user_id = int(get_jwt_identity())
    count   = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({"unread_count": count}), 200


# ── Mark satu notifikasi sebagai read ────────────────────────────────────────
@notification_bp.route("/read/<int:notif_id>", methods=["PUT"])
@jwt_required()
def mark_read(notif_id):
    from models import Notification
    user_id = int(get_jwt_identity())
    n = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked as read"}), 200


# ── Mark semua notifikasi sebagai read ───────────────────────────────────────
@notification_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_read():
    from models import Notification
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All marked as read"}), 200


# ── Hapus satu notifikasi ────────────────────────────────────────────────────
@notification_bp.route("/delete/<int:notif_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notif_id):
    from models import Notification
    user_id = int(get_jwt_identity())
    n = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(n)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ── Hapus semua notifikasi yang sudah dibaca ─────────────────────────────────
@notification_bp.route("/clear-read", methods=["DELETE"])
@jwt_required()
def clear_read():
    from models import Notification
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=True).delete()
    db.session.commit()
    return jsonify({"message": "Cleared"}), 200


# ── [ADMIN] Buat notifikasi manual ke semua / user tertentu ──────────────────
@notification_bp.route("/send", methods=["POST"])
@jwt_required()
def send_manual():
    user_id = int(get_jwt_identity())
    me      = User.query.get(user_id)
    if not me or me.role not in ("admin", "manager"):
        return jsonify({"error": "Access denied"}), 403

    data       = request.get_json()
    target_id  = data.get("user_id")   # None = broadcast ke semua
    title      = data.get("title", "")
    message    = data.get("message", "")
    link       = data.get("link")

    if not title or not message:
        return jsonify({"error": "title dan message wajib"}), 400

    if target_id:
        create_notification(
            user_id=target_id,
            type="general",
            title=title,
            message=message,
            link=link,
            actor_id=user_id,
        )
    else:
        broadcast_notification(
            exclude_user_id=user_id,
            type="general",
            title=title,
            message=message,
            link=link,
            actor_id=user_id,
        )

    return jsonify({"message": "Notification sent"}), 201
