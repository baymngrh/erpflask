from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, WasteRecord, WasteCategory, WasteTarget, WasteDisposal
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime

waste_bp = Blueprint('waste', __name__)

@waste_bp.route('/records', methods=['GET'])
@waste_bp.route('/records/', methods=['GET'])
@jwt_required()
def get_waste_records():
    try:
        records = WasteRecord.query.order_by(WasteRecord.waste_date.desc()).all()
        return jsonify({
            'records': [{
                'id': r.id,
                'record_number': r.record_number,
                'category_name': r.category.name,
                'waste_date': r.waste_date.isoformat(),
                'quantity': float(r.quantity),
                'uom': r.uom,
                'status': r.status
            } for r in records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/records', methods=['POST'])
@jwt_required()
def create_waste_record():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        record_number = generate_number('WR', WasteRecord, 'record_number')
        
        record = WasteRecord(
            record_number=record_number,
            category_id=data['category_id'],
            waste_date=datetime.fromisoformat(data['waste_date']),
            source_department=data.get('source_department'),
            source_machine_id=data.get('source_machine_id'),
            work_order_id=data.get('work_order_id'),
            quantity=data['quantity'],
            uom=data['uom'],
            weight_kg=data.get('weight_kg'),
            estimated_value=data.get('estimated_value', 0),
            reason=data.get('reason'),
            recorded_by=user_id
        )
        
        db.session.add(record)
        db.session.commit()
        return jsonify({'message': 'Waste record created', 'record_id': record.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/records/<int:id>', methods=['GET'])
@jwt_required()
def get_waste_record(id):
    try:
        record = WasteRecord.query.get_or_404(id)
        return jsonify({
            'id': record.id,
            'record_number': record.record_number,
            'waste_date': record.waste_date.isoformat() if record.waste_date else None,
            'category': record.category.name if record.category else None,
            'source_department': record.source_department,
            'waste_type': record.waste_type,
            'quantity': float(record.quantity) if record.quantity else 0,
            'uom': record.uom,
            'hazard_level': record.hazard_level,
            'disposal_method': record.disposal_method,
            'disposal_location': record.disposal_location,
            'cost_estimation': float(record.estimated_value) if record.estimated_value else 0,
            'responsible_person': record.responsible_person,
            'notes': record.reason,
            'regulatory_compliance': record.regulatory_compliance,
            'disposal_certificate': record.disposal_certificate,
            'created_at': record.created_at.isoformat() if record.created_at else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/records/<int:id>', methods=['PUT'])
@jwt_required()
def update_waste_record(id):
    try:
        record = WasteRecord.query.get_or_404(id)
        data = request.get_json()
        
        if data.get('waste_date'):
            record.waste_date = datetime.fromisoformat(data['waste_date'])
        record.source_department = data.get('source_department', record.source_department)
        record.waste_type = data.get('waste_type', record.waste_type)
        record.quantity = data.get('quantity', record.quantity)
        record.uom = data.get('uom', record.uom)
        record.hazard_level = data.get('hazard_level', record.hazard_level)
        record.disposal_method = data.get('disposal_method', record.disposal_method)
        record.disposal_location = data.get('disposal_location', record.disposal_location)
        record.estimated_value = data.get('cost_estimation', record.estimated_value)
        record.responsible_person = data.get('responsible_person', record.responsible_person)
        record.reason = data.get('notes', record.reason)
        record.regulatory_compliance = data.get('regulatory_compliance', record.regulatory_compliance)
        record.disposal_certificate = data.get('disposal_certificate', record.disposal_certificate)
        record.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/records/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_waste_record(id):
    try:
        record = WasteRecord.query.get_or_404(id)
        db.session.delete(record)
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    try:
        categories = WasteCategory.query.filter_by(is_active=True).all()
        return jsonify({
            'categories': [{
                'id': c.id,
                'code': c.code,
                'name': c.name,
                'waste_type': c.waste_type,
                'hazard_level': c.hazard_level
            } for c in categories]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/targets', methods=['GET'])
@jwt_required()
def get_targets():
    try:
        targets = WasteTarget.query.all()
        return jsonify({
            'targets': [{
                'id': t.id,
                'category_name': t.category.name,
                'target_period': t.target_period,
                'target_quantity': float(t.target_quantity),
                'actual_quantity': float(t.actual_quantity),
                'status': t.status
            } for t in targets]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@waste_bp.route('/disposals', methods=['GET'])
@jwt_required()
def get_disposals():
    try:
        disposals = WasteDisposal.query.order_by(WasteDisposal.disposal_date.desc()).all()
        return jsonify({
            'disposals': [{
                'id': d.id,
                'disposal_number': d.disposal_number,
                'disposal_date': d.disposal_date.isoformat(),
                'disposal_method': d.disposal_method,
                'total_weight_kg': float(d.total_weight_kg),
                'total_cost': float(d.total_cost),
                'status': d.status
            } for d in disposals]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
