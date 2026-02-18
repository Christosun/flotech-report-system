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

    # Engineer profile relation
    engineer_profile = db.relationship("Engineer", backref="user", uselist=False)


class Engineer(db.Model):
    __tablename__ = "engineers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    name = db.Column(db.String(150), nullable=False)
    employee_id = db.Column(db.String(50), unique=True)
    position = db.Column(db.String(100))
    department = db.Column(db.String(100))
    specialization = db.Column(db.String(200))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(30))
    certification = db.Column(db.String(300))
    years_experience = db.Column(db.Integer, default=0)
    signature_data = db.Column(db.Text)  # base64 PNG of signature
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    reports = db.relationship("Report", backref="engineer", lazy=True)


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    report_number = db.Column(db.String(50))
    report_type = db.Column(db.String(50))  # commissioning/investigation/troubleshooting/service
    client_name = db.Column(db.String(150))
    project_name = db.Column(db.String(150))
    engineer_id = db.Column(db.Integer, db.ForeignKey("engineers.id"), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
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