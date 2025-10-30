from datetime import datetime
from . import db

class CostCenter(db.Model):
    __tablename__ = 'cost_centers'
    
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    invoice_type = db.Column(db.String(50), nullable=False)  # sales, purchase
    invoice_date = db.Column(db.Date, nullable=False, index=True)
    due_date = db.Column(db.Date, nullable=True)
    sales_order_id = db.Column(db.Integer, db.ForeignKey('sales_orders.id'), nullable=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey('purchase_orders.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='draft')  # draft, sent, partial, paid, overdue, cancelled
    currency = db.Column(db.String(10), nullable=False, default='IDR')
    exchange_rate = db.Column(db.Numeric(15, 6), default=1)
    subtotal = db.Column(db.Numeric(15, 2), default=0)
    tax_amount = db.Column(db.Numeric(15, 2), default=0)
    discount_amount = db.Column(db.Numeric(15, 2), default=0)
    total_amount = db.Column(db.Numeric(15, 2), default=0)
    paid_amount = db.Column(db.Numeric(15, 2), default=0)
    balance_due = db.Column(db.Numeric(15, 2), default=0)
    payment_terms = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sales_order = db.relationship('SalesOrder', back_populates='invoices')
    purchase_order = db.relationship('PurchaseOrder')
    customer = db.relationship('Customer')
    supplier = db.relationship('Supplier')
    items = db.relationship('InvoiceItem', back_populates='invoice', cascade='all, delete-orphan')
    payments = db.relationship('Payment', back_populates='invoice')
    created_by_user = db.relationship('User')

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id', ondelete='CASCADE'), nullable=False)
    line_number = db.Column(db.Integer, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(15, 2), nullable=False)
    uom = db.Column(db.String(20), nullable=True)
    unit_price = db.Column(db.Numeric(15, 2), nullable=False)
    discount_percent = db.Column(db.Numeric(5, 2), default=0)
    discount_amount = db.Column(db.Numeric(15, 2), default=0)
    tax_percent = db.Column(db.Numeric(5, 2), default=0)
    tax_amount = db.Column(db.Numeric(15, 2), default=0)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    invoice = db.relationship('Invoice', back_populates='items')
    product = db.relationship('Product')
    
    __table_args__ = (
        db.UniqueConstraint('invoice_id', 'line_number', name='unique_invoice_line'),
    )

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    payment_date = db.Column(db.Date, nullable=False, index=True)
    payment_type = db.Column(db.String(50), nullable=False)  # receipt, payment
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.id'), nullable=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('suppliers.id'), nullable=True)
    payment_method = db.Column(db.String(50), nullable=False)  # cash, bank_transfer, check, credit_card
    amount = db.Column(db.Numeric(15, 2), nullable=False)
    currency = db.Column(db.String(10), nullable=False, default='IDR')
    exchange_rate = db.Column(db.Numeric(15, 6), default=1)
    reference_number = db.Column(db.String(100), nullable=True)
    bank_account = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='pending')  # pending, cleared, bounced, cancelled
    notes = db.Column(db.Text, nullable=True)
    received_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    invoice = db.relationship('Invoice', back_populates='payments')
    customer = db.relationship('Customer')
    supplier = db.relationship('Supplier')
    received_by_user = db.relationship('User')

class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    account_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    account_name = db.Column(db.String(200), nullable=False)
    account_type = db.Column(db.String(50), nullable=False)  # asset, liability, equity, revenue, expense
    parent_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)
    level = db.Column(db.Integer, default=1)
    is_active = db.Column(db.Boolean, default=True)
    is_header = db.Column(db.Boolean, default=False)
    normal_balance = db.Column(db.String(10), nullable=False)  # debit, credit
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship
    children = db.relationship('Account', backref=db.backref('parent', remote_side=[id]))
    
    @property
    def balance(self):
        """Calculate account balance from accounting entries"""
        entries = AccountingEntry.query.filter_by(account_code=self.account_code, status='posted').all()
        debit_total = sum(float(entry.debit_amount or 0) for entry in entries)
        credit_total = sum(float(entry.credit_amount or 0) for entry in entries)
        
        if self.normal_balance == 'debit':
            return debit_total - credit_total
        else:
            return credit_total - debit_total

class Budget(db.Model):
    __tablename__ = 'budgets'
    
    id = db.Column(db.Integer, primary_key=True)
    budget_name = db.Column(db.String(200), nullable=False)
    budget_year = db.Column(db.Integer, nullable=False)
    budget_period = db.Column(db.String(50), nullable=False)  # annual, quarterly, monthly
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), default='draft')  # draft, approved, active, closed
    total_budget = db.Column(db.Numeric(15, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    lines = db.relationship('BudgetLine', back_populates='budget', cascade='all, delete-orphan')
    created_by_user = db.relationship('User', foreign_keys=[created_by])
    approved_by_user = db.relationship('User', foreign_keys=[approved_by])

class BudgetLine(db.Model):
    __tablename__ = 'budget_lines'
    
    id = db.Column(db.Integer, primary_key=True)
    budget_id = db.Column(db.Integer, db.ForeignKey('budgets.id', ondelete='CASCADE'), nullable=False)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    budget_amount = db.Column(db.Numeric(15, 2), nullable=False)
    actual_amount = db.Column(db.Numeric(15, 2), default=0)
    variance_amount = db.Column(db.Numeric(15, 2), default=0)
    variance_percent = db.Column(db.Numeric(5, 2), default=0)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    budget = db.relationship('Budget', back_populates='lines')
    account = db.relationship('Account')

class AccountingEntry(db.Model):
    __tablename__ = 'accounting_entries'
    
    id = db.Column(db.Integer, primary_key=True)
    entry_number = db.Column(db.String(100), unique=True, nullable=False, index=True)
    entry_date = db.Column(db.Date, nullable=False, index=True)
    entry_type = db.Column(db.String(50), nullable=False)  # general, sales, purchase, payment
    reference_type = db.Column(db.String(50), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)
    reference_number = db.Column(db.String(100), nullable=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=True)
    account_code = db.Column(db.String(50), nullable=False)
    account_name = db.Column(db.String(200), nullable=False)
    debit_amount = db.Column(db.Numeric(15, 2), default=0)
    credit_amount = db.Column(db.Numeric(15, 2), default=0)
    cost_center_id = db.Column(db.Integer, db.ForeignKey('cost_centers.id'), nullable=True)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='draft')  # draft, posted, reversed
    posted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    posted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    account = db.relationship('Account')
    cost_center = db.relationship('CostCenter')
    posted_by_user = db.relationship('User')
