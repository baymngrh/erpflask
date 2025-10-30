from datetime import datetime
from . import db

class LogisticsProvider(db.Model):
    __tablename__ = 'logistics_providers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    company_name = db.Column(db.String(255), nullable=False)
    contact_person = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(50), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    service_type = db.Column(db.String(100), nullable=True)  # land, sea, air, courier
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    rating = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shipping_orders = db.relationship('ShippingOrder', back_populates='logistics_provider')

class ShippingOrder(db.Model):
    __tablename__ = 'shipping_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    shipping_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_orders.id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    shipping_date = db.Column(db.Date, nullable=False)
    expected_delivery_date = db.Column(db.Date, nullable=True)
    actual_delivery_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='preparing')  # preparing, packed, shipped, in_transit, delivered, cancelled
    logistics_provider_id = db.Column(db.Integer, db.ForeignKey('logistics_providers.id'), nullable=True)
    tracking_number = db.Column(db.String(200), nullable=True)
    vehicle_number = db.Column(db.String(50), nullable=True)
    driver_name = db.Column(db.String(200), nullable=True)
    driver_phone = db.Column(db.String(50), nullable=True)
    shipping_address = db.Column(db.Text, nullable=True)
    shipping_cost = db.Column(db.Numeric(15, 2), default=0)
    total_weight = db.Column(db.Numeric(15, 3), default=0)
    total_volume = db.Column(db.Numeric(15, 3), default=0)
    number_of_packages = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text, nullable=True)
    prepared_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sales_order = db.relationship('SalesOrder', back_populates='shipping_orders')
    customer = db.relationship('Customer')
    logistics_provider = db.relationship('LogisticsProvider', back_populates='shipping_orders')
    items = db.relationship('ShippingItem', back_populates='shipping_order', cascade='all, delete-orphan')
    tracking = db.relationship('DeliveryTracking', back_populates='shipping_order', cascade='all, delete-orphan')
    prepared_by_user = db.relationship('User')

class ShippingItem(db.Model):
    __tablename__ = 'shipping_items'
    
    id = db.Column(db.Integer, primary_key=True)
    shipping_id = db.Column(db.Integer, db.ForeignKey('shipping_orders.id', ondelete='CASCADE'), nullable=False)
    sales_order_item_id = db.Column(db.Integer, db.ForeignKey('sales_order_items.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Numeric(15, 2), nullable=False)
    uom = db.Column(db.String(20), nullable=False)
    batch_number = db.Column(db.String(100), nullable=True)
    package_numbers = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    shipping_order = db.relationship('ShippingOrder', back_populates='items')
    sales_order_item = db.relationship('SalesOrderItem')
    product = db.relationship('Product')

class DeliveryTracking(db.Model):
    __tablename__ = 'delivery_tracking'
    
    id = db.Column(db.Integer, primary_key=True)
    shipping_id = db.Column(db.Integer, db.ForeignKey('shipping_orders.id', ondelete='CASCADE'), nullable=False)
    tracking_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(50), nullable=False)
    location = db.Column(db.String(200), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    shipping_order = db.relationship('ShippingOrder', back_populates='tracking')
    user = db.relationship('User')
