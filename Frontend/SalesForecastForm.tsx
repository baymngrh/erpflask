import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CalendarIcon,
  ChartBarIcon,
  UserIcon,
  CubeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { 
  useGetSalesForecastQuery,
  useCreateSalesForecastMutation,
  useUpdateSalesForecastMutation,
  useGetCustomersQuery,
  useGetProductsQuery
} from '../../services/api'
import toast from 'react-hot-toast'

interface ForecastFormData {
  forecast_number: string
  name: string
  forecast_type: 'monthly' | 'quarterly' | 'yearly'
  period_start: string
  period_end: string
  customer_id: number | null
  product_id: number | null
  best_case: number
  most_likely: number
  worst_case: number
  committed: number
  confidence_level: 'high' | 'medium' | 'low'
  methodology: string
  notes: string
}

export default function SalesForecastForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [formData, setFormData] = useState<ForecastFormData>({
    forecast_number: '',
    name: '',
    forecast_type: 'monthly',
    period_start: '',
    period_end: '',
    customer_id: null,
    product_id: null,
    best_case: 0,
    most_likely: 0,
    worst_case: 0,
    committed: 0,
    confidence_level: 'medium',
    methodology: 'pipeline',
    notes: ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: forecastData, isLoading: forecastLoading } = useGetSalesForecastQuery(
    Number(id), 
    { skip: !isEdit }
  )
  
  const { data: customersData } = useGetCustomersQuery({})
  const { data: productsData } = useGetProductsQuery({})
  
  const [createForecast, { isLoading: creating }] = useCreateSalesForecastMutation()
  const [updateForecast, { isLoading: updating }] = useUpdateSalesForecastMutation()

  useEffect(() => {
    if (forecastData && isEdit) {
      setFormData({
        forecast_number: forecastData.forecast_number || '',
        name: forecastData.name || '',
        forecast_type: forecastData.forecast_type || 'monthly',
        period_start: forecastData.period_start || '',
        period_end: forecastData.period_end || '',
        customer_id: forecastData.customer_id || null,
        product_id: forecastData.product_id || null,
        best_case: forecastData.best_case || 0,
        most_likely: forecastData.most_likely || 0,
        worst_case: forecastData.worst_case || 0,
        committed: forecastData.committed || 0,
        confidence_level: forecastData.confidence_level || 'medium',
        methodology: forecastData.methodology || 'pipeline',
        notes: forecastData.notes || ''
      })
    }
  }, [forecastData, isEdit])

  // Auto-generate forecast number
  useEffect(() => {
    if (!isEdit && !formData.forecast_number) {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      setFormData(prev => ({
        ...prev,
        forecast_number: `FC-${year}${month}-${random}`
      }))
    }
  }, [isEdit, formData.forecast_number])

  // Auto-calculate period end based on type and start date
  useEffect(() => {
    if (formData.period_start && formData.forecast_type) {
      const startDate = new Date(formData.period_start)
      let endDate = new Date(startDate)

      switch (formData.forecast_type) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1)
          endDate.setDate(endDate.getDate() - 1)
          break
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3)
          endDate.setDate(endDate.getDate() - 1)
          break
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1)
          endDate.setDate(endDate.getDate() - 1)
          break
      }

      setFormData(prev => ({
        ...prev,
        period_end: endDate.toISOString().split('T')[0]
      }))
    }
  }, [formData.period_start, formData.forecast_type])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Forecast name is required'
    }

    if (!formData.period_start) {
      newErrors.period_start = 'Period start date is required'
    }

    if (!formData.period_end) {
      newErrors.period_end = 'Period end date is required'
    }

    if (formData.period_start && formData.period_end && 
        new Date(formData.period_start) >= new Date(formData.period_end)) {
      newErrors.period_end = 'End date must be after start date'
    }

    if (formData.most_likely <= 0) {
      newErrors.most_likely = 'Most likely value must be greater than 0'
    }

    if (formData.best_case < formData.most_likely) {
      newErrors.best_case = 'Best case must be greater than or equal to most likely'
    }

    if (formData.worst_case > formData.most_likely) {
      newErrors.worst_case = 'Worst case must be less than or equal to most likely'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    try {
      if (isEdit) {
        await updateForecast({ id: Number(id), ...formData }).unwrap()
        toast.success('Forecast updated successfully')
      } else {
        await createForecast(formData).unwrap()
        toast.success('Forecast created successfully')
      }
      navigate('/app/sales/forecasts')
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save forecast')
    }
  }

  const handleInputChange = (field: keyof ForecastFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  if (forecastLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Sales Forecast' : 'Create Sales Forecast'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update forecast details' : 'Create a new sales forecast for planning'}
          </p>
        </div>
        <button
          onClick={() => navigate('/app/sales/forecasts')}
          className="btn-secondary"
        >
          ← Back to Forecasts
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Basic Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forecast Number *
                  </label>
                  <input
                    type="text"
                    value={formData.forecast_number}
                    onChange={(e) => handleInputChange('forecast_number', e.target.value)}
                    className={`input ${errors.forecast_number ? 'border-red-500' : ''}`}
                    placeholder="FC-202410-001"
                  />
                  {errors.forecast_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.forecast_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forecast Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`input ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Q4 2024 Sales Forecast"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forecast Type *
                  </label>
                  <select
                    value={formData.forecast_type}
                    onChange={(e) => handleInputChange('forecast_type', e.target.value)}
                    className="input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Methodology
                  </label>
                  <select
                    value={formData.methodology}
                    onChange={(e) => handleInputChange('methodology', e.target.value)}
                    className="input"
                  >
                    <option value="pipeline">Pipeline Analysis</option>
                    <option value="historical">Historical Data</option>
                    <option value="quota">Quota Based</option>
                    <option value="market">Market Analysis</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Period & Scope */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Period & Scope
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Start *
                  </label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => handleInputChange('period_start', e.target.value)}
                    className={`input ${errors.period_start ? 'border-red-500' : ''}`}
                  />
                  {errors.period_start && (
                    <p className="text-red-500 text-sm mt-1">{errors.period_start}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period End *
                  </label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => handleInputChange('period_end', e.target.value)}
                    className={`input ${errors.period_end ? 'border-red-500' : ''}`}
                  />
                  {errors.period_end && (
                    <p className="text-red-500 text-sm mt-1">{errors.period_end}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer (Optional)
                  </label>
                  <select
                    value={formData.customer_id || ''}
                    onChange={(e) => handleInputChange('customer_id', e.target.value ? Number(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">All Customers</option>
                    {customersData?.customers?.map((customer: any) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product (Optional)
                  </label>
                  <select
                    value={formData.product_id || ''}
                    onChange={(e) => handleInputChange('product_id', e.target.value ? Number(e.target.value) : null)}
                    className="input"
                  >
                    <option value="">All Products</option>
                    {productsData?.products?.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Forecast Values */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Forecast Values
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Most Likely * (Base Forecast)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.most_likely}
                    onChange={(e) => handleInputChange('most_likely', Number(e.target.value))}
                    className={`input ${errors.most_likely ? 'border-red-500' : ''}`}
                    placeholder="100000"
                  />
                  {errors.most_likely && (
                    <p className="text-red-500 text-sm mt-1">{errors.most_likely}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Committed (Confirmed)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.committed}
                    onChange={(e) => handleInputChange('committed', Number(e.target.value))}
                    className="input"
                    placeholder="80000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Best Case (Optimistic)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.best_case}
                    onChange={(e) => handleInputChange('best_case', Number(e.target.value))}
                    className={`input ${errors.best_case ? 'border-red-500' : ''}`}
                    placeholder="120000"
                  />
                  {errors.best_case && (
                    <p className="text-red-500 text-sm mt-1">{errors.best_case}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Worst Case (Pessimistic)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.worst_case}
                    onChange={(e) => handleInputChange('worst_case', Number(e.target.value))}
                    className={`input ${errors.worst_case ? 'border-red-500' : ''}`}
                    placeholder="80000"
                  />
                  {errors.worst_case && (
                    <p className="text-red-500 text-sm mt-1">{errors.worst_case}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Additional Notes
              </h3>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="input"
                placeholder="Add any additional notes, assumptions, or context for this forecast..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confidence Level */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confidence Level
              </h3>
              <div className="space-y-3">
                {[
                  { value: 'high', label: 'High', color: 'green', desc: 'Very confident in forecast' },
                  { value: 'medium', label: 'Medium', color: 'yellow', desc: 'Moderately confident' },
                  { value: 'low', label: 'Low', color: 'red', desc: 'Low confidence, high uncertainty' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="confidence"
                      value={option.value}
                      checked={formData.confidence_level === option.value}
                      onChange={(e) => handleInputChange('confidence_level', e.target.value)}
                      className="mt-1"
                    />
                    <div>
                      <div className={`text-sm font-medium text-${option.color}-700`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {option.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Forecast Summary */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Forecast Summary
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-medium">
                    {formData.period_start && formData.period_end ? 
                      `${new Date(formData.period_start).toLocaleDateString()} - ${new Date(formData.period_end).toLocaleDateString()}` : 
                      'Not set'
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{formData.forecast_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Most Likely:</span>
                  <span className="font-medium">{formData.most_likely.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Range:</span>
                  <span className="font-medium">
                    {formData.worst_case.toLocaleString()} - {formData.best_case.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Confidence:</span>
                  <span className={`font-medium capitalize ${
                    formData.confidence_level === 'high' ? 'text-green-600' :
                    formData.confidence_level === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {formData.confidence_level}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation Warnings */}
            {Object.keys(errors).length > 0 && (
              <div className="card p-6 border-red-200 bg-red-50">
                <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  Validation Errors
                </h3>
                <ul className="text-sm text-red-700 space-y-1">
                  {Object.values(errors).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/app/sales/forecasts')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating || updating}
            className="btn-primary"
          >
            {creating || updating ? 'Saving...' : (isEdit ? 'Update Forecast' : 'Create Forecast')}
          </button>
        </div>
      </form>
    </div>
  )
}
