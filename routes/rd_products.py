from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ProductDevelopment, ResearchProject, Prototype, ProductTestResult, User
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime, date
from sqlalchemy import or_
import json

rd_products_bp = Blueprint('rd_products', __name__)

# ===============================
# PRODUCT DEVELOPMENT MANAGEMENT
# ===============================

@rd_products_bp.route('/', methods=['GET'])
@jwt_required()
def get_product_developments():
    """Get all product developments with filtering and pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        project_id = request.args.get('project_id', type=int)
        status = request.args.get('status')
        development_stage = request.args.get('development_stage')
        product_type = request.args.get('product_type')
        search = request.args.get('search')
        
        query = ProductDevelopment.query
        
        # Apply filters
        if project_id:
            query = query.filter(ProductDevelopment.project_id == project_id)
        if status:
            query = query.filter(ProductDevelopment.status == status)
        if development_stage:
            query = query.filter(ProductDevelopment.development_stage == development_stage)
        if product_type:
            query = query.filter(ProductDevelopment.product_type == product_type)
        if search:
            query = query.filter(
                or_(
                    ProductDevelopment.product_name.ilike(f'%{search}%'),
                    ProductDevelopment.development_number.ilike(f'%{search}%'),
                    ProductDevelopment.product_category.ilike(f'%{search}%')
                )
            )
        
        developments = query.order_by(ProductDevelopment.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'developments': [{
                'id': d.id,
                'development_number': d.development_number,
                'product_name': d.product_name,
                'product_category': d.product_category,
                'product_type': d.product_type,
                'project_id': d.project_id,
                'project_name': d.project.project_name if d.project else None,
                'current_version': d.current_version,
                'development_stage': d.development_stage,
                'status': d.status,
                'market_potential': d.market_potential,
                'target_launch_date': d.target_launch_date.isoformat() if d.target_launch_date else None,
                'actual_launch_date': d.actual_launch_date.isoformat() if d.actual_launch_date else None,
                'estimated_development_cost': float(d.estimated_development_cost) if d.estimated_development_cost else 0,
                'actual_development_cost': float(d.actual_development_cost) if d.actual_development_cost else 0,
                'target_selling_price': float(d.target_selling_price) if d.target_selling_price else 0,
                'roi_projection': float(d.roi_projection) if d.roi_projection else None,
                'development_progress': d.development_progress,
                'created_by': d.created_by_user.username if d.created_by_user else None,
                'approved_by': d.approved_by_user.username if d.approved_by_user else None,
                'approved_at': d.approved_at.isoformat() if d.approved_at else None,
                'prototypes_count': len(d.prototypes),
                'test_results_count': len(d.test_results),
                'created_at': d.created_at.isoformat(),
                'updated_at': d.updated_at.isoformat() if d.updated_at else None
            } for d in developments.items],
            'total': developments.total,
            'pages': developments.pages,
            'current_page': developments.page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rd_products_bp.route('/', methods=['POST'])
@jwt_required()
def create_product_development():
    """Create new product development"""
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Generate development number
        development_number = generate_number('PD', ProductDevelopment, 'development_number')
        
        # Parse dates
        target_launch_date = None
        if data.get('target_launch_date'):
            target_launch_date = datetime.strptime(data['target_launch_date'], '%Y-%m-%d').date()
        
        # Create product development
        development = ProductDevelopment(
            development_number=development_number,
            project_id=data.get('project_id'),
            product_name=data['product_name'],
            product_category=data.get('product_category'),
            product_type=data.get('product_type', 'new'),
            target_specifications=json.dumps(data.get('target_specifications', {})),
            current_specifications=json.dumps(data.get('current_specifications', {})),
            current_version=data.get('current_version', '1.0'),
            development_stage=data.get('development_stage', 'concept'),
            target_launch_date=target_launch_date,
            status=data.get('status', 'concept'),
            market_potential=data.get('market_potential'),
            target_market=data.get('target_market'),
            competitive_analysis=data.get('competitive_analysis'),
            estimated_development_cost=data.get('estimated_development_cost', 0),
            estimated_production_cost=data.get('estimated_production_cost', 0),
            target_selling_price=data.get('target_selling_price', 0),
            roi_projection=data.get('roi_projection'),
            quality_standards=json.dumps(data.get('quality_standards', {})),
            regulatory_requirements=data.get('regulatory_requirements'),
            intellectual_property=data.get('intellectual_property'),
            notes=data.get('notes'),
            created_by=user_id
        )
        
        db.session.add(development)
        db.session.commit()
        
        return jsonify({
            'message': 'Product development created successfully',
            'development_id': development.id,
            'development_number': development_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rd_products_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
def get_product_development(id):
    """Get product development details"""
    try:
        development = ProductDevelopment.query.get_or_404(id)
        
        return jsonify({
            'id': development.id,
            'development_number': development.development_number,
            'product_name': development.product_name,
            'product_category': development.product_category,
            'product_type': development.product_type,
            'project_id': development.project_id,
            'project_name': development.project.project_name if development.project else None,
            'target_specifications': json.loads(development.target_specifications) if development.target_specifications else {},
            'current_specifications': json.loads(development.current_specifications) if development.current_specifications else {},
            'current_version': development.current_version,
            'development_stage': development.development_stage,
            'target_launch_date': development.target_launch_date.isoformat() if development.target_launch_date else None,
            'actual_launch_date': development.actual_launch_date.isoformat() if development.actual_launch_date else None,
            'status': development.status,
            'market_potential': development.market_potential,
            'target_market': development.target_market,
            'competitive_analysis': development.competitive_analysis,
            'estimated_development_cost': float(development.estimated_development_cost) if development.estimated_development_cost else 0,
            'actual_development_cost': float(development.actual_development_cost) if development.actual_development_cost else 0,
            'estimated_production_cost': float(development.estimated_production_cost) if development.estimated_production_cost else 0,
            'target_selling_price': float(development.target_selling_price) if development.target_selling_price else 0,
            'roi_projection': float(development.roi_projection) if development.roi_projection else None,
            'development_progress': development.development_progress,
            'quality_standards': json.loads(development.quality_standards) if development.quality_standards else {},
            'regulatory_requirements': development.regulatory_requirements,
            'intellectual_property': development.intellectual_property,
            'notes': development.notes,
            'created_by': development.created_by,
            'created_by_name': development.created_by_user.username if development.created_by_user else None,
            'approved_by': development.approved_by,
            'approved_by_name': development.approved_by_user.username if development.approved_by_user else None,
            'approved_at': development.approved_at.isoformat() if development.approved_at else None,
            'prototypes': [{
                'id': p.id,
                'prototype_number': p.prototype_number,
                'prototype_name': p.prototype_name,
                'version': p.version,
                'prototype_type': p.prototype_type,
                'development_date': p.development_date.isoformat(),
                'testing_status': p.testing_status,
                'status': p.status
            } for p in development.prototypes],
            'test_results': [{
                'id': t.id,
                'test_number': t.test_number,
                'test_name': t.test_name,
                'test_type': t.test_type,
                'test_date': t.test_date.isoformat(),
                'pass_fail_status': t.pass_fail_status,
                'score': float(t.score) if t.score else None
            } for t in development.test_results],
            'created_at': development.created_at.isoformat(),
            'updated_at': development.updated_at.isoformat() if development.updated_at else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rd_products_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_product_development(id):
    """Update product development"""
    try:
        development = ProductDevelopment.query.get_or_404(id)
        data = request.get_json()
        
        # Update fields
        if 'product_name' in data:
            development.product_name = data['product_name']
        if 'product_category' in data:
            development.product_category = data['product_category']
        if 'product_type' in data:
            development.product_type = data['product_type']
        if 'target_specifications' in data:
            development.target_specifications = json.dumps(data['target_specifications'])
        if 'current_specifications' in data:
            development.current_specifications = json.dumps(data['current_specifications'])
        if 'current_version' in data:
            development.current_version = data['current_version']
        if 'development_stage' in data:
            development.development_stage = data['development_stage']
        if 'status' in data:
            development.status = data['status']
        if 'market_potential' in data:
            development.market_potential = data['market_potential']
        if 'target_market' in data:
            development.target_market = data['target_market']
        if 'competitive_analysis' in data:
            development.competitive_analysis = data['competitive_analysis']
        if 'estimated_development_cost' in data:
            development.estimated_development_cost = data['estimated_development_cost']
        if 'actual_development_cost' in data:
            development.actual_development_cost = data['actual_development_cost']
        if 'estimated_production_cost' in data:
            development.estimated_production_cost = data['estimated_production_cost']
        if 'target_selling_price' in data:
            development.target_selling_price = data['target_selling_price']
        if 'roi_projection' in data:
            development.roi_projection = data['roi_projection']
        if 'development_progress' in data:
            development.development_progress = data['development_progress']
        if 'quality_standards' in data:
            development.quality_standards = json.dumps(data['quality_standards'])
        if 'regulatory_requirements' in data:
            development.regulatory_requirements = data['regulatory_requirements']
        if 'intellectual_property' in data:
            development.intellectual_property = data['intellectual_property']
        if 'notes' in data:
            development.notes = data['notes']
        
        # Update dates
        if 'target_launch_date' in data and data['target_launch_date']:
            development.target_launch_date = datetime.strptime(data['target_launch_date'], '%Y-%m-%d').date()
        if 'actual_launch_date' in data and data['actual_launch_date']:
            development.actual_launch_date = datetime.strptime(data['actual_launch_date'], '%Y-%m-%d').date()
        
        # Auto-update stage based on progress
        if development.development_progress == 100 and development.development_stage != 'launched':
            development.development_stage = 'production'
        
        development.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rd_products_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_product_development(id):
    """Delete product development"""
    try:
        development = ProductDevelopment.query.get_or_404(id)
        
        # Check if development has related data
        if development.prototypes or development.test_results:
            return jsonify({
                'error': 'Cannot delete product development with related prototypes or test results'
            }), 400
        
        db.session.delete(development)
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rd_products_bp.route('/<int:id>/approve', methods=['POST'])
@jwt_required()
def approve_product_development(id):
    """Approve product development"""
    try:
        development = ProductDevelopment.query.get_or_404(id)
        user_id = get_jwt_identity()
        
        development.approved_by = user_id
        development.approved_at = datetime.utcnow()
        development.status = 'approved'
        
        # Move to next stage if appropriate
        if development.development_stage == 'testing':
            development.development_stage = 'pilot'
        elif development.development_stage == 'pilot':
            development.development_stage = 'production'
        
        development.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rd_products_bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_product_development_analytics():
    """Get product development analytics"""
    try:
        project_id = request.args.get('project_id', type=int)
        
        query = ProductDevelopment.query
        if project_id:
            query = query.filter(ProductDevelopment.project_id == project_id)
        
        # Basic counts
        total_developments = query.count()
        approved_developments = query.filter_by(status='approved').count()
        launched_products = query.filter_by(development_stage='launched').count()
        
        # Stage distribution
        stage_stats = db.session.query(
            ProductDevelopment.development_stage,
            db.func.count(ProductDevelopment.id).label('count')
        )
        if project_id:
            stage_stats = stage_stats.filter(ProductDevelopment.project_id == project_id)
        stage_stats = stage_stats.group_by(ProductDevelopment.development_stage).all()
        
        # Status distribution
        status_stats = db.session.query(
            ProductDevelopment.status,
            db.func.count(ProductDevelopment.id).label('count')
        )
        if project_id:
            status_stats = status_stats.filter(ProductDevelopment.project_id == project_id)
        status_stats = status_stats.group_by(ProductDevelopment.status).all()
        
        # Market potential distribution
        market_stats = db.session.query(
            ProductDevelopment.market_potential,
            db.func.count(ProductDevelopment.id).label('count')
        )
        if project_id:
            market_stats = market_stats.filter(ProductDevelopment.project_id == project_id)
        market_stats = market_stats.group_by(ProductDevelopment.market_potential).all()
        
        # Cost analysis
        total_estimated_cost = db.session.query(
            db.func.sum(ProductDevelopment.estimated_development_cost)
        )
        if project_id:
            total_estimated_cost = total_estimated_cost.filter(ProductDevelopment.project_id == project_id)
        total_estimated_cost = total_estimated_cost.scalar() or 0
        
        total_actual_cost = db.session.query(
            db.func.sum(ProductDevelopment.actual_development_cost)
        )
        if project_id:
            total_actual_cost = total_actual_cost.filter(ProductDevelopment.project_id == project_id)
        total_actual_cost = total_actual_cost.scalar() or 0
        
        return jsonify({
            'summary': {
                'total_developments': total_developments,
                'approved_developments': approved_developments,
                'launched_products': launched_products,
                'approval_rate': (approved_developments / max(1, total_developments)) * 100,
                'launch_rate': (launched_products / max(1, total_developments)) * 100,
                'total_estimated_cost': float(total_estimated_cost),
                'total_actual_cost': float(total_actual_cost),
                'cost_variance': float(total_actual_cost - total_estimated_cost)
            },
            'stage_distribution': [
                {'stage': s.development_stage, 'count': s.count}
                for s in stage_stats
            ],
            'status_distribution': [
                {'status': s.status, 'count': s.count}
                for s in status_stats
            ],
            'market_potential_distribution': [
                {'potential': m.market_potential, 'count': m.count}
                for m in market_stats if m.market_potential
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
