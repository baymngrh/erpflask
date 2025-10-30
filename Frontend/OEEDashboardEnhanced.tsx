import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChartBarIcon, 
  CogIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  CheckCircleIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { useGetOEEDashboardQuery, useGetOEEAlertsQuery, useAcknowledgeAlertMutation, useResolveAlertMutation } from '../../services/api'
import { useLanguage } from '../../contexts/LanguageContext'
import { format, parseISO } from 'date-fns'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import toast from 'react-hot-toast'

export default function OEEDashboardEnhanced() {
  const { t } = useLanguage()
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)
  const [dateRange, setDateRange] = useState(30)
  const [alertFilter, setAlertFilter] = useState('active')
  
  const { data: dashboardData, isLoading, refetch } = useGetOEEDashboardQuery({
    machine_id: selectedMachine || undefined,
    days: dateRange
  })
  
  const { data: alertsData, refetch: refetchAlerts } = useGetOEEAlertsQuery({
    status: alertFilter,
    machine_id: selectedMachine || undefined
  })
  
  const [acknowledgeAlert] = useAcknowledgeAlertMutation()
  const [resolveAlert] = useResolveAlertMutation()

  const getOEEColor = (oee: number) => {
    if (oee >= 85) return 'text-green-600'
    if (oee >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getOEEBgColor = (oee: number) => {
    if (oee >= 85) return 'bg-green-100'
    if (oee >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await acknowledgeAlert(alertId).unwrap()
      toast.success('Alert acknowledged successfully')
      refetchAlerts()
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to acknowledge alert')
    }
  }

  const handleResolveAlert = async (alertId: number, notes: string) => {
    try {
      await resolveAlert({ alertId, resolution_notes: notes }).unwrap()
      toast.success('Alert resolved successfully')
      refetchAlerts()
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to resolve alert')
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const summary = dashboardData?.summary || {}
  const machinePerformance = dashboardData?.machine_performance || []
  const trendData = dashboardData?.trend_data || []
  const activeAlerts = dashboardData?.active_alerts || []
  const downtimeAnalysis = dashboardData?.downtime_analysis || []
  const alerts = alertsData?.alerts || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OEE Dashboard Enhanced</h1>
          <p className="text-gray-600">Overall Equipment Effectiveness with Machine & Maintenance Integration</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/app/oee/records/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New OEE Record
          </Link>
          <select
            className="input"
            value={selectedMachine || ''}
            onChange={(e) => setSelectedMachine(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All Machines</option>
            {machinePerformance.map((machine: any) => (
              <option key={machine.machine_id} value={machine.machine_id}>
                {machine.machine_name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Average OEE</h3>
              <p className={`mt-2 text-3xl font-semibold ${getOEEColor(summary.avg_oee || 0)}`}>
                {(summary.avg_oee || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: 85%</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Availability</h3>
              <p className={`mt-2 text-3xl font-semibold ${getOEEColor(summary.avg_availability || 0)}`}>
                {(summary.avg_availability || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: 90%</p>
            </div>
            <ClockIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Performance</h3>
              <p className={`mt-2 text-3xl font-semibold ${getOEEColor(summary.avg_performance || 0)}`}>
                {(summary.avg_performance || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: 95%</p>
            </div>
            <CogIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Quality</h3>
              <p className={`mt-2 text-3xl font-semibold ${getOEEColor(summary.avg_quality || 0)}`}>
                {(summary.avg_quality || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: 99%</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OEE Trend Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">OEE Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(parseISO(value), 'MMM dd')}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(value) => format(parseISO(value as string), 'MMM dd, yyyy')}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'OEE']}
              />
              <Line 
                type="monotone" 
                dataKey="oee" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Downtime Analysis */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Downtime Analysis</h3>
          {downtimeAnalysis.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={downtimeAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, minutes }) => `${category}: ${minutes}m`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="minutes"
                >
                  {downtimeAnalysis.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} minutes`, 'Downtime']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2">No downtime data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Machine Performance Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Machine Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  OEE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Downtime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Production
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Maintenance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {machinePerformance.map((machine: any) => (
                <tr key={machine.machine_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{machine.machine_name}</div>
                      <div className="text-sm text-gray-500">{machine.machine_code}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      machine.status === 'running' ? 'bg-green-100 text-green-800' :
                      machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                      machine.status === 'breakdown' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {machine.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${getOEEBgColor(machine.avg_oee)}`}></div>
                      <span className={`text-sm font-medium ${getOEEColor(machine.avg_oee)}`}>
                        {machine.avg_oee.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {machine.total_downtime} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {machine.total_production.toLocaleString()} units
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {machine.next_maintenance ? 
                      format(parseISO(machine.next_maintenance), 'MMM dd, yyyy') : 
                      'Not scheduled'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {machine.active_alerts > 0 ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        <BellIcon className="h-3 w-3 mr-1" />
                        {machine.active_alerts}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedMachine(machine.machine_id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Filter by Machine"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <Link
                        to={`/app/oee/machines/${machine.machine_id}/analytics`}
                        className="text-green-600 hover:text-green-900"
                        title="View Analytics"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
          <select
            className="input"
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        <div className="divide-y divide-gray-200">
          {alerts.length > 0 ? (
            alerts.map((alert: any) => (
              <div key={alert.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className={`h-6 w-6 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-red-500' :
                      alert.severity === 'high' ? 'text-orange-500' :
                      alert.severity === 'medium' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Machine: {alert.machine_name}</span>
                        <span>Type: {alert.alert_type}</span>
                        <span>{format(parseISO(alert.alert_date), 'MMM dd, yyyy HH:mm')}</span>
                        {alert.threshold_value && alert.actual_value && (
                          <span>
                            Threshold: {alert.threshold_value} | Actual: {alert.actual_value}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleResolveAlert(alert.id, 'Resolved from dashboard')}
                          className="text-green-600 hover:text-green-900 text-sm"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <span className="text-xs text-blue-600">
                        Acknowledged by {alert.acknowledged_by}
                      </span>
                    )}
                    {alert.status === 'resolved' && (
                      <span className="text-xs text-green-600">
                        Resolved by {alert.resolved_by}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2">No alerts found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
