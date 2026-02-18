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

CORS(app)

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

# ✅ ADD THIS
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == "__main__":
    app.run(debug=True)
