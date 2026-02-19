from flask import Blueprint, request, jsonify
from extensions import db
from flask_jwt_extended import jwt_required
from datetime import datetime

stock_bp = Blueprint('stock', __name__)


class StockUnit(db.Model):
    __tablename__ = "stock_units"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(150))
    serial_number = db.Column(db.String(100))
    asset_tag = db.Column(db.String(100))
    type = db.Column(db.String(100))
    category = db.Column(db.String(20), default="stock")  # stock / demo
    condition = db.Column(db.String(20), default="good")
    status = db.Column(db.String(30), default="available")
    location = db.Column(db.String(200))
    loan_to = db.Column(db.String(200))
    loan_date = db.Column(db.Date)
    return_date = db.Column(db.Date)
    purchase_date = db.Column(db.Date)
    purchase_price = db.Column(db.Float)
    description = db.Column(db.Text)
    remarks = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def parse_date(s):
    if not s: return None
    try: return datetime.strptime(s, "%Y-%m-%d").date()
    except: return None


def unit_to_dict(u):
    return {
        "id": u.id, "name": u.name, "brand": u.brand, "model": u.model,
        "serial_number": u.serial_number, "asset_tag": u.asset_tag,
        "type": u.type, "category": u.category, "condition": u.condition,
        "status": u.status, "location": u.location, "loan_to": u.loan_to,
        "loan_date": u.loan_date.isoformat() if u.loan_date else None,
        "return_date": u.return_date.isoformat() if u.return_date else None,
        "purchase_date": u.purchase_date.isoformat() if u.purchase_date else None,
        "purchase_price": u.purchase_price,
        "description": u.description, "remarks": u.remarks,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


@stock_bp.route('/list', methods=['GET'])
@jwt_required()
def list_units():
    units = StockUnit.query.order_by(StockUnit.created_at.desc()).all()
    return jsonify([unit_to_dict(u) for u in units]), 200


@stock_bp.route('/create', methods=['POST'])
@jwt_required()
def create_unit():
    data = request.get_json()
    u = StockUnit(
        name=data.get("name"), brand=data.get("brand"), model=data.get("model"),
        serial_number=data.get("serial_number"), asset_tag=data.get("asset_tag"),
        type=data.get("type"), category=data.get("category", "stock"),
        condition=data.get("condition", "good"), status=data.get("status", "available"),
        location=data.get("location"), loan_to=data.get("loan_to"),
        loan_date=parse_date(data.get("loan_date")),
        return_date=parse_date(data.get("return_date")),
        purchase_date=parse_date(data.get("purchase_date")),
        purchase_price=data.get("purchase_price"),
        description=data.get("description"), remarks=data.get("remarks"),
    )
    db.session.add(u)
    db.session.commit()
    return jsonify({"message": "Unit created", "id": u.id}), 201


@stock_bp.route('/update/<int:uid>', methods=['PUT'])
@jwt_required()
def update_unit(uid):
    u = StockUnit.query.get(uid)
    if not u: return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    for field in ["name","brand","model","serial_number","asset_tag","type","category",
                  "condition","status","location","loan_to","description","remarks"]:
        if field in data: setattr(u, field, data[field])
    u.loan_date = parse_date(data.get("loan_date"))
    u.return_date = parse_date(data.get("return_date"))
    u.purchase_date = parse_date(data.get("purchase_date"))
    if "purchase_price" in data: u.purchase_price = data["purchase_price"]
    u.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Updated"}), 200


@stock_bp.route('/delete/<int:uid>', methods=['DELETE'])
@jwt_required()
def delete_unit(uid):
    u = StockUnit.query.get(uid)
    if not u: return jsonify({"error": "Not found"}), 404
    db.session.delete(u)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
