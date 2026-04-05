"""
backend/routes/customer.py
Customer management route for PT Flotech Controls Indonesia
"""
from flask import Blueprint, request, jsonify
from extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

customer_bp = Blueprint('customer', __name__)

class Customer(db.Model):
    __tablename__ = "customers"
    id            = db.Column(db.Integer, primary_key=True)
    company_name  = db.Column(db.String(200), nullable=False)
    address       = db.Column(db.Text)
    phone         = db.Column(db.String(50))
    email         = db.Column(db.String(120))
    industry      = db.Column(db.String(100))
    notes         = db.Column(db.Text)
    created_by    = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def cust_to_dict(c):
    return {
        "id": c.id,
        "company_name": c.company_name,
        "address": c.address,
        "phone": c.phone,
        "email": c.email,
        "industry": c.industry,
        "notes": c.notes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }

@customer_bp.route('/list', methods=['GET'])
@jwt_required()
def list_customers():
    q = request.args.get('q', '').lower()
    qs = Customer.query.order_by(Customer.company_name).all()
    result = [cust_to_dict(c) for c in qs
              if not q or q in (c.company_name or '').lower()
              or q in (c.email or '').lower()]
    return jsonify(result), 200

@customer_bp.route('/create', methods=['POST'])
@jwt_required()
def create_customer():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data.get('company_name'):
        return jsonify({"error": "Nama perusahaan wajib diisi"}), 400
    c = Customer(
        company_name=data['company_name'],
        address=data.get('address'),
        phone=data.get('phone'),
        email=data.get('email'),
        industry=data.get('industry'),
        notes=data.get('notes'),
        created_by=user_id,
    )
    db.session.add(c)
    db.session.commit()
    return jsonify({"message": "Customer berhasil ditambahkan", "id": c.id, "customer": cust_to_dict(c)}), 201

@customer_bp.route('/update/<int:cid>', methods=['PUT'])
@jwt_required()
def update_customer(cid):
    c = Customer.query.get(cid)
    if not c: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for f in ['company_name','address','phone','email','industry','notes']:
        if f in data: setattr(c, f, data[f])
    c.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated", "customer": cust_to_dict(c)}), 200

@customer_bp.route('/delete/<int:cid>', methods=['DELETE'])
@jwt_required()
def delete_customer(cid):
    c = Customer.query.get(cid)
    if not c: return jsonify({"error": "Not found"}), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
