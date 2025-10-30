import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  useCreateSalesOrderMutation,
  useGetCustomersQuery,
  useGetProductsQuery
} from '../../services/api'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface SalesOrderFormData {
  customer_id: number
  order_date: string
  required_date?: string
  priority?: string
  notes?: string
  items: {
    product_id: number
    quantity: number
    unit_price: number
    discount_percent?: number
  }[]
}

export default function SalesOrderForm() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  
  const { data: customers } = useGetCustomersQuery({})
  const { data: products } = useGetProductsQuery({})
  const [createOrder] = useCreateSalesOrderMutation()
  
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<SalesOrderFormData>({
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      priority: 'normal',
      items: [{ product_id: 0, quantity: 1, unit_price: 0, discount_percent: 0 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  })

  const watchedItems = watch('items')

  const calculateItemTotal = (index: number) => {
    const item = watchedItems[index]
    if (!item) return 0
    const subtotal = (item.quantity || 0) * (item.unit_price || 0)
    const discount = subtotal * ((item.discount_percent || 0) / 100)
    return subtotal - discount
  }

  const calculateGrandTotal = () => {
    return watchedItems.reduce((total, _, index) => {
      return total + calculateItemTotal(index)
    }, 0)
  }

  const onSubmit = async (data: SalesOrderFormData) => {
    setIsLoading(true)
    try {
      // Validate items
      const validItems = data.items.filter(item => 
        item.product_id && item.quantity > 0 && item.unit_price > 0
      )

      if (validItems.length === 0) {
        toast.error('Please add at least one valid item')
        return
      }

      await createOrder({
        ...data,
        customer_id: parseInt(data.customer_id.toString()),
        items: validItems.map(item => ({
          ...item,
          product_id: parseInt(item.product_id.toString()),
          quantity: parseFloat(item.quantity.toString()),
          unit_price: parseFloat(item.unit_price.toString()),
          discount_percent: parseFloat((item.discount_percent || 0).toString())
        }))
      }).unwrap()
      
      toast.success('Sales Order created successfully!')
      navigate('/sales/orders')
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to create sales order')
    } finally {
      setIsLoading(false)
    }
  }

  const addItem = () => {
    append({ product_id: 0, quantity: 1, unit_price: 0, discount_percent: 0 })
  }

  const getProductById = (productId: number) => {
    return products?.products?.find((p: any) => p.id == productId)
  }

  const selectedCustomer = customers?.customers?.find((c: any) => c.id == watch('customer_id'))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Sales Order</h1>
          <p className="text-gray-600">Create a new sales order for customer</p>
        </div>
        <button
          onClick={() => navigate('/sales/orders')}
          className="btn-secondary"
        >
          Back to List
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Information */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer *
              </label>
              <select
                {...register('customer_id', { required: 'Customer is required' })}
                className="input-field"
              >
                <option value="">Select a customer</option>
                {customers?.customers?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.code} - {customer.company_name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Date *
              </label>
              <input
                type="date"
                {...register('order_date', { required: 'Order date is required' })}
                className="input-field"
              />
              {errors.order_date && (
                <p className="mt-1 text-sm text-red-600">{errors.order_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Date
              </label>
              <input
                type="date"
                {...register('required_date')}
                className="input-field"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select {...register('priority')} className="input-field">
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input-field"
                placeholder="Additional notes or special instructions..."
              />
            </div>
          </div>

          {/* Customer Info Display */}
          {selectedCustomer && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Type:</span>
                  <p className="font-medium">{selectedCustomer.customer_type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <span className="text-blue-600">Credit Limit:</span>
                  <p className="font-medium">Rp {selectedCustomer.credit_limit?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <span className="text-blue-600">Payment Terms:</span>
                  <p className="font-medium">{selectedCustomer.payment_terms_days || 30} days</p>
                </div>
                <div>
                  <span className="text-blue-600">Contact:</span>
                  <p className="font-medium">{selectedCustomer.contact_person || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedProduct = getProductById(watchedItems[index]?.product_id)
              
              return (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product *
                      </label>
                      <select
                        {...register(`items.${index}.product_id` as const, {
                          required: 'Product is required'
                        })}
                        className="input-field"
                      >
                        <option value="">Select product</option>
                        {products?.products?.filter((p: any) => p.is_sellable && p.is_active).map((product: any) => (
                          <option key={product.id} value={product.id}>
                            {product.code} - {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.quantity` as const, {
                          required: 'Quantity is required',
                          min: { value: 0.01, message: 'Quantity must be greater than 0' }
                        })}
                        className="input-field"
                      />
                      {selectedProduct && (
                        <p className="text-xs text-gray-500 mt-1">{selectedProduct.primary_uom}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register(`items.${index}.unit_price` as const, {
                          required: 'Unit price is required',
                          min: { value: 0, message: 'Price must be non-negative' }
                        })}
                        className="input-field"
                        placeholder={selectedProduct?.price?.toString() || '0.00'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        {...register(`items.${index}.discount_percent` as const)}
                        className="input-field"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Total
                      </label>
                      <div className="input-field bg-gray-50">
                        Rp {calculateItemTotal(index).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="btn-danger p-2"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  {selectedProduct && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-green-600">Category:</span>
                          <p className="font-medium">{selectedProduct.category || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-green-600">Stock Available:</span>
                          <p className="font-medium">Check inventory</p>
                        </div>
                        <div>
                          <span className="text-green-600">List Price:</span>
                          <p className="font-medium">Rp {selectedProduct.price?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Order Summary */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Grand Total:</span>
                  <span>Rp {calculateGrandTotal().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/sales/orders')}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Sales Order'}
          </button>
        </div>
      </form>

      {/* Sales Tips */}
      <div className="card p-4 bg-blue-50 border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">💡 Sales Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Verify customer credit limit before processing large orders</li>
          <li>• Check product availability in inventory before confirming orders</li>
          <li>• Set realistic delivery dates considering production schedules</li>
          <li>• Apply appropriate discounts based on customer type and volume</li>
        </ul>
      </div>
    </div>
  )
}
