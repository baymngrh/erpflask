import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  CogIcon,
  TagIcon,
  ChartBarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import axiosInstance from '../../utils/axiosConfig'
import LoadingSpinner from '../../components/Common/LoadingSpinner'

interface WorkOrder {
  id: number
  wo_number: string
  product_name: string
  quantity: number
  quantity_produced: number
  quantity_good: number
  quantity_scrap: number
  status: string
  priority: string
  batch_number?: string
  machine_name?: string
  supervisor_name?: string
  scheduled_start_date?: string
  scheduled_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  created_at: string
}

const WorkOrderList = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  })

  useEffect(() => {
    loadWorkOrders()
  }, [currentPage, filters])

  const loadWorkOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '20',
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && { search: filters.search })
      })

      const response = await axiosInstance.get(`/api/production/work-orders?${params}`)
      setWorkOrders(response.data.work_orders || [])
      setTotalPages(response.data.pages || 1)
    } catch (error) {
      console.error('Error loading work orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await axiosInstance.put(`/api/production/work-orders/${id}/status`, { status: newStatus })
      loadWorkOrders() // Refresh list
    } catch (error) {
      console.error('Error updating work order status:', error)
      alert('Failed to update work order status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned': return 'bg-blue-100 text-blue-800'
      case 'released': return 'bg-yellow-100 text-yellow-800'  
      case 'in_progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return ClockIcon
      case 'released': return ClockIcon
      case 'in_progress': return PlayIcon
      case 'completed': return CheckCircleIcon
      default: return ClockIcon
    }
  }

  const calculateProgress = (produced: number, total: number) => {
    return total > 0 ? (produced / total * 100).toFixed(1) : '0.0'
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({ status: '', priority: '', search: '' })
    setCurrentPage(1)
  }

  if (loading && workOrders.length === 0) {
    return <LoadingSpinner />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 Work Orders</h1>
          <p className="text-gray-600 mt-1">Manage production work orders and schedules</p>
        </div>
        <div className="flex gap-3">
          <Link to="/app/production/work-orders/new" className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{workOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-yellow-500 p-3 rounded-lg">
              <PlayIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {workOrders.filter(wo => wo.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {workOrders.filter(wo => wo.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center">
            <div className="bg-purple-500 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Produced</p>
              <p className="text-2xl font-bold text-gray-900">
                {workOrders.reduce((sum, wo) => sum + wo.quantity_produced, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-4 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <div className="relative mt-1">
              <input
                type="text"
                placeholder="WO number, product..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input mt-1"
            >
              <option value="">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="released">Released</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="input mt-1"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Work Orders</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity & Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((wo) => {
                const StatusIcon = getStatusIcon(wo.status)
                const progress = calculateProgress(wo.quantity_produced, wo.quantity)
                
                return (
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{wo.wo_number}</div>
                        {wo.batch_number && (
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            <TagIcon className="h-3 w-3 mr-1" />
                            {wo.batch_number}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{wo.product_name}</div>
                      {wo.supervisor_name && (
                        <div className="text-xs text-gray-500">{wo.supervisor_name}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          {wo.quantity_produced.toLocaleString()} / {wo.quantity.toLocaleString()}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{progress}% complete</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {wo.machine_name ? (
                        <div className="flex items-center">
                          <CogIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{wo.machine_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                          <StatusIcon className="h-3 w-3" />
                          {wo.status}
                        </div>
                        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(wo.priority)} ml-2`}>
                          {wo.priority} priority
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {wo.scheduled_start_date && wo.scheduled_end_date ? (
                          <>
                            <div>{new Date(wo.scheduled_start_date).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              to {new Date(wo.scheduled_end_date).toLocaleDateString()}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">Not scheduled</span>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        {wo.status === 'planned' && (
                          <button
                            onClick={() => handleStatusChange(wo.id, 'released')}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Release
                          </button>
                        )}
                        {wo.status === 'released' && (
                          <button
                            onClick={() => handleStatusChange(wo.id, 'in_progress')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Start
                          </button>
                        )}
                        {wo.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(wo.id, 'completed')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Complete
                          </button>
                        )}
                        <Link
                          to={`/app/production/work-orders/${wo.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="btn-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {workOrders.length === 0 && !loading && (
          <div className="text-center py-12">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No work orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first work order
            </p>
            <div className="mt-6">
              <Link to="/app/production/work-orders/new" className="btn-primary">
                <PlusIcon className="h-5 w-5 mr-2" />
                New Work Order
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkOrderList
