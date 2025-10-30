from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Machine, MaintenanceRecord, MaintenanceSchedule, User
from utils.i18n import success_response, error_response, get_message
from models.oee import OEERecord, OEEDowntimeRecord, OEETarget, OEEAlert, MaintenanceImpact, OEEAnalytics, QualityDefect
from utils import generate_number
from datetime import datetime, date, timedelta
from sqlalchemy import func, and_, or_, desc
import json

oee_bp = Blueprint('oee', __name__)

@oee_bp.route('/records', methods=['GET'])
@oee_bp.route('/records/', methods=['GET'])
@jwt_required()
def get_records():
    try:
        records = OEERecord.query.order_by(OEERecord.record_date.desc()).all()
        return jsonify({
            'records': [{
                'id': r.id,
                'record_number': r.record_number,
                'machine_name': r.machine.name,
                'record_date': r.record_date.isoformat(),
                'availability': float(r.availability),
                'performance': float(r.performance),
                'quality': float(r.quality),
                'oee': float(r.oee)
            } for r in records]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/records', methods=['POST'])
@jwt_required()
def create_record():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        record_number = generate_number('OEE', OEERecord, 'record_number')
        
        # Calculate OEE metrics
        availability = ((data['planned_production_time'] - data['downtime']) / data['planned_production_time']) * 100
        performance = ((data['total_pieces_produced'] * data['ideal_cycle_time']) / data['actual_production_time']) * 100 if data['actual_production_time'] > 0 else 0
        quality = (data['good_pieces'] / data['total_pieces_produced']) * 100 if data['total_pieces_produced'] > 0 else 0
        oee = (availability * performance * quality) / 10000
        
        record = OEERecord(
            record_number=record_number,
            machine_id=data['machine_id'],
            work_order_id=data.get('work_order_id'),
            record_date=datetime.fromisoformat(data['record_date']),
            shift=data.get('shift'),
            planned_production_time=data['planned_production_time'],
            downtime=data['downtime'],
            actual_production_time=data['actual_production_time'],
            ideal_cycle_time=data['ideal_cycle_time'],
            total_pieces_produced=data['total_pieces_produced'],
            good_pieces=data['good_pieces'],
            rejected_pieces=data['rejected_pieces'],
            availability=availability,
            performance=performance,
            quality=quality,
            oee=oee,
            recorded_by=user_id
        )
        
        db.session.add(record)
        db.session.commit()
        return jsonify({'message': 'OEE record created', 'record_id': record.id, 'oee': oee}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/downtime', methods=['POST'])
@jwt_required()
def create_downtime():
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        downtime = OEEDowntimeRecord(
            oee_record_id=data.get('oee_record_id'),
            machine_id=data['machine_id'],
            start_time=datetime.fromisoformat(data['start_time']),
            end_time=datetime.fromisoformat(data['end_time']) if data.get('end_time') else None,
            duration_minutes=data.get('duration_minutes'),
            downtime_category=data['downtime_category'],
            reason=data.get('reason'),
            recorded_by=user_id
        )
        
        db.session.add(downtime)
        db.session.commit()
        return jsonify(success_response('api.success')), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===============================
# ENHANCED OEE ENDPOINTS
# ===============================

@oee_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_oee_dashboard():
    """Get comprehensive OEE dashboard data"""
    try:
        # Get query parameters
        machine_id_param = request.args.get('machine_id')
        machine_id = None
        if machine_id_param and machine_id_param != 'null' and machine_id_param != '':
            try:
                machine_id = int(machine_id_param)
            except (ValueError, TypeError):
                machine_id = None
        
        days = request.args.get('days', 30, type=int)
        
        # Date range
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        # Base query
        query = OEERecord.query.filter(
            OEERecord.record_date.between(start_date, end_date)
        )
        
        if machine_id:
            query = query.filter(OEERecord.machine_id == machine_id)
        
        records = query.all()
        
        # Calculate overall metrics
        if records:
            avg_oee = sum(float(r.oee) for r in records) / len(records)
            avg_availability = sum(float(r.availability) for r in records) / len(records)
            avg_performance = sum(float(r.performance) for r in records) / len(records)
            avg_quality = sum(float(r.quality) for r in records) / len(records)
            best_oee = max(float(r.oee) for r in records)
            worst_oee = min(float(r.oee) for r in records)
        else:
            avg_oee = avg_availability = avg_performance = avg_quality = 0
            best_oee = worst_oee = 0
        
        # Get machine performance data
        machines_query = Machine.query.filter(Machine.is_active == True)
        if machine_id:
            machines_query = machines_query.filter(Machine.id == machine_id)
        
        machines = machines_query.all()
        machine_performance = []
        
        for machine in machines:
            machine_records = [r for r in records if r.machine_id == machine.id]
            if machine_records:
                machine_avg_oee = sum(float(r.oee) for r in machine_records) / len(machine_records)
                machine_downtime = sum(r.downtime for r in machine_records)
                machine_production = sum(r.total_pieces_produced for r in machine_records)
            else:
                machine_avg_oee = 0
                machine_downtime = 0
                machine_production = 0
            
            # Get maintenance info
            next_maintenance = MaintenanceSchedule.query.filter(
                MaintenanceSchedule.machine_id == machine.id,
                MaintenanceSchedule.is_active == True,
                MaintenanceSchedule.next_maintenance_date >= date.today()
            ).order_by(MaintenanceSchedule.next_maintenance_date).first()
            
            # Get recent alerts
            recent_alerts = OEEAlert.query.filter(
                OEEAlert.machine_id == machine.id,
                OEEAlert.status == 'active'
            ).count()
            
            machine_performance.append({
                'machine_id': machine.id,
                'machine_name': machine.name,
                'machine_code': machine.code,
                'status': machine.status,
                'avg_oee': round(machine_avg_oee, 2),
                'total_downtime': machine_downtime,
                'total_production': machine_production,
                'next_maintenance': next_maintenance.next_maintenance_date.isoformat() if next_maintenance else None,
                'active_alerts': recent_alerts,
                'efficiency': float(machine.efficiency) if machine.efficiency else 100,
                'availability': float(machine.availability) if machine.availability else 100
            })
        
        # Get trend data (last 7 days)
        trend_data = []
        for i in range(7):
            trend_date = end_date - timedelta(days=i)
            day_records = [r for r in records if r.record_date == trend_date]
            if day_records:
                day_avg_oee = sum(float(r.oee) for r in day_records) / len(day_records)
            else:
                day_avg_oee = 0
            
            trend_data.append({
                'date': trend_date.isoformat(),
                'oee': round(day_avg_oee, 2)
            })
        
        trend_data.reverse()  # Show oldest to newest
        
        # Get active alerts
        alerts_query = OEEAlert.query.filter(OEEAlert.status == 'active')
        if machine_id:
            alerts_query = alerts_query.filter(OEEAlert.machine_id == machine_id)
        
        active_alerts = alerts_query.order_by(desc(OEEAlert.alert_date)).limit(10).all()
        
        # Get downtime analysis
        downtime_records = OEEDowntimeRecord.query.join(OEERecord).filter(
            OEERecord.record_date.between(start_date, end_date)
        )
        if machine_id:
            downtime_records = downtime_records.filter(OEEDowntimeRecord.machine_id == machine_id)
        
        downtime_by_category = {}
        for downtime in downtime_records.all():
            category = downtime.downtime_category
            if category not in downtime_by_category:
                downtime_by_category[category] = 0
            downtime_by_category[category] += downtime.duration_minutes or 0
        
        return jsonify({
            'summary': {
                'avg_oee': round(avg_oee, 2),
                'avg_availability': round(avg_availability, 2),
                'avg_performance': round(avg_performance, 2),
                'avg_quality': round(avg_quality, 2),
                'best_oee': round(best_oee, 2),
                'worst_oee': round(worst_oee, 2),
                'total_records': len(records),
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            },
            'machine_performance': machine_performance,
            'trend_data': trend_data,
            'active_alerts': [{
                'id': alert.id,
                'machine_name': alert.machine.name,
                'alert_type': alert.alert_type,
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.message,
                'alert_date': alert.alert_date.isoformat(),
                'threshold_value': float(alert.threshold_value) if alert.threshold_value else None,
                'actual_value': float(alert.actual_value) if alert.actual_value else None
            } for alert in active_alerts],
            'downtime_analysis': [
                {'category': category, 'minutes': minutes}
                for category, minutes in downtime_by_category.items()
            ]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """Get OEE alerts"""
    try:
        status = request.args.get('status', 'active')
        
        # Handle machine_id parameter properly
        machine_id_param = request.args.get('machine_id')
        machine_id = None
        if machine_id_param and machine_id_param != 'null' and machine_id_param != '':
            try:
                machine_id = int(machine_id_param)
            except (ValueError, TypeError):
                machine_id = None
        
        severity = request.args.get('severity')
        
        query = OEEAlert.query
        
        if status:
            query = query.filter(OEEAlert.status == status)
        if machine_id:
            query = query.filter(OEEAlert.machine_id == machine_id)
        if severity:
            query = query.filter(OEEAlert.severity == severity)
        
        alerts = query.order_by(desc(OEEAlert.alert_date)).all()
        
        return jsonify({
            'alerts': [{
                'id': alert.id,
                'machine_id': alert.machine_id,
                'machine_name': alert.machine.name,
                'alert_type': alert.alert_type,
                'severity': alert.severity,
                'title': alert.title,
                'message': alert.message,
                'threshold_value': float(alert.threshold_value) if alert.threshold_value else None,
                'actual_value': float(alert.actual_value) if alert.actual_value else None,
                'alert_date': alert.alert_date.isoformat(),
                'status': alert.status,
                'acknowledged_by': alert.acknowledged_by_user.username if alert.acknowledged_by_user else None,
                'acknowledged_at': alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                'resolved_by': alert.resolved_by_user.username if alert.resolved_by_user else None,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            } for alert in alerts]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['PUT'])
@jwt_required()
def acknowledge_alert(alert_id):
    """Acknowledge an OEE alert"""
    try:
        user_id = get_jwt_identity()
        alert = OEEAlert.query.get_or_404(alert_id)
        
        alert.status = 'acknowledged'
        alert.acknowledged_by = user_id
        alert.acknowledged_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/alerts/<int:alert_id>/resolve', methods=['PUT'])
@jwt_required()
def resolve_alert(alert_id):
    """Resolve an OEE alert"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        alert = OEEAlert.query.get_or_404(alert_id)
        
        alert.status = 'resolved'
        alert.resolved_by = user_id
        alert.resolved_at = datetime.utcnow()
        alert.resolution_notes = data.get('resolution_notes', '')
        
        db.session.commit()
        
        return jsonify(success_response('api.success')), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/maintenance-impact', methods=['POST'])
@jwt_required()
def create_maintenance_impact():
    """Create maintenance impact record"""
    try:
        data = request.get_json()
        
        impact = MaintenanceImpact(
            maintenance_record_id=data['maintenance_record_id'],
            machine_id=data['machine_id'],
            impact_date=datetime.strptime(data['impact_date'], '%Y-%m-%d').date(),
            planned_downtime_hours=data.get('planned_downtime_hours', 0),
            actual_downtime_hours=data.get('actual_downtime_hours', 0),
            production_loss_units=data.get('production_loss_units', 0),
            revenue_impact=data.get('revenue_impact', 0),
            oee_before_maintenance=data.get('oee_before_maintenance'),
            oee_after_maintenance=data.get('oee_after_maintenance'),
            notes=data.get('notes')
        )
        
        # Calculate improvement percentage
        if impact.oee_before_maintenance and impact.oee_after_maintenance:
            impact.improvement_percentage = float(impact.oee_after_maintenance) - float(impact.oee_before_maintenance)
        
        db.session.add(impact)
        db.session.commit()
        
        return jsonify({
            'message': 'Maintenance impact recorded successfully',
            'impact_id': impact.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@oee_bp.route('/machines/<int:machine_id>/analytics', methods=['GET'])
@jwt_required()
def get_machine_analytics(machine_id):
    """Get detailed analytics for a specific machine"""
    try:
        machine = Machine.query.get_or_404(machine_id)
        
        # Get query parameters
        period = request.args.get('period', 'monthly')  # daily, weekly, monthly
        months = request.args.get('months', 6, type=int)
        
        # Get analytics data
        analytics = OEEAnalytics.query.filter(
            OEEAnalytics.machine_id == machine_id,
            OEEAnalytics.period_type == period
        ).order_by(desc(OEEAnalytics.analysis_date)).limit(months).all()
        
        # Get maintenance impact data
        maintenance_impacts = MaintenanceImpact.query.filter(
            MaintenanceImpact.machine_id == machine_id
        ).order_by(desc(MaintenanceImpact.impact_date)).limit(10).all()
        
        # Get recent OEE records for detailed view
        recent_records = OEERecord.query.filter(
            OEERecord.machine_id == machine_id
        ).order_by(desc(OEERecord.record_date)).limit(30).all()
        
        # Calculate trends
        if len(analytics) >= 2:
            latest = analytics[0]
            previous = analytics[1]
            oee_trend = float(latest.avg_oee) - float(previous.avg_oee)
            availability_trend = float(latest.avg_availability) - float(previous.avg_availability)
            performance_trend = float(latest.avg_performance) - float(previous.avg_performance)
            quality_trend = float(latest.avg_quality) - float(previous.avg_quality)
        else:
            oee_trend = availability_trend = performance_trend = quality_trend = 0
        
        return jsonify({
            'machine': {
                'id': machine.id,
                'name': machine.name,
                'code': machine.code,
                'type': machine.machine_type,
                'status': machine.status,
                'capacity_per_hour': float(machine.capacity_per_hour) if machine.capacity_per_hour else None,
                'last_maintenance': machine.last_maintenance.isoformat() if machine.last_maintenance else None,
                'next_maintenance': machine.next_maintenance.isoformat() if machine.next_maintenance else None
            },
            'trends': {
                'oee_trend': round(oee_trend, 2),
                'availability_trend': round(availability_trend, 2),
                'performance_trend': round(performance_trend, 2),
                'quality_trend': round(quality_trend, 2)
            },
            'analytics': [{
                'date': a.analysis_date.isoformat(),
                'period_type': a.period_type,
                'avg_oee': float(a.avg_oee),
                'avg_availability': float(a.avg_availability),
                'avg_performance': float(a.avg_performance),
                'avg_quality': float(a.avg_quality),
                'total_downtime_hours': float(a.total_downtime_hours),
                'total_production_hours': float(a.total_production_hours),
                'total_units_produced': float(a.total_units_produced),
                'defect_rate': float(a.defect_rate),
                'maintenance_hours': float(a.maintenance_hours),
                'breakdown_count': a.breakdown_count
            } for a in analytics],
            'maintenance_impacts': [{
                'date': mi.impact_date.isoformat(),
                'planned_downtime': float(mi.planned_downtime_hours),
                'actual_downtime': float(mi.actual_downtime_hours),
                'production_loss': float(mi.production_loss_units),
                'revenue_impact': float(mi.revenue_impact),
                'oee_before': float(mi.oee_before_maintenance) if mi.oee_before_maintenance else None,
                'oee_after': float(mi.oee_after_maintenance) if mi.oee_after_maintenance else None,
                'improvement': float(mi.improvement_percentage) if mi.improvement_percentage else None
            } for mi in maintenance_impacts],
            'recent_records': [{
                'date': r.record_date.isoformat(),
                'shift': r.shift,
                'oee': float(r.oee),
                'availability': float(r.availability),
                'performance': float(r.performance),
                'quality': float(r.quality),
                'downtime': r.downtime,
                'total_pieces': r.total_pieces_produced,
                'good_pieces': r.good_pieces
            } for r in recent_records]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
