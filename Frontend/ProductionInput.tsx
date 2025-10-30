import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Factory, Target, CheckCircle, XCircle, Save, RefreshCw, AlertTriangle, TrendingUp, Calculator } from 'lucide-react';
import axios from 'axios';

// Create axios instance with proper API base URL
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface Machine {
  id: number;
  code: string;
  name: string;
  machine_type: string;
  capacity_per_hour: number;
  capacity_uom: string;
}

interface Product {
  id: number;
  code: string;
  name: string;
  uom: string;
  category: string;
}

interface Operator {
  id: number;
  employee_id: string;
  name: string;
  position: string;
  department: string;
}

interface ShiftProductionForm {
  production_date: string;
  shift: string;
  machine_id: string;
  product_id: string;
  target_quantity: string;
  actual_quantity: string;
  good_quantity: string;
  reject_quantity: string;
  rework_quantity: string;
  planned_runtime: string;
  actual_runtime: string;
  downtime_minutes: string;
  setup_time: string;
  operator_id: string;
  supervisor_id: string;
  notes: string;
  issues: string;
}

const ProductionInput: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState<ShiftProductionForm>({
    production_date: new Date().toISOString().split('T')[0],
    shift: '',
    machine_id: '',
    product_id: '',
    target_quantity: '',
    actual_quantity: '',
    good_quantity: '',
    reject_quantity: '0',
    rework_quantity: '0',
    planned_runtime: '480',
    actual_runtime: '',
    downtime_minutes: '0',
    setup_time: '0',
    operator_id: '',
    supervisor_id: '',
    notes: '',
    issues: ''
  });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [machinesRes, productsRes, operatorsRes] = await Promise.all([
        axiosInstance.get('/api/production-input/machines/active'),
        axiosInstance.get('/api/production-input/products/active'),
        axiosInstance.get('/api/production-input/employees/operators')
      ]);

      setMachines(machinesRes.data.machines || []);
      setProducts(productsRes.data.products || []);
      setOperators(operatorsRes.data.operators || []);
    } catch (error) {
      console.error('Error fetching master data:', error);
      setMessage({ type: 'error', text: 'Gagal memuat data master' });
    }
  };

  const handleInputChange = (field: keyof ShiftProductionForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Auto-calculations with validation
    if (field === 'actual_quantity' || field === 'reject_quantity' || field === 'rework_quantity') {
      const actualQty = parseFloat(field === 'actual_quantity' ? value : formData.actual_quantity) || 0;
      const rejectQty = parseFloat(field === 'reject_quantity' ? value : formData.reject_quantity) || 0;
      const reworkQty = parseFloat(field === 'rework_quantity' ? value : formData.rework_quantity) || 0;
      const goodQty = actualQty - rejectQty - reworkQty;
      
      if (goodQty < 0) {
        setValidationErrors(prev => ({
          ...prev,
          good_quantity: 'Good quantity tidak boleh negatif'
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        good_quantity: Math.max(0, goodQty).toString()
      }));
    }

    if (field === 'downtime_minutes' || field === 'planned_runtime') {
      const plannedRuntime = parseFloat(field === 'planned_runtime' ? value : formData.planned_runtime) || 480;
      const downtimeMinutes = parseFloat(field === 'downtime_minutes' ? value : formData.downtime_minutes) || 0;
      const actualRuntime = plannedRuntime - downtimeMinutes;
      
      if (actualRuntime < 0) {
        setValidationErrors(prev => ({
          ...prev,
          actual_runtime: 'Actual runtime tidak boleh negatif'
        }));
      }
      
      setFormData(prev => ({
        ...prev,
        actual_runtime: Math.max(0, actualRuntime).toString()
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.production_date) errors.production_date = 'Tanggal produksi wajib diisi';
    if (!formData.shift) errors.shift = 'Shift wajib dipilih';
    if (!formData.machine_id) errors.machine_id = 'Mesin wajib dipilih';
    if (!formData.product_id) errors.product_id = 'Produk wajib dipilih';
    if (!formData.target_quantity || parseFloat(formData.target_quantity) <= 0) {
      errors.target_quantity = 'Target quantity harus lebih dari 0';
    }
    if (!formData.actual_quantity || parseFloat(formData.actual_quantity) < 0) {
      errors.actual_quantity = 'Actual quantity tidak boleh negatif';
    }
    
    const actualQty = parseFloat(formData.actual_quantity) || 0;
    const rejectQty = parseFloat(formData.reject_quantity) || 0;
    const reworkQty = parseFloat(formData.rework_quantity) || 0;
    
    if (rejectQty + reworkQty > actualQty) {
      errors.reject_quantity = 'Total reject + rework tidak boleh melebihi actual quantity';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateMetrics = () => {
    const actualQty = parseFloat(formData.actual_quantity) || 0;
    const goodQty = parseFloat(formData.good_quantity) || 0;
    const targetQty = parseFloat(formData.target_quantity) || 0;
    const plannedRuntime = parseFloat(formData.planned_runtime) || 480;
    const downtimeMinutes = parseFloat(formData.downtime_minutes) || 0;

    const qualityRate = actualQty > 0 ? (goodQty / actualQty * 100) : 0;
    const efficiencyRate = targetQty > 0 ? (actualQty / targetQty * 100) : 0;
    const availabilityRate = plannedRuntime > 0 ? ((plannedRuntime - downtimeMinutes) / plannedRuntime * 100) : 0;
    const oeeScore = (availabilityRate * efficiencyRate * qualityRate) / 10000;

    return {
      qualityRate: qualityRate.toFixed(1),
      efficiencyRate: efficiencyRate.toFixed(1),
      availabilityRate: availabilityRate.toFixed(1),
      oeeScore: oeeScore.toFixed(1),
      isGoodPerformance: oeeScore >= 85,
      isWarningPerformance: oeeScore >= 60 && oeeScore < 85
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Mohon perbaiki kesalahan pada form' });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        ...formData,
        target_quantity: parseFloat(formData.target_quantity),
        actual_quantity: parseFloat(formData.actual_quantity),
        good_quantity: parseFloat(formData.good_quantity),
        reject_quantity: parseFloat(formData.reject_quantity),
        rework_quantity: parseFloat(formData.rework_quantity),
        planned_runtime: parseInt(formData.planned_runtime),
        actual_runtime: parseInt(formData.actual_runtime),
        downtime_minutes: parseInt(formData.downtime_minutes),
        setup_time: parseInt(formData.setup_time),
        machine_id: parseInt(formData.machine_id),
        product_id: parseInt(formData.product_id),
        operator_id: formData.operator_id ? parseInt(formData.operator_id) : null,
        supervisor_id: formData.supervisor_id ? parseInt(formData.supervisor_id) : null
      };

      await axiosInstance.post('/api/production-input/shift-productions', payload);
      
      setMessage({ type: 'success', text: 'Data produksi berhasil disimpan!' });
      setIsDirty(false);
      
      // Reset form
      setFormData({
        production_date: new Date().toISOString().split('T')[0],
        shift: '',
        machine_id: '',
        product_id: '',
        target_quantity: '',
        actual_quantity: '',
        good_quantity: '',
        reject_quantity: '0',
        rework_quantity: '0',
        planned_runtime: '480',
        actual_runtime: '',
        downtime_minutes: '0',
        setup_time: '0',
        operator_id: '',
        supervisor_id: '',
        notes: '',
        issues: ''
      });
    } catch (error: any) {
      console.error('Error saving production data:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Gagal menyimpan data produksi' 
      });
    } finally {
      setLoading(false);
    }
  };

  const metrics = calculateMetrics();
  const selectedProduct = products.find(p => p.id === parseInt(formData.product_id));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Factory className="h-8 w-8 text-blue-600" />
            Input Produksi Shift
          </h1>
          <p className="text-gray-600 mt-2">Input data produksi per shift dan mesin dengan validasi otomatis</p>
        </div>
        <div className="flex items-center gap-4">
          {isDirty && (
            <div className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Ada perubahan belum disimpan</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border-l-4 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-500 text-green-700' 
            : message.type === 'warning'
            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
            : 'bg-red-50 border-red-500 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {message.type === 'warning' && <AlertTriangle className="h-5 w-5" />}
            {message.type === 'error' && <XCircle className="h-5 w-5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informasi Dasar
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="production_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal Produksi *
                </label>
                <input
                  id="production_date"
                  type="date"
                  value={formData.production_date}
                  onChange={(e) => handleInputChange('production_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.production_date ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {validationErrors.production_date && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.production_date}</p>
                )}
              </div>

              <div>
                <label htmlFor="shift" className="block text-sm font-medium text-gray-700 mb-1">
                  Shift *
                </label>
                <select
                  id="shift"
                  value={formData.shift}
                  onChange={(e) => handleInputChange('shift', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.shift ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Pilih Shift</option>
                  <option value="shift_1">Shift 1 (07:00 - 15:00)</option>
                  <option value="shift_2">Shift 2 (15:00 - 23:00)</option>
                  <option value="shift_3">Shift 3 (23:00 - 07:00)</option>
                </select>
                {validationErrors.shift && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.shift}</p>
                )}
              </div>

              <div>
                <label htmlFor="machine_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Mesin *
                </label>
                <select
                  id="machine_id"
                  value={formData.machine_id}
                  onChange={(e) => handleInputChange('machine_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.machine_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Pilih Mesin</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id.toString()}>
                      {machine.code} - {machine.name}
                    </option>
                  ))}
                </select>
                {validationErrors.machine_id && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.machine_id}</p>
                )}
              </div>

              <div>
                <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Produk *
                </label>
                <select
                  id="product_id"
                  value={formData.product_id}
                  onChange={(e) => handleInputChange('product_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.product_id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Pilih Produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id.toString()}>
                      {product.code} - {product.name}
                    </option>
                  ))}
                </select>
                {validationErrors.product_id && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.product_id}</p>
                )}
              </div>
            </div>
          </div>

          {/* Production Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Data Produksi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="target_quantity">Target Quantity</Label>
                <Input
                  id="target_quantity"
                  type="number"
                  step="0.01"
                  value={formData.target_quantity}
                  onChange={(e) => handleInputChange('target_quantity', e.target.value)}
                  placeholder="Target produksi"
                  required
                />
                {selectedProduct && (
                  <p className="text-sm text-gray-500 mt-1">UOM: {selectedProduct.uom}</p>
                )}
              </div>

              <div>
                <Label htmlFor="actual_quantity">Actual Quantity</Label>
                <Input
                  id="actual_quantity"
                  type="number"
                  step="0.01"
                  value={formData.actual_quantity}
                  onChange={(e) => handleInputChange('actual_quantity', e.target.value)}
                  placeholder="Actual produksi"
                  required
                />
              </div>

              <div>
                <Label htmlFor="good_quantity">Good Quantity</Label>
                <Input
                  id="good_quantity"
                  type="number"
                  step="0.01"
                  value={formData.good_quantity}
                  onChange={(e) => handleInputChange('good_quantity', e.target.value)}
                  placeholder="Produk baik"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="reject_quantity">Reject</Label>
                  <Input
                    id="reject_quantity"
                    type="number"
                    step="0.01"
                    value={formData.reject_quantity}
                    onChange={(e) => handleInputChange('reject_quantity', e.target.value)}
                    placeholder="Reject"
                  />
                </div>
                <div>
                  <Label htmlFor="rework_quantity">Rework</Label>
                  <Input
                    id="rework_quantity"
                    type="number"
                    step="0.01"
                    value={formData.rework_quantity}
                    onChange={(e) => handleInputChange('rework_quantity', e.target.value)}
                    placeholder="Rework"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time & Operators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Waktu & Operator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="planned_runtime">Planned Runtime (menit)</Label>
                <Input
                  id="planned_runtime"
                  type="number"
                  value={formData.planned_runtime}
                  onChange={(e) => handleInputChange('planned_runtime', e.target.value)}
                  placeholder="480"
                />
              </div>

              <div>
                <Label htmlFor="actual_runtime">Actual Runtime (menit)</Label>
                <Input
                  id="actual_runtime"
                  type="number"
                  value={formData.actual_runtime}
                  onChange={(e) => handleInputChange('actual_runtime', e.target.value)}
                  placeholder="Actual runtime"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="downtime_minutes">Downtime (menit)</Label>
                  <Input
                    id="downtime_minutes"
                    type="number"
                    value={formData.downtime_minutes}
                    onChange={(e) => handleInputChange('downtime_minutes', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="setup_time">Setup Time (menit)</Label>
                  <Input
                    id="setup_time"
                    type="number"
                    value={formData.setup_time}
                    onChange={(e) => handleInputChange('setup_time', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="operator_id">Operator</Label>
                <Select value={formData.operator_id} onValueChange={(value) => handleInputChange('operator_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id.toString()}>
                        {operator.employee_id} - {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="supervisor_id">Supervisor</Label>
                <Select value={formData.supervisor_id} onValueChange={(value) => handleInputChange('supervisor_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.id} value={operator.id.toString()}>
                        {operator.employee_id} - {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Metrics Display */}
        <div className="bg-white rounded-lg shadow-lg border">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600" />
                Metrics Otomatis & Performance
              </h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                metrics.isGoodPerformance 
                  ? 'bg-green-100 text-green-800'
                  : metrics.isWarningPerformance 
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {metrics.isGoodPerformance 
                  ? '🎯 Excellent Performance'
                  : metrics.isWarningPerformance 
                  ? '⚠️ Warning Performance'
                  : '🚨 Poor Performance'
                }
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="text-3xl font-bold text-blue-600 mb-1">{metrics.qualityRate}%</div>
                <div className="text-sm font-medium text-blue-700">Quality Rate</div>
                <div className="text-xs text-blue-600 mt-1">Good / Actual</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="text-3xl font-bold text-green-600 mb-1">{metrics.efficiencyRate}%</div>
                <div className="text-sm font-medium text-green-700">Efficiency Rate</div>
                <div className="text-xs text-green-600 mt-1">Actual / Target</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
                <div className="text-3xl font-bold text-yellow-600 mb-1">{metrics.availabilityRate}%</div>
                <div className="text-sm font-medium text-yellow-700">Availability Rate</div>
                <div className="text-xs text-yellow-600 mt-1">Uptime / Planned</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                <div className="text-3xl font-bold text-purple-600 mb-1">{metrics.oeeScore}%</div>
                <div className="text-sm font-medium text-purple-700">OEE Score</div>
                <div className="text-xs text-purple-600 mt-1">Overall Equipment Effectiveness</div>
              </div>
            </div>
            
            {/* Performance Indicators */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Target vs Actual</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formData.actual_quantity && formData.target_quantity 
                    ? `${((parseFloat(formData.actual_quantity) / parseFloat(formData.target_quantity)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Defect Rate</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formData.actual_quantity 
                    ? `${(((parseFloat(formData.reject_quantity) || 0) / parseFloat(formData.actual_quantity)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Downtime Rate</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {formData.planned_runtime 
                    ? `${(((parseFloat(formData.downtime_minutes) || 0) / parseFloat(formData.planned_runtime)) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Catatan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Catatan produksi..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="issues">Issues</Label>
              <Textarea
                id="issues"
                value={formData.issues}
                onChange={(e) => handleInputChange('issues', e.target.value)}
                placeholder="Masalah yang terjadi..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin reset form?')) {
                  setFormData({
                    production_date: new Date().toISOString().split('T')[0],
                    shift: '',
                    machine_id: '',
                    product_id: '',
                    target_quantity: '',
                    actual_quantity: '',
                    good_quantity: '',
                    reject_quantity: '0',
                    rework_quantity: '0',
                    planned_runtime: '480',
                    actual_runtime: '',
                    downtime_minutes: '0',
                    setup_time: '0',
                    operator_id: '',
                    supervisor_id: '',
                    notes: '',
                    issues: ''
                  });
                  setIsDirty(false);
                  setValidationErrors({});
                }
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Form
            </button>
            
            {Object.keys(validationErrors).length > 0 && (
              <div className="text-red-600 text-sm flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {Object.keys(validationErrors).length} error(s) found
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || Object.keys(validationErrors).length > 0}
            className={`px-8 py-3 rounded-md font-medium flex items-center gap-2 ${
              loading || Object.keys(validationErrors).length > 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan Data Produksi
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductionInput;
