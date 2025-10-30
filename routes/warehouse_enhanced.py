from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Product, WarehouseZone, WarehouseLocation, Inventory, InventoryMovement
from utils.i18n import success_response, error_response, get_message
from models.warehouse_enhanced import (
    WarehouseAnalytics, ProductABCClassification, InventoryReorderPoint,
    WarehouseAlert, WarehouseOptimization, StockMovementForecast
)
from sqlalchemy import func, desc, asc, and_, or_
from sqlalchemy.orm import joinedload
from datetime import datetime, date, timedelta
from utils.helpers import generate_number
import json

warehouse_enhanced_bp = Blueprint('warehouse_enhanced', __name__)

@warehouse_enhanced_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_warehouse_dashboard():
    """Enhanced warehouse dashboard with comprehensive metrics"""
    try:
        # Date ranges
        today = date.today()
        week_start = today - timedelta(days=7)
        month_start = today.replace(day=1)
        
        # Basic inventory metrics
        total_products = db.session.query(func.count(func.distinct(Inventory.product_id))).scalar() or 0
        total_locations = WarehouseLocation.query.filter_by(is_active=True).count()
        total_zones = WarehouseZone.query.filter_by(is_active=True).count()
        
        # Inventory value and quantity
        inventory_summary = db.session.query(
            func.sum(Inventory.quantity).label('total_quantity'),
            func.sum(Inventory.quantity * Product.cost).label('total_value')
        ).join(Product).first()
        
        total_quantity = float(inventory_summary.total_quantity) if inventory_summary.total_quantity else 0
        total_value = float(inventory_summary.total_value) if inventory_summary.total_value else 0
        
        # Storage utilization
        location_utilization = db.session.query(
            func.avg(WarehouseLocation.occupied / WarehouseLocation.capacity * 100).label('avg_utilization')
        ).filter(
            WarehouseLocation.is_active == True,
            WarehouseLocation.capacity > 0
        ).scalar() or 0
        
        # Movement metrics (last 7 days)
        movements_week = db.session.query(
            InventoryMovement.movement_type,
            func.sum(InventoryMovement.quantity).label('total_quantity'),
            func.count(InventoryMovement.id).label('transaction_count')
        ).filter(
            InventoryMovement.movement_date >= week_start
        ).group_by(InventoryMovement.movement_type).all()
        
        movement_summary = {
            'receipts': 0,
            'issues': 0,
            'transfers': 0,
            'adjustments': 0
        }
        
        for movement in movements_week:
            if movement.movement_type == 'receive':
                movement_summary['receipts'] = float(movement.total_quantity)
            elif movement.movement_type == 'issue':
                movement_summary['issues'] = float(movement.total_quantity)
            elif movement.movement_type == 'transfer':
                movement_summary['transfers'] = float(movement.total_quantity)
            elif movement.movement_type == 'adjust':
                movement_summary['adjustments'] = float(movement.total_quantity)
        
        # Active alerts
        active_alerts = WarehouseAlert.query.filter_by(status='active').count()
        critical_alerts = WarehouseAlert.query.filter(
            WarehouseAlert.status == 'active',
            WarehouseAlert.severity.in_(['high', 'critical'])
        ).count()
        
        # Low stock items (below reorder point)
        low_stock_items = db.session.query(func.count(Inventory.id)).join(
            InventoryReorderPoint, Inventory.product_id == InventoryReorderPoint.product_id
        ).filter(
            Inventory.available_quantity <= InventoryReorderPoint.reorder_point,
            InventoryReorderPoint.is_active == True
        ).scalar() or 0
        
        # Expiring items (next 30 days)
        expiring_soon = Inventory.query.filter(
            Inventory.expiry_date.between(today, today + timedelta(days=30))
        ).count()
        
        # ABC Analysis summary
        abc_summary = db.session.query(
            ProductABCClassification.abc_category,
            func.count(ProductABCClassification.id).label('product_count'),
            func.sum(ProductABCClassification.total_value).label('category_value')
        ).group_by(ProductABCClassification.abc_category).all()
        
        abc_data = {'A': {'count': 0, 'value': 0}, 'B': {'count': 0, 'value': 0}, 'C': {'count': 0, 'value': 0}}
        for item in abc_summary:
            if item.abc_category in abc_data:
                abc_data[item.abc_category] = {
                    'count': item.product_count,
                    'value': float(item.category_value) if item.category_value else 0
                }
        
        # Recent movements for timeline
        recent_movements = db.session.query(
            InventoryMovement.movement_type,
            InventoryMovement.quantity,
            InventoryMovement.movement_date,
            Product.name.label('product_name'),
            WarehouseLocation.location_code
        ).join(Product).join(
            WarehouseLocation, InventoryMovement.to_location_id == WarehouseLocation.id
        ).order_by(desc(InventoryMovement.movement_date)).limit(10).all()
        
        movement_timeline = []
        for movement in recent_movements:
            movement_timeline.append({
                'type': movement.movement_type,
                'quantity': float(movement.quantity),
                'date': movement.movement_date.isoformat(),
                'product': movement.product_name,
                'location': movement.location_code
            })
        
        # Top products by value
        top_products = db.session.query(
            Product.name,
            func.sum(Inventory.quantity).label('total_quantity'),
            func.sum(Inventory.quantity * Product.cost).label('total_value')
        ).join(Inventory).group_by(Product.id, Product.name).order_by(
            desc(func.sum(Inventory.quantity * Product.cost))
        ).limit(5).all()
        
        top_products_data = []
        for product in top_products:
            top_products_data.append({
                'name': product.name,
                'quantity': float(product.total_quantity),
                'value': float(product.total_value) if product.total_value else 0
            })
        
        return jsonify({
            'summary': {
                'total_products': total_products,
                'total_locations': total_locations,
                'total_zones': total_zones,
                'total_quantity': total_quantity,
                'total_value': total_value,
                'location_utilization': round(float(location_utilization), 2),
                'active_alerts': active_alerts,
                'critical_alerts': critical_alerts,
                'low_stock_items': low_stock_items,
                'expiring_soon': expiring_soon
            },
            'movements': movement_summary,
            'abc_analysis': abc_data,
            'recent_movements': movement_timeline,
            'top_products': top_products_data,
            'last_updated': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_warehouse_analytics():
    """Get warehouse analytics and KPIs"""
    try:
        period = request.args.get('period', 'monthly')
        warehouse_id = request.args.get('warehouse_id', type=int)
        
        # Base query
        query = WarehouseAnalytics.query
        if warehouse_id:
            query = query.filter_by(warehouse_id=warehouse_id)
        
        # Filter by period
        if period == 'daily':
            start_date = date.today() - timedelta(days=30)
        elif period == 'weekly':
            start_date = date.today() - timedelta(weeks=12)
        else:  # monthly
            start_date = date.today() - timedelta(days=365)
        
        analytics = query.filter(
            WarehouseAnalytics.analysis_date >= start_date,
            WarehouseAnalytics.analysis_type == period
        ).order_by(WarehouseAnalytics.analysis_date).all()
        
        analytics_data = []
        for record in analytics:
            analytics_data.append({
                'date': record.analysis_date.isoformat(),
                'total_products': record.total_products,
                'total_quantity': float(record.total_quantity),
                'total_value': float(record.total_value),
                'inventory_turnover': float(record.inventory_turnover),
                'days_of_supply': float(record.days_of_supply),
                'storage_utilization': float(record.storage_utilization),
                'location_utilization': float(record.location_utilization),
                'stockout_incidents': record.stockout_incidents,
                'overstock_incidents': record.overstock_incidents,
                'expired_products': record.expired_products,
                'expired_value': float(record.expired_value)
            })
        
        # Summary metrics
        if analytics:
            latest = analytics[-1]
            summary = {
                'current_turnover': float(latest.inventory_turnover),
                'current_utilization': float(latest.storage_utilization),
                'current_days_supply': float(latest.days_of_supply),
                'total_stockouts': sum(a.stockout_incidents for a in analytics),
                'total_overstocks': sum(a.overstock_incidents for a in analytics),
                'avg_utilization': sum(float(a.storage_utilization) for a in analytics) / len(analytics)
            }
        else:
            summary = {
                'current_turnover': 0,
                'current_utilization': 0,
                'current_days_supply': 0,
                'total_stockouts': 0,
                'total_overstocks': 0,
                'avg_utilization': 0
            }
        
        return jsonify({
            'analytics': analytics_data,
            'summary': summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/abc-analysis', methods=['GET'])
@jwt_required()
def get_abc_analysis():
    """Get ABC analysis results"""
    try:
        warehouse_id = request.args.get('warehouse_id', type=int)
        
        query = ProductABCClassification.query.options(joinedload(ProductABCClassification.product))
        if warehouse_id:
            query = query.filter_by(warehouse_id=warehouse_id)
        
        classifications = query.order_by(
            ProductABCClassification.abc_category,
            desc(ProductABCClassification.total_value)
        ).all()
        
        abc_data = []
        for classification in classifications:
            abc_data.append({
                'product_id': classification.product_id,
                'product_name': classification.product.name,
                'abc_category': classification.abc_category,
                'xyz_category': classification.xyz_category,
                'total_consumption': float(classification.total_consumption),
                'total_value': float(classification.total_value),
                'average_monthly_consumption': float(classification.average_monthly_consumption),
                'consumption_variance': float(classification.consumption_variance),
                'recommended_reorder_point': float(classification.recommended_reorder_point),
                'recommended_max_stock': float(classification.recommended_max_stock),
                'recommended_safety_stock': float(classification.recommended_safety_stock)
            })
        
        return jsonify({
            'classifications': abc_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/reorder-points', methods=['GET'])
@jwt_required()
def get_reorder_points():
    """Get inventory reorder points and recommendations"""
    try:
        status = request.args.get('status', 'all')  # all, below_reorder, auto_enabled
        
        query = InventoryReorderPoint.query.options(joinedload(InventoryReorderPoint.product))
        
        if status == 'below_reorder':
            # Get items below reorder point
            query = query.join(Inventory, InventoryReorderPoint.product_id == Inventory.product_id).filter(
                Inventory.available_quantity <= InventoryReorderPoint.reorder_point
            )
        elif status == 'auto_enabled':
            query = query.filter_by(auto_reorder_enabled=True)
        
        reorder_points = query.filter_by(is_active=True).all()
        
        reorder_data = []
        for rp in reorder_points:
            # Get current stock
            current_stock = db.session.query(func.sum(Inventory.available_quantity)).filter_by(
                product_id=rp.product_id
            ).scalar() or 0
            
            reorder_data.append({
                'id': rp.id,
                'product_id': rp.product_id,
                'product_name': rp.product.name,
                'current_stock': float(current_stock),
                'reorder_point': float(rp.reorder_point),
                'reorder_quantity': float(rp.reorder_quantity),
                'safety_stock': float(rp.safety_stock),
                'maximum_stock': float(rp.maximum_stock),
                'lead_time_days': rp.lead_time_days,
                'average_daily_demand': float(rp.average_daily_demand),
                'service_level_target': float(rp.service_level_target),
                'auto_reorder_enabled': rp.auto_reorder_enabled,
                'status': 'below_reorder' if current_stock <= rp.reorder_point else 'normal',
                'days_until_stockout': int((current_stock / rp.average_daily_demand)) if rp.average_daily_demand > 0 else None
            })
        
        return jsonify({
            'reorder_points': reorder_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_warehouse_alerts():
    """Get warehouse alerts"""
    try:
        status = request.args.get('status', 'active')
        severity = request.args.get('severity')
        
        query = WarehouseAlert.query.options(
            joinedload(WarehouseAlert.product),
            joinedload(WarehouseAlert.location)
        )
        
        if status != 'all':
            query = query.filter_by(status=status)
        
        if severity:
            query = query.filter_by(severity=severity)
        
        alerts = query.order_by(desc(WarehouseAlert.created_at)).all()
        
        alerts_data = []
        for alert in alerts:
            alerts_data.append({
                'id': alert.id,
                'alert_number': alert.alert_number,
                'alert_type': alert.alert_type,
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.message,
                'product_name': alert.product.name if alert.product else None,
                'location_code': alert.location.location_code if alert.location else None,
                'threshold_value': float(alert.threshold_value) if alert.threshold_value else None,
                'actual_value': float(alert.actual_value) if alert.actual_value else None,
                'status': alert.status,
                'created_at': alert.created_at.isoformat(),
                'acknowledged_at': alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            })
        
        return jsonify({
            'alerts': alerts_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id):
    """Acknowledge a warehouse alert"""
    try:
        user_id = get_jwt_identity()
        alert = WarehouseAlert.query.get_or_404(alert_id)
        
        alert.status = 'acknowledged'
        alert.acknowledged_by = user_id
        alert.acknowledged_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/alerts/<int:alert_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_alert(alert_id):
    """Resolve a warehouse alert"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        alert = WarehouseAlert.query.get_or_404(alert_id)
        
        alert.status = 'resolved'
        alert.resolved_by = user_id
        alert.resolved_at = datetime.utcnow()
        alert.resolution_notes = data.get('resolution_notes', '')
        
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/optimization', methods=['GET'])
@jwt_required()
def get_optimization_results():
    """Get warehouse optimization results"""
    try:
        optimization_type = request.args.get('type', 'all')
        
        query = WarehouseOptimization.query
        if optimization_type != 'all':
            query = query.filter_by(optimization_type=optimization_type)
        
        optimizations = query.order_by(desc(WarehouseOptimization.optimization_date)).all()
        
        optimization_data = []
        for opt in optimizations:
            optimization_data.append({
                'id': opt.id,
                'optimization_type': opt.optimization_type,
                'optimization_date': opt.optimization_date.isoformat(),
                'algorithm_used': opt.algorithm_used,
                'current_efficiency': float(opt.current_efficiency),
                'optimized_efficiency': float(opt.optimized_efficiency),
                'improvement_percentage': float(opt.improvement_percentage),
                'recommendations': opt.recommendations,
                'implementation_status': opt.implementation_status,
                'average_picking_time': float(opt.average_picking_time),
                'average_travel_distance': float(opt.average_travel_distance),
                'storage_density': float(opt.storage_density)
            })
        
        return jsonify({
            'optimizations': optimization_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/forecast', methods=['GET'])
@jwt_required()
def get_demand_forecast():
    """Get demand forecast and predictions"""
    try:
        product_id = request.args.get('product_id', type=int)
        period = request.args.get('period', 'monthly')
        
        query = StockMovementForecast.query.options(joinedload(StockMovementForecast.product))
        
        if product_id:
            query = query.filter_by(product_id=product_id)
        
        query = query.filter_by(forecast_period=period)
        
        # Get future forecasts
        forecasts = query.filter(
            StockMovementForecast.forecast_date >= date.today()
        ).order_by(StockMovementForecast.forecast_date).limit(12).all()
        
        forecast_data = []
        for forecast in forecasts:
            forecast_data.append({
                'product_id': forecast.product_id,
                'product_name': forecast.product.name,
                'forecast_date': forecast.forecast_date.isoformat(),
                'predicted_demand': float(forecast.predicted_demand),
                'predicted_receipts': float(forecast.predicted_receipts),
                'predicted_stock_level': float(forecast.predicted_stock_level),
                'confidence_level': float(forecast.confidence_level),
                'forecast_accuracy': float(forecast.forecast_accuracy),
                'model_type': forecast.model_type
            })
        
        return jsonify({
            'forecasts': forecast_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_enhanced_bp.route('/stock-summary', methods=['GET'])
@jwt_required()
def get_enhanced_stock_summary():
    """Get enhanced stock summary with analytics"""
    try:
        # Stock by category
        stock_by_category = db.session.query(
            Product.category,
            func.count(func.distinct(Inventory.product_id)).label('product_count'),
            func.sum(Inventory.quantity).label('total_quantity'),
            func.sum(Inventory.quantity * Product.cost).label('total_value')
        ).join(Inventory).group_by(Product.category).all()
        
        category_data = []
        for category in stock_by_category:
            category_data.append({
                'category': category.category,
                'product_count': category.product_count,
                'total_quantity': float(category.total_quantity) if category.total_quantity else 0,
                'total_value': float(category.total_value) if category.total_value else 0
            })
        
        # Stock by zone
        stock_by_zone = db.session.query(
            WarehouseZone.name,
            WarehouseZone.material_type,
            func.count(func.distinct(Inventory.product_id)).label('product_count'),
            func.sum(Inventory.quantity).label('total_quantity')
        ).join(WarehouseLocation).join(Inventory).group_by(
            WarehouseZone.id, WarehouseZone.name, WarehouseZone.material_type
        ).all()
        
        zone_data = []
        for zone in stock_by_zone:
            zone_data.append({
                'zone_name': zone.name,
                'material_type': zone.material_type,
                'product_count': zone.product_count,
                'total_quantity': float(zone.total_quantity) if zone.total_quantity else 0
            })
        
        return jsonify({
            'stock_by_category': category_data,
            'stock_by_zone': zone_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
