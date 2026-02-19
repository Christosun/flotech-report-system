from flask import Blueprint, request, jsonify, send_file, current_app
from extensions import db
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename
from datetime import datetime
import os

catalog_bp = Blueprint('catalog', __name__)

ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.png', '.jpg', '.jpeg'}


class CatalogFile(db.Model):
    __tablename__ = "catalog_files"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(300), nullable=False)
    brand = db.Column(db.String(100))
    model_series = db.Column(db.String(200))
    document_type = db.Column(db.String(30), default="catalog")
    description = db.Column(db.Text)
    tags = db.Column(db.String(500))
    filename = db.Column(db.String(300))
    file_path = db.Column(db.String(500))
    file_size = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def file_to_dict(f):
    return {
        "id": f.id, "title": f.title, "brand": f.brand,
        "model_series": f.model_series, "document_type": f.document_type,
        "description": f.description, "tags": f.tags,
        "filename": f.filename, "file_size": f.file_size,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


@catalog_bp.route('/list', methods=['GET'])
@jwt_required()
def list_files():
    files = CatalogFile.query.order_by(CatalogFile.created_at.desc()).all()
    return jsonify([file_to_dict(f) for f in files]), 200


@catalog_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"File type not allowed: {ext}"}), 400

    # Save to catalog subfolder
    catalog_folder = os.path.join(current_app.config["UPLOAD_FOLDER"], "catalog")
    os.makedirs(catalog_folder, exist_ok=True)

    filename = secure_filename(file.filename)
    # Add timestamp to avoid collision
    base, extension = os.path.splitext(filename)
    filename = f"{base}_{int(datetime.utcnow().timestamp())}{extension}"
    file_path = os.path.join(catalog_folder, filename)
    file.save(file_path)

    file_size = os.path.getsize(file_path)

    cf = CatalogFile(
        title=request.form.get("title", filename),
        brand=request.form.get("brand"),
        model_series=request.form.get("model_series"),
        document_type=request.form.get("document_type", "catalog"),
        description=request.form.get("description"),
        tags=request.form.get("tags"),
        filename=filename,
        file_path=file_path,
        file_size=file_size,
    )
    db.session.add(cf)
    db.session.commit()

    return jsonify({"message": "File uploaded", "id": cf.id}), 201


@catalog_bp.route('/download/<int:fid>', methods=['GET'])
@jwt_required()
def download_file(fid):
    cf = CatalogFile.query.get(fid)
    if not cf: return jsonify({"error": "Not found"}), 404
    if not os.path.exists(cf.file_path):
        return jsonify({"error": "File not found on server"}), 404
    return send_file(cf.file_path, as_attachment=True, download_name=cf.filename)


@catalog_bp.route('/delete/<int:fid>', methods=['DELETE'])
@jwt_required()
def delete_file(fid):
    cf = CatalogFile.query.get(fid)
    if not cf: return jsonify({"error": "Not found"}), 404
    # Delete physical file
    try:
        if os.path.exists(cf.file_path):
            os.remove(cf.file_path)
    except Exception:
        pass
    db.session.delete(cf)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
