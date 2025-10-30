from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from models import db, BackupRecord
from utils.i18n import success_response, error_response, get_message
from utils import generate_number
from datetime import datetime
import os
import shutil
import sqlite3

backup_bp = Blueprint('backup', __name__)

@backup_bp.route('/records', methods=['GET'])
@jwt_required()
def get_backup_records():
    try:
        records = BackupRecord.query.order_by(BackupRecord.backup_date.desc()).all()
        return jsonify({
            'backups': [{
                'id': r.id,
                'backup_number': r.backup_number,
                'backup_type': r.backup_type,
                'backup_date': r.backup_date.isoformat(),
                'file_name': r.file_name,
                'file_size_mb': float(r.file_size_mb) if r.file_size_mb else 0,
                'status': r.status
            } for r in records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/create', methods=['POST'])
@jwt_required()
def create_backup():
    try:
        from flask_jwt_extended import get_jwt_identity
        user_id = get_jwt_identity()
        
        backup_number = generate_number('BKP', BackupRecord, 'backup_number')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        file_name = f'backup_{timestamp}.db'
        backup_dir = 'backups'
        
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, file_name)
        
        # Backup SQLite database
        db_path = 'erp_database.db'
        if os.path.exists(db_path):
            shutil.copy2(db_path, backup_path)
            file_size = os.path.getsize(backup_path) / (1024 * 1024)  # MB
            
            record = BackupRecord(
                backup_number=backup_number,
                backup_type='full',
                file_name=file_name,
                file_path=backup_path,
                file_size_mb=file_size,
                status='completed',
                retention_days=30,
                created_by=user_id
            )
            
            db.session.add(record)
            db.session.commit()
            
            return jsonify({
                'message': 'Backup created successfully',
                'backup_id': record.id,
                'file_name': file_name,
                'file_size_mb': file_size
            }), 201
        else:
            return jsonify(error_response('api.error', error_code=404)), 404
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@backup_bp.route('/restore/<int:id>', methods=['POST'])
@jwt_required()
def restore_backup(id):
    try:
        record = BackupRecord.query.get(id)
        if not record:
            return jsonify(error_response('api.error', error_code=404)), 404
        
        if not os.path.exists(record.file_path):
            return jsonify(error_response('api.error', error_code=404)), 404
        
        # This is a simplified restore - in production, you'd want more safeguards
        db_path = 'erp_database.db'
        shutil.copy2(record.file_path, db_path)
        
        return jsonify(success_response('api.success')), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
