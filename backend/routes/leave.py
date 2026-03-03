"""
backend/routes/leave.py
Leave Management System — PT Flotech Controls Indonesia

Add to backend/models.py:
    from routes.leave import leave_bp
    app.register_blueprint(leave_bp, url_prefix='/api/leave')

Also add these models to backend/models.py
"""
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User
from datetime import datetime, date
from io import BytesIO
import json

leave_bp = Blueprint('leave', __name__)

# ─────────────────────────────────────────────────────────────────────────────
# ADD THESE MODELS TO backend/models.py
# ─────────────────────────────────────────────────────────────────────────────
"""
class LeaveEntitlement(db.Model):
    __tablename__ = "leave_entitlements"
    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    year          = db.Column(db.Integer, nullable=False)
    entitlement_days  = db.Column(db.Integer, default=12)
    joint_leave_days  = db.Column(db.Integer, default=0)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"
    id              = db.Column(db.Integer, primary_key=True)
    request_number  = db.Column(db.String(50), unique=True)
    user_id         = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    leave_type      = db.Column(db.String(50))   # annual/sick/emergency/marriage/maternity/paternity/bereavement
    reason          = db.Column(db.String(500))
    start_date      = db.Column(db.Date, nullable=False)
    end_date        = db.Column(db.Date)
    total_days      = db.Column(db.Integer, default=1)
    status          = db.Column(db.String(20), default="pending")  # pending/approved/rejected
    approved_by     = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approved_at     = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(500))
    is_joint_leave  = db.Column(db.Boolean, default=False)
    notes           = db.Column(db.Text)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class JointLeaveSchedule(db.Model):
    __tablename__ = "joint_leave_schedules"
    id          = db.Column(db.Integer, primary_key=True)
    year        = db.Column(db.Integer, nullable=False)
    name        = db.Column(db.String(200), nullable=False)
    leave_date  = db.Column(db.Date, nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
"""

# Import after adding to models.py
# from models import LeaveRequest, LeaveEntitlement, JointLeaveSchedule

def calc_working_days(start: date, end: date) -> int:
    """Count working days between two dates (Monday-Friday)."""
    count = 0
    cur = start
    while cur <= end:
        if cur.weekday() < 5:
            count += 1
        from datetime import timedelta
        cur += timedelta(days=1)
    return max(count, 1)

def gen_request_number(user_id: int) -> str:
    now = datetime.utcnow()
    return f"LV-{now.strftime('%Y%m%d')}-{user_id:04d}{now.strftime('%H%M')}"

def request_to_dict(r, approved_by_user=None):
    return {
        "id": r.id,
        "request_number": r.request_number,
        "user_id": r.user_id,
        "leave_type": r.leave_type,
        "reason": r.reason,
        "start_date": r.start_date.isoformat() if r.start_date else None,
        "end_date": r.end_date.isoformat() if r.end_date else None,
        "total_days": r.total_days,
        "status": r.status,
        "approved_by": r.approved_by,
        "approved_by_name": approved_by_user.name if approved_by_user else None,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "rejection_reason": r.rejection_reason,
        "is_joint_leave": r.is_joint_leave,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# LEAVE REQUESTS
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route('/requests', methods=['GET'])
@jwt_required()
def get_my_requests():
    """Get leave requests for current user."""
    from models import LeaveRequest
    user_id = int(get_jwt_identity())
    year = request.args.get('year', datetime.utcnow().year, type=int)
    reqs = LeaveRequest.query.filter_by(user_id=user_id).order_by(LeaveRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        approver = User.query.get(r.approved_by) if r.approved_by else None
        result.append(request_to_dict(r, approver))
    return jsonify(result), 200


@leave_bp.route('/requests/all', methods=['GET'])
@jwt_required()
def get_all_requests():
    """Admin: get all employees' leave requests."""
    from models import LeaveRequest
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "manager", "hr"):
        return jsonify({"error": "Access denied"}), 403

    reqs = LeaveRequest.query.order_by(LeaveRequest.created_at.desc()).all()
    result = []
    for r in reqs:
        requester = User.query.get(r.user_id)
        approver = User.query.get(r.approved_by) if r.approved_by else None
        d = request_to_dict(r, approver)
        d["requester_name"] = requester.name if requester else None
        result.append(d)
    return jsonify(result), 200


@leave_bp.route('/requests/pending', methods=['GET'])
@jwt_required()
def get_pending_requests():
    """Admin: get pending leave requests."""
    from models import LeaveRequest
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "manager", "hr"):
        return jsonify({"error": "Access denied"}), 403

    reqs = LeaveRequest.query.filter_by(status="pending").order_by(LeaveRequest.created_at.asc()).all()
    result = []
    for r in reqs:
        requester = User.query.get(r.user_id)
        d = request_to_dict(r)
        d["requester_name"] = requester.name if requester else None
        result.append(d)
    return jsonify(result), 200


