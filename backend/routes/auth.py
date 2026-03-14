from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint('auth', __name__)

# ── REGISTER ──────────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.get_json()
    username = (data.get('username') or '').strip().lower()
    name     = data.get('name') or username
    password = data.get('password')

    if not username:
        return jsonify({"message": "Username wajib diisi"}), 400
    if not password or len(password) < 6:
        return jsonify({"message": "Password minimal 6 karakter"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username sudah digunakan"}), 400

    new_user = User(
        name=name,
        username=username,
        email=data.get('email') or None,   # email opsional
        password_hash=generate_password_hash(password),
        role=data.get('role', 'engineer'),
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


# ── LOGIN — pakai username ─────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"message": "Username dan password harus diisi"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Username atau password salah"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": access_token,
        "name":         user.name,
        "username":     user.username,
        "role":         user.role or "engineer",
        "id":           user.id,
    }), 200


# ── GET CURRENT USER ──────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    eng = user.engineer_profile
    return jsonify({
        "id":         user.id,
        "name":       user.name,
        "username":   user.username,
        "role":       user.role or "engineer",
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "engineer": {
            "id":               eng.id,
            "employee_id":      eng.employee_id,
            "position":         eng.position,
            "department":       eng.department,
            "phone":            eng.phone,
            "specialization":   eng.specialization,
            "years_experience": eng.years_experience,
            "certification":    eng.certification,
        } if eng else None,
    }), 200


# ── UPDATE PROFILE ────────────────────────────────────────────────────────────
@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()

    # Update display name
    if data.get('name') and data['name'].strip():
        user.name = data['name'].strip()

    # Update username (harus unik)
    if data.get('username') and data['username'].strip():
        new_uname = data['username'].strip().lower()
        existing  = User.query.filter_by(username=new_uname).first()
        if existing and existing.id != user_id:
            return jsonify({"error": "Username sudah digunakan akun lain"}), 400
        user.username = new_uname

    # Ganti password
    if data.get('new_password'):
        if not data.get('current_password'):
            return jsonify({"error": "Password lama harus diisi"}), 400
        if not check_password_hash(user.password_hash, data['current_password']):
            return jsonify({"error": "Password lama salah"}), 400
        if len(data['new_password']) < 6:
            return jsonify({"error": "Password baru minimal 6 karakter"}), 400
        user.password_hash = generate_password_hash(data['new_password'])

    db.session.commit()
    return jsonify({
        "message":  "Profil berhasil diperbarui",
        "name":     user.name,
        "username": user.username,
        "role":     user.role or "engineer",
    }), 200

# UPDATE list_users — semua authenticated user bisa lihat, tapi detail terbatas
@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    user_id = int(get_jwt_identity())
    me      = User.query.get(user_id)
    if not me:
        return jsonify({"error": "Access denied"}), 403

    users = User.query.order_by(User.name).all()
    return jsonify([{
        "id":       u.id,
        "name":     u.name,
        "username": u.username,
        "role":     u.role or "engineer",
    } for u in users]), 200

# ── CREATE USER (Admin only) ──────────────────────────────────────────────────
@auth_bp.route('/users/create', methods=['POST'])
@jwt_required()
def create_user():
    user_id = int(get_jwt_identity())
    me      = User.query.get(user_id)
    if not me or me.role != "admin":
        return jsonify({"error": "Access denied — admin only"}), 403

    data     = request.get_json()
    username = (data.get('username') or '').strip().lower()
    name     = (data.get('name') or '').strip()
    email    = (data.get('email') or '').strip() or None
    password = data.get('password') or ''
    role     = data.get('role', 'engineer')

    if not username:
        return jsonify({"error": "Username wajib diisi"}), 400
    if not name:
        return jsonify({"error": "Nama lengkap wajib diisi"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password minimal 6 karakter"}), 400
    if role not in ("admin", "engineer", "manager", "hr"):
        return jsonify({"error": "Role tidak valid"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": f"Username '{username}' sudah digunakan"}), 400

    new_user = User(
        name=name,
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({
        "message":  f"User '{username}' berhasil dibuat",
        "id":       new_user.id,
        "name":     new_user.name,
        "username": new_user.username,
        "role":     new_user.role,
    }), 201


# ── DELETE USER (Admin only) ──────────────────────────────────────────────────
@auth_bp.route('/users/delete/<int:uid>', methods=['DELETE'])
@jwt_required()
def delete_user(uid):
    user_id = int(get_jwt_identity())
    me      = User.query.get(user_id)
    if not me or me.role != "admin":
        return jsonify({"error": "Access denied — admin only"}), 403
    if uid == user_id:
        return jsonify({"error": "Tidak bisa menghapus akun sendiri"}), 400

    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User tidak ditemukan"}), 404

    db.session.delete(target)
    db.session.commit()
    return jsonify({"message": f"User '{target.username}' berhasil dihapus"}), 200


# ── UPDATE USER ROLE (Admin only) ─────────────────────────────────────────────
@auth_bp.route('/users/update/<int:uid>', methods=['PUT'])
@jwt_required()
def update_user(uid):
    user_id = int(get_jwt_identity())
    me      = User.query.get(user_id)
    if not me or me.role != "admin":
        return jsonify({"error": "Access denied — admin only"}), 403

    target = User.query.get(uid)
    if not target:
        return jsonify({"error": "User tidak ditemukan"}), 404

    data = request.get_json()
    if data.get('role') and data['role'] in ("admin", "engineer", "manager", "hr"):
        target.role = data['role']
    if data.get('name') and data['name'].strip():
        target.name = data['name'].strip()
    # Reset password jika dikirim
    if data.get('new_password') and len(data['new_password']) >= 6:
        target.password_hash = generate_password_hash(data['new_password'])

    db.session.commit()
    return jsonify({
        "message":  "User berhasil diperbarui",
        "id":       target.id,
        "name":     target.name,
        "username": target.username,
        "role":     target.role,
    }), 200