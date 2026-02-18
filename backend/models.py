from extensions import db
from datetime import datetime

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True)
    password_hash = db.Column(db.String(200))
    role = db.Column(db.String(50), default="engineer")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    report_number = db.Column(db.String(50))
    report_type = db.Column(db.String(50))
    client_name = db.Column(db.String(150))
    project_name = db.Column(db.String(150))
    engineer_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    report_date = db.Column(db.Date)
    status = db.Column(db.String(20), default="draft")
    data_json = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    images = db.relationship("ReportImage", backref="report", lazy=True)


class ReportImage(db.Model):
    __tablename__ = "report_images"

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"))
    file_path = db.Column(db.String(300))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

