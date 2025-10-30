from datetime import datetime
from . import db

class Machine(db.Model):
    __tablename__ = 'machines'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    machine_type = db.Column(db.String(100), nullable=False)  # nonwoven_machine, cutting_machine, packing_machine
    manufacturer = db.Column(db.String(200), nullable=True)
    model = db.Column(db.String(100), nullable=True)
    serial_number = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='idle')  # idle, running, maintenance, breakdown, offline
    location = db.Column(db.String(200), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    capacity_per_hour = db.Column(db.Numeric(15, 2), nullable=True)
    capacity_uom = db.Column(db.String(20), nullable=True)
    efficiency = db.Column(db.Numeric(5, 2), default=100)  # percentage
    availability = db.Column(db.Numeric(5, 2), default=100)  # percentage
    last_maintenance = db.Column(db.Date, nullable=True)
    next_maintenance = db.Column(db.Date, nullable=True)
    installation_date = db.Column(db.Date, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    work_orders = db.relationship('WorkOrder', back_populates='machine')
    production_records = db.relationship('ProductionRecord', back_populates='machine')
    maintenance_records = db.relationship('MaintenanceRecord', back_populates='machine')
    oee_records = db.relationship('OEERecord', back_populates='machine')
    rosters = db.relationship('EmployeeRoster', back_populates='machine')
    shift_productions = db.relationship('ShiftProduction', back_populates='machine')
    downtime_records = db.relationship('DowntimeRecord', back_populates='machine')
    
    def __repr__(self):
        return f'<Machine {self.code} - {self.name}>'

class BillOfMaterials(db.Model):
    __tablename__ = 'bill_of_materials'
    
    id = db.Column(db.Integer, primary_key=True)
    bom_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    version = db.Column(db.String(20), nullable=False, default='1.0')
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    effective_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)
    batch_size = db.Column(db.Numeric(15, 2), nullable=False, default=1)
    batch_uom = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product')
    items = db.relationship('BOMItem', back_populates='bom', cascade='all, delete-orphan')
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    approved_by_user = db.relationship('User', foreign_keys=[approved_by])
    
    # MRP Integration
    mrp_requirements = db.relationship('MRPRequirement', back_populates='bom')
    work_orders = db.relationship('WorkOrder', back_populates='bom')

    @property
    def total_cost(self):
        """Calculate total cost of all BOM items"""
        return sum(item.total_cost for item in self.items)

    @property
    def total_materials(self):
        """Count total number of materials in BOM"""
        return len(self.items)

    @property
    def critical_materials(self):
        """Count critical materials in BOM"""
        return len([item for item in self.items if item.is_critical])

class BOMItem(db.Model):
    __tablename__ = 'bom_items'
    
    id = db.Column(db.Integer, primary_key=True)
    bom_id = db.Column(db.Integer, db.ForeignKey('bill_of_materials.id', ondelete='CASCADE'), nullable=False)
    line_number = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    material_id = db.Column(db.Integer, db.ForeignKey('materials.id'), nullable=True)
    quantity = db.Column(db.Numeric(15, 4), nullable=False)
    uom = db.Column(db.String(20), nullable=False)
    scrap_percent = db.Column(db.Numeric(5, 2), default=0)
    is_critical = db.Column(db.Boolean, default=False)
    unit_cost = db.Column(db.Numeric(15, 4), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    lead_time_days = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    bom = db.relationship('BillOfMaterials', back_populates='items')
    product = db.relationship('Product', back_populates='bom_items')
    material = db.relationship('Material', back_populates='bom_items')
    supplier = db.relationship('Supplier', backref='bom_items')
    
    __table_args__ = (
        db.UniqueConstraint('bom_id', 'line_number', name='unique_bom_line'),
    )

    @property
    def item_name(self):
        """Get the name of the material or product"""
        if self.material:
            return self.material.name
        elif self.product:
            return self.product.name
        return "Unknown Item"

    @property
    def item_code(self):
        """Get the code of the material or product"""
        if self.material:
            return self.material.code
        elif self.product:
            return self.product.code
        return "Unknown Code"

    @property
    def item_type(self):
        """Get the type of item (material or product)"""
        if self.material:
            return self.material.material_type
        elif self.product:
            return self.product.material_type
        return "unknown"

    @property
    def effective_quantity(self):
        """Calculate quantity including scrap percentage"""
        base_quantity = float(self.quantity)
        scrap_quantity = base_quantity * (float(self.scrap_percent) / 100)
        return base_quantity + scrap_quantity

    @property
    def total_cost(self):
        """Calculate total cost for this BOM item"""
        if self.unit_cost:
            return float(self.effective_quantity) * float(self.unit_cost)
        elif self.material and self.material.cost_per_unit:
            return float(self.effective_quantity) * float(self.material.cost_per_unit)
        elif self.product and self.product.cost:
            return float(self.effective_quantity) * float(self.product.cost)
        return 0

    @property
    def current_stock(self):
        """Get current stock level from warehouse"""
        if self.material:
            # Get from material inventory
            from .warehouse import Inventory
            inventory = Inventory.query.filter_by(
                material_id=self.material_id,
                is_active=True
            ).first()
            return float(inventory.quantity_on_hand) if inventory else 0
        elif self.product:
            # Get from product inventory
            from .warehouse import Inventory
            inventory = Inventory.query.filter_by(
                product_id=self.product_id,
                is_active=True
            ).first()
            return float(inventory.quantity_on_hand) if inventory else 0
        return 0

    @property
    def shortage_quantity(self):
        """Calculate shortage for production requirements"""
        required_qty = float(self.effective_quantity)
        available_qty = self.current_stock
        return max(0, required_qty - available_qty)

    @property
    def is_shortage(self):
        """Check if there's a shortage for this item"""
        return self.shortage_quantity > 0

class WorkOrder(db.Model):
    __tablename__ = 'work_orders'
    
    id = db.Column(db.Integer, primary_key=True)
    wo_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    bom_id = db.Column(db.Integer, db.ForeignKey('bill_of_materials.id'), nullable=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_orders.id'), nullable=True)
    required_date = db.Column(db.Date, nullable=True)
    uom = db.Column(db.String(20), nullable=False)
    quantity_produced = db.Column(db.Numeric(15, 2), default=0)
    quantity_good = db.Column(db.Numeric(15, 2), default=0)
    quantity_scrap = db.Column(db.Numeric(15, 2), default=0)
    status = db.Column(db.String(50), nullable=False, default='planned')  # planned, released, in_progress, completed, cancelled
    priority = db.Column(db.String(20), nullable=False, default='normal')  # low, normal, high, urgent
    
    # Workflow Integration Fields
    mrp_requirement_id = db.Column(db.Integer, nullable=True)  # Link to MRP requirement
    workflow_status = db.Column(db.String(50), nullable=False, default='pending')  # pending, mrp_analyzed, scheduled, in_production
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=True)
    scheduled_start_date = db.Column(db.DateTime, nullable=True)
    scheduled_end_date = db.Column(db.DateTime, nullable=True)
    actual_start_date = db.Column(db.DateTime, nullable=True)
    actual_end_date = db.Column(db.DateTime, nullable=True)
    production_shift = db.Column(db.String(50), nullable=True)
    batch_number = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = db.relationship('Product', back_populates='work_orders')
    bom = db.relationship('BillOfMaterials')
    sales_order = db.relationship('SalesOrder')
    machine = db.relationship('Machine', back_populates='work_orders')
    production_records = db.relationship('ProductionRecord', back_populates='work_order', cascade='all, delete-orphan')
    created_by_user = db.relationship('User')
    supervisor = db.relationship('Employee')

class ProductionRecord(db.Model):
    __tablename__ = 'production_records'
    
    id = db.Column(db.Integer, primary_key=True)
    work_order_id = db.Column(db.Integer, db.ForeignKey('work_orders.id', ondelete='CASCADE'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=True)
    operator_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    production_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    shift = db.Column(db.String(50), nullable=True)
    quantity_produced = db.Column(db.Numeric(15, 2), nullable=False)
    quantity_good = db.Column(db.Numeric(15, 2), nullable=False)
    quantity_scrap = db.Column(db.Numeric(15, 2), default=0)
    uom = db.Column(db.String(20), nullable=False)
    downtime_minutes = db.Column(db.Integer, default=0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    work_order = db.relationship('WorkOrder', back_populates='production_records')
    machine = db.relationship('Machine', back_populates='production_records')
    operator = db.relationship('Employee')
    
    __table_args__ = (
        db.Index('idx_production_date', 'production_date'),
    )

class ProductionSchedule(db.Model):
    __tablename__ = 'production_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    schedule_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    work_order_id = db.Column(db.Integer, db.ForeignKey('work_orders.id'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=False)
    scheduled_start = db.Column(db.DateTime, nullable=False)
    scheduled_end = db.Column(db.DateTime, nullable=False)
    actual_start = db.Column(db.DateTime, nullable=True)
    actual_end = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='scheduled')  # scheduled, in_progress, completed, cancelled
    shift = db.Column(db.String(50), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    work_order = db.relationship('WorkOrder')
    machine = db.relationship('Machine')
    user = db.relationship('User')

class ShiftProduction(db.Model):
    __tablename__ = 'shift_productions'
    
    id = db.Column(db.Integer, primary_key=True)
    production_date = db.Column(db.Date, nullable=False, index=True)
    shift = db.Column(db.String(20), nullable=False)  # shift_1, shift_2, shift_3
    shift_start = db.Column(db.Time, nullable=False)
    shift_end = db.Column(db.Time, nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    work_order_id = db.Column(db.Integer, db.ForeignKey('work_orders.id'), nullable=True)
    
    # Production Data
    target_quantity = db.Column(db.Numeric(15, 2), nullable=False)
    actual_quantity = db.Column(db.Numeric(15, 2), nullable=False)
    good_quantity = db.Column(db.Numeric(15, 2), nullable=False)
    reject_quantity = db.Column(db.Numeric(15, 2), default=0)
    rework_quantity = db.Column(db.Numeric(15, 2), default=0)
    uom = db.Column(db.String(20), nullable=False)
    
    # Efficiency Metrics
    planned_runtime = db.Column(db.Integer, nullable=False)  # minutes
    actual_runtime = db.Column(db.Integer, nullable=False)  # minutes
    downtime_minutes = db.Column(db.Integer, default=0)
    setup_time = db.Column(db.Integer, default=0)  # minutes
    
    # Quality Data
    quality_rate = db.Column(db.Numeric(5, 2), default=100)  # percentage
    efficiency_rate = db.Column(db.Numeric(5, 2), default=100)  # percentage
    oee_score = db.Column(db.Numeric(5, 2), default=100)  # percentage
    
    # Operator Information
    operator_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    supervisor_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    
    # Additional Information
    notes = db.Column(db.Text, nullable=True)
    issues = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), default='completed')  # planned, running, completed, cancelled
    
    # Audit Fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    machine = db.relationship('Machine', back_populates='shift_productions')
    product = db.relationship('Product')
    work_order = db.relationship('WorkOrder')
    operator = db.relationship('Employee', foreign_keys=[operator_id])
    supervisor = db.relationship('Employee', foreign_keys=[supervisor_id])
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    approved_by_user = db.relationship('User', foreign_keys=[approved_by])
    downtime_records = db.relationship('DowntimeRecord', back_populates='shift_production')
    
    def __repr__(self):
        return f'<ShiftProduction {self.production_date} {self.shift} - {self.machine.name}>'

class DowntimeRecord(db.Model):
    __tablename__ = 'downtime_records'
    
    id = db.Column(db.Integer, primary_key=True)
    shift_production_id = db.Column(db.Integer, db.ForeignKey('shift_productions.id'), nullable=False)
    machine_id = db.Column(db.Integer, db.ForeignKey('machines.id'), nullable=False)
    downtime_date = db.Column(db.Date, nullable=False, index=True)
    
    # Downtime Details
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    
    # Downtime Classification
    downtime_type = db.Column(db.String(50), nullable=False)  # planned, unplanned
    downtime_category = db.Column(db.String(100), nullable=False)  # breakdown, maintenance, setup, material_shortage, quality_issue, operator_break
    downtime_reason = db.Column(db.String(200), nullable=False)
    root_cause = db.Column(db.Text, nullable=True)
    
    # Impact Assessment
    production_loss = db.Column(db.Numeric(15, 2), default=0)  # quantity lost
    cost_impact = db.Column(db.Numeric(15, 2), default=0)  # cost in IDR
    
    # Resolution
    action_taken = db.Column(db.Text, nullable=True)
    resolved_by = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=True)
    prevention_action = db.Column(db.Text, nullable=True)
    
    # Status
    status = db.Column(db.String(50), default='open')  # open, investigating, resolved, closed
    priority = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    
    # Audit Fields
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    shift_production = db.relationship('ShiftProduction', back_populates='downtime_records')
    machine = db.relationship('Machine', back_populates='downtime_records')
    resolved_by_employee = db.relationship('Employee', foreign_keys=[resolved_by])
    reported_by_user = db.relationship('User', foreign_keys=[reported_by])
    
    def __repr__(self):
        return f'<DowntimeRecord {self.machine.name} - {self.downtime_category}>'
