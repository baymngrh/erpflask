import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Package, 
  Calendar, 
  Hash,
  Plus,
  Trash2,
  FileText,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Settings,
  Layers
} from 'lucide-react';

interface Product {
  id: number;
  code: string;
  name: string;
  material_type: string;
  primary_uom: string;
  cost: number;
  price: number;
  category_name?: string;
}

interface Material {
  id: number;
  code: string;
  name: string;
  material_type: string;
  category: string;
  primary_uom: string;
  cost_per_unit: number;
  supplier_name?: string;
  lead_time_days: number;
  is_hazardous: boolean;
}

interface BOMItem {
  id?: number;
  line_number: number;
  product_id: number | null;
  material_id: number | null;
  quantity: number;
  uom: string;
  scrap_percent: number;
  is_critical: boolean;
  notes: string;
  item_type: 'product' | 'material';
  item_name?: string;
  item_code?: string;
}

interface BOMFormData {
  bom_number: string;
  product_id: number;
  version: string;
  is_active: boolean;
  effective_date: string;
  expiry_date: string;
  batch_size: number;
  batch_uom: string;
  notes: string;
  items: BOMItem[];
}

const BOMForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<BOMFormData>({
    bom_number: '',
    product_id: 0,
    version: '1.0',
    is_active: true,
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    batch_size: 1,
    batch_uom: 'pcs',
    notes: '',
    items: []
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const uomOptions = [
    'pcs', 'kg', 'g', 'liter', 'ml', 'meter', 'cm', 'box', 'pack', 'unit'
  ];

  useEffect(() => {
    fetchProducts();
    fetchMaterials();
    if (isEdit) {
      fetchBOM();
    } else {
      generateBOMNumber();
    }
  }, [id]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/production/products?is_producible=true&is_active=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/production/materials?is_active=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  const generateBOMNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-4);
    const bomNumber = `BOM-${year}${month}-${timestamp}`;
    
    setFormData(prev => ({
      ...prev,
      bom_number: bomNumber
    }));
  };

  const fetchBOM = async () => {
    try {
      const response = await fetch(`/api/production/boms/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData({
          bom_number: data.bom_number,
          product_id: data.product_id,
          version: data.version,
          is_active: data.is_active,
          effective_date: data.effective_date,
          expiry_date: data.expiry_date || '',
          batch_size: data.batch_size,
          batch_uom: data.batch_uom,
          notes: data.notes || '',
          items: data.items?.map((item: any, index: number) => ({
            id: item.id,
            line_number: item.line_number || index + 1,
            product_id: item.product_id,
            material_id: item.material_id,
            quantity: item.quantity,
            uom: item.uom,
            scrap_percent: item.scrap_percent || 0,
            is_critical: item.is_critical || false,
            notes: item.notes || '',
            item_type: item.product_id ? 'product' : 'material',
            item_name: item.product?.product_name || item.material?.material_name,
            item_code: item.product?.product_code || item.material?.material_code
          })) || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch BOM:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.product_id === 0) {
      setError('Please select a product');
      setLoading(false);
      return;
    }

    if (formData.items.length === 0) {
      setError('Please add at least one BOM item');
      setLoading(false);
      return;
    }

    // Validate items
    for (const item of formData.items) {
      if (!item.product_id && !item.material_id) {
        setError(`Line ${item.line_number}: Please select a product or material`);
        setLoading(false);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Line ${item.line_number}: Quantity must be greater than 0`);
        setLoading(false);
        return;
      }
    }

    try {
      const url = isEdit 
        ? `/api/production/boms/${id}` 
        : '/api/production/boms';
      
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate('/app/products/boms');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save BOM');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : ['product_id', 'batch_size'].includes(name) 
          ? (value === '' ? 0 : Number(value))
          : value
    }));
  };

  const addBOMItem = () => {
    const newItem: BOMItem = {
      line_number: formData.items.length + 1,
      product_id: null,
      material_id: null,
      quantity: 1,
      uom: 'pcs',
      scrap_percent: 0,
      is_critical: false,
      notes: '',
      item_type: 'material'
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeBOMItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        line_number: i + 1
      }))
    }));
  };

  const updateBOMItem = (index: number, field: keyof BOMItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };
          
          // Handle item type change
          if (field === 'item_type') {
            updatedItem.product_id = null;
            updatedItem.material_id = null;
            updatedItem.item_name = '';
            updatedItem.item_code = '';
          }
          
          // Handle product/material selection
          if (field === 'product_id' && value) {
            const product = products.find(p => p.id === Number(value));
            if (product) {
              updatedItem.uom = product.primary_uom;
              updatedItem.item_name = product.name;
              updatedItem.item_code = product.code;
              updatedItem.material_id = null;
            }
          }
          
          if (field === 'material_id' && value) {
            const material = materials.find(m => m.id === Number(value));
            if (material) {
              updatedItem.uom = material.primary_uom;
              updatedItem.item_name = material.name;
              updatedItem.item_code = material.code;
              updatedItem.product_id = null;
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);
  const getTotalItems = () => formData.items.length;
  const getCriticalItems = () => formData.items.filter(item => item.is_critical).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Bill of Materials' : 'New Bill of Materials'}
          </h1>
          <p className="text-gray-600">
            {isEdit ? 'Update BOM structure and components' : 'Create new BOM for product manufacturing'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {/* BOM Header Information */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              <Layers className="inline h-4 w-4 mr-1" />
              BOM Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Hash className="inline h-4 w-4 mr-1" />
                  BOM Number *
                </label>
                <input
                  type="text"
                  name="bom_number"
                  value={formData.bom_number}
                  onChange={handleInputChange}
                  required
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="inline h-4 w-4 mr-1" />
                  Product *
                </label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="mt-1 text-sm text-gray-500">
                    UOM: {selectedProduct.primary_uom}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  name="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Effective Date
                </label>
                <input
                  type="date"
                  name="effective_date"
                  value={formData.effective_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch Size *
                </label>
                <input
                  type="number"
                  name="batch_size"
                  value={formData.batch_size}
                  onChange={handleInputChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Batch UOM *
                </label>
                <select
                  name="batch_uom"
                  value={formData.batch_uom}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {uomOptions.map(uom => (
                    <option key={uom} value={uom}>
                      {uom}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                <CheckCircle className="inline h-4 w-4 mr-1" />
                Active BOM
              </label>
            </div>
          </div>

          {/* BOM Items */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                <Settings className="inline h-4 w-4 mr-1" />
                BOM Components
              </h3>
              <button
                type="button"
                onClick={addBOMItem}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Plus className="inline h-4 w-4 mr-2" />
                Add Component
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No components added yet</p>
                <p className="text-sm">Click "Add Component" to start building your BOM</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Line
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UOM
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scrap %
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Critical
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.line_number}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.item_type}
                            onChange={(e) => updateBOMItem(index, 'item_type', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="material">Material</option>
                            <option value="product">Product</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {item.item_type === 'product' ? (
                            <select
                              value={item.product_id || ''}
                              onChange={(e) => updateBOMItem(index, 'product_id', e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Product</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.code} - {product.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <select
                              value={item.material_id || ''}
                              onChange={(e) => updateBOMItem(index, 'material_id', e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Material</option>
                              {materials.map(material => (
                                <option key={material.id} value={material.id}>
                                  {material.code} - {material.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateBOMItem(index, 'quantity', Number(e.target.value))}
                            min="0.0001"
                            step="0.0001"
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.uom}
                            onChange={(e) => updateBOMItem(index, 'uom', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          >
                            {uomOptions.map(uom => (
                              <option key={uom} value={uom}>
                                {uom}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.scrap_percent}
                            onChange={(e) => updateBOMItem(index, 'scrap_percent', Number(e.target.value))}
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={item.is_critical}
                            onChange={(e) => updateBOMItem(index, 'is_critical', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeBOMItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* BOM Summary */}
            {formData.items.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">BOM Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Total Components:</span>
                    <div className="font-medium">{getTotalItems()}</div>
                  </div>
                  <div>
                    <span className="text-blue-600">Critical Items:</span>
                    <div className="font-medium text-red-600">{getCriticalItems()}</div>
                  </div>
                  <div>
                    <span className="text-blue-600">Batch Size:</span>
                    <div className="font-medium">{formData.batch_size} {formData.batch_uom}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="inline h-4 w-4 mr-1" />
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter any additional notes about this BOM..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/app/products/boms')}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              <X className="inline h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="inline h-4 w-4 mr-2" />
              {loading ? 'Saving...' : isEdit ? 'Update BOM' : 'Create BOM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BOMForm;