@leave_bp.route('/request/create', methods=['POST'])
@jwt_required()
def create_request():
    from models import LeaveRequest, LeaveEntitlement
    user_id = int(get_jwt_identity())
    data = request.get_json()

    start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    end = datetime.strptime(data.get('end_date', data['start_date']), '%Y-%m-%d').date()
    total_days = calc_working_days(start, end)

    # Check annual leave balance for annual leave type
    if data.get('leave_type') == 'annual':
        year = start.year
        entitlement = LeaveEntitlement.query.filter_by(user_id=user_id, year=year).first()
        entitlement_days = entitlement.entitlement_days if entitlement else 12
        joint_days = entitlement.joint_leave_days if entitlement else 0

        taken = db.session.query(db.func.sum(LeaveRequest.total_days)).filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.leave_type == 'annual',
            LeaveRequest.status == 'approved',
            LeaveRequest.is_joint_leave == False,
            db.extract('year', LeaveRequest.start_date) == year
        ).scalar() or 0

        balance = entitlement_days - taken - joint_days
        if total_days > balance:
            return jsonify({"error": f"Insufficient leave balance. Balance: {balance} days, Requested: {total_days} days"}), 400

    new_req = LeaveRequest(
        request_number=gen_request_number(user_id),
        user_id=user_id,
        leave_type=data.get('leave_type', 'annual'),
        reason=data.get('reason', ''),
        start_date=start,
        end_date=end,
        total_days=total_days,
        status='pending',
        is_joint_leave=data.get('is_joint_leave', False),
        notes=data.get('notes', ''),
    )
    db.session.add(new_req)
    db.session.commit()
    return jsonify({"message": "Leave request submitted", "id": new_req.id, "request_number": new_req.request_number}), 201


@leave_bp.route('/request/<int:req_id>/approve', methods=['PUT'])
@jwt_required()
def approve_request(req_id):
    from models import LeaveRequest
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "manager", "hr"):
        return jsonify({"error": "Access denied"}), 403

    r = LeaveRequest.query.get(req_id)
    if not r:
        return jsonify({"error": "Request not found"}), 404

    r.status = "approved"
    r.approved_by = user_id
    r.approved_at = datetime.utcnow()
    r.rejection_reason = None
    db.session.commit()
    return jsonify({"message": "Leave request approved"}), 200


@leave_bp.route('/request/<int:req_id>/reject', methods=['PUT'])
@jwt_required()
def reject_request(req_id):
    from models import LeaveRequest
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "manager", "hr"):
        return jsonify({"error": "Access denied"}), 403

    r = LeaveRequest.query.get(req_id)
    if not r:
        return jsonify({"error": "Request not found"}), 404

    data = request.get_json()
    reason = data.get("rejection_reason", "")
    if not reason:
        return jsonify({"error": "Rejection reason is required"}), 400

    r.status = "rejected"
    r.approved_by = user_id
    r.approved_at = datetime.utcnow()
    r.rejection_reason = reason
    db.session.commit()
    return jsonify({"message": "Leave request rejected"}), 200


