from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, time
from sqlalchemy import func, and_, or_
from models import db
from utils.i18n import success_response, error_response, get_message
from models.production import Machine, ShiftProduction, DowntimeRecord
from models.product import Product
from models.hr import Employee
from models.user import User

production_input_bp = Blueprint('production_input', __name__)

# ===============================
# SHIFT PRODUCTION ENDPOINTS
# ===============================

@production_input_bp.route('/shift-productions', methods=['GET'])
@jwt_required()
def get_shift_productions():
    """Get shift production records with filtering"""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        production_date = request.args.get('date')
        machine_id = request.args.get('machine_id', type=int)
        shift = request.args.get('shift')
        
        # Build query
        query = ShiftProduction.query
        
        if production_date:
            query = query.filter(ShiftProduction.production_date == production_date)
        if machine_id:
            query = query.filter(ShiftProduction.machine_id == machine_id)
        if shift:
            query = query.filter(ShiftProduction.shift == shift)
        
        # Paginate results
        productions = query.order_by(ShiftProduction.production_date.desc(), 
                                   ShiftProduction.shift).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format response
        result = []
        for prod in productions.items:
            result.append({
                'id': prod.id,
                'production_date': prod.production_date.isoformat(),
                'shift': prod.shift,
                'shift_start': prod.shift_start.strftime('%H:%M'),
                'shift_end': prod.shift_end.strftime('%H:%M'),
                'machine': {
                    'id': prod.machine.id,
                    'code': prod.machine.code,
                    'name': prod.machine.name
                },
                'product': {
                    'id': prod.product.id,
                    'code': prod.product.code,
                    'name': prod.product.name
                },
                'target_quantity': float(prod.target_quantity),
                'actual_quantity': float(prod.actual_quantity),
                'good_quantity': float(prod.good_quantity),
                'reject_quantity': float(prod.reject_quantity),
                'uom': prod.uom,
                'planned_runtime': prod.planned_runtime,
                'actual_runtime': prod.actual_runtime,
                'downtime_minutes': prod.downtime_minutes,
                'quality_rate': float(prod.quality_rate),
                'efficiency_rate': float(prod.efficiency_rate),
                'oee_score': float(prod.oee_score),
                'operator': prod.operator.name if prod.operator else None,
                'supervisor': prod.supervisor.name if prod.supervisor else None,
                'status': prod.status,
                'notes': prod.notes,
                'created_at': prod.created_at.isoformat()
            })
        
        return jsonify({
            'shift_productions': result,
            'total': productions.total,
            'pages': productions.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_input_bp.route('/shift-productions', methods=['POST'])
@jwt_required()
def create_shift_production():
    """Create new shift production record"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['production_date', 'shift', 'machine_id', 'product_id', 
                          'target_quantity', 'actual_quantity', 'good_quantity']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Parse date and time
        production_date = datetime.strptime(data['production_date'], '%Y-%m-%d').date()
        
        # Default shift times
        shift_times = {
            'shift_1': ('07:00', '15:00'),
            'shift_2': ('15:00', '23:00'),
            'shift_3': ('23:00', '07:00')
        }
        
        shift_start_str, shift_end_str = shift_times.get(data['shift'], ('07:00', '15:00'))
        shift_start = datetime.strptime(shift_start_str, '%H:%M').time()
        shift_end = datetime.strptime(shift_end_str, '%H:%M').time()
        
        # Calculate metrics
        reject_quantity = float(data.get('reject_quantity', 0))
        rework_quantity = float(data.get('rework_quantity', 0))
        good_quantity = float(data['good_quantity'])
        actual_quantity = float(data['actual_quantity'])
        target_quantity = float(data['target_quantity'])
        
        # Calculate rates
        quality_rate = (good_quantity / actual_quantity * 100) if actual_quantity > 0 else 0
        efficiency_rate = (actual_quantity / target_quantity * 100) if target_quantity > 0 else 0
        
        planned_runtime = int(data.get('planned_runtime', 480))  # 8 hours default
        actual_runtime = int(data.get('actual_runtime', planned_runtime))
        downtime_minutes = int(data.get('downtime_minutes', 0))
        
        availability_rate = ((planned_runtime - downtime_minutes) / planned_runtime * 100) if planned_runtime > 0 else 0
        oee_score = (availability_rate * efficiency_rate * quality_rate) / 10000
        
        # Create shift production record
        shift_production = ShiftProduction(
            production_date=production_date,
            shift=data['shift'],
            shift_start=shift_start,
            shift_end=shift_end,
            machine_id=data['machine_id'],
            product_id=data['product_id'],
            work_order_id=data.get('work_order_id'),
            target_quantity=target_quantity,
            actual_quantity=actual_quantity,
            good_quantity=good_quantity,
            reject_quantity=reject_quantity,
            rework_quantity=rework_quantity,
            uom=data.get('uom', 'pcs'),
            planned_runtime=planned_runtime,
            actual_runtime=actual_runtime,
            downtime_minutes=downtime_minutes,
            setup_time=int(data.get('setup_time', 0)),
            quality_rate=quality_rate,
            efficiency_rate=efficiency_rate,
            oee_score=oee_score,
            operator_id=data.get('operator_id'),
            supervisor_id=data.get('supervisor_id'),
            notes=data.get('notes'),
            issues=data.get('issues'),
            status=data.get('status', 'completed'),
            created_by=current_user_id
        )
        
        db.session.add(shift_production)
        db.session.commit()
        
        return jsonify({
            'message': 'Shift production record created successfully',
            'id': shift_production.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_input_bp.route('/shift-productions/<int:production_id>', methods=['PUT'])
@jwt_required()
def update_shift_production(production_id):
    """Update shift production record"""
    try:
        data = request.get_json()
        
        shift_production = ShiftProduction.query.get_or_404(production_id)
        
        # Update fields
        if 'actual_quantity' in data:
            shift_production.actual_quantity = float(data['actual_quantity'])
        if 'good_quantity' in data:
            shift_production.good_quantity = float(data['good_quantity'])
        if 'reject_quantity' in data:
            shift_production.reject_quantity = float(data['reject_quantity'])
        if 'rework_quantity' in data:
            shift_production.rework_quantity = float(data['rework_quantity'])
        if 'actual_runtime' in data:
            shift_production.actual_runtime = int(data['actual_runtime'])
        if 'downtime_minutes' in data:
            shift_production.downtime_minutes = int(data['downtime_minutes'])
        if 'notes' in data:
            shift_production.notes = data['notes']
        if 'issues' in data:
            shift_production.issues = data['issues']
        
        # Recalculate metrics
        quality_rate = (shift_production.good_quantity / shift_production.actual_quantity * 100) if shift_production.actual_quantity > 0 else 0
        efficiency_rate = (shift_production.actual_quantity / shift_production.target_quantity * 100) if shift_production.target_quantity > 0 else 0
        availability_rate = ((shift_production.planned_runtime - shift_production.downtime_minutes) / shift_production.planned_runtime * 100) if shift_production.planned_runtime > 0 else 0
        
        shift_production.quality_rate = quality_rate
        shift_production.efficiency_rate = efficiency_rate
        shift_production.oee_score = (availability_rate * efficiency_rate * quality_rate) / 10000
        
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===============================
# DOWNTIME RECORDS ENDPOINTS
# ===============================

@production_input_bp.route('/downtime-records', methods=['GET'])
@jwt_required()
def get_downtime_records():
    """Get downtime records with filtering"""
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        machine_id = request.args.get('machine_id', type=int)
        downtime_date = request.args.get('date')
        shift_production_id = request.args.get('shift_production_id', type=int)
        
        # Build query
        query = DowntimeRecord.query
        
        if machine_id:
            query = query.filter(DowntimeRecord.machine_id == machine_id)
        if downtime_date:
            query = query.filter(DowntimeRecord.downtime_date == downtime_date)
        if shift_production_id:
            query = query.filter(DowntimeRecord.shift_production_id == shift_production_id)
        
        # Paginate results
        downtimes = query.order_by(DowntimeRecord.start_time.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format response
        result = []
        for dt in downtimes.items:
            result.append({
                'id': dt.id,
                'shift_production_id': dt.shift_production_id,
                'machine': {
                    'id': dt.machine.id,
                    'code': dt.machine.code,
                    'name': dt.machine.name
                },
                'downtime_date': dt.downtime_date.isoformat(),
                'start_time': dt.start_time.isoformat(),
                'end_time': dt.end_time.isoformat() if dt.end_time else None,
                'duration_minutes': dt.duration_minutes,
                'downtime_type': dt.downtime_type,
                'downtime_category': dt.downtime_category,
                'downtime_reason': dt.downtime_reason,
                'root_cause': dt.root_cause,
                'production_loss': float(dt.production_loss) if dt.production_loss else 0,
                'cost_impact': float(dt.cost_impact) if dt.cost_impact else 0,
                'action_taken': dt.action_taken,
                'resolved_by': dt.resolved_by_employee.name if dt.resolved_by_employee else None,
                'status': dt.status,
                'priority': dt.priority,
                'created_at': dt.created_at.isoformat()
            })
        
        return jsonify({
            'downtime_records': result,
            'total': downtimes.total,
            'pages': downtimes.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_input_bp.route('/downtime-records', methods=['POST'])
@jwt_required()
def create_downtime_record():
    """Create new downtime record"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Validate required fields
        required_fields = ['shift_production_id', 'machine_id', 'start_time', 
                          'downtime_type', 'downtime_category', 'downtime_reason']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Parse datetime
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time']) if data.get('end_time') else None
        
        # Calculate duration
        duration_minutes = None
        if end_time:
            duration_minutes = int((end_time - start_time).total_seconds() / 60)
        
        # Create downtime record
        downtime_record = DowntimeRecord(
            shift_production_id=data['shift_production_id'],
            machine_id=data['machine_id'],
            downtime_date=start_time.date(),
            start_time=start_time,
            end_time=end_time,
            duration_minutes=duration_minutes,
            downtime_type=data['downtime_type'],
            downtime_category=data['downtime_category'],
            downtime_reason=data['downtime_reason'],
            root_cause=data.get('root_cause'),
            production_loss=float(data.get('production_loss', 0)),
            cost_impact=float(data.get('cost_impact', 0)),
            action_taken=data.get('action_taken'),
            resolved_by=data.get('resolved_by'),
            prevention_action=data.get('prevention_action'),
            status=data.get('status', 'open'),
            priority=data.get('priority', 'medium'),
            reported_by=current_user_id
        )
        
        db.session.add(downtime_record)
        
        # Update shift production downtime minutes
        if duration_minutes:
            shift_production = ShiftProduction.query.get(data['shift_production_id'])
            if shift_production:
                shift_production.downtime_minutes += duration_minutes
                
                # Recalculate OEE
                availability_rate = ((shift_production.planned_runtime - shift_production.downtime_minutes) / shift_production.planned_runtime * 100) if shift_production.planned_runtime > 0 else 0
                shift_production.oee_score = (availability_rate * shift_production.efficiency_rate * shift_production.quality_rate) / 10000
        
        db.session.commit()
        
        return jsonify({
            'message': 'Downtime record created successfully',
            'id': downtime_record.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===============================
# HELPER ENDPOINTS
# ===============================

@production_input_bp.route('/machines/active', methods=['GET'])
@jwt_required()
def get_active_machines():
    """Get list of active machines for production input"""
    try:
        machines = Machine.query.filter_by(is_active=True).order_by(Machine.name).all()
        
        result = []
        for machine in machines:
            result.append({
                'id': machine.id,
                'code': machine.code,
                'name': machine.name,
                'machine_type': machine.machine_type,
                'capacity_per_hour': float(machine.capacity_per_hour) if machine.capacity_per_hour else None,
                'capacity_uom': machine.capacity_uom
            })
        
        return jsonify({'machines': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_input_bp.route('/products/active', methods=['GET'])
@jwt_required()
def get_active_products():
    """Get list of active products for production input"""
    try:
        products = Product.query.filter_by(is_active=True).order_by(Product.name).all()
        
        result = []
        for product in products:
            result.append({
                'id': product.id,
                'code': product.code,
                'name': product.name,
                'uom': product.uom,
                'category': product.category
            })
        
        return jsonify({'products': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_input_bp.route('/employees/operators', methods=['GET'])
@jwt_required()
def get_operators():
    """Get list of operators for production input"""
    try:
        operators = Employee.query.filter_by(is_active=True).filter(
            Employee.position.like('%operator%')
        ).order_by(Employee.name).all()
        
        result = []
        for emp in operators:
            result.append({
                'id': emp.id,
                'employee_id': emp.employee_id,
                'name': emp.name,
                'position': emp.position,
                'department': emp.department
            })
        
        return jsonify({'operators': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
