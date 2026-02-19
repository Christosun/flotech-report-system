from flask import Blueprint, request, jsonify
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

quotation_bp = Blueprint('quotation', __name__)

# Model inline (atau bisa pisah ke models.py)
from extensions import db

class Quotation(db.Model):
    __tablename__ = "quotations"
    id = db.Column(db.Integer, primary_key=True)
    quotation_number = db.Column(db.String(50), unique=True)
    customer_name = db.Column(db.String(150))
    customer_company = db.Column(db.String(200))
    customer_email = db.Column(db.String(120))
    customer_phone = db.Column(db.String(30))
    customer_address = db.Column(db.Text)
    project_name = db.Column(db.String(200))
    category = db.Column(db.String(100))
    status = db.Column(db.String(30), default="draft")
    valid_until = db.Column(db.Date)
    currency = db.Column(db.String(10), default="IDR")
    total_amount = db.Column(db.Float, default=0)
    notes = db.Column(db.Text)
    terms = db.Column(db.Text)
    items = db.Column(db.JSON)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


@quotation_bp.route('/list', methods=['GET'])
@jwt_required()
def list_quotations():
    qs = Quotation.query.order_by(Quotation.created_at.desc()).all()
    result = []
    for q in qs:
        result.append({
            "id": q.id, "quotation_number": q.quotation_number,
            "customer_name": q.customer_name, "customer_company": q.customer_company,
            "customer_email": q.customer_email, "customer_phone": q.customer_phone,
            "project_name": q.project_name, "category": q.category,
            "status": q.status, "valid_until": q.valid_until.isoformat() if q.valid_until else None,
            "total_amount": q.total_amount, "created_at": q.created_at.isoformat() if q.created_at else None,
        })
    return jsonify(result), 200


@quotation_bp.route('/detail/<int:qid>', methods=['GET'])
@jwt_required()
def get_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": q.id, "quotation_number": q.quotation_number,
        "customer_name": q.customer_name, "customer_company": q.customer_company,
        "customer_email": q.customer_email, "customer_phone": q.customer_phone,
        "customer_address": q.customer_address, "project_name": q.project_name,
        "category": q.category, "status": q.status,
        "valid_until": q.valid_until.isoformat() if q.valid_until else None,
        "total_amount": q.total_amount, "notes": q.notes, "terms": q.terms,
        "items": q.items, "created_at": q.created_at.isoformat() if q.created_at else None,
    }), 200


@quotation_bp.route('/create', methods=['POST'])
@jwt_required()
def create_quotation():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if Quotation.query.filter_by(quotation_number=data.get("quotation_number")).first():
        return jsonify({"error": "Nomor quotation sudah ada"}), 400

    valid_until = None
    if data.get("valid_until"):
        try: valid_until = datetime.strptime(data["valid_until"], "%Y-%m-%d").date()
        except: pass

    q = Quotation(
        quotation_number=data.get("quotation_number"),
        customer_name=data.get("customer_name"),
        customer_company=data.get("customer_company"),
        customer_email=data.get("customer_email"),
        customer_phone=data.get("customer_phone"),
        customer_address=data.get("customer_address"),
        project_name=data.get("project_name"),
        category=data.get("category"),
        valid_until=valid_until,
        currency=data.get("currency", "IDR"),
        total_amount=data.get("total_amount", 0),
        notes=data.get("notes"),
        terms=data.get("terms"),
        items=data.get("items", []),
        created_by=user_id,
    )
    db.session.add(q)
    db.session.commit()
    return jsonify({"message": "Quotation created", "id": q.id}), 201


@quotation_bp.route('/status/<int:qid>', methods=['PUT'])
@jwt_required()
def update_status(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    q.status = data.get("status", q.status)
    q.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Status updated"}), 200


@quotation_bp.route('/delete/<int:qid>', methods=['DELETE'])
@jwt_required()
def delete_quotation(qid):
    q = Quotation.query.get(qid)
    if not q: return jsonify({"error": "Not found"}), 404
    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
