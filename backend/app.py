from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from extensions import db, jwt
import os

app = Flask(__name__)
app.config.from_object(Config)

UPLOAD_FOLDER = "uploads"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# ✅ CORS fix: izinkan origin frontend dengan headers & methods lengkap
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
    return {"message": "Flotech Report System Running"}

from routes.auth import auth_bp
app.register_blueprint(auth_bp, url_prefix='/api/auth')

from routes.report import report_bp
app.register_blueprint(report_bp, url_prefix='/api/report')

from routes.engineer import engineer_bp
app.register_blueprint(engineer_bp, url_prefix='/api/engineer')

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True)