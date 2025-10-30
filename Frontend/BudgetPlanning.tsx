import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  ChartBarIcon,
  CalculatorIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import axiosInstance from '../../utils/axiosConfig';
import { formatRupiah } from '../../utils/currencyUtils';

interface Budget {
  id: number;
  budget_name: string;
  budget_period: string;
  total_budget: number;
  total_actual: number;
  variance: number;
  variance_percent: number;
  status: string;
}

interface VarianceAnalysis {
  category: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
}

const BudgetPlanning: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [varianceAnalysis, setVarianceAnalysis] = useState<VarianceAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBudget, setSelectedBudget] = useState<string>('annual');

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      
      const [budgetsRes, varianceRes] = await Promise.all([
        axiosInstance.get('/api/finance/budget/budgets'),
        axiosInstance.get('/api/finance/budget/variance-analysis')
      ]);

      setBudgets(budgetsRes.data?.budgets || []);
      setVarianceAnalysis(varianceRes.data?.analysis || []);
    } catch (error) {
      console.error('Failed to load budget data:', error);
      // Mock data fallback
      setBudgets([
        {
          id: 1,
          budget_name: 'Annual Budget 2024',
          budget_period: '2024',
          total_budget: 150000000000,
          total_actual: 125000000000,
          variance: -25000000000,
          variance_percent: -16.7,
          status: 'active'
        },
        {
          id: 2,
          budget_name: 'Q4 2024 Budget',
          budget_period: 'Q4 2024',
          total_budget: 40000000000,
          total_actual: 38500000000,
          variance: -1500000000,
          variance_percent: -3.8,
          status: 'active'
        },
        {
          id: 3,
          budget_name: 'Marketing Budget 2024',
          budget_period: '2024',
          total_budget: 12000000000,
          total_actual: 8500000000,
          variance: -3500000000,
          variance_percent: -29.2,
          status: 'active'
        }
      ]);

      setVarianceAnalysis([
        { category: 'Revenue', budget: 150000000000, actual: 125000000000, variance: -25000000000, variance_percent: -16.7 },
        { category: 'Raw Materials', budget: 45000000000, actual: 35000000000, variance: -10000000000, variance_percent: -22.2 },
        { category: 'Labor Costs', budget: 30000000000, actual: 28000000000, variance: -2000000000, variance_percent: -6.7 },
        { category: 'Manufacturing', budget: 18000000000, actual: 15000000000, variance: -3000000000, variance_percent: -16.7 },
        { category: 'Marketing', budget: 10000000000, actual: 8500000000, variance: -1500000000, variance_percent: -15.0 },
        { category: 'Administration', budget: 7000000000, actual: 5200000000, variance: -1800000000, variance_percent: -25.7 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < -10) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getVarianceBgColor = (variance: number) => {
    if (variance > 0) return 'bg-green-100 text-green-800';
    if (variance < -10) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading budget data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget Planning</h1>
          <p className="text-gray-600 mt-1">Budget planning and variance analysis</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn-secondary">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Generate Report
          </button>
          <button className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Budget
          </button>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {budgets.map((budget) => (
          <div key={budget.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{budget.budget_name}</h3>
              <span className="text-sm text-gray-500">{budget.budget_period}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Budget:</span>
                <span className="text-sm font-medium">{formatRupiah(budget.total_budget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Actual:</span>
                <span className="text-sm font-medium">{formatRupiah(budget.total_actual)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Variance:</span>
                <div className="flex items-center">
                  {budget.variance_percent > 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${getVarianceColor(budget.variance_percent)}`}>
                    {formatPercent(budget.variance_percent)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((budget.total_actual / budget.total_budget) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {((budget.total_actual / budget.total_budget) * 100).toFixed(1)}% of budget used
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Variance Analysis Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={varianceAnalysis}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(value) => `${(value / 1000000000).toFixed(0)}B`} />
              <Tooltip formatter={(value, name) => [
                formatRupiah(value as number),
                name === 'budget' ? 'Budget' : 'Actual'
              ]} />
              <Bar dataKey="budget" fill="#3B82F6" name="Budget" />
              <Bar dataKey="actual" fill="#10B981" name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Variance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={varianceAnalysis.map(item => ({ ...item, absVariance: Math.abs(item.variance) }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, variance_percent }) => `${category}: ${variance_percent.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="absVariance"
              >
                {varianceAnalysis.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatRupiah(value as number), 'Variance']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Variance Analysis */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Variance Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance %
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {varianceAnalysis.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatRupiah(item.budget)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatRupiah(item.actual)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${getVarianceColor(item.variance_percent)}`}>
                    {formatRupiah(item.variance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVarianceBgColor(item.variance_percent)}`}>
                      {formatPercent(item.variance_percent)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {item.variance_percent > 0 ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                    ) : item.variance_percent < -10 ? (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mx-auto" />
                    ) : (
                      <CalculatorIcon className="h-5 w-5 text-yellow-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CalculatorIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-xl font-bold text-gray-900">
                {formatRupiah(budgets.reduce((sum, b) => sum + b.total_budget, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Actual</p>
              <p className="text-xl font-bold text-gray-900">
                {formatRupiah(budgets.reduce((sum, b) => sum + b.total_actual, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-red-100 p-3 rounded-lg">
              <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Variance</p>
              <p className="text-xl font-bold text-red-900">
                {formatRupiah(budgets.reduce((sum, b) => sum + b.variance, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Budget Utilization</p>
              <p className="text-xl font-bold text-gray-900">
                {((budgets.reduce((sum, b) => sum + b.total_actual, 0) / budgets.reduce((sum, b) => sum + b.total_budget, 0)) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPlanning;
