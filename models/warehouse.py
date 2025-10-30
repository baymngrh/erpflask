from datetime import datetime
from . import db

class WarehouseZone(db.Model):
    __tablename__ = 'warehouse_zones'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    material_type = db.Column(db.String(50), nullable=False)  # finished_goods, raw_materials, packaging_materials, chemical_materials
    capacity = db.Column(db.Numeric(15, 2), nullable=True)
    capacity_uom = db.Column(db.String(20), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    locations = db.relationship('WarehouseLocation', back_populates='zone', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<WarehouseZone {self.code} - {self.name}>'

class WarehouseLocation(db.Model):
    __tablename__ = 'warehouse_locations'
    
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, db.ForeignKey('warehouse_zones.id', ondelete='CASCADE'), nullable=False)
    location_code = db.Column(db.String(100), unique=True, nullable=False, index=True)  # ZONE-RACK-LEVEL-POSITION
    rack = db.Column(db.String(50), nullable=False)
    level = db.Column(db.String(50), nullable=False)
    position = db.Column(db.String(50), nullable=False)
    capacity = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    capacity_uom = db.Column(db.String(20), nullable=False)
    occupied = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    zone = db.relationship('WarehouseZone', back_populates='locations')
    inventory_records = db.relationship('Inventory', back_populates='location', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Location {self.location_code}>'

class Inventory(db.Model):
    __tablename__ = 'inventory'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('warehouse_locations.id', ondelete='CASCADE'), nullable=False)
    quantity = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    reserved_quantity = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    available_quantity = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    batch_number = db.Column(db.String(100), nullable=True, index=True)
    lot_number = db.Column(db.String(100), nullable=True)
    serial_number = db.Column(db.String(100), nullable=True)
    production_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)
    last_stock_check = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product', back_populates='inventory_records')
    location = db.relationship('WarehouseLocation', back_populates='inventory_records')
    
    __table_args__ = (
        db.Index('idx_product_location', 'product_id', 'location_id'),
        db.UniqueConstraint('product_id', 'location_id', 'batch_number', name='unique_inventory_item'),
    )

class InventoryMovement(db.Model):
    __tablename__ = 'inventory_movements'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    from_location_id = db.Column(db.Integer, db.ForeignKey('warehouse_locations.id'), nullable=True)
    to_location_id = db.Column(db.Integer, db.ForeignKey('warehouse_locations.id'), nullable=True)
    movement_type = db.Column(db.String(50), nullable=False)  # receive, issue, transfer, adjust
    reference_type = db.Column(db.String(50), nullable=True)  # sales_order, purchase_order, work_order
    reference_id = db.Column(db.Integer, nullable=True)
    quantity = db.Column(db.Numeric(15, 2), nullable=False)
    uom = db.Column(db.String(20), nullable=False)
    batch_number = db.Column(db.String(100), nullable=True)
    lot_number = db.Column(db.String(100), nullable=True)
    serial_number = db.Column(db.String(100), nullable=True)
    unit_cost = db.Column(db.Numeric(15, 4), nullable=True)
    total_cost = db.Column(db.Numeric(15, 2), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    movement_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    performed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    product = db.relationship('Product')
    from_location = db.relationship('WarehouseLocation', foreign_keys=[from_location_id])
    to_location = db.relationship('WarehouseLocation', foreign_keys=[to_location_id])
    performed_by_user = db.relationship('User')
    
    def __repr__(self):
        return f'<InventoryMovement {self.movement_type} - {self.quantity} {self.uom}>'
    
    __table_args__ = (
        db.Index('idx_reference', 'reference_type', 'reference_id'),
    )
