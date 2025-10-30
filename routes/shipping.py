from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ShippingOrder, ShippingItem, DeliveryTracking, LogisticsProvider
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime

shipping_bp = Blueprint('shipping', __name__)

@shipping_bp.route('/orders', methods=['GET'])
@shipping_bp.route('/orders/', methods=['GET'])
@jwt_required()
def get_shipping_orders():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        orders = ShippingOrder.query.order_by(ShippingOrder.shipping_date.desc()).paginate(page=page, per_page=per_page)
        
        return jsonify({
            'shipping_orders': [{
                'id': o.id,
                'shipping_number': o.shipping_number,
                'customer_name': o.customer.company_name,
                'shipping_date': o.shipping_date.isoformat(),
                'status': o.status,
                'tracking_number': o.tracking_number
            } for o in orders.items],
            'total': orders.total
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/shipments', methods=['POST'])
@jwt_required()
def create_shipment():
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        
        shipping_number = generate_number('SHP', ShippingOrder, 'shipping_number')
        
        order = ShippingOrder(
            shipping_number=shipping_number,
            customer_id=data.get('customer_id'),
            shipping_date=datetime.fromisoformat(data['shipping_date']),
            expected_delivery_date=datetime.fromisoformat(data['expected_delivery_date']) if data.get('expected_delivery_date') else None,
            shipping_method=data['shipping_method'],
            carrier=data.get('carrier'),
            tracking_number=data.get('tracking_number'),
            driver_name=data.get('driver_name'),
            driver_phone=data.get('driver_phone'),
            vehicle_number=data.get('vehicle_number'),
            vehicle_type=data.get('vehicle_type'),
            notes=data.get('notes'),
            status='preparing',
            prepared_by=user_id
        )
        
        db.session.add(order)
        db.session.flush()
        
        # Link sales orders if provided
        if data.get('sales_order_ids'):
            for so_id in data['sales_order_ids']:
                order.sales_order_id = so_id  # For now, take first one
                break
        
        # Add shipping items
        for item_data in data.get('items', []):
            item = ShippingItem(
                shipping_id=order.id,
                product_name=item_data['product_name'],
                quantity=item_data['quantity'],
                unit=item_data['unit'],
                weight_kg=item_data.get('weight_kg'),
                dimensions=item_data.get('dimensions')
            )
            db.session.add(item)
        
        db.session.commit()
        return jsonify({'message': 'Shipment created successfully', 'shipping_id': order.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/orders', methods=['POST'])
@jwt_required()
def create_shipping_order():
    try:
        data = request.get_json()
        user_id = int(get_jwt_identity())
        
        shipping_number = generate_number('SHP', ShippingOrder, 'shipping_number')
        
        order = ShippingOrder(
            shipping_number=shipping_number,
            sales_order_id=data['sales_order_id'],
            customer_id=data['customer_id'],
            shipping_date=datetime.fromisoformat(data['shipping_date']),
            expected_delivery_date=datetime.fromisoformat(data['expected_delivery_date']) if data.get('expected_delivery_date') else None,
            logistics_provider_id=data.get('logistics_provider_id'),
            tracking_number=data.get('tracking_number'),
            vehicle_number=data.get('vehicle_number'),
            driver_name=data.get('driver_name'),
            shipping_address=data.get('shipping_address'),
            prepared_by=user_id
        )
        
        db.session.add(order)
        db.session.flush()
        
        for item_data in data.get('items', []):
            item = ShippingItem(
                shipping_id=order.id,
                product_id=item_data['product_id'],
                quantity=item_data['quantity'],
                uom=item_data['uom'],
                batch_number=item_data.get('batch_number')
            )
            db.session.add(item)
        
        db.session.commit()
        return jsonify({'message': 'Shipping order created', 'shipping_id': order.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/tracking', methods=['GET'])
@jwt_required()
def get_tracking():
    try:
        tracking_number = request.args.get('tracking_number')
        if not tracking_number:
            return jsonify(error_response('api.error', error_code=400)), 400
        
        # Find shipping order by tracking number
        shipping_order = ShippingOrder.query.filter_by(tracking_number=tracking_number).first()
        if not shipping_order:
            return jsonify(error_response('api.error', error_code=404)), 404
        
        # Get tracking history
        tracking_history = DeliveryTracking.query.filter_by(shipping_id=shipping_order.id).order_by(DeliveryTracking.tracking_date.desc()).all()
        
        return jsonify({
            'tracking_number': tracking_number,
            'status': shipping_order.status,
            'shipping_order': {
                'id': shipping_order.id,
                'shipping_number': shipping_order.shipping_number,
                'customer_name': shipping_order.customer.company_name if shipping_order.customer else 'Unknown',
                'shipping_date': shipping_order.shipping_date.isoformat(),
                'expected_delivery_date': shipping_order.expected_delivery_date.isoformat() if shipping_order.expected_delivery_date else None,
                'sender_name': 'PT. Gratia Makmur Sentosa',
                'sender_address': 'Jl. Industri No. 123, Tangerang',
                'sender_phone': '021-12345678',
                'recipient_name': shipping_order.customer.company_name if shipping_order.customer else 'Unknown',
                'recipient_address': shipping_order.shipping_address or 'Address not available',
                'recipient_phone': shipping_order.customer.phone if shipping_order.customer else 'Phone not available',
                'items': [{
                    'id': item.id,
                    'product_name': item.product.name if item.product else 'Unknown Product',
                    'quantity': float(item.quantity),
                    'weight': 1.0,  # Default weight
                    'length': 30,   # Default dimensions
                    'width': 20,
                    'height': 10
                } for item in shipping_order.items]
            },
            'logistics_provider': {
                'name': shipping_order.logistics_provider.company_name if shipping_order.logistics_provider else 'Unknown Provider'
            } if shipping_order.logistics_provider_id else None,
            'estimated_delivery': shipping_order.expected_delivery_date.isoformat() if shipping_order.expected_delivery_date else None,
            'tracking_history': [{
                'id': t.id,
                'status': t.status,
                'description': t.remarks or f"Status updated to {t.status}",
                'location': t.location or 'Unknown Location',
                'timestamp': t.tracking_date.isoformat()
            } for t in tracking_history]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/tracking', methods=['POST'])
@jwt_required()
def add_tracking():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        tracking = DeliveryTracking(
            shipping_id=data['shipping_id'],
            status=data['status'],
            location=data.get('location'),
            remarks=data.get('remarks'),
            updated_by=user_id
        )
        db.session.add(tracking)
        
        # Update shipping order status
        order = ShippingOrder.query.get(data['shipping_id'])
        order.status = data['status']
        
        db.session.commit()
        return jsonify(success_response('api.success'))
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/providers', methods=['GET'])
@jwt_required()
def get_providers():
    try:
        providers = LogisticsProvider.query.all()
        return jsonify({
            'logistics_providers': [{
                'id': p.id,
                'name': p.company_name,
                'service_type': p.service_type or 'regular',
                'contact_info': p.email or p.phone or '',
                'pricing_model': 'weight_based',  # Default for now
                'is_active': p.is_active,
                'created_at': p.created_at.isoformat()
            } for p in providers]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/providers', methods=['POST'])
@jwt_required()
def create_provider():
    try:
        data = request.get_json()
        
        # Generate provider code
        code = f"LP{datetime.now().strftime('%Y%m%d')}{LogisticsProvider.query.count() + 1:03d}"
        
        provider = LogisticsProvider(
            code=code,
            company_name=data['name'],
            service_type=data.get('service_type', 'regular'),
            phone=data.get('contact_info', '') if '@' not in data.get('contact_info', '') else None,
            email=data.get('contact_info', '') if '@' in data.get('contact_info', '') else None,
            is_active=data.get('is_active', True)
        )
        
        db.session.add(provider)
        db.session.commit()
        
        return jsonify({
            'message': 'Provider created successfully',
            'provider_id': provider.id
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/providers/<int:id>', methods=['PUT'])
@jwt_required()
def update_provider(id):
    try:
        provider = LogisticsProvider.query.get_or_404(id)
        data = request.get_json()
        
        provider.company_name = data.get('name', provider.company_name)
        provider.service_type = data.get('service_type', provider.service_type)
        provider.is_active = data.get('is_active', provider.is_active)
        
        contact_info = data.get('contact_info', '')
        if '@' in contact_info:
            provider.email = contact_info
            provider.phone = None
        else:
            provider.phone = contact_info
            provider.email = None
        
        db.session.commit()
        
        return jsonify(success_response('api.success'))
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/providers/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_provider(id):
    try:
        provider = LogisticsProvider.query.get_or_404(id)
        
        # Check if provider is used in any shipping orders
        if ShippingOrder.query.filter_by(logistics_provider_id=id).first():
            return jsonify(error_response('api.error', error_code=400)), 400
        
        db.session.delete(provider)
        db.session.commit()
        
        return jsonify(success_response('api.success'))
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/orders/<int:order_id>', methods=['GET'])
@jwt_required()
def get_shipping_order(order_id):
    try:
        order = ShippingOrder.query.get_or_404(order_id)
        
        return jsonify({
            'shipping_order': {
                'id': order.id,
                'shipping_number': order.shipping_number,
                'customer_id': order.customer_id,
                'customer_name': order.customer.company_name if order.customer else None,
                'shipping_date': order.shipping_date.isoformat(),
                'expected_delivery_date': order.expected_delivery_date.isoformat() if order.expected_delivery_date else None,
                'actual_delivery_date': order.actual_delivery_date.isoformat() if order.actual_delivery_date else None,
                'shipping_method': order.shipping_method,
                'carrier': order.carrier,
                'tracking_number': order.tracking_number,
                'driver_name': order.driver_name,
                'driver_phone': order.driver_phone,
                'vehicle_number': order.vehicle_number,
                'status': order.status,
                'shipping_cost': float(order.shipping_cost) if order.shipping_cost else 0,
                'insurance_cost': float(order.insurance_cost) if order.insurance_cost else 0,
                'total_weight': float(order.total_weight) if order.total_weight else 0,
                'total_volume': float(order.total_volume) if order.total_volume else 0,
                'destination_address': order.destination_address,
                'destination_city': order.destination_city,
                'destination_postal_code': order.destination_postal_code,
                'special_instructions': order.special_instructions,
                'notes': order.notes,
                'created_at': order.created_at.isoformat(),
                'updated_at': order.updated_at.isoformat(),
                'items': [{
                    'id': item.id,
                    'product_name': item.product_name,
                    'quantity': item.quantity,
                    'unit_weight': float(item.unit_weight) if item.unit_weight else 0,
                    'unit_volume': float(item.unit_volume) if item.unit_volume else 0,
                    'description': item.description
                } for item in order.items] if order.items else []
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_shipping_order(order_id):
    try:
        order = ShippingOrder.query.get_or_404(order_id)
        data = request.get_json()
        
        # Update order fields
        if 'customer_id' in data:
            order.customer_id = data['customer_id']
        if 'shipping_date' in data:
            order.shipping_date = datetime.fromisoformat(data['shipping_date'])
        if 'expected_delivery_date' in data:
            order.expected_delivery_date = datetime.fromisoformat(data['expected_delivery_date']) if data['expected_delivery_date'] else None
        if 'actual_delivery_date' in data:
            order.actual_delivery_date = datetime.fromisoformat(data['actual_delivery_date']) if data['actual_delivery_date'] else None
        if 'shipping_method' in data:
            order.shipping_method = data['shipping_method']
        if 'carrier' in data:
            order.carrier = data['carrier']
        if 'tracking_number' in data:
            order.tracking_number = data['tracking_number']
        if 'driver_name' in data:
            order.driver_name = data['driver_name']
        if 'driver_phone' in data:
            order.driver_phone = data['driver_phone']
        if 'vehicle_number' in data:
            order.vehicle_number = data['vehicle_number']
        if 'status' in data:
            order.status = data['status']
        if 'shipping_cost' in data:
            order.shipping_cost = data['shipping_cost']
        if 'insurance_cost' in data:
            order.insurance_cost = data['insurance_cost']
        if 'total_weight' in data:
            order.total_weight = data['total_weight']
        if 'total_volume' in data:
            order.total_volume = data['total_volume']
        if 'destination_address' in data:
            order.destination_address = data['destination_address']
        if 'destination_city' in data:
            order.destination_city = data['destination_city']
        if 'destination_postal_code' in data:
            order.destination_postal_code = data['destination_postal_code']
        if 'special_instructions' in data:
            order.special_instructions = data['special_instructions']
        if 'notes' in data:
            order.notes = data['notes']
        
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@jwt_required()
def delete_shipping_order(order_id):
    try:
        order = ShippingOrder.query.get_or_404(order_id)
        
        # Check if order can be deleted (not shipped yet)
        if order.status in ['shipped', 'delivered']:
            return jsonify(error_response('api.error', error_code=400)), 400
        
        # Delete related items first
        ShippingItem.query.filter_by(shipping_order_id=order_id).delete()
        
        # Delete tracking records
        DeliveryTracking.query.filter_by(shipping_order_id=order_id).delete()
        
        # Delete the order
        db.session.delete(order)
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/tracking/<tracking_number>', methods=['PUT'])
@jwt_required()
def update_tracking_status(tracking_number):
    try:
        # Find the shipping order by tracking number
        order = ShippingOrder.query.filter_by(tracking_number=tracking_number).first()
        if not order:
            return jsonify(error_response('api.error', error_code=404)), 404
        
        data = request.get_json()
        
        # Create new tracking record
        tracking = DeliveryTracking(
            shipping_order_id=order.id,
            tracking_number=tracking_number,
            status=data['status'],
            location=data.get('location'),
            timestamp=datetime.fromisoformat(data['timestamp']) if data.get('timestamp') else datetime.utcnow(),
            notes=data.get('notes'),
            updated_by=get_jwt_identity()
        )
        
        db.session.add(tracking)
        
        # Update order status if needed
        if 'order_status' in data:
            order.status = data['order_status']
            
        # Update delivery date if delivered
        if data['status'] == 'delivered' and not order.actual_delivery_date:
            order.actual_delivery_date = tracking.timestamp
        
        order.updated_at = datetime.utcnow()
        
        db.session.commit()
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shipping_bp.route('/available-sales-orders', methods=['GET'])
@jwt_required()
def get_available_sales_orders():
    """Get sales orders that are ready for shipping"""
    try:
        from models.sales import SalesOrder
        
        # Get confirmed sales orders that don't have shipping yet or are ready for shipping
        available_orders = SalesOrder.query.filter(
            SalesOrder.status.in_(['confirmed', 'in_production', 'ready'])
        ).all()
        
        # Filter out orders that already have shipping
        orders_without_shipping = []
        for order in available_orders:
            # Check if order already has shipping
            has_shipping = any(shipping.status not in ['cancelled'] for shipping in order.shipping_orders)
            if not has_shipping:
                orders_without_shipping.append(order)
        
        orders_data = []
        for order in orders_without_shipping:
            orders_data.append({
                'id': order.id,
                'order_number': order.order_number,
                'customer_name': order.customer.company_name if order.customer else 'Unknown',
                'customer_id': order.customer_id,
                'order_date': order.order_date.isoformat(),
                'delivery_date': order.delivery_date.isoformat() if order.delivery_date else None,
                'total_amount': float(order.total_amount),
                'status': order.status,
                'delivery_address': order.delivery_address,
                'items': [{
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else item.description,
                    'quantity': float(item.quantity),
                    'uom': item.uom,
                    'unit_price': float(item.unit_price)
                } for item in order.items]
            })
        
        return jsonify({
            'available_orders': orders_data,
            'total_count': len(orders_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
