from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Employee, Department, ShiftSchedule, Attendance, Leave, EmployeeRoster
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime

hr_bp = Blueprint('hr', __name__)

@hr_bp.route('/employees', methods=['GET'])
@jwt_required()
def get_employees():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        employees = Employee.query.filter_by(is_active=True).paginate(page=page, per_page=per_page)
        
        return jsonify({
            'employees': [{
                'id': e.id,
                'employee_number': e.employee_number,
                'full_name': e.full_name,
                'department': e.department.name if e.department else None,
                'position': e.position,
                'employment_type': e.employment_type,
                'status': e.status
            } for e in employees.items],
            'total': employees.total
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/employees', methods=['POST'])
@jwt_required()
def create_employee():
    try:
        data = request.get_json()
        
        employee = Employee(
            employee_number=data['employee_number'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            full_name=f"{data['first_name']} {data['last_name']}",
            email=data.get('email'),
            phone=data.get('phone'),
            date_of_birth=datetime.fromisoformat(data['date_of_birth']) if data.get('date_of_birth') else None,
            gender=data.get('gender'),
            department_id=data.get('department_id'),
            position=data.get('position'),
            employment_type=data.get('employment_type'),
            hire_date=datetime.fromisoformat(data['hire_date']) if data.get('hire_date') else None
        )
        
        db.session.add(employee)
        db.session.commit()
        return jsonify({'message': 'Employee created', 'employee_id': employee.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/departments', methods=['GET'])
@jwt_required()
def get_departments():
    try:
        departments = Department.query.filter_by(is_active=True).all()
        return jsonify({
            'departments': [{
                'id': d.id,
                'code': d.code,
                'name': d.name,
                'employee_count': len(d.employees)
            } for d in departments]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/shifts', methods=['GET'])
@jwt_required()
def get_shifts():
    try:
        shifts = ShiftSchedule.query.filter_by(is_active=True).all()
        return jsonify({
            'shifts': [{
                'id': s.id,
                'name': s.name,
                'shift_type': s.shift_type,
                'start_time': s.start_time.isoformat(),
                'end_time': s.end_time.isoformat(),
                'color_code': s.color_code
            } for s in shifts]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/attendance', methods=['POST'])
@jwt_required()
def record_attendance():
    try:
        data = request.get_json()
        
        attendance = Attendance(
            employee_id=data['employee_id'],
            attendance_date=datetime.fromisoformat(data['attendance_date']),
            shift_id=data.get('shift_id'),
            clock_in=datetime.fromisoformat(data['clock_in']) if data.get('clock_in') else None,
            clock_out=datetime.fromisoformat(data['clock_out']) if data.get('clock_out') else None,
            status=data.get('status', 'present'),
            worked_hours=data.get('worked_hours', 0)
        )
        
        db.session.add(attendance)
        db.session.commit()
        return jsonify(success_response('api.success')), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/leaves', methods=['GET'])
@jwt_required()
def get_leaves():
    try:
        leaves = Leave.query.order_by(Leave.start_date.desc()).all()
        return jsonify({
            'leaves': [{
                'id': l.id,
                'leave_number': l.leave_number,
                'employee_name': l.employee.full_name,
                'leave_type': l.leave_type,
                'start_date': l.start_date.isoformat(),
                'end_date': l.end_date.isoformat(),
                'total_days': l.total_days,
                'status': l.status
            } for l in leaves]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/leaves', methods=['POST'])
@jwt_required()
def create_leave():
    try:
        data = request.get_json()
        
        leave_number = generate_number('LV', Leave, 'leave_number')
        
        leave = Leave(
            leave_number=leave_number,
            employee_id=data['employee_id'],
            leave_type=data['leave_type'],
            start_date=datetime.fromisoformat(data['start_date']),
            end_date=datetime.fromisoformat(data['end_date']),
            total_days=data['total_days'],
            reason=data.get('reason')
        )
        
        db.session.add(leave)
        db.session.commit()
        return jsonify({'message': 'Leave request created', 'leave_id': leave.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster', methods=['GET'])
@jwt_required()
def get_roster():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = EmployeeRoster.query
        
        if start_date:
            query = query.filter(EmployeeRoster.roster_date >= datetime.fromisoformat(start_date).date())
        if end_date:
            query = query.filter(EmployeeRoster.roster_date <= datetime.fromisoformat(end_date).date())
        
        rosters = query.all()
        
        return jsonify({
            'rosters': [{
                'id': r.id,
                'employee_id': r.employee_id,
                'employee_name': r.employee.full_name if r.employee else f'Employee {r.employee_id}',
                'shift_id': r.shift_id,
                'shift_name': r.shift.name if r.shift else f'Shift {r.shift_id}',
                'roster_date': r.roster_date.isoformat(),
                'is_off_day': r.is_off_day,
                'machine_id': getattr(r, 'machine_id', None),
                'machine_name': r.machine.name if hasattr(r, 'machine') and r.machine else None,
                'notes': getattr(r, 'notes', None)
            } for r in rosters]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster', methods=['POST'])
@jwt_required()
def create_roster():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        roster = EmployeeRoster(
            employee_id=data['employee_id'],
            shift_id=data['shift_id'],
            roster_date=datetime.fromisoformat(data['roster_date']),
            is_off_day=data.get('is_off_day', False),
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(roster)
        db.session.commit()
        return jsonify(success_response('api.success')), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster/weekly', methods=['GET'])
@jwt_required()
def get_weekly_roster():
    """Get weekly roster view for drag and drop functionality"""
    try:
        # Get week start date (Monday)
        week_start_str = request.args.get('week_start')
        if week_start_str:
            week_start = datetime.fromisoformat(week_start_str).date()
        else:
            # Default to current week Monday
            today = datetime.now().date()
            week_start = today - timedelta(days=today.weekday())

        week_end = week_start + timedelta(days=6)

        # Get all rosters for the week
        rosters = EmployeeRoster.query.filter(
            EmployeeRoster.roster_date.between(week_start, week_end)
        ).all()

        # Get all machines and shifts
        from models import Machine, ShiftSchedule
        machines = Machine.query.filter_by(is_active=True).all()
        shifts = ShiftSchedule.query.all()

        # Get all active employees
        employees = Employee.query.filter_by(is_active=True).all()

        # Structure data for frontend
        roster_data = {}

        for date in [week_start + timedelta(days=i) for i in range(7)]:
            date_str = date.isoformat()
            roster_data[date_str] = {
                'date': date_str,
                'shifts': {}
            }

            for shift in shifts:
                roster_data[date_str]['shifts'][shift.id] = {
                    'shift_id': shift.id,
                    'shift_name': shift.name,
                    'start_time': shift.start_time,
                    'end_time': shift.end_time,
                    'machines': {}
                }

                # Get machines for this shift on this date
                for machine in machines:
                    roster_data[date_str]['shifts'][shift.id]['machines'][machine.id] = {
                        'machine_id': machine.id,
                        'machine_code': machine.code,
                        'machine_name': machine.name,
                        'assigned_employees': []
                    }

        # Assign employees to machines
        for roster in rosters:
            if not roster.is_off_day and roster.machine_id:
                date_str = roster.roster_date.isoformat()
                shift_id = roster.shift_id
                machine_id = roster.machine_id

                if date_str in roster_data and shift_id in roster_data[date_str]['shifts']:
                    if machine_id in roster_data[date_str]['shifts'][shift_id]['machines']:
                        roster_data[date_str]['shifts'][shift_id]['machines'][machine_id]['assigned_employees'].append({
                            'employee_id': roster.employee_id,
                            'employee_name': roster.employee.full_name,
                            'employee_number': roster.employee.employee_number
                        })

        return jsonify({
            'week_start': week_start.isoformat(),
            'week_end': week_end.isoformat(),
            'roster_data': roster_data,
            'employees': [{
                'id': emp.id,
                'employee_number': emp.employee_number,
                'full_name': emp.full_name,
                'department': emp.department.name if emp.department else None
            } for emp in employees],
            'machines': [{
                'id': m.id,
                'code': m.code,
                'name': m.name,
                'machine_type': m.machine_type
            } for m in machines],
            'shifts': [{
                'id': s.id,
                'name': s.name,
                'start_time': s.start_time,
                'end_time': s.end_time
            } for s in shifts]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster/assign', methods=['POST'])
@jwt_required()
def assign_roster():
    """Assign employee to machine and shift for specific date"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        employee_id = data['employee_id']
        machine_id = data['machine_id']
        shift_id = data['shift_id']
        
        # Handle both 'date' and 'roster_date' field names
        date_str = data.get('roster_date') or data.get('date')
        if not date_str:
            return jsonify(error_response('api.error', error_code=400)), 400
        
        # Handle different date formats
        try:
            if len(date_str) == 4:  # Just year like "2025"
                # Default to today's date in that year
                from datetime import date
                today = date.today()
                roster_date = date(int(date_str), today.month, today.day)
            else:
                # Try to parse as ISO format
                roster_date = datetime.fromisoformat(date_str).date()
        except (ValueError, TypeError) as e:
            return jsonify({'error': f'Invalid date format: {date_str}. Use YYYY-MM-DD or YYYY'}), 400
        
        notes = data.get('notes')

        # Check if employee already has assignment for this date
        existing_roster = EmployeeRoster.query.filter_by(
            employee_id=employee_id,
            roster_date=roster_date
        ).first()

        if existing_roster:
            # Update existing roster
            existing_roster.shift_id = shift_id
            existing_roster.machine_id = machine_id
            existing_roster.notes = notes
            existing_roster.is_off_day = False
        else:
            # Create new roster
            roster = EmployeeRoster(
                employee_id=employee_id,
                shift_id=shift_id,
                machine_id=machine_id,
                roster_date=roster_date,
                is_off_day=False,
                notes=notes,
                created_by=user_id
            )
            db.session.add(roster)

        db.session.commit()
        return jsonify(success_response('api.success')), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster/unassign', methods=['POST'])
@jwt_required()
def unassign_roster():
    """Remove employee assignment for specific date"""
    try:
        data = request.get_json()

        employee_id = data['employee_id']
        roster_date = datetime.fromisoformat(data['roster_date']).date()

        roster = EmployeeRoster.query.filter_by(
            employee_id=employee_id,
            roster_date=roster_date
        ).first()

        if roster:
            db.session.delete(roster)
            db.session.commit()
            return jsonify(success_response('api.success')), 200
        else:
            return jsonify(success_response('api.success')), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster/copy-week', methods=['POST'])
@jwt_required()
def copy_weekly_roster():
    """Copy roster assignments from one week to another"""
    try:
        data = request.get_json()
        source_week_start = datetime.fromisoformat(data['source_week_start']).date()
        target_week_start = datetime.fromisoformat(data['target_week_start']).date()

        # Get source week rosters
        source_rosters = EmployeeRoster.query.filter(
            EmployeeRoster.roster_date.between(source_week_start, source_week_start + timedelta(days=6))
        ).all()

        # Calculate day difference
        day_diff = (target_week_start - source_week_start).days

        # Copy rosters to target week
        for roster in source_rosters:
            target_date = roster.roster_date + timedelta(days=day_diff)

            # Check if target roster already exists
            existing = EmployeeRoster.query.filter_by(
                employee_id=roster.employee_id,
                roster_date=target_date
            ).first()

            if not existing:
                new_roster = EmployeeRoster(
                    employee_id=roster.employee_id,
                    shift_id=roster.shift_id,
                    machine_id=roster.machine_id,
                    roster_date=target_date,
                    is_off_day=roster.is_off_day,
                    notes=roster.notes,
                    created_by=get_jwt_identity()
                )
                db.session.add(new_roster)

        db.session.commit()
        return jsonify(success_response('api.success')), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@hr_bp.route('/roster/<int:roster_id>', methods=['DELETE'])
@jwt_required()
def delete_roster_assignment(roster_id):
    try:
        roster = EmployeeRoster.query.get_or_404(roster_id)
        
        db.session.delete(roster)
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
