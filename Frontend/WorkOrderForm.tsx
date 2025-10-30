import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  ArrowLeftIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import axiosInstance from '../../utils/axiosConfig'
import LoadingSpinner from '../../components/Common/LoadingSpinner'

interface WorkOrderFormData {
  product_id: number
  quantity: number
  priority: string
  machine_id?: number
  scheduled_start_date?: string
  scheduled_end_date?: string
  notes?: string
  supervisor_id?: number
}

interface Product {
  id: number
  code: string
  name: string
  primary_uom: string
  category?: string
  cost?: number
  is_producible: boolean
  is_active: boolean
}

interface Machine {
  id: number
  code: string
  name: string
  status: string
  machine_type?: string
}

interface Employee {
  id: number
  name: string
  employee_number: string
  department?: string
}

const WorkOrderForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<WorkOrderFormData>({
    defaultValues: {
      priority: 'medium'
    }
  })

  const selectedProductId = watch('product_id')
  const selectedProduct = products.find(p => p.id == selectedProductId)

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600', bg: 'bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { value: 'high', label: 'High', color: 'text-orange-600', bg: 'bg-orange-50' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600', bg: 'bg-red-50' }
  ]

  useEffect(() => {
    loadFormData()
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      loadWorkOrder()
    }
  }, [isEdit, id])

  const loadFormData = async () => {
    try {
      setLoadingData(true)
      
      // Load products, machines, and employees in parallel
      const [productsRes, machinesRes, employeesRes] = await Promise.all([
        axiosInstance.get('/api/products'),
        axiosInstance.get('/api/production/machines'),
        axiosInstance.get('/api/hr/employees')
      ])
      
      setProducts(productsRes.data.products?.filter((p: Product) => p.is_producible && p.is_active) || [])
      setMachines(machinesRes.data.machines?.filter((m: Machine) => m.status !== 'broken') || [])
      setEmployees(employeesRes.data.employees || [])
    } catch (error) {
      console.error('Error loading form data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const loadWorkOrder = async () => {
    try {
      const response = await axiosInstance.get(`/api/production/work-orders/${id}`)
      const wo = response.data.work_order
      
      // Populate form with existing data
      setValue('product_id', wo.product_id)
      setValue('quantity', wo.quantity)
      setValue('priority', wo.priority)
      setValue('machine_id', wo.machine_id)
      setValue('supervisor_id', wo.supervisor_id)
      setValue('notes', wo.notes)
      
      if (wo.scheduled_start_date) {
        setValue('scheduled_start_date', new Date(wo.scheduled_start_date).toISOString().slice(0, 16))
      }
      if (wo.scheduled_end_date) {
        setValue('scheduled_end_date', new Date(wo.scheduled_end_date).toISOString().slice(0, 16))
      }
    } catch (error) {
      console.error('Error loading work order:', error)
      alert('Failed to load work order')
    }
  }

  const onSubmit = async (data: WorkOrderFormData) => {
    setIsLoading(true)
    try {
      const payload = {
        ...data,
        product_id: parseInt(data.product_id.toString()),
        machine_id: data.machine_id ? parseInt(data.machine_id.toString()) : undefined,
        supervisor_id: data.supervisor_id ? parseInt(data.supervisor_id.toString()) : undefined,
        quantity: parseFloat(data.quantity.toString())
      }

      if (isEdit) {
        await axiosInstance.put(`/api/production/work-orders/${id}`, payload)
        alert('Work Order updated successfully!')
      } else {
        await axiosInstance.post('/api/production/work-orders', payload)
        alert('Work Order created successfully!')
      }
      
      navigate('/app/production/work-orders')
    } catch (error: any) {
      console.error('Error saving work order:', error)
      alert(error.response?.data?.error || 'Failed to save work order')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return <LoadingSpinner />
  }

  const selectedPriority = priorities.find(p => p.value === watch('priority'))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/production/work-orders')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? '✏️ Edit Work Order' : '📋 Create Work Order'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEdit ? 'Update work order details' : 'Schedule production for a specific product'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Form */}
        <div className="card p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product *
              </label>
              <select
                {...register('product_id', { required: 'Product is required' })}
                className="input"
                disabled={isEdit}
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
              {errors.product_id && (
                <p className="mt-1 text-sm text-red-600">{errors.product_id.message}</p>
              )}
            </div>

            {/* Product Info Display */}
            {selectedProduct && (
              <div className="lg:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Product Information</h4>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Code:</span>
                    <p className="font-medium">{selectedProduct.code}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Category:</span>
                    <p className="font-medium">{selectedProduct.category || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">UOM:</span>
                    <p className="font-medium">{selectedProduct.primary_uom}</p>
                  </div>
                  <div>
                    <span className="text-blue-600">Cost:</span>
                    <p className="font-medium">
                      {selectedProduct.cost ? `Rp ${selectedProduct.cost.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Produce *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('quantity', { 
                  required: 'Quantity is required',
                  min: { value: 0.01, message: 'Quantity must be greater than 0' }
                })}
                className="input"
                placeholder="0.00"
              />
              {errors.quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
              )}
              {selectedProduct && (
                <p className="mt-1 text-xs text-gray-500">Unit: {selectedProduct.primary_uom}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select {...register('priority')} className="input">
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>
              {selectedPriority && (
                <div className={`mt-2 p-2 rounded-lg ${selectedPriority.bg}`}>
                  <p className={`text-sm font-medium ${selectedPriority.color}`}>
                    {selectedPriority.label} Priority Work Order
                  </p>
                </div>
              )}
            </div>

            {/* Machine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned Machine
              </label>
              <select {...register('machine_id')} className="input">
                <option value="">Auto-assign or select machine</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.code} - {machine.name} ({machine.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Supervisor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Production Supervisor
              </label>
              <select {...register('supervisor_id')} className="input">
                <option value="">Select supervisor</option>
                {employees.filter(emp => emp.department === 'Production').map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.employee_number})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scheduling */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Production Schedule</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Start Date
              </label>
              <input
                type="datetime-local"
                {...register('scheduled_start_date')}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled End Date
              </label>
              <input
                type="datetime-local"
                {...register('scheduled_end_date')}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes & Special Instructions
          </label>
          <textarea
            {...register('notes')}
            rows={4}
            className="input"
            placeholder="Additional notes, special requirements, quality specifications..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/production/work-orders')}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !selectedProduct}
          >
            {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Work Order' : 'Create Work Order')}
          </button>
        </div>
      </form>

      {/* Quick Tips */}
      <div className="card p-4 bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-2">💡 Production Guidelines</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Only producible and active products can be selected</li>
              <li>• Machine assignment is optional - system will auto-assign if available</li>
              <li>• Higher priority work orders will be scheduled first</li>
              <li>• Consider material availability and machine capacity when planning</li>
              <li>• Supervisor assignment helps with production accountability</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkOrderForm
