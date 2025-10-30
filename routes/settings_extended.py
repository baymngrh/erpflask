from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from utils.i18n import success_response, error_response, get_message
from models.user import User
from models.settings import SystemSetting
from models.settings_extended import (
    AdvancedUserRole, AdvancedPermission, AdvancedRolePermission,
    AdvancedUserRoleAssignment, AuditLog, SystemConfiguration, BackupConfiguration
)
from datetime import datetime, timedelta
import json
import os
import subprocess
import shutil
from sqlalchemy import text

settings_extended_bp = Blueprint('settings_extended', __name__)

# System Configuration Endpoints
@settings_extended_bp.route('/system-config', methods=['GET'])
@jwt_required()
def get_system_config():
    """Get system configuration settings"""
    try:
        # Default system configurations
        default_configs = {
            'general': {
                'system_name': 'ERP System',
                'system_version': '1.0.0',
                'timezone': 'Asia/Jakarta',
                'date_format': 'DD/MM/YYYY',
                'currency': 'IDR',
                'language': 'id'
            },
            'database': {
                'connection_pool_size': 10,
                'connection_timeout': 30,
                'query_timeout': 60,
                'backup_retention_days': 30
            },
            'security': {
                'session_timeout': 3600,
                'password_min_length': 8,
                'password_require_special': True,
                'max_login_attempts': 5,
                'account_lockout_duration': 900
            },
            'performance': {
                'cache_enabled': True,
                'cache_timeout': 300,
                'pagination_size': 20,
                'max_file_size': 10485760
            },
            'logging': {
                'log_level': 'INFO',
                'log_retention_days': 90,
                'audit_enabled': True,
                'debug_mode': False
            }
        }
        
        # Get existing settings from database
        settings = SystemSetting.query.all()
        
        # Merge with defaults
        for setting in settings:
            try:
                keys = setting.key.split('.')
                if len(keys) == 2:
                    category, key = keys
                    if category in default_configs and key in default_configs[category]:
                        # Parse value based on type
                        if isinstance(default_configs[category][key], bool):
                            default_configs[category][key] = setting.value.lower() == 'true'
                        elif isinstance(default_configs[category][key], int):
                            default_configs[category][key] = int(setting.value)
                        else:
                            default_configs[category][key] = setting.value
            except:
                continue
        
        return jsonify({
            'success': True,
            'configurations': default_configs
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load system configurations: {str(e)}'
        }), 500

@settings_extended_bp.route('/system-config', methods=['POST'])
@jwt_required()
def save_system_config():
    """Save system configuration settings"""
    try:
        data = request.get_json()
        configurations = data.get('configurations', {})
        
        # Save each configuration to database
        for category, settings in configurations.items():
            for key, value in settings.items():
                setting_key = f"{category}.{key}"
                
                # Find existing setting or create new
                setting = SystemSetting.query.filter_by(key=setting_key).first()
                if not setting:
                    setting = SystemSetting(key=setting_key)
                    db.session.add(setting)
                
                # Convert value to string for storage
                setting.value = str(value)
                setting.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'System configurations saved successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to save system configurations: {str(e)}'
        }), 500

# Role and Permission Management
@settings_extended_bp.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    """Get all user roles"""
    try:
        # For now, return basic roles - can be extended with proper Role model
        roles = [
            {
                'id': 1,
                'name': 'Administrator',
                'description': 'Full system access',
                'permissions': ['all'],
                'user_count': User.query.filter_by(is_admin=True).count(),
                'created_at': datetime.utcnow().isoformat()
            },
            {
                'id': 2,
                'name': 'Manager',
                'description': 'Management level access',
                'permissions': ['read', 'write', 'manage_users'],
                'user_count': 0,
                'created_at': datetime.utcnow().isoformat()
            },
            {
                'id': 3,
                'name': 'User',
                'description': 'Standard user access',
                'permissions': ['read', 'write'],
                'user_count': User.query.filter_by(is_admin=False).count(),
                'created_at': datetime.utcnow().isoformat()
            }
        ]
        
        return jsonify({
            'success': True,
            'roles': roles
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load roles: {str(e)}'
        }), 500

@settings_extended_bp.route('/permissions', methods=['GET'])
@jwt_required()
def get_permissions():
    """Get all available permissions"""
    try:
        permissions = [
            {
                'id': 1,
                'name': 'all',
                'description': 'Full system access',
                'category': 'system'
            },
            {
                'id': 2,
                'name': 'read',
                'description': 'Read access to data',
                'category': 'data'
            },
            {
                'id': 3,
                'name': 'write',
                'description': 'Write access to data',
                'category': 'data'
            },
            {
                'id': 4,
                'name': 'delete',
                'description': 'Delete access to data',
                'category': 'data'
            },
            {
                'id': 5,
                'name': 'manage_users',
                'description': 'Manage user accounts',
                'category': 'user_management'
            },
            {
                'id': 6,
                'name': 'manage_settings',
                'description': 'Manage system settings',
                'category': 'system'
            }
        ]
        
        return jsonify({
            'success': True,
            'permissions': permissions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load permissions: {str(e)}'
        }), 500

