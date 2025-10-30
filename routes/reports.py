from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, SalesOrder, WorkOrder, Inventory, Product, Customer, WasteRecord, MaintenanceRecord, QualityTest
from utils.i18n import success_response, error_response, get_message
from sqlalchemy import func
from datetime import datetime, timedelta

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/sales', methods=['GET'])
@jwt_required()
def sales_report():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = SalesOrder.query
        
        if start_date:
            query = query.filter(SalesOrder.order_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(SalesOrder.order_date <= datetime.fromisoformat(end_date))
        
        orders = query.all()
        
        total_orders = len(orders)
        total_amount = sum(float(o.total_amount) for o in orders)
        
        return jsonify({
            'total_orders': total_orders,
            'total_amount': total_amount,
            'orders': [{
                'order_number': o.order_number,
                'customer_name': o.customer.company_name,
                'order_date': o.order_date.isoformat(),
                'total_amount': float(o.total_amount),
                'status': o.status
            } for o in orders]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/production', methods=['GET'])
@jwt_required()
def production_report():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = WorkOrder.query.filter_by(status='completed')
        
        if start_date:
            query = query.filter(WorkOrder.actual_end_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(WorkOrder.actual_end_date <= datetime.fromisoformat(end_date))
        
        work_orders = query.all()
        
        total_quantity = sum(float(wo.quantity_produced) for wo in work_orders)
        total_good = sum(float(wo.quantity_good) for wo in work_orders)
        total_scrap = sum(float(wo.quantity_scrap) for wo in work_orders)
        
        return jsonify({
            'total_work_orders': len(work_orders),
            'total_quantity_produced': total_quantity,
            'total_good': total_good,
            'total_scrap': total_scrap,
            'efficiency': (total_good / total_quantity * 100) if total_quantity > 0 else 0,
            'work_orders': [{
                'wo_number': wo.wo_number,
                'product_name': wo.product.name,
                'quantity_produced': float(wo.quantity_produced),
                'quantity_good': float(wo.quantity_good),
                'status': wo.status
            } for wo in work_orders]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/inventory', methods=['GET'])
@jwt_required()
def inventory_report():
    try:
        results = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            Product.primary_uom,
            func.sum(Inventory.quantity).label('total_quantity'),
            func.sum(Inventory.available_quantity).label('available_quantity')
        ).join(Inventory).group_by(Product.id, Product.code, Product.name, Product.primary_uom).all()
        
        return jsonify({
            'inventory': [{
                'product_code': r.code,
                'product_name': r.name,
                'total_quantity': float(r.total_quantity or 0),
                'available_quantity': float(r.available_quantity or 0),
                'uom': r.primary_uom
            } for r in results]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/waste', methods=['GET'])
@jwt_required()
def waste_report():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = WasteRecord.query
        
        if start_date:
            query = query.filter(WasteRecord.waste_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(WasteRecord.waste_date <= datetime.fromisoformat(end_date))
        
        records = query.all()
        
        total_quantity = sum(float(r.quantity) for r in records if r.quantity)
        total_weight = sum(float(r.weight_kg) for r in records if r.weight_kg)
        total_value = sum(float(r.estimated_value) for r in records if r.estimated_value)
        
        # Group by hazard level
        hazard_stats = {}
        for record in records:
            level = record.hazard_level or 'unknown'
            if level not in hazard_stats:
                hazard_stats[level] = {'count': 0, 'quantity': 0}
            hazard_stats[level]['count'] += 1
            hazard_stats[level]['quantity'] += float(record.quantity or 0)
        
        return jsonify({
            'total_records': len(records),
            'total_quantity': total_quantity,
            'total_weight_kg': total_weight,
            'total_estimated_value': total_value,
            'hazard_level_breakdown': hazard_stats,
            'records': [{
                'record_number': r.record_number,
                'waste_date': r.waste_date.isoformat() if r.waste_date else None,
                'category': r.category.name if r.category else None,
                'quantity': float(r.quantity) if r.quantity else 0,
                'hazard_level': r.hazard_level,
                'disposal_method': r.disposal_method
            } for r in records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/maintenance', methods=['GET'])
@jwt_required()
def maintenance_report():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = MaintenanceRecord.query
        
        if start_date:
            query = query.filter(MaintenanceRecord.maintenance_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(MaintenanceRecord.maintenance_date <= datetime.fromisoformat(end_date))
        
        records = query.all()
        
        total_cost = sum(float(r.cost) for r in records if r.cost)
        completed_count = len([r for r in records if r.status == 'completed'])
        
        # Group by maintenance type
        type_stats = {}
        for record in records:
            mtype = record.maintenance_type or 'unknown'
            if mtype not in type_stats:
                type_stats[mtype] = {'count': 0, 'cost': 0}
            type_stats[mtype]['count'] += 1
            type_stats[mtype]['cost'] += float(record.cost or 0)
        
        return jsonify({
            'total_records': len(records),
            'completed_count': completed_count,
            'total_cost': total_cost,
            'completion_rate': (completed_count / len(records) * 100) if records else 0,
            'maintenance_type_breakdown': type_stats,
            'records': [{
                'record_number': r.record_number,
                'machine_name': r.machine.name if r.machine else None,
                'maintenance_date': r.maintenance_date.isoformat() if r.maintenance_date else None,
                'maintenance_type': r.maintenance_type,
                'status': r.status,
                'cost': float(r.cost) if r.cost else 0
            } for r in records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/quality', methods=['GET'])
@jwt_required()
def quality_report():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = QualityTest.query
        
        if start_date:
            query = query.filter(QualityTest.test_date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(QualityTest.test_date <= datetime.fromisoformat(end_date))
        
        tests = query.all()
        
        passed_count = len([t for t in tests if t.result == 'pass'])
        failed_count = len([t for t in tests if t.result == 'fail'])
        
        return jsonify({
            'total_tests': len(tests),
            'passed_count': passed_count,
            'failed_count': failed_count,
            'pass_rate': (passed_count / len(tests) * 100) if tests else 0,
            'tests': [{
                'test_number': t.test_number,
                'product_name': t.product.name if t.product else None,
                'test_date': t.test_date.isoformat() if t.test_date else None,
                'result': t.result,
                'defect_count': t.defect_count or 0
            } for t in tests]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/generate/<report_type>', methods=['POST'])
@jwt_required()
def generate_report(report_type):
    try:
        data = request.get_json()
        filters = data.get('filters', {})
        fields = data.get('fields', [])
        
        # Route to appropriate report function based on type
        if report_type == 'sales-summary':
            return sales_report()
        elif report_type == 'production-efficiency':
            return production_report()
        elif report_type == 'inventory-status':
            return inventory_report()
        elif report_type == 'waste-management':
            return waste_report()
        elif report_type == 'maintenance-schedule':
            return maintenance_report()
        elif report_type == 'quality-metrics':
            return quality_report()
        else:
            return jsonify(error_response('api.error', error_code=400)), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reports_bp.route('/dashboard-summary', methods=['GET'])
@jwt_required()
def dashboard_summary():
    try:
        # Get data for the last 30 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        # Sales summary
        sales_orders = SalesOrder.query.filter(
            SalesOrder.order_date >= start_date,
            SalesOrder.order_date <= end_date
        ).all()
        
        # Production summary
        work_orders = WorkOrder.query.filter(
            WorkOrder.actual_end_date >= start_date,
            WorkOrder.actual_end_date <= end_date,
            WorkOrder.status == 'completed'
        ).all()
        
        # Quality summary
        quality_tests = QualityTest.query.filter(
            QualityTest.test_date >= start_date,
            QualityTest.test_date <= end_date
        ).all()
        
        # Waste summary
        waste_records = WasteRecord.query.filter(
            WasteRecord.waste_date >= start_date,
            WasteRecord.waste_date <= end_date
        ).all()
        
        return jsonify({
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'sales': {
                'total_orders': len(sales_orders),
                'total_amount': sum(float(o.total_amount) for o in sales_orders)
            },
            'production': {
                'total_work_orders': len(work_orders),
                'total_quantity': sum(float(wo.quantity_produced) for wo in work_orders)
            },
            'quality': {
                'total_tests': len(quality_tests),
                'pass_rate': (len([t for t in quality_tests if t.result == 'pass']) / len(quality_tests) * 100) if quality_tests else 0
            },
            'waste': {
                'total_records': len(waste_records),
                'total_quantity': sum(float(r.quantity) for r in waste_records if r.quantity)
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
