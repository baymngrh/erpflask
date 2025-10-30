from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, QualityTest, QualityInspection, CAPA, QualityStandard
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime

quality_bp = Blueprint('quality', __name__)

@quality_bp.route('/tests', methods=['GET'])
@jwt_required()
def get_tests():
    try:
        tests = QualityTest.query.order_by(QualityTest.test_date.desc()).all()
        return jsonify({
            'tests': [{
                'id': t.id,
                'test_number': t.test_number,
                'test_type': t.test_type,
                'product_name': t.product.name,
                'test_date': t.test_date.isoformat(),
                'result': t.result
            } for t in tests]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/tests', methods=['POST'])
@jwt_required()
def create_quality_test():
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        
        test_number = generate_number('QT', QualityTest, 'test_number')
        
        test = QualityTest(
            test_number=test_number,
            test_type=data['test_type'],
            product_id=data['product_id'],
            batch_number=data.get('batch_number'),
            lot_number=data.get('lot_number'),
            test_date=datetime.fromisoformat(data['test_date']),
            tested_by=data.get('tested_by'),
            sample_size=data.get('sample_size'),
            test_method=data.get('test_method'),
            test_environment=data.get('test_environment'),
            temperature=data.get('temperature'),
            humidity=data.get('humidity'),
            notes=data.get('notes'),
            result=data.get('overall_result', 'pending'),
            created_by=user_id
        )
        
        db.session.add(test)
        db.session.flush()
        
        # Add test parameters
        for param in data.get('test_parameters', []):
            from models import QualityTestParameter
            test_param = QualityTestParameter(
                test_id=test.id,
                parameter_name=param['parameter_name'],
                expected_value=param['expected_value'],
                actual_value=param['actual_value'],
                unit=param.get('unit'),
                result_status=param['result_status'],
                notes=param.get('notes')
            )
            db.session.add(test_param)
        
        db.session.commit()
        return jsonify({'message': 'Quality test created', 'test_id': test.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/inspections', methods=['GET'])
@jwt_required()
def get_inspections():
    try:
        inspections = QualityInspection.query.order_by(QualityInspection.inspection_date.desc()).all()
        return jsonify({
            'inspections': [{
                'id': i.id,
                'inspection_number': i.inspection_number,
                'inspection_type': i.inspection_type,
                'inspection_date': i.inspection_date.isoformat(),
                'status': i.status,
                'result': i.result
            } for i in inspections]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/inspections', methods=['POST'])
@jwt_required()
def create_inspection():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        inspection_number = generate_number('QI', QualityInspection, 'inspection_number')
        
        inspection = QualityInspection(
            inspection_number=inspection_number,
            inspection_type=data['inspection_type'],
            product_id=data.get('product_id'),
            batch_number=data.get('batch_number'),
            sample_size=data.get('sample_size'),
            inspector_id=user_id
        )
        db.session.add(inspection)
        db.session.commit()
        return jsonify({'message': 'Inspection created', 'inspection_id': inspection.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/capa', methods=['GET'])
@jwt_required()
def get_capas():
    try:
        capas = CAPA.query.order_by(CAPA.issue_date.desc()).all()
        return jsonify({
            'capas': [{
                'id': c.id,
                'capa_number': c.capa_number,
                'capa_type': c.capa_type,
                'issue_date': c.issue_date.isoformat(),
                'status': c.status,
                'problem_description': c.problem_description[:100]
            } for c in capas]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/capa', methods=['POST'])
@jwt_required()
def create_capa():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        capa_number = generate_number('CAPA', CAPA, 'capa_number')
        
        capa = CAPA(
            capa_number=capa_number,
            capa_type=data['capa_type'],
            issue_date=datetime.fromisoformat(data['issue_date']),
            problem_description=data['problem_description'],
            root_cause=data.get('root_cause'),
            action_plan=data.get('action_plan'),
            responsible_person_id=data.get('responsible_person_id'),
            target_date=datetime.fromisoformat(data['target_date']) if data.get('target_date') else None,
            created_by=user_id
        )
        db.session.add(capa)
        db.session.commit()
        return jsonify({'message': 'CAPA created', 'capa_id': capa.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@quality_bp.route('/standards', methods=['GET'])
@jwt_required()
def get_standards():
    try:
        standards = QualityStandard.query.filter_by(is_active=True).all()
        return jsonify({
            'standards': [{
                'id': s.id,
                'code': s.code,
                'name': s.name,
                'standard_type': s.standard_type
            } for s in standards]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