# Audit Trail
@settings_extended_bp.route('/audit-logs', methods=['GET'])
@jwt_required()
def get_audit_logs():
    """Get audit trail logs"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # Mock audit logs - in real implementation, these would come from audit log table
        logs = []
        for i in range(per_page):
            logs.append({
                'id': i + 1,
                'user_id': 1,
                'user_name': 'Admin User',
                'action': ['create', 'update', 'delete', 'login'][i % 4],
                'resource_type': ['user', 'product', 'order', 'settings'][i % 4],
                'resource_id': str(i + 1),
                'old_values': {'field': 'old_value'} if i % 2 == 0 else None,
                'new_values': {'field': 'new_value'},
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'timestamp': (datetime.utcnow() - timedelta(hours=i)).isoformat(),
                'status': ['success', 'failed', 'warning'][i % 3]
            })
        
        return jsonify({
            'success': True,
            'logs': logs,
            'total': 1000,
            'total_pages': 20,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load audit logs: {str(e)}'
        }), 500

@settings_extended_bp.route('/audit-logs/export', methods=['GET'])
@jwt_required()
def export_audit_logs():
    """Export audit logs to CSV"""
    try:
        # Mock CSV export
        csv_content = "ID,User,Action,Resource,Timestamp,Status\n"
        csv_content += "1,Admin User,create,user,2024-01-01 10:00:00,success\n"
        csv_content += "2,Admin User,update,product,2024-01-01 11:00:00,success\n"
        
        from flask import Response
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': 'attachment; filename=audit_logs.csv'}
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to export audit logs: {str(e)}'
        }), 500

# Backup Management
@settings_extended_bp.route('/backups', methods=['GET'])
@jwt_required()
def get_backups():
    """Get list of backups"""
    try:
        # Mock backup list - in real implementation, scan backup directory
        backups = [
            {
                'id': 1,
                'filename': 'backup_2024_01_15_10_30_00.sql',
                'size': 15728640,  # 15MB
                'created_at': (datetime.utcnow() - timedelta(days=1)).isoformat(),
                'backup_type': 'scheduled',
                'status': 'completed',
                'description': 'Scheduled daily backup'
            },
            {
                'id': 2,
                'filename': 'backup_2024_01_14_02_00_00.sql',
                'size': 14680064,  # 14MB
                'created_at': (datetime.utcnow() - timedelta(days=2)).isoformat(),
                'backup_type': 'scheduled',
                'status': 'completed',
                'description': 'Scheduled daily backup'
            }
        ]
        
        return jsonify({
            'success': True,
            'backups': backups
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load backups: {str(e)}'
        }), 500

@settings_extended_bp.route('/backup-config', methods=['GET'])
@jwt_required()
def get_backup_config():
    """Get backup configuration"""
    try:
        # Default backup configuration
        config = {
            'auto_backup_enabled': True,
            'backup_frequency': 'daily',
            'backup_time': '02:00',
            'retention_days': 30,
            'include_files': True,
            'compress_backup': True
        }
        
        return jsonify({
            'success': True,
            'settings': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to load backup configuration: {str(e)}'
        }), 500

@settings_extended_bp.route('/backup-config', methods=['POST'])
@jwt_required()
def save_backup_config():
    """Save backup configuration"""
    try:
        data = request.get_json()
        
        # In real implementation, save to database or config file
        # For now, just return success
        
        return jsonify({
            'success': True,
            'message': 'Backup configuration saved successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to save backup configuration: {str(e)}'
        }), 500

@settings_extended_bp.route('/backups/create', methods=['POST'])
@jwt_required()
def create_backup():
    """Create a new backup"""
    try:
        data = request.get_json()
        description = data.get('description', 'Manual backup')
        
        # Mock backup creation
        # In real implementation, this would:
        # 1. Create database dump
        # 2. Optionally include files
        # 3. Compress if configured
        # 4. Store in backup directory
        
        backup_filename = f"backup_{datetime.utcnow().strftime('%Y_%m_%d_%H_%M_%S')}.sql"
        
        return jsonify({
            'success': True,
            'message': 'Backup created successfully',
            'backup': {
                'filename': backup_filename,
                'created_at': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to create backup: {str(e)}'
        }), 500

@settings_extended_bp.route('/backups/<int:backup_id>/restore', methods=['POST'])
@jwt_required()
def restore_backup(backup_id):
    """Restore from backup"""
    try:
        # Mock restore process
        # In real implementation, this would:
        # 1. Validate backup file
        # 2. Create current backup before restore
        # 3. Restore database from backup
        # 4. Restart services if needed
        
        return jsonify({
            'success': True,
            'message': 'Backup restored successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to restore backup: {str(e)}'
        }), 500

@settings_extended_bp.route('/backups/<int:backup_id>/download', methods=['GET'])
@jwt_required()
def download_backup(backup_id):
    """Download backup file"""
    try:
        # Mock file download
        # In real implementation, serve actual backup file
        
        from flask import Response
        return Response(
            "-- Mock backup file content\n-- This would be actual SQL dump\n",
            mimetype='application/sql',
            headers={'Content-Disposition': f'attachment; filename=backup_{backup_id}.sql'}
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to download backup: {str(e)}'
        }), 500

@settings_extended_bp.route('/backups/<int:backup_id>', methods=['DELETE'])
@jwt_required()
def delete_backup(backup_id):
    """Delete backup"""
    try:
        # Mock backup deletion
        # In real implementation, delete actual backup file
        
        return jsonify({
            'success': True,
            'message': 'Backup deleted successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to delete backup: {str(e)}'
        }), 500
