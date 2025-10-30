import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CubeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  CalculatorIcon,
  EyeIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import axiosInstance from '../../utils/axiosConfig';
import { formatRupiah } from '../../utils/currencyUtils';

interface BOMItem {
  id: number;
  material_id: number;
  material_name: string;
  material_code: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  waste_percentage: number;
  notes?: string;
}

interface BOM {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  version: string;
  is_active: boolean;
  total_cost: number;
  total_materials: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  items: BOMItem[];
}

interface Product {
  id: number;
  name: string;
  code: string;
  category: string;
}

interface Material {
  id: number;
  name: string;
  code: string;
  unit: string;
  unit_cost: number;
  stock_quantity: number;
}

const BOMManagement: React.FC = () => {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [showBOMModal, setShowBOMModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  
  // Form states
  const [bomForm, setBomForm] = useState({
    product_id: 0,
    version: '1.0',
    is_active: true
  });

  const [itemForm, setItemForm] = useState({
    material_id: 0,
    quantity: 0,
    waste_percentage: 0,
    notes: ''
  });

  const [editingItem, setEditingItem] = useState<BOMItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [bomsRes, productsRes, materialsRes] = await Promise.all([
        axiosInstance.get('/api/products/bom'),
        axiosInstance.get('/api/products'),
        axiosInstance.get('/api/products/materials')
      ]);

      setBoms(bomsRes.data?.boms || []);
      setProducts(productsRes.data?.products || []);
      setMaterials(materialsRes.data?.materials || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      // Set mock data for development
      setBoms([
        {
          id: 1,
          product_id: 1,
          product_name: 'Nonwoven Fabric A',
          product_code: 'NWF-001',
          version: '1.0',
          is_active: true,
          total_cost: 12500,
          total_materials: 4,
          created_by: 'Admin User',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
          items: [
            {
              id: 1,
              material_id: 1,
              material_name: 'PP Granules',
              material_code: 'PP-001',
              quantity: 10,
              unit: 'kg',
              unit_cost: 8500,
              total_cost: 85000,
              waste_percentage: 2,
              notes: 'Primary raw material'
            },
            {
              id: 2,
              material_id: 2,
              material_name: 'Additives',
              material_code: 'ADD-001',
              quantity: 0.5,
              unit: 'kg',
              unit_cost: 25000,
              total_cost: 12500,
              waste_percentage: 1,
              notes: 'Color and UV stabilizer'
            }
          ]
        },
        {
          id: 2,
          product_id: 2,
          product_name: 'Medical Mask Material',
          product_code: 'MMM-001',
          version: '2.1',
          is_active: true,
          total_cost: 15800,
          total_materials: 3,
          created_by: 'Production Manager',
          created_at: '2024-01-05T00:00:00Z',
          updated_at: '2024-01-15T14:20:00Z',
          items: [
            {
              id: 3,
              material_id: 3,
              material_name: 'Meltblown Fabric',
              material_code: 'MB-001',
              quantity: 1,
              unit: 'm²',
              unit_cost: 12000,
              total_cost: 12000,
              waste_percentage: 3,
              notes: 'Filter layer'
            },
            {
              id: 4,
              material_id: 4,
              material_name: 'Spunbond Fabric',
              material_code: 'SB-001',
              quantity: 2,
              unit: 'm²',
              unit_cost: 1900,
              total_cost: 3800,
              waste_percentage: 2,
              notes: 'Outer layers'
            }
          ]
        }
      ]);
      
      setProducts([
        { id: 1, name: 'Nonwoven Fabric A', code: 'NWF-001', category: 'Nonwoven Fabrics' },
        { id: 2, name: 'Medical Mask Material', code: 'MMM-001', category: 'Medical Products' },
        { id: 3, name: 'Filter Media', code: 'FM-001', category: 'Filter Media' },
        { id: 4, name: 'Geotextile Fabric', code: 'GTF-001', category: 'Geotextiles' }
      ]);
      
      setMaterials([
        { id: 1, name: 'PP Granules', code: 'PP-001', unit: 'kg', unit_cost: 8500, stock_quantity: 1500 },
        { id: 2, name: 'Additives', code: 'ADD-001', unit: 'kg', unit_cost: 25000, stock_quantity: 50 },
        { id: 3, name: 'Meltblown Fabric', code: 'MB-001', unit: 'm²', unit_cost: 12000, stock_quantity: 200 },
        { id: 4, name: 'Spunbond Fabric', code: 'SB-001', unit: 'm²', unit_cost: 1900, stock_quantity: 800 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredBOMs = boms.filter(bom =>
    bom.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bom.version.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openBOMModal = (bom?: BOM) => {
    if (bom) {
      setSelectedBOM(bom);
      setBomForm({
        product_id: bom.product_id,
        version: bom.version,
        is_active: bom.is_active
      });
    } else {
      setSelectedBOM(null);
      setBomForm({
        product_id: 0,
        version: '1.0',
        is_active: true
      });
    }
    setShowBOMModal(true);
  };

  const closeBOMModal = () => {
    setShowBOMModal(false);
    setSelectedBOM(null);
  };

  const saveBOM = async () => {
    try {
      const bomData = {
        ...bomForm,
        id: selectedBOM?.id
      };

      if (selectedBOM) {
        await axiosInstance.put(`/api/products/bom/${selectedBOM.id}`, bomData);
      } else {
        await axiosInstance.post('/api/products/bom', bomData);
      }

      closeBOMModal();
      await loadData();
      alert(`BOM ${selectedBOM ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Failed to save BOM:', error);
      alert('Failed to save BOM');
    }
  };

  const deleteBOM = async (bomId: number) => {
    if (!confirm('Are you sure you want to delete this BOM? This action cannot be undone.')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/products/bom/${bomId}`);
      await loadData();
      alert('BOM deleted successfully!');
    } catch (error) {
      console.error('Failed to delete BOM:', error);
      alert('Failed to delete BOM');
    }
  };

  const openItemModal = (bom: BOM, item?: BOMItem) => {
    setSelectedBOM(bom);
    if (item) {
      setEditingItem(item);
      setItemForm({
        material_id: item.material_id,
        quantity: item.quantity,
        waste_percentage: item.waste_percentage,
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setItemForm({
        material_id: 0,
        quantity: 0,
        waste_percentage: 0,
        notes: ''
      });
    }
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setSelectedBOM(null);
  };

  const saveItem = async () => {
    try {
      const itemData = {
        ...itemForm,
        bom_id: selectedBOM?.id,
        id: editingItem?.id
      };

      if (editingItem) {
        await axiosInstance.put(`/api/products/bom/${selectedBOM?.id}/items/${editingItem.id}`, itemData);
      } else {
        await axiosInstance.post(`/api/products/bom/${selectedBOM?.id}/items`, itemData);
      }

      closeItemModal();
      await loadData();
      alert(`BOM item ${editingItem ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Failed to save BOM item:', error);
      alert('Failed to save BOM item');
    }
  };

  const deleteItem = async (bomId: number, itemId: number) => {
    if (!confirm('Are you sure you want to remove this item from the BOM?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/products/bom/${bomId}/items/${itemId}`);
      await loadData();
      alert('BOM item removed successfully!');
    } catch (error) {
      console.error('Failed to delete BOM item:', error);
      alert('Failed to delete BOM item');
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const calculateItemCost = () => {
    const material = materials.find(m => m.id === itemForm.material_id);
    if (material && itemForm.quantity > 0) {
      const baseCost = material.unit_cost * itemForm.quantity;
      const wasteCost = baseCost * (itemForm.waste_percentage / 100);
      return baseCost + wasteCost;
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading BOM data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            to="/app/products/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bill of Materials</h1>
            <p className="text-gray-600 mt-1">Manage product recipes and material requirements</p>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> Click "Create BOM" to access the full form with material input table, quantities, scrap percentage, and more advanced features.
              </p>
            </div>
          </div>
        </div>
        <Link
          to="/app/products/boms/new"
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create BOM
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search BOMs by product name, code, or version..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* BOM List */}
      <div className="space-y-4">
        {filteredBOMs.map((bom) => (
          <div key={bom.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {bom.product_name} ({bom.product_code})
                  </h3>
                  <p className="text-sm text-gray-600">Version {bom.version}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  bom.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {bom.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex space-x-1">
                  <Link
                    to={`/app/products/boms/${bom.id}/edit`}
                    className="p-2 text-gray-400 hover:text-blue-600"
                    title="Edit BOM"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => deleteBOM(bom.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete BOM"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Total Materials</div>
                <div className="text-lg font-semibold text-gray-900">{bom.total_materials}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Total Cost</div>
                <div className="text-lg font-semibold text-gray-900">{formatRupiah(bom.total_cost)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Created By</div>
                <div className="text-lg font-semibold text-gray-900">{bom.created_by}</div>
              </div>
            </div>

            {/* BOM Items */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">Materials</h4>
                <button
                  onClick={() => openItemModal(bom)}
                  className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Material
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Waste %</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bom.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <div>
                            <div className="font-medium text-gray-900">{item.material_name}</div>
                            <div className="text-gray-500">{item.material_code}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="px-3 py-2">
                          {formatRupiah(item.unit_cost)}
                        </td>
                        <td className="px-3 py-2">
                          {item.waste_percentage}%
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {formatRupiah(item.total_cost)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openItemModal(bom, item)}
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Edit item"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteItem(bom.id, item.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove item"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBOMs.length === 0 && (
        <div className="text-center py-12">
          <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No BOMs found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm 
              ? 'Try adjusting your search terms' 
              : 'Get started by creating your first Bill of Materials'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => openBOMModal()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create BOM
            </button>
          )}
        </div>
      )}

      {/* BOM Modal */}
      {showBOMModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedBOM ? 'Edit BOM' : 'Create New BOM'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <select
                    value={bomForm.product_id}
                    onChange={(e) => setBomForm({...bomForm, product_id: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={!!selectedBOM}
                  >
                    <option value={0}>Select Product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Version</label>
                  <input
                    type="text"
                    value={bomForm.version}
                    onChange={(e) => setBomForm({...bomForm, version: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 1.0, 2.1"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bomForm.is_active}
                      onChange={(e) => setBomForm({...bomForm, is_active: e.target.checked})}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Active BOM</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={closeBOMModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBOM}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={bomForm.product_id === 0 || !bomForm.version.trim()}
                >
                  {selectedBOM ? 'Update BOM' : 'Create BOM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingItem ? 'Edit Material' : 'Add Material'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Material</label>
                  <select
                    value={itemForm.material_id}
                    onChange={(e) => setItemForm({...itemForm, material_id: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Select Material</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.code}) - {formatRupiah(material.unit_cost)}/{material.unit}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({...itemForm, quantity: parseFloat(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Waste Percentage</label>
                  <input
                    type="number"
                    step="0.1"
                    value={itemForm.waste_percentage}
                    onChange={(e) => setItemForm({...itemForm, waste_percentage: parseFloat(e.target.value) || 0})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter waste percentage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={itemForm.notes}
                    onChange={(e) => setItemForm({...itemForm, notes: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>

                {itemForm.material_id > 0 && itemForm.quantity > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-sm text-blue-600">Estimated Cost</div>
                    <div className="text-lg font-semibold text-blue-900">
                      {formatRupiah(calculateItemCost())}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                <button
                  onClick={closeItemModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={saveItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={itemForm.material_id === 0 || itemForm.quantity <= 0}
                >
                  {editingItem ? 'Update Material' : 'Add Material'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOMManagement;
