from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Machine, WorkOrder, ProductionRecord, BillOfMaterials, BOMItem, ProductionSchedule, Product, Employee
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_

production_bp = Blueprint('production', __name__)

# ============= MACHINES =============
@production_bp.route('/machines', methods=['GET'])
@jwt_required()
def get_machines():
    try:
        machines = Machine.query.filter_by(is_active=True).all()
        return jsonify({
            'machines': [{
                'id': m.id,
                'code': m.code,
                'name': m.name,
                'machine_type': m.machine_type,
                'manufacturer': m.manufacturer,
                'model': m.model,
                'serial_number': m.serial_number,
                'status': m.status,
                'location': m.location,
                'department': m.department,
                'capacity_per_hour': float(m.capacity_per_hour) if m.capacity_per_hour else None,
                'capacity_uom': m.capacity_uom,
                'efficiency': float(m.efficiency) if m.efficiency else 100,
                'availability': float(m.availability) if m.availability else 100,
                'last_maintenance': m.last_maintenance.isoformat() if m.last_maintenance else None,
                'next_maintenance': m.next_maintenance.isoformat() if m.next_maintenance else None,
                'installation_date': m.installation_date.isoformat() if m.installation_date else None,
                'notes': m.notes,
                'created_at': m.created_at.isoformat(),
                'updated_at': m.updated_at.isoformat()
            } for m in machines]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/machines/<int:id>', methods=['GET'])
@jwt_required()
def get_machine(id):
    try:
        machine = Machine.query.get(id)
        if not machine:
            return jsonify(error_response('api.error', error_code=404)), 404
            
        return jsonify({
            'machine': {
                'id': machine.id,
                'code': machine.code,
                'name': machine.name,
                'machine_type': machine.machine_type,
                'manufacturer': machine.manufacturer,
                'model': machine.model,
                'serial_number': machine.serial_number,
                'status': machine.status,
                'location': machine.location,
                'department': machine.department,
                'capacity_per_hour': float(machine.capacity_per_hour) if machine.capacity_per_hour else None,
                'capacity_uom': machine.capacity_uom,
                'efficiency': float(machine.efficiency) if machine.efficiency else 100,
                'availability': float(machine.availability) if machine.availability else 100,
                'last_maintenance': machine.last_maintenance.isoformat() if machine.last_maintenance else None,
                'next_maintenance': machine.next_maintenance.isoformat() if machine.next_maintenance else None,
                'installation_date': machine.installation_date.isoformat() if machine.installation_date else None,
                'notes': machine.notes,
                'is_active': machine.is_active,
                'created_at': machine.created_at.isoformat(),
                'updated_at': machine.updated_at.isoformat()
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/machines', methods=['POST'])
@jwt_required()
def create_machine():
    try:
        data = request.get_json()
        machine = Machine(
            code=data['code'],
            name=data['name'],
            machine_type=data['machine_type'],
            manufacturer=data.get('manufacturer'),
            model=data.get('model'),
            serial_number=data.get('serial_number'),
            status='idle',
            location=data.get('location'),
            capacity_per_hour=data.get('capacity_per_hour')
        )
        db.session.add(machine)
        db.session.commit()
        return jsonify({'message': 'Machine created', 'machine_id': machine.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/machines/<int:id>/update', methods=['PUT'])
@jwt_required()
def update_machine(id):
    try:
        machine = Machine.query.get(id)
        if not machine:
            return jsonify(error_response('api.error', error_code=404)), 404
            
        data = request.get_json()
        
        # Update machine fields
        if 'name' in data:
            machine.name = data['name']
        if 'machine_type' in data:
            machine.machine_type = data['machine_type']
        if 'manufacturer' in data:
            machine.manufacturer = data['manufacturer']
        if 'model' in data:
            machine.model = data['model']
        if 'serial_number' in data:
            machine.serial_number = data['serial_number']
        if 'status' in data:
            machine.status = data['status']
        if 'location' in data:
            machine.location = data['location']
        if 'department' in data:
            machine.department = data['department']
        if 'capacity_per_hour' in data:
            machine.capacity_per_hour = data['capacity_per_hour']
        if 'capacity_uom' in data:
            machine.capacity_uom = data['capacity_uom']
        if 'efficiency' in data:
            machine.efficiency = data['efficiency']
        if 'availability' in data:
            machine.availability = data['availability']
        if 'last_maintenance' in data:
            machine.last_maintenance = datetime.fromisoformat(data['last_maintenance']).date() if data['last_maintenance'] else None
        if 'next_maintenance' in data:
            machine.next_maintenance = datetime.fromisoformat(data['next_maintenance']).date() if data['next_maintenance'] else None
        if 'notes' in data:
            machine.notes = data['notes']
        if 'is_active' in data:
            machine.is_active = data['is_active']
            
        machine.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/machines/<int:id>/efficiency', methods=['GET'])
@jwt_required()
def get_machine_efficiency(id):
    """Get machine efficiency data for specific time period"""
    try:
        machine = Machine.query.get(id)
        if not machine:
            return jsonify(error_response('api.error', error_code=404)), 404
            
        start_date = request.args.get('start_date', (datetime.now() - timedelta(days=30)).isoformat())
        end_date = request.args.get('end_date', datetime.now().isoformat())
        
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        
        # Get production records for the period
        records = ProductionRecord.query.filter(
            ProductionRecord.machine_id == id,
            ProductionRecord.production_date.between(start_dt, end_dt)
        ).all()
        
        # Calculate efficiency metrics
        total_produced = sum(float(r.quantity_produced) for r in records)
        total_good = sum(float(r.quantity_good) for r in records)
        total_scrap = sum(float(r.quantity_scrap) for r in records)
        total_downtime = sum(r.downtime_minutes for r in records)
        
        # Calculate efficiency percentages
        quality_rate = (total_good / total_produced * 100) if total_produced > 0 else 0
        scrap_rate = (total_scrap / total_produced * 100) if total_produced > 0 else 0
        
        # Theoretical capacity calculation (assume 8 hours per day)
        days_in_period = (end_dt - start_dt).days + 1
        theoretical_hours = days_in_period * 8 * 60  # in minutes
        actual_runtime = theoretical_hours - total_downtime
        availability_rate = (actual_runtime / theoretical_hours * 100) if theoretical_hours > 0 else 0
        
        # Overall Equipment Effectiveness (OEE)
        oee = (availability_rate * quality_rate * float(machine.efficiency or 100)) / 10000
        
        return jsonify({
            'machine_id': id,
            'machine_name': machine.name,
            'period': {
                'start': start_date,
                'end': end_date,
                'days': days_in_period
            },
            'production': {
                'total_produced': total_produced,
                'total_good': total_good,
                'total_scrap': total_scrap,
                'quality_rate': round(quality_rate, 2),
                'scrap_rate': round(scrap_rate, 2)
            },
            'availability': {
                'theoretical_hours': theoretical_hours / 60,  # convert to hours
                'total_downtime_hours': total_downtime / 60,
                'actual_runtime_hours': actual_runtime / 60,
                'availability_rate': round(availability_rate, 2)
            },
            'efficiency': {
                'performance_rate': float(machine.efficiency or 100),
                'oee': round(oee, 2)
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= WORK ORDERS =============
@production_bp.route('/work-orders', methods=['GET'])
@jwt_required()
def get_work_orders():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        status = request.args.get('status')
        
        query = WorkOrder.query
        if status:
            query = query.filter_by(status=status)
        
        wos = query.order_by(WorkOrder.created_at.desc()).paginate(page=page, per_page=per_page)
        
        return jsonify({
            'work_orders': [{
                'id': wo.id,
                'wo_number': wo.wo_number,
                'product_name': wo.product.name,
                'quantity': float(wo.quantity),
                'quantity_produced': float(wo.quantity_produced),
                'status': wo.status,
                'machine': wo.machine.name if wo.machine else None,
                'scheduled_start_date': wo.scheduled_start_date.isoformat() if wo.scheduled_start_date else None
            } for wo in wos.items],
            'total': wos.total
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/work-orders', methods=['POST'])
@jwt_required()
def create_work_order():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        wo_number = generate_number('WO', WorkOrder, 'wo_number')
        
        wo = WorkOrder(
            wo_number=wo_number,
            product_id=data['product_id'],
            quantity=data['quantity'],
            uom=data['uom'],
            status='planned',
            priority=data.get('priority', 'normal'),
            machine_id=data.get('machine_id'),
            scheduled_start_date=datetime.fromisoformat(data['scheduled_start_date']) if data.get('scheduled_start_date') else None,
            scheduled_end_date=datetime.fromisoformat(data['scheduled_end_date']) if data.get('scheduled_end_date') else None,
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(wo)
        db.session.commit()
        
        return jsonify({'message': 'Work order created', 'wo_id': wo.id, 'wo_number': wo_number}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/work-orders/<int:id>/start', methods=['PUT'])
@jwt_required()
def start_work_order(id):
    try:
        wo = WorkOrder.query.get(id)
        if not wo:
            return jsonify(error_response('api.error', error_code=404)), 404
        
        wo.status = 'in_progress'
        wo.actual_start_date = datetime.utcnow()
        
        if wo.machine:
            wo.machine.status = 'running'
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/work-orders/<int:id>/complete', methods=['PUT'])
@jwt_required()
def complete_work_order(id):
    try:
        wo = WorkOrder.query.get(id)
        if not wo:
            return jsonify(error_response('api.error', error_code=404)), 404
        
        wo.status = 'completed'
        wo.actual_end_date = datetime.utcnow()
        
        if wo.machine:
            wo.machine.status = 'idle'
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-records', methods=['GET'])
@jwt_required()
def get_production_records():
    """Get production records"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        records = ProductionRecord.query.order_by(ProductionRecord.production_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'records': [{
                'id': r.id,
                'work_order_id': r.work_order_id,
                'work_order_number': r.work_order.wo_number if r.work_order else '',
                'machine_id': r.machine_id,
                'machine_name': r.machine.name if r.machine else '',
                'production_date': r.production_date.isoformat(),
                'shift': r.shift,
                'quantity_produced': r.quantity_produced,
                'quantity_good': r.quantity_good,
                'quantity_scrap': r.quantity_scrap,
                'uom': r.uom,
                'downtime_minutes': r.downtime_minutes,
                'efficiency': (r.quantity_good / r.quantity_produced * 100) if r.quantity_produced > 0 else 0
            } for r in records.items],
            'total': records.total,
            'pages': records.pages
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/production-records', methods=['POST'])
@jwt_required()
def create_production_record():
    try:
        data = request.get_json()
        
        record = ProductionRecord(
            work_order_id=data['work_order_id'],
            machine_id=data.get('machine_id'),
            operator_id=data.get('operator_id'),
            production_date=datetime.utcnow(),
            shift=data.get('shift'),
            quantity_produced=data['quantity_produced'],
            quantity_good=data['quantity_good'],
            quantity_scrap=data.get('quantity_scrap', 0),
            uom=data['uom'],
            downtime_minutes=data.get('downtime_minutes', 0),
            notes=data.get('notes')
        )
        
        db.session.add(record)
        
        # Update work order quantities
        wo = WorkOrder.query.get(data['work_order_id'])
        wo.quantity_produced += data['quantity_produced']
        wo.quantity_good += data['quantity_good']
        wo.quantity_scrap += data.get('quantity_scrap', 0)
        
        db.session.commit()
        return jsonify({'message': 'Production record created', 'record_id': record.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/bom', methods=['GET'])
@jwt_required()
def get_boms():
    try:
        boms = BillOfMaterials.query.filter_by(is_active=True).all()
        return jsonify({
            'boms': [{
                'id': b.id,
                'bom_number': b.bom_number,
                'product_name': b.product.name,
                'version': b.version,
                'batch_size': float(b.batch_size),
                'item_count': len(b.items)
            } for b in boms]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/bom', methods=['POST'])
@jwt_required()
def create_bom():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        bom_number = generate_number('BOM', BillOfMaterials, 'bom_number')
        
        bom = BillOfMaterials(
            bom_number=bom_number,
            product_id=data['product_id'],
            version=data.get('version', '1.0'),
            batch_size=data['batch_size'],
            batch_uom=data['batch_uom'],
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(bom)
        db.session.flush()
        
        for idx, item_data in enumerate(data.get('items', []), 1):
            bom_item = BOMItem(
                bom_id=bom.id,
                line_number=idx,
                material_id=item_data['material_id'],
                quantity=item_data['quantity'],
                uom=item_data['uom'],
                scrap_percent=item_data.get('scrap_percent', 0)
            )
            db.session.add(bom_item)
        
        db.session.commit()
        return jsonify({'message': 'BOM created', 'bom_id': bom.id, 'bom_number': bom_number}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/schedules', methods=['GET'])
@jwt_required()
def get_schedules():
    try:
        schedules = ProductionSchedule.query.order_by(ProductionSchedule.scheduled_start).all()
        return jsonify({
            'schedules': [{
                'id': s.id,
                'schedule_number': s.schedule_number,
                'wo_number': s.work_order.wo_number,
                'machine_name': s.machine.name,
                'scheduled_start': s.scheduled_start.isoformat(),
                'scheduled_end': s.scheduled_end.isoformat(),
                'status': s.status
            } for s in schedules]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============= ADVANCED SCHEDULING =============
@production_bp.route('/schedules', methods=['POST'])
@jwt_required()
def create_schedule():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        schedule_number = generate_number('SCH', ProductionSchedule, 'schedule_number')
        
        schedule = ProductionSchedule(
            schedule_number=schedule_number,
            work_order_id=data['work_order_id'],
            machine_id=data['machine_id'],
            scheduled_start=datetime.fromisoformat(data['scheduled_start']),
            scheduled_end=datetime.fromisoformat(data['scheduled_end']),
            status='scheduled',
            shift=data.get('shift'),
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(schedule)
        db.session.commit()
        
        return jsonify({'message': 'Schedule created', 'schedule_id': schedule.id, 'schedule_number': schedule_number}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@production_bp.route('/traceability/<batch_number>', methods=['GET'])
@jwt_required()
def get_traceability(batch_number):
    """Get complete traceability information for a batch"""
    try:
        # Find work order by batch number
        work_order = WorkOrder.query.filter_by(batch_number=batch_number).first()
        if not work_order:
            return jsonify(error_response('api.error', error_code=404)), 404
        
        # Get production records
        production_records = ProductionRecord.query.filter_by(work_order_id=work_order.id).all()
        
        return jsonify({
            'batch_number': batch_number,
            'work_order': {
                'id': work_order.id,
                'wo_number': work_order.wo_number,
                'product_name': work_order.product.name,
                'quantity': float(work_order.quantity),
                'quantity_produced': float(work_order.quantity_produced),
                'status': work_order.status,
                'machine_name': work_order.machine.name if work_order.machine else None
            },
            'production_records': [{
                'id': record.id,
                'production_date': record.production_date.isoformat(),
                'shift': record.shift,
                'machine_name': record.machine.name if record.machine else None,
                'operator_name': record.operator.full_name if record.operator else None,
                'quantity_produced': float(record.quantity_produced),
                'quantity_good': float(record.quantity_good),
                'quantity_scrap': float(record.quantity_scrap),
                'downtime_minutes': record.downtime_minutes,
                'notes': record.notes
            } for record in production_records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@production_bp.route('/dashboard/summary', methods=['GET'])
@jwt_required()
def get_production_dashboard():
    """Get production dashboard summary"""
    try:
        # Work Orders Summary
        total_wos = WorkOrder.query.count()
        active_wos = WorkOrder.query.filter(WorkOrder.status.in_(['planned', 'released', 'in_progress'])).count()
        completed_wos = WorkOrder.query.filter_by(status='completed').count()
        
        # Machine Status
        machines = Machine.query.filter_by(is_active=True).all()
        machine_status = {}
        for machine in machines:
            status = machine.status
            machine_status[status] = machine_status.get(status, 0) + 1
        
        return jsonify({
            'work_orders': {
                'total': total_wos,
                'active': active_wos,
                'completed': completed_wos
            },
            'machines': {
                'total_active': len(machines),
                'status_breakdown': machine_status
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
