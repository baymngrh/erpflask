from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, WarehouseZone, WarehouseLocation, Inventory, InventoryMovement, Product
from utils.i18n import success_response, error_response, get_message
from sqlalchemy import or_, func
from sqlalchemy.orm import joinedload
from datetime import datetime

warehouse_bp = Blueprint('warehouse', __name__)

@warehouse_bp.route('/zones', methods=['GET'])
@jwt_required()
def get_zones():
    """Get all warehouse zones"""
    try:
        zones = WarehouseZone.query.filter_by(is_active=True).all()
        
        return jsonify({
            'zones': [{
                'id': z.id,
                'code': z.code,
                'name': z.name,
                'material_type': z.material_type,
                'capacity': float(z.capacity) if z.capacity else None,
                'capacity_uom': z.capacity_uom,
                'location_count': len(z.locations)
            } for z in zones]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/zones', methods=['POST'])
@jwt_required()
def create_zone():
    """Create warehouse zone"""
    try:
        data = request.get_json()
        zone = WarehouseZone(
            code=data['code'],
            name=data['name'],
            description=data.get('description'),
            material_type=data['material_type'],
            capacity=data.get('capacity'),
            capacity_uom=data.get('capacity_uom')
        )
        db.session.add(zone)
        db.session.commit()
        
        return jsonify({'message': 'Zone created', 'zone_id': zone.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/locations', methods=['GET'])
@jwt_required()
def get_locations():
    """Get all warehouse locations"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        zone_id = request.args.get('zone_id', type=int)
        search = request.args.get('search', '')
        
        query = WarehouseLocation.query
        
        if zone_id:
            query = query.filter_by(zone_id=zone_id)
        
        if search:
            query = query.filter(WarehouseLocation.location_code.ilike(f'%{search}%'))
        
        locations = query.paginate(page=page, per_page=per_page)
        
        return jsonify({
            'locations': [{
                'id': l.id,
                'location_code': l.location_code,
                'zone': l.zone.name,
                'rack': l.rack,
                'level': l.level,
                'position': l.position,
                'capacity': float(l.capacity),
                'occupied': float(l.occupied),
                'available': float(l.capacity - l.occupied),
                'is_available': l.is_available
            } for l in locations.items],
            'total': locations.total,
            'pages': locations.pages,
            'current_page': locations.page
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/locations', methods=['POST'])
@jwt_required()
def create_location():
    """Create warehouse location"""
    try:
        data = request.get_json()
        
        location = WarehouseLocation(
            zone_id=data['zone_id'],
            location_code=data['location_code'],
            rack=data['rack'],
            level=data['level'],
            position=data['position'],
            capacity=data.get('capacity', 0),
            capacity_uom=data.get('capacity_uom', 'KG')
        )
        db.session.add(location)
        db.session.commit()
        
        return jsonify({'message': 'Location created', 'location_id': location.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    """Get inventory"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        product_id = request.args.get('product_id', type=int)
        location_id = request.args.get('location_id', type=int)
        
        # Use basic query without problematic columns
        query = db.session.query(Inventory)
        
        # Add filters if provided
        if product_id:
            query = query.filter(Inventory.product_id == product_id)
        
        if location_id:
            query = query.filter(Inventory.location_id == location_id)
        
        # Execute query with pagination
        inventory = query.paginate(page=page, per_page=per_page, error_out=False)
        
        inventory_list = []
        for i in inventory.items:
            try:
                # Get related data manually to avoid relationship issues
                product = None
                location = None
                
                if i.product_id:
                    product = Product.query.get(i.product_id)
                
                if i.location_id:
                    location = WarehouseLocation.query.get(i.location_id)
                
                inventory_list.append({
                    'id': i.id,
                    'product_code': product.code if product else 'N/A',
                    'product_name': product.name if product else 'N/A',
                    'location_code': location.location_code if location else 'N/A',
                    'quantity': float(i.quantity) if i.quantity else 0,
                    'reserved_quantity': float(i.reserved_quantity) if i.reserved_quantity else 0,
                    'available_quantity': float(i.available_quantity) if i.available_quantity else 0,
                    'batch_number': i.batch_number or '',
                    'expiry_date': i.expiry_date.isoformat() if i.expiry_date else None
                })
            except Exception as e:
                print(f"Error processing inventory item {i.id}: {str(e)}")
                continue
        
        return jsonify({
            'inventory': inventory_list,
            'total': inventory.total,
            'pages': inventory.pages,
            'current_page': inventory.page
        }), 200
            
    except Exception as e:
        print(f"Inventory error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/movements', methods=['POST'])
@jwt_required()
def create_movement():
    """Create inventory movement"""
    try:
        from flask_jwt_extended import get_jwt_identity
        data = request.get_json()
        user_id = get_jwt_identity()
        
        movement = InventoryMovement(
            product_id=data['product_id'],
            from_location_id=data.get('from_location_id'),
            to_location_id=data.get('to_location_id'),
            movement_type=data['movement_type'],
            reference_type=data.get('reference_type'),
            reference_id=data.get('reference_id'),
            quantity=data['quantity'],
            uom=data['uom'],
            batch_number=data.get('batch_number'),
            notes=data.get('notes'),
            performed_by=user_id
        )
        
        db.session.add(movement)
        
        # Update inventory based on movement type
        if data['movement_type'] == 'receive' and data.get('to_location_id'):
            inventory = Inventory.query.filter_by(
                product_id=data['product_id'],
                location_id=data['to_location_id']
            ).first()
            
            if inventory:
                inventory.quantity += data['quantity']
                inventory.available_quantity += data['quantity']
            else:
                inventory = Inventory(
                    product_id=data['product_id'],
                    location_id=data['to_location_id'],
                    quantity=data['quantity'],
                    available_quantity=data['quantity'],
                    batch_number=data.get('batch_number')
                )
                db.session.add(inventory)
        
        elif data['movement_type'] == 'issue' and data.get('from_location_id'):
            inventory = Inventory.query.filter_by(
                product_id=data['product_id'],
                location_id=data['from_location_id']
            ).first()
            
            if inventory:
                inventory.quantity -= data['quantity']
                inventory.available_quantity -= data['quantity']
        
        db.session.commit()
        
        return jsonify({'message': 'Movement recorded', 'movement_id': movement.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/stock-summary', methods=['GET'])
@jwt_required()
def get_stock_summary():
    """Get stock summary by product"""
    try:
        query = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            func.sum(Inventory.quantity).label('total_quantity'),
            func.sum(Inventory.available_quantity).label('available_quantity'),
            func.sum(Inventory.reserved_quantity).label('reserved_quantity')
        ).join(Inventory).group_by(Product.id, Product.code, Product.name)
        
        results = query.all()
        
        return jsonify({
            'stock_summary': [{
                'product_id': r.id,
                'product_code': r.code,
                'product_name': r.name,
                'total_quantity': float(r.total_quantity or 0),
                'available_quantity': float(r.available_quantity or 0),
                'reserved_quantity': float(r.reserved_quantity or 0)
            } for r in results]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Enhanced Dashboard Endpoints
@warehouse_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_warehouse_dashboard():
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func, and_
        
        # Calculate date range for trends
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        # Summary metrics
        total_locations = WarehouseLocation.query.filter_by(is_active=True).count()
        total_zones = WarehouseZone.query.filter_by(is_active=True).count()
        
        # Inventory summary
        inventory_summary = db.session.query(
            func.count(Inventory.id).label('total_items'),
            func.sum(Inventory.quantity).label('total_quantity'),
            func.sum(Inventory.quantity * Product.unit_cost).label('total_value')
        ).join(Product).filter(Inventory.quantity > 0).first()
        
        # Movement summary (last 30 days)
        movement_summary = db.session.query(
            func.count(InventoryMovement.id).label('total_movements'),
            func.sum(func.case([(InventoryMovement.movement_type == 'in', InventoryMovement.quantity)], else_=0)).label('total_in'),
            func.sum(func.case([(InventoryMovement.movement_type == 'out', InventoryMovement.quantity)], else_=0)).label('total_out')
        ).filter(
            InventoryMovement.movement_date >= start_date
        ).first()
        
        # Low stock alerts
        low_stock_items = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            Inventory.quantity,
            Product.minimum_stock
        ).join(Inventory).filter(
            and_(
                Inventory.quantity <= Product.minimum_stock,
                Product.minimum_stock > 0
            )
        ).all()
        
        # ABC Analysis
        abc_analysis = db.session.query(
            func.count(func.case([(Product.abc_category == 'A', 1)])).label('category_a'),
            func.count(func.case([(Product.abc_category == 'B', 1)])).label('category_b'),
            func.count(func.case([(Product.abc_category == 'C', 1)])).label('category_c')
        ).join(Inventory).first()
        
        # Recent movements
        recent_movements = db.session.query(
            InventoryMovement.id,
            InventoryMovement.movement_type,
            InventoryMovement.quantity,
            InventoryMovement.movement_date,
            Product.code.label('product_code'),
            Product.name.label('product_name'),
            WarehouseLocation.code.label('location_code')
        ).join(Product).join(WarehouseLocation).order_by(
            InventoryMovement.movement_date.desc()
        ).limit(10).all()
        
        # Top products by movement
        top_products = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            func.sum(InventoryMovement.quantity).label('total_movement')
        ).join(InventoryMovement).filter(
            InventoryMovement.movement_date >= start_date
        ).group_by(Product.id, Product.code, Product.name).order_by(
            func.sum(InventoryMovement.quantity).desc()
        ).limit(10).all()
        
        return jsonify({
            'summary': {
                'total_locations': total_locations,
                'total_zones': total_zones,
                'total_items': int(inventory_summary.total_items or 0),
                'total_quantity': float(inventory_summary.total_quantity or 0),
                'total_value': float(inventory_summary.total_value or 0),
                'low_stock_count': len(low_stock_items)
            },
            'movements': {
                'total_movements': int(movement_summary.total_movements or 0),
                'total_in': float(movement_summary.total_in or 0),
                'total_out': float(movement_summary.total_out or 0),
                'net_movement': float((movement_summary.total_in or 0) - (movement_summary.total_out or 0))
            },
            'abc_analysis': {
                'category_a': int(abc_analysis.category_a or 0),
                'category_b': int(abc_analysis.category_b or 0),
                'category_c': int(abc_analysis.category_c or 0)
            },
            'low_stock_items': [{
                'id': item.id,
                'code': item.code,
                'name': item.name,
                'current_quantity': float(item.quantity),
                'minimum_stock': float(item.minimum_stock)
            } for item in low_stock_items],
            'recent_movements': [{
                'id': movement.id,
                'movement_type': movement.movement_type,
                'quantity': float(movement.quantity),
                'movement_date': movement.movement_date.isoformat(),
                'product_code': movement.product_code,
                'product_name': movement.product_name,
                'location_code': movement.location_code
            } for movement in recent_movements],
            'top_products': [{
                'id': product.id,
                'code': product.code,
                'name': product.name,
                'total_movement': float(product.total_movement)
            } for product in top_products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_warehouse_alerts():
    try:
        status = request.args.get('status', 'active')
        
        # Get low stock alerts
        low_stock_items = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            Inventory.quantity,
            Product.minimum_stock,
            WarehouseLocation.code.label('location_code')
        ).join(Inventory).join(WarehouseLocation).filter(
            and_(
                Inventory.quantity <= Product.minimum_stock,
                Product.minimum_stock > 0
            )
        ).all()
        
        # Get out of stock alerts
        out_of_stock_items = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            WarehouseLocation.code.label('location_code')
        ).join(Inventory).join(WarehouseLocation).filter(
            Inventory.quantity <= 0
        ).all()
        
        alerts = []
        
        # Add low stock alerts
        for item in low_stock_items:
            alerts.append({
                'id': f"low_stock_{item.id}",
                'type': 'low_stock',
                'severity': 'medium',
                'title': f"Low Stock: {item.code}",
                'message': f"{item.name} is running low (Current: {item.quantity}, Min: {item.minimum_stock})",
                'product_id': item.id,
                'location_code': item.location_code,
                'created_at': datetime.utcnow().isoformat()
            })
        
        # Add out of stock alerts
        for item in out_of_stock_items:
            alerts.append({
                'id': f"out_of_stock_{item.id}",
                'type': 'out_of_stock',
                'severity': 'high',
                'title': f"Out of Stock: {item.code}",
                'message': f"{item.name} is out of stock",
                'product_id': item.id,
                'location_code': item.location_code,
                'created_at': datetime.utcnow().isoformat()
            })
        
        return jsonify({'alerts': alerts}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@warehouse_bp.route('/analytics/turnover', methods=['GET'])
@jwt_required()
def get_inventory_turnover():
    try:
        from datetime import datetime, timedelta
        
        period = int(request.args.get('period', 90))  # days
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period)
        
        # Calculate inventory turnover
        turnover_data = db.session.query(
            Product.id,
            Product.code,
            Product.name,
            func.avg(Inventory.quantity).label('avg_inventory'),
            func.sum(func.case([(InventoryMovement.movement_type == 'out', InventoryMovement.quantity)], else_=0)).label('total_sold'),
            Product.unit_cost
        ).join(Inventory).join(InventoryMovement).filter(
            InventoryMovement.movement_date >= start_date
        ).group_by(Product.id, Product.code, Product.name, Product.unit_cost).all()
        
        turnover_analysis = []
        for item in turnover_data:
            avg_inventory = float(item.avg_inventory or 0)
            total_sold = float(item.total_sold or 0)
            
            if avg_inventory > 0:
                turnover_ratio = total_sold / avg_inventory
                days_of_supply = period / turnover_ratio if turnover_ratio > 0 else float('inf')
            else:
                turnover_ratio = 0
                days_of_supply = 0
            
            turnover_analysis.append({
                'product_id': item.id,
                'product_code': item.code,
                'product_name': item.name,
                'avg_inventory': avg_inventory,
                'total_sold': total_sold,
                'turnover_ratio': round(turnover_ratio, 2),
                'days_of_supply': round(days_of_supply, 1) if days_of_supply != float('inf') else 0,
                'unit_cost': float(item.unit_cost or 0)
            })
        
        # Sort by turnover ratio
        turnover_analysis.sort(key=lambda x: x['turnover_ratio'], reverse=True)
        
        return jsonify({
            'period_days': period,
            'turnover_analysis': turnover_analysis
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
