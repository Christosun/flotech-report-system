from flask import Blueprint, request, jsonify
from extensions import db
from models import User
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)

# REGISTER
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already exists"}), 400

    hashed_password = generate_password_hash(password)

    new_user = User(
        name=username,
        email=email,
        password_hash=hashed_password
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


# LOGIN
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,
        "name": user.name
    }), 200

# ─────────────────────────────────────────────────────────────────────────────
# TAMBAHKAN KE backend/routes/auth.py
# (import tambahan di bagian atas file)
# ─────────────────────────────────────────────────────────────────────────────
# from flask_jwt_extended import jwt_required, get_jwt_identity   <-- tambah ini

# GET CURRENT USER PROFILE
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Cari engineer profile yang terhubung
    engineer = user.engineer_profile

    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        # Engineer profile (jika ada)
        "engineer": {
            "id": engineer.id,
            "employee_id": engineer.employee_id,
            "position": engineer.position,
            "department": engineer.department,
            "phone": engineer.phone,
            "specialization": engineer.specialization,
            "years_experience": engineer.years_experience,
        } if engineer else None
    }), 200


# UPDATE CURRENT USER PROFILE
@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()

    # Update name
    if data.get("name"):
        user.name = data["name"]

    # Update email (cek duplikat)
    if data.get("email") and data["email"] != user.email:
        existing = User.query.filter_by(email=data["email"]).first()
        if existing:
            return jsonify({"error": "Email sudah digunakan"}), 400
        user.email = data["email"]

    # Update password
    if data.get("new_password"):
        if not data.get("current_password"):
            return jsonify({"error": "Password lama harus diisi"}), 400
        if not check_password_hash(user.password_hash, data["current_password"]):
            return jsonify({"error": "Password lama salah"}), 400
        user.password_hash = generate_password_hash(data["new_password"])

    db.session.commit()

    return jsonify({
        "message": "Profil berhasil diperbarui",
        "name": user.name,
        "email": user.email
    }), 200