from flask import Blueprint, request, jsonify
from extensions import db
from models import Engineer
from flask_jwt_extended import jwt_required
from datetime import datetime

engineer_bp = Blueprint('engineer', __name__)


# GET ALL ENGINEERS
@engineer_bp.route('/', methods=['GET'])
@jwt_required()
def get_engineers():
    engineers = Engineer.query.order_by(Engineer.created_at.desc()).all()
    result = []
    for e in engineers:
        result.append({
            "id": e.id,
            "user_id": e.user_id,
            "name": e.name,
            "employee_id": e.employee_id,
            "position": e.position,
            "department": e.department,
            "specialization": e.specialization,
            "email": e.email,
            "phone": e.phone,
            "certification": e.certification,
            "years_experience": e.years_experience,
            "has_signature": bool(e.signature_data),
            "created_at": e.created_at.isoformat() if e.created_at else None
        })
    return jsonify(result), 200


# GET SINGLE ENGINEER
@engineer_bp.route('/<int:engineer_id>', methods=['GET'])
@jwt_required()
def get_engineer(engineer_id):
    e = Engineer.query.get(engineer_id)
    if not e:
        return jsonify({"error": "Engineer not found"}), 404
    return jsonify({
        "id": e.id,
        "user_id": e.user_id,
        "name": e.name,
        "employee_id": e.employee_id,
        "position": e.position,
        "department": e.department,
        "specialization": e.specialization,
        "email": e.email,
        "phone": e.phone,
        "certification": e.certification,
        "years_experience": e.years_experience,
        "signature_data": e.signature_data,
        "created_at": e.created_at.isoformat() if e.created_at else None
    }), 200


# CREATE ENGINEER
@engineer_bp.route('/create', methods=['POST'])
@jwt_required()
def create_engineer():
    data = request.get_json()

    # check duplicate employee_id
    if data.get("employee_id"):
        existing = Engineer.query.filter_by(employee_id=data["employee_id"]).first()
        if existing:
            return jsonify({"error": "Employee ID already exists"}), 400

    new_eng = Engineer(
        user_id=data.get("user_id"),
        name=data.get("name"),
        employee_id=data.get("employee_id"),
        position=data.get("position"),
        department=data.get("department"),
        specialization=data.get("specialization"),
        email=data.get("email"),
        phone=data.get("phone"),
        certification=data.get("certification"),
        years_experience=data.get("years_experience", 0),
        signature_data=data.get("signature_data")
    )

    db.session.add(new_eng)
    db.session.commit()

    return jsonify({"message": "Engineer created", "id": new_eng.id}), 201


# UPDATE ENGINEER
@engineer_bp.route('/update/<int:engineer_id>', methods=['PUT'])
@jwt_required()
def update_engineer(engineer_id):
    e = Engineer.query.get(engineer_id)
    if not e:
        return jsonify({"error": "Engineer not found"}), 404

    data = request.get_json()
    e.name = data.get("name", e.name)
    e.employee_id = data.get("employee_id", e.employee_id)
    e.position = data.get("position", e.position)
    e.department = data.get("department", e.department)
    e.specialization = data.get("specialization", e.specialization)
    e.email = data.get("email", e.email)
    e.phone = data.get("phone", e.phone)
    e.certification = data.get("certification", e.certification)
    e.years_experience = data.get("years_experience", e.years_experience)
    if data.get("signature_data"):
        e.signature_data = data["signature_data"]
    e.updated_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"message": "Engineer updated"}), 200


# SAVE SIGNATURE
@engineer_bp.route('/signature/<int:engineer_id>', methods=['POST'])
@jwt_required()
def save_signature(engineer_id):
    e = Engineer.query.get(engineer_id)
    if not e:
        return jsonify({"error": "Engineer not found"}), 404

    data = request.get_json()
    e.signature_data = data.get("signature_data")
    e.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Signature saved"}), 200


# DELETE ENGINEER
@engineer_bp.route('/delete/<int:engineer_id>', methods=['DELETE'])
@jwt_required()
def delete_engineer(engineer_id):
    e = Engineer.query.get(engineer_id)
    if not e:
        return jsonify({"error": "Engineer not found"}), 404

    db.session.delete(e)
    db.session.commit()
    return jsonify({"message": "Engineer deleted"}), 200