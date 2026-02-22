from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from extensions import db, jwt
import os

app = Flask(__name__)
app.config.from_object(Config)

UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max upload

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

CORS(app, resources={r"/api/*": {
    "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

db.init_app(app)
jwt.init_app(app)

import models

@app.route("/")
def home():
    return {"message": "PT Flotech Controls Indonesia — Management System"}

# ── Existing blueprints ──────────────────────────────────────
from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix='/api/auth')

from routes.report import report_bp
app.register_blueprint(report_bp, url_prefix='/api/report')

from routes.engineer import engineer_bp
app.register_blueprint(engineer_bp, url_prefix='/api/engineer')

from routes.quotation import quotation_bp
app.register_blueprint(quotation_bp, url_prefix='/api/quotation')

from routes.stock import stock_bp
app.register_blueprint(stock_bp, url_prefix='/api/stock')

from routes.catalog import catalog_bp
app.register_blueprint(catalog_bp, url_prefix='/api/catalog')

# ── NEW blueprints ───────────────────────────────────────────
from routes.onsite_report import onsite_bp
app.register_blueprint(onsite_bp, url_prefix='/api/onsite')

from routes.surat_serah_terima import surat_bp
app.register_blueprint(surat_bp, url_prefix='/api/surat')

# ── Static uploads ───────────────────────────────────────────
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ── DB init ─────────────────────────────────────────────────
with app.app_context():
    db.create_all()

    # Import new models so tables are created
    from routes.onsite_report import OnsiteReport
    from routes.surat_serah_terima import SuratSerahTerima
    db.create_all()  # create new tables if not exists

    # Create subfolders
    for folder in ["catalog"]:
        path = os.path.join(UPLOAD_FOLDER, folder)
        if not os.path.exists(path):
            os.makedirs(path)

if __name__ == "__main__":
    app.run(debug=True)