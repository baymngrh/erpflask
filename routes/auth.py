from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from models import db, User, Role, UserRole
from datetime import datetime
from utils.i18n import success_response, error_response, get_message

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify(error_response('validation.required_field', field='Username and Password')), 400
        
        # Find user with eager loading of roles
        from sqlalchemy.orm import joinedload
        user = User.query.options(
            joinedload(User.roles).joinedload(UserRole.role)
        ).filter_by(username=username).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify(error_response('auth.invalid_credentials')), 401
        
        if not user.is_active:
            return jsonify(error_response('auth.account_inactive')), 403
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Get user roles safely
        try:
            user_roles = [ur.role.name for ur in user.roles if ur.role]
        except Exception as e:
            print(f"Error getting user roles: {e}")
            user_roles = []
        
        # Create tokens with string identity
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'is_admin': user.is_admin,
                'roles': user_roles
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'full_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if user exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 409
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 409
        
        # Create new user
        hashed_password = generate_password_hash(data['password'])
        
        new_user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password,
            full_name=data['full_name'],
            is_active=True,
            is_admin=False
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'email': new_user.email,
                'full_name': new_user.full_name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        user_id = get_jwt_identity()
        # Get user with eager loading of roles
        from sqlalchemy.orm import joinedload
        user = User.query.options(
            joinedload(User.roles).joinedload(UserRole.role)
        ).get(int(user_id))  # Convert string to int
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user roles safely
        try:
            user_roles = [ur.role.name for ur in user.roles if ur.role]
        except Exception as e:
            print(f"Error getting user roles in /me: {e}")
            user_roles = []
        
        return jsonify({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name,
                'is_active': user.is_active,
                'is_admin': user.is_admin,
                'roles': user_roles,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'created_at': user.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)  # user_id already string
        
        return jsonify({
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout endpoint"""
    # In a production system, you would add the token to a blacklist
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current and new passwords are required'}), 400
        
        user = User.query.get(int(user_id))  # Convert string to int
        
        if not user or not check_password_hash(user.password_hash, current_password):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Update password
        user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users for assignment dropdowns"""
    try:
        users = User.query.filter_by(is_active=True).all()
        return jsonify({
            'users': [{
                'id': u.id,
                'name': u.full_name or u.username,
                'username': u.username,
                'email': u.email
            } for u in users]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
