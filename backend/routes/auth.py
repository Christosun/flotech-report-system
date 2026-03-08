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
    data = request.get_json()
    username = data.get('username')
    email    = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    new_user = User(
        name=username,
        email=email,
        password_hash=generate_password_hash(password),
        role=data.get('role', 'engineer'),   # allow role on register
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201


# ── LOGIN ─────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "name":  user.name,
        "role":  user.role or "engineer",   # ← PENTING: frontend butuh ini
        "email": user.email,
        "id":    user.id,
    }), 200


# ── GET CURRENT USER ─────────────────────────────────────────────────────────
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
        "email":      user.email,
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

    # Name / email
    if 'name' in data and data['name'].strip():
        user.name = data['name'].strip()
    if 'email' in data and data['email'].strip():
        existing = User.query.filter_by(email=data['email'].strip()).first()
        if existing and existing.id != user_id:
            return jsonify({"error": "Email sudah digunakan akun lain"}), 400
        user.email = data['email'].strip()

    # Password change
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
        "message": "Profil berhasil diperbarui",
        "name":    user.name,
        "email":   user.email,
        "role":    user.role or "engineer",
    }), 200


# ── LIST ALL USERS (Admin only) ───────────────────────────────────────────────
@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """Return all users — used by leave admin to set entitlements."""
    user_id = int(get_jwt_identity())
    me      = User.query.get(user_id)
    if not me or me.role not in ("admin", "hr", "manager"):
        return jsonify({"error": "Access denied"}), 403

    users = User.query.order_by(User.name).all()
    return jsonify([{
        "id":    u.id,
        "name":  u.name,
        "email": u.email,
        "role":  u.role or "engineer",
    } for u in users]), 200