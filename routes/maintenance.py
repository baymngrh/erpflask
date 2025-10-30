from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, MaintenanceSchedule, MaintenanceRecord, MaintenanceTask, EquipmentHistory
from models.production import Machine
from models.hr import Employee
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime
from sqlalchemy import func, desc

maintenance_bp = Blueprint('maintenance', __name__)

@maintenance_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_schedules():
    try:
        schedules = MaintenanceSchedule.query.filter_by(is_active=True).all()
        return jsonify({
            'schedules': [{
                'id': s.id,
                'schedule_number': s.schedule_number,
                'machine_name': s.machine.name,
                'maintenance_type': s.maintenance_type,
                'frequency': s.frequency,
                'next_maintenance_date': s.next_maintenance_date.isoformat()
            } for s in schedules]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/schedules', methods=['POST'])
@jwt_required()
def create_schedule():
    try:
        data = request.get_json()
        
        schedule_number = generate_number('MS', MaintenanceSchedule, 'schedule_number')
        
        schedule = MaintenanceSchedule(
            schedule_number=schedule_number,
            machine_id=data['machine_id'],
            maintenance_type=data['maintenance_type'],
            frequency=data['frequency'],
            frequency_value=data['frequency_value'],
            next_maintenance_date=datetime.fromisoformat(data['next_maintenance_date']),
            assigned_to=data.get('assigned_to')
        )
        
        db.session.add(schedule)
        db.session.commit()
        return jsonify({'message': 'Schedule created', 'schedule_id': schedule.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/records', methods=['GET'])
@maintenance_bp.route('/records/', methods=['GET'])
@jwt_required()
def get_records():
    try:
        records = MaintenanceRecord.query.order_by(MaintenanceRecord.maintenance_date.desc()).all()
        return jsonify({
            'records': [{
                'id': r.id,
                'record_number': r.record_number,
                'machine_name': r.machine.name,
                'maintenance_type': r.maintenance_type,
                'maintenance_date': r.maintenance_date.isoformat(),
                'status': r.status,
                'cost': float(r.cost)
            } for r in records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/maintenance', methods=['POST'])
@jwt_required()
def create_maintenance():
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        
        record_number = generate_number('MR', MaintenanceRecord, 'record_number')
        
        record = MaintenanceRecord(
            record_number=record_number,
            machine_id=data['machine_id'],
            maintenance_type=data['maintenance_type'],
            scheduled_date=datetime.fromisoformat(data['scheduled_date']),
            estimated_duration_hours=data.get('estimated_duration_hours'),
            priority=data.get('priority', 'medium'),
            description=data.get('description'),
            assigned_to=data.get('assigned_to'),
            preventive_schedule=data.get('preventive_schedule'),
            cost_estimate=data.get('cost_estimate', 0),
            safety_requirements=data.get('safety_requirements'),
            notes=data.get('notes'),
            status='scheduled',
            created_by=user_id
        )
        
        db.session.add(record)
        db.session.flush()
        
        # Add maintenance tasks
        for task in data.get('tasks', []):
            from models import MaintenanceTask
            maintenance_task = MaintenanceTask(
                maintenance_record_id=record.id,
                task_name=task['task_name'],
                description=task.get('description'),
                estimated_time_hours=task.get('estimated_time_hours'),
                required_parts=task.get('required_parts'),
                status=task.get('status', 'pending')
            )
            db.session.add(maintenance_task)
        
        # Add required parts
        for part in data.get('required_parts', []):
            from models import MaintenancePart
            maintenance_part = MaintenancePart(
                maintenance_record_id=record.id,
                part_name=part['part_name'],
                quantity=part['quantity'],
                unit_cost=part.get('unit_cost', 0),
                supplier=part.get('supplier'),
                availability_status=part.get('availability_status', 'available')
            )
            db.session.add(maintenance_part)
        
        db.session.commit()
        return jsonify({'message': 'Maintenance scheduled successfully', 'record_id': record.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/records', methods=['POST'])
@jwt_required()
def create_record():
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        
        record_number = generate_number('MR', MaintenanceRecord, 'record_number')
        
        record = MaintenanceRecord(
            record_number=record_number,
            machine_id=data['machine_id'],
            maintenance_type=data['maintenance_type'],
            maintenance_date=datetime.utcnow(),
            start_time=datetime.fromisoformat(data['start_time']) if data.get('start_time') else None,
            end_time=datetime.fromisoformat(data['end_time']) if data.get('end_time') else None,
            problem_description=data.get('problem_description'),
            work_performed=data.get('work_performed'),
            cost=data.get('cost', 0),
            performed_by=user_id
        )
        
        db.session.add(record)
        db.session.commit()
        return jsonify({'message': 'Maintenance record created', 'record_id': record.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/records/<int:record_id>', methods=['PATCH'])
@jwt_required()
def update_maintenance_record(record_id):
    try:
        record = MaintenanceRecord.query.get_or_404(record_id)
        data = request.get_json()
        
        # Update fields
        if 'status' in data:
            record.status = data['status']
            
            # Auto-update timestamps based on status
            if data['status'] == 'in_progress' and not record.start_time:
                record.start_time = datetime.utcnow()
            elif data['status'] == 'completed' and not record.end_time:
                record.end_time = datetime.utcnow()
                if record.start_time:
                    duration = record.end_time - record.start_time
                    record.duration_hours = duration.total_seconds() / 3600
        
        if 'work_performed' in data:
            record.work_performed = data['work_performed']
        
        if 'cost' in data:
            record.cost = data['cost']
        
        if 'notes' in data:
            record.notes = data['notes']
        
        record.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/records/<int:record_id>', methods=['GET'])
@jwt_required()
def get_maintenance_record(record_id):
    try:
        record = MaintenanceRecord.query.get_or_404(record_id)
        return jsonify({
            'record': {
                'id': record.id,
                'record_number': record.record_number,
                'machine_id': record.machine_id,
                'machine_name': record.machine.name if record.machine else None,
                'maintenance_type': record.maintenance_type,
                'maintenance_date': record.maintenance_date.isoformat(),
                'start_time': record.start_time.isoformat() if record.start_time else None,
                'end_time': record.end_time.isoformat() if record.end_time else None,
                'duration_hours': float(record.duration_hours) if record.duration_hours else None,
                'downtime_hours': float(record.downtime_hours) if record.downtime_hours else None,
                'status': record.status,
                'problem_description': record.problem_description,
                'work_performed': record.work_performed,
                'parts_used': record.parts_used,
                'cost': float(record.cost) if record.cost else 0,
                'performed_by': record.performed_by,
                'performed_by_name': record.performed_by_user.full_name if record.performed_by_user else None,
                'notes': record.notes,
                'created_at': record.created_at.isoformat(),
                'updated_at': record.updated_at.isoformat()
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_maintenance_stats():
    try:
        # Get basic counts
        total_records = MaintenanceRecord.query.count()
        scheduled = MaintenanceRecord.query.filter_by(status='scheduled').count()
        in_progress = MaintenanceRecord.query.filter_by(status='in_progress').count()
        completed = MaintenanceRecord.query.filter_by(status='completed').count()
        
        # Get overdue count (scheduled items past due date)
        overdue = MaintenanceRecord.query.filter(
            MaintenanceRecord.status == 'scheduled',
            MaintenanceRecord.maintenance_date < datetime.utcnow()
        ).count()
        
        # Calculate total cost
        total_cost_result = db.session.query(db.func.sum(MaintenanceRecord.cost)).scalar()
        total_cost = float(total_cost_result) if total_cost_result else 0
        
        # Calculate average downtime
        avg_downtime_result = db.session.query(db.func.avg(MaintenanceRecord.duration_hours)).scalar()
        avg_downtime = float(avg_downtime_result) if avg_downtime_result else 0
        
        return jsonify({
            'stats': {
                'total_records': total_records,
                'scheduled': scheduled,
                'in_progress': in_progress,
                'completed': completed,
                'overdue': overdue,
                'total_cost': total_cost,
                'avg_downtime': avg_downtime
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/schedules/<int:schedule_id>/generate', methods=['POST'])
@jwt_required()
def generate_maintenance_from_schedule(schedule_id):
    try:
        schedule = MaintenanceSchedule.query.get_or_404(schedule_id)
        user_id = int(get_jwt_identity())
        
        # Generate record number
        record_number = generate_number('MR', MaintenanceRecord, 'record_number')
        
        # Create maintenance record from schedule
        record = MaintenanceRecord(
            record_number=record_number,
            machine_id=schedule.machine_id,
            schedule_id=schedule.id,
            maintenance_type=schedule.maintenance_type,
            maintenance_date=schedule.next_maintenance_date,
            duration_hours=schedule.estimated_duration_hours,
            status='scheduled',
            problem_description=f'Scheduled {schedule.maintenance_type} maintenance',
            performed_by=schedule.assigned_to or user_id,
            notes=f'Generated from schedule {schedule.schedule_number}'
        )
        
        db.session.add(record)
        
        # Update schedule's last maintenance date and calculate next date
        from dateutil.relativedelta import relativedelta
        
        schedule.last_maintenance_date = schedule.next_maintenance_date
        
        # Calculate next maintenance date based on frequency
        next_date = schedule.next_maintenance_date
        if schedule.frequency == 'daily':
            next_date = next_date + relativedelta(days=schedule.frequency_value)
        elif schedule.frequency == 'weekly':
            next_date = next_date + relativedelta(weeks=schedule.frequency_value)
        elif schedule.frequency == 'monthly':
            next_date = next_date + relativedelta(months=schedule.frequency_value)
        elif schedule.frequency == 'quarterly':
            next_date = next_date + relativedelta(months=schedule.frequency_value * 3)
        elif schedule.frequency == 'yearly':
            next_date = next_date + relativedelta(years=schedule.frequency_value)
        
        schedule.next_maintenance_date = next_date
        
        db.session.commit()
        return jsonify({
            'message': 'Maintenance record generated successfully',
            'record_id': record.id,
            'next_maintenance_date': next_date.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Enhanced Dashboard Endpoints
@maintenance_bp.route('/dashboard/kpis', methods=['GET'])
@jwt_required()
def get_maintenance_kpis():
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func, and_
        from models import Machine
        
        period = int(request.args.get('period', 30))
        machine_filter = request.args.get('machine', 'all')
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period)
        
        # Base query filters
        date_filter = and_(
            MaintenanceRecord.maintenance_date >= start_date,
            MaintenanceRecord.maintenance_date <= end_date
        )
        
        # Machine filter
        if machine_filter != 'all':
            date_filter = and_(date_filter, MaintenanceRecord.machine_id == machine_filter)
        
        # Total work orders
        total_work_orders = MaintenanceRecord.query.filter(date_filter).count()
        
        # Work order status counts
        pending_work_orders = MaintenanceRecord.query.filter(
            and_(date_filter, MaintenanceRecord.status.in_(['scheduled', 'in_progress']))
        ).count()
        
        completed_work_orders = MaintenanceRecord.query.filter(
            and_(date_filter, MaintenanceRecord.status == 'completed')
        ).count()
        
        overdue_work_orders = MaintenanceRecord.query.filter(
            and_(
                MaintenanceRecord.scheduled_date < datetime.utcnow(),
                MaintenanceRecord.status.in_(['scheduled', 'in_progress'])
            )
        ).count()
        
        # Total cost this month
        cost_result = db.session.query(func.sum(MaintenanceRecord.cost)).filter(date_filter).scalar()
        total_cost_this_month = float(cost_result or 0)
        
        # Average completion time (MTTR)
        completed_records = MaintenanceRecord.query.filter(
            and_(date_filter, MaintenanceRecord.status == 'completed',
                 MaintenanceRecord.start_time.isnot(None),
                 MaintenanceRecord.end_time.isnot(None))
        ).all()
        
        if completed_records:
            total_duration = sum([
                (record.end_time - record.start_time).total_seconds() / 3600
                for record in completed_records
                if record.end_time and record.start_time
            ])
            mttr = total_duration / len(completed_records)
        else:
            mttr = 0
        
        # MTBF calculation (simplified)
        mtbf = 168  # Default 1 week in hours
        
        # Preventive maintenance percentage
        preventive_count = MaintenanceRecord.query.filter(
            and_(date_filter, MaintenanceRecord.maintenance_type == 'preventive')
        ).count()
        
        preventive_percentage = (preventive_count / total_work_orders * 100) if total_work_orders > 0 else 0
        
        # Equipment uptime (simplified calculation)
        equipment_uptime = max(0, 100 - (total_work_orders * 2))  # Rough estimate
        
        return jsonify({
            'total_work_orders': total_work_orders,
            'pending_work_orders': pending_work_orders,
            'completed_work_orders': completed_work_orders,
            'overdue_work_orders': overdue_work_orders,
            'total_cost_this_month': total_cost_this_month,
            'avg_completion_time': mttr,
            'mttr': mttr,
            'mtbf': mtbf,
            'preventive_percentage': preventive_percentage,
            'equipment_uptime': equipment_uptime
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_maintenance_alerts():
    try:
        status = request.args.get('status', 'active')
        
        # For now, return empty alerts array
        # This can be enhanced with actual alert logic
        alerts = []
        
        return jsonify({'alerts': alerts}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/work-orders/summary', methods=['GET'])
@jwt_required()
def get_work_orders_summary():
    try:
        # Get recent work orders with machine info
        records = MaintenanceRecord.query.join(
            MaintenanceRecord.machine
        ).order_by(MaintenanceRecord.created_at.desc()).limit(10).all()
        
        work_orders = []
        for record in records:
            work_orders.append({
                'id': record.id,
                'record_number': record.record_number,
                'machine_name': record.machine.name if record.machine else 'Unknown',
                'maintenance_type': record.maintenance_type,
                'priority': record.priority or 'medium',
                'status': record.status,
                'scheduled_date': record.scheduled_date.isoformat() if record.scheduled_date else '',
                'assigned_to': record.assigned_to or 'Unassigned',
                'estimated_duration': record.estimated_duration_hours or 4
            })
        
        return jsonify({'work_orders': work_orders}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/analytics/trends', methods=['GET'])
@jwt_required()
def get_maintenance_trends():
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func, extract
        
        period = int(request.args.get('period', 30))
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period)
        
        # Get maintenance trends by month
        trends_query = db.session.query(
            func.date_trunc('month', MaintenanceRecord.maintenance_date).label('month'),
            func.count(func.case([(MaintenanceRecord.maintenance_type == 'preventive', 1)])).label('preventive'),
            func.count(func.case([(MaintenanceRecord.maintenance_type == 'corrective', 1)])).label('corrective'),
            func.count(func.case([(MaintenanceRecord.maintenance_type == 'emergency', 1)])).label('emergency'),
            func.sum(MaintenanceRecord.cost).label('cost')
        ).filter(
            MaintenanceRecord.maintenance_date >= start_date
        ).group_by(
            func.date_trunc('month', MaintenanceRecord.maintenance_date)
        ).order_by('month').all()
        
        trends = []
        for trend in trends_query:
            trends.append({
                'month': trend.month.strftime('%Y-%m') if trend.month else '',
                'preventive': int(trend.preventive or 0),
                'corrective': int(trend.corrective or 0),
                'emergency': int(trend.emergency or 0),
                'cost': float(trend.cost or 0)
            })
        
        # If no data, return empty trends
        if not trends:
            trends = []
        
        return jsonify({'trends': trends}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@maintenance_bp.route('/analytics/equipment-performance', methods=['GET'])
@jwt_required()
def get_equipment_performance():
    try:
        from models import Machine
        from sqlalchemy import func
        
        # Get equipment performance data
        machines = Machine.query.all()
        equipment_performance = []
        
        for machine in machines:
            # Get maintenance records for this machine
            records = MaintenanceRecord.query.filter_by(machine_id=machine.id).all()
            
            if records:
                # Calculate metrics
                total_downtime = sum([
                    (record.end_time - record.start_time).total_seconds() / 3600
                    for record in records
                    if record.end_time and record.start_time
                ])
                
                # Simplified calculations
                uptime_percentage = max(0, 100 - (len(records) * 1.5))
                mttr = total_downtime / len(records) if total_downtime > 0 else 0
                mtbf = 168  # Default 1 week
                maintenance_cost = sum([float(record.cost or 0) for record in records])
                last_maintenance = max([record.maintenance_date for record in records]).isoformat()
            else:
                uptime_percentage = 100
                mttr = 0
                mtbf = 168
                maintenance_cost = 0
                last_maintenance = datetime.utcnow().isoformat()
            
            equipment_performance.append({
                'machine_name': machine.name,
                'uptime_percentage': uptime_percentage,
                'mttr': mttr,
                'mtbf': mtbf,
                'maintenance_cost': maintenance_cost,
                'last_maintenance': last_maintenance
            })
        
        return jsonify({'equipment': equipment_performance}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