@leave_bp.route('/request/<int:req_id>', methods=['DELETE'])
@jwt_required()
def delete_request(req_id):
    from models import LeaveRequest
    user_id = int(get_jwt_identity())
    r = LeaveRequest.query.get(req_id)
    if not r:
        return jsonify({"error": "Request not found"}), 404
    if r.user_id != user_id and r.status != "pending":
        return jsonify({"error": "Cannot delete approved/rejected request"}), 400
    db.session.delete(r)
    db.session.commit()
    return jsonify({"message": "Request deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# LEAVE BALANCE / SUMMARY
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    from models import LeaveRequest, LeaveEntitlement, JointLeaveSchedule
    user_id = int(get_jwt_identity())
    year = request.args.get('year', datetime.utcnow().year, type=int)

    entitlement = LeaveEntitlement.query.filter_by(user_id=user_id, year=year).first()
    entitlement_days = entitlement.entitlement_days if entitlement else 12
    joint_leave_days = entitlement.joint_leave_days if entitlement else 0

    # Count joint leave from schedule
    joint_schedules = JointLeaveSchedule.query.filter_by(year=year).all()
    joint_from_schedule = len(joint_schedules)

    # Approved annual leave taken
    annual_taken = db.session.query(db.func.sum(LeaveRequest.total_days)).filter(
        LeaveRequest.user_id == user_id,
        LeaveRequest.leave_type == 'annual',
        LeaveRequest.status == 'approved',
        LeaveRequest.is_joint_leave == False,
        db.extract('year', LeaveRequest.start_date) == year
    ).scalar() or 0

    balance = entitlement_days - annual_taken - joint_from_schedule

    # Leave by type
    by_type = {}
    all_approved = LeaveRequest.query.filter(
        LeaveRequest.user_id == user_id,
        LeaveRequest.status == 'approved',
        db.extract('year', LeaveRequest.start_date) == year
    ).all()
    for r in all_approved:
        lt = r.leave_type
        if lt not in by_type:
            by_type[lt] = {"count": 0, "days": 0}
        by_type[lt]["count"] += 1
        by_type[lt]["days"] += r.total_days

    return jsonify({
        "year": year,
        "entitlement": entitlement_days,
        "joint_leave": joint_from_schedule,
        "annual_taken": annual_taken,
        "balance": balance,
        "by_type": by_type,
        "joint_schedule": [{"name": j.name, "date": j.leave_date.isoformat()} for j in joint_schedules],
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# JOINT LEAVE SCHEDULE (Admin)
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route('/joint-schedule', methods=['GET'])
@jwt_required()
def get_joint_schedule():
    from models import JointLeaveSchedule
    year = request.args.get('year', datetime.utcnow().year, type=int)
    schedules = JointLeaveSchedule.query.filter_by(year=year).order_by(JointLeaveSchedule.leave_date).all()
    return jsonify([{
        "id": s.id, "year": s.year, "name": s.name,
        "date": s.leave_date.isoformat(),
        "total_days": 1,
    } for s in schedules]), 200


@leave_bp.route('/joint-schedule/create', methods=['POST'])
@jwt_required()
def create_joint_schedule():
    from models import JointLeaveSchedule
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "hr"):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    s = JointLeaveSchedule(
        year=data.get('year', datetime.utcnow().year),
        name=data.get('name'),
        leave_date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify({"message": "Joint leave schedule created", "id": s.id}), 201


@leave_bp.route('/joint-schedule/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_joint_schedule(sid):
    from models import JointLeaveSchedule
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "hr"):
        return jsonify({"error": "Access denied"}), 403

    s = JointLeaveSchedule.query.get(sid)
    if not s:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# ENTITLEMENT (Admin)
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route('/entitlement/<int:target_user_id>', methods=['PUT'])
@jwt_required()
def update_entitlement(target_user_id):
    from models import LeaveEntitlement
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role not in ("admin", "hr"):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    year = data.get('year', datetime.utcnow().year)
    ent = LeaveEntitlement.query.filter_by(user_id=target_user_id, year=year).first()
    if not ent:
        ent = LeaveEntitlement(user_id=target_user_id, year=year)
        db.session.add(ent)

    ent.entitlement_days = data.get('entitlement_days', 12)
    ent.joint_leave_days = data.get('joint_leave_days', 0)
    db.session.commit()
    return jsonify({"message": "Entitlement updated"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# EXPORT (Excel CSV & PDF trigger)
# ─────────────────────────────────────────────────────────────────────────────

@leave_bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    from models import LeaveRequest, JointLeaveSchedule, LeaveEntitlement
    user_id = int(get_jwt_identity())
    year = request.args.get('year', datetime.utcnow().year, type=int)
    user = User.query.get(user_id)

    reqs = LeaveRequest.query.filter(
        LeaveRequest.user_id == user_id,
        db.extract('year', LeaveRequest.start_date) == year
    ).order_by(LeaveRequest.start_date).all()

    entitlement_obj = LeaveEntitlement.query.filter_by(user_id=user_id, year=year).first()
    entitlement_days = entitlement_obj.entitlement_days if entitlement_obj else 12
    joint_schedules = JointLeaveSchedule.query.filter_by(year=year).all()
    joint_days = len(joint_schedules)

    lines = [
        f"Annual Leave Recap - {year}",
        f"{user.name}",
        "",
        "Annual Leave Entitlement,Annual Leave Taken,Joint Leave,Annual Leave Balance",
    ]

    annual_taken = sum(r.total_days for r in reqs if r.status == "approved" and r.leave_type == "annual" and not r.is_joint_leave)
    balance = entitlement_days - annual_taken - joint_days
    lines.append(f"{entitlement_days},{annual_taken},{joint_days},{balance}")
    lines.append("")
    lines.append("Reason for Request,Start Date,End Date,Total Days,Type,Status")

    for r in reqs:
        lines.append(f'"{r.reason}",{r.start_date},{r.end_date},{r.total_days},{r.leave_type},{r.status}')

    lines.append("")
    lines.append("Joint Leave Schedule")
    lines.append("Reason,Date,Total Days")
    for j in joint_schedules:
        lines.append(f'"{j.name}",{j.leave_date},1')

    csv_content = "\n".join(lines)
    buf = BytesIO(csv_content.encode('utf-8-sig'))  # BOM for Excel
    buf.seek(0)
    return send_file(
        buf,
        mimetype='text/csv',
        as_attachment=True,
        download_name=f"Leave_Report_{user.name.replace(' ','_')}_{year}.csv"
    )
