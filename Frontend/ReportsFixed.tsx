import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ChartBarIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CubeIcon,
  TruckIcon,
  BeakerIcon,
  ClockIcon,
  Cog6ToothIcon,
  UsersIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

interface ReportCard {
  id: string
  title: string
  description: string
  icon: any
  category: string
  frequency: string
  lastGenerated?: string
  onClick: () => void
}

export default function Reports() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Auto-select category based on URL parameter
  useEffect(() => {
    const moduleParam = searchParams.get('module')
    if (moduleParam) {
      // Map module parameters to categories
      const moduleMapping: Record<string, string> = {
        'attendance': 'hr',
        'appraisal': 'hr', 
        'training': 'hr',
        'payroll': 'hr',
        'leave': 'hr'
      }
      const category = moduleMapping[moduleParam] || moduleParam
      setSelectedCategory(category)
    }
  }, [searchParams])

  const newFeatures: ReportCard[] = [
    {
      id: 'advanced-builder',
      title: 'Advanced Report Builder',
      description: 'Create custom reports with advanced filtering and visualization options',
      icon: Cog6ToothIcon,
      category: 'tools',
      frequency: 'On-demand',
      onClick: () => navigate('/app/reports/advanced-builder')
    },
    {
      id: 'scheduled-reports',
      title: 'Scheduled Reports',
      description: 'Automate report generation and delivery on schedule',
      icon: ClockIcon,
      category: 'tools',
      frequency: 'Automated',
      onClick: () => navigate('/app/reports/scheduled')
    },
    {
      id: 'executive-dashboard',
      title: 'Executive Dashboard',
      description: 'High-level business insights and key performance indicators',
      icon: ChartBarIcon,
      category: 'executive',
      frequency: 'Real-time',
      onClick: () => navigate('/app/reports/executive')
    }
  ]

  const reports: ReportCard[] = [
    {
      id: 'sales-summary',
      title: 'Sales Summary Report',
      description: 'Monthly sales performance, top customers, and revenue trends',
      icon: ChartBarIcon,
      category: 'sales',
      frequency: 'Monthly',
      lastGenerated: '2025-09-30',
      onClick: () => navigate('/app/reports/generate/sales-summary')
    },
    {
      id: 'production-efficiency',
      title: 'Production Efficiency Report',
      description: 'Machine utilization, downtime analysis, and productivity metrics',
      icon: CubeIcon,
      category: 'production',
      frequency: 'Weekly',
      lastGenerated: '2025-10-01',
      onClick: () => navigate('/app/reports/generate/production-efficiency')
    },
    {
      id: 'inventory-status',
      title: 'Inventory Status Report',
      description: 'Stock levels, reorder points, and inventory valuation',
      icon: DocumentTextIcon,
      category: 'inventory',
      frequency: 'Daily',
      lastGenerated: '2025-10-02',
      onClick: () => navigate('/app/reports/generate/inventory-status')
    },
    {
      id: 'financial-summary',
      title: 'Financial Summary Report',
      description: 'P&L statements, cash flow, and budget variance analysis',
      icon: BanknotesIcon,
      category: 'finance',
      frequency: 'Monthly',
      lastGenerated: '2025-09-30',
      onClick: () => navigate('/app/reports/generate/financial-summary')
    },
    {
      id: 'hr-analytics',
      title: 'HR Analytics Report',
      description: 'Employee performance, attendance, and workforce analytics',
      icon: UsersIcon,
      category: 'hr',
      frequency: 'Monthly',
      lastGenerated: '2025-09-30',
      onClick: () => navigate('/app/reports/generate/hr-analytics')
    },
    {
      id: 'quality-metrics',
      title: 'Quality Metrics Report',
      description: 'Quality control results, defect rates, and compliance tracking',
      icon: BeakerIcon,
      category: 'quality',
      frequency: 'Weekly',
      lastGenerated: '2025-10-01',
      onClick: () => navigate('/app/reports/generate/quality-metrics')
    },
    {
      id: 'shipping-performance',
      title: 'Shipping Performance Report',
      description: 'Delivery times, shipping costs, and logistics efficiency',
      icon: TruckIcon,
      category: 'shipping',
      frequency: 'Weekly',
      lastGenerated: '2025-10-01',
      onClick: () => navigate('/app/reports/generate/shipping-performance')
    },
    {
      id: 'maintenance-summary',
      title: 'Maintenance Summary Report',
      description: 'Equipment maintenance schedules, costs, and downtime analysis',
      icon: Cog6ToothIcon,
      category: 'maintenance',
      frequency: 'Monthly',
      lastGenerated: '2025-09-30',
      onClick: () => navigate('/app/reports/generate/maintenance-summary')
    },
    {
      id: 'training-progress',
      title: 'Training Progress Report',
      description: 'Employee training completion rates and skill development tracking',
      icon: AcademicCapIcon,
      category: 'hr',
      frequency: 'Monthly',
      lastGenerated: '2025-09-30',
      onClick: () => navigate('/app/reports/generate/training-progress')
    },
    {
      id: 'custom-report',
      title: 'Custom Report Builder',
      description: 'Build custom reports with your own parameters and filters',
      icon: Cog6ToothIcon,
      category: 'custom',
      frequency: 'On Demand',
      onClick: () => navigate('/app/reports/custom')
    }
  ]

  const categories = [
    { id: 'all', label: 'All Reports' },
    { id: 'sales', label: 'Sales' },
    { id: 'production', label: 'Production' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'finance', label: 'Finance' },
    { id: 'hr', label: 'Human Resources' },
    { id: 'quality', label: 'Quality' },
    { id: 'shipping', label: 'Shipping' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'custom', label: 'Custom' },
  ]

  const filteredReports = selectedCategory === 'all' 
    ? reports 
    : reports.filter(report => report.category === selectedCategory)

  const getFrequencyBadge = (frequency: string) => {
    const badges: Record<string, string> = {
      'Daily': 'badge-success',
      'Weekly': 'badge-info', 
      'Monthly': 'badge-warning',
      'On Demand': 'badge-gray'
    }
    return badges[frequency] || 'badge-info'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate insights and track performance across all operations</p>
        </div>
        <Link
          to="/app/reports/scheduler"
          className="btn-primary"
        >
          <Cog6ToothIcon className="h-5 w-5 mr-2" />
          Schedule Reports
        </Link>
      </div>

      {/* Category Filter */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* New Features Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">🆕 New Report Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {newFeatures.map((feature) => {
            const IconComponent = feature.icon
            return (
              <div
                key={feature.id}
                onClick={feature.onClick}
                className="card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-green-200 group bg-gradient-to-br from-green-50 to-blue-50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <IconComponent className="h-6 w-6 text-green-600" />
                  </div>
                  <span className="badge badge-success">
                    {feature.frequency}
                  </span>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {feature.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="capitalize">{feature.category}</span>
                  <span className="text-green-600 font-medium">Available Now!</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Standard Reports Grid */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Standard Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const IconComponent = report.icon
            return (
              <div
                key={report.id}
                onClick={report.onClick}
                className="card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-primary-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
                    <IconComponent className="h-6 w-6 text-primary-600" />
                  </div>
                  <span className={`badge ${getFrequencyBadge(report.frequency)}`}>
                    {report.frequency}
                  </span>
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">
                  {report.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {report.description}
                </p>

                {report.lastGenerated && (
                  <div className="text-xs text-gray-500">
                    Last generated: {new Date(report.lastGenerated).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {report.category}
                    </span>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Generate →
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link 
            to="/app/reports/custom"
            className="btn-secondary text-center"
          >
            Custom Report Builder
          </Link>
          <Link 
            to="/app/dashboard"
            className="btn-secondary text-center"
          >
            View Analytics Dashboard
          </Link>
          <Link 
            to="/app/reports/scheduler"
            className="btn-secondary text-center"
          >
            Schedule Reports
          </Link>
          <button 
            onClick={() => window.print()}
            className="btn-secondary text-center"
          >
            Print Current View
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="card p-4 bg-blue-50 border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">💡 Report Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Reports are automatically updated based on their frequency</li>
          <li>• Use filters to customize report data before generation</li>
          <li>• Schedule reports to be delivered to your email automatically</li>
          <li>• Export reports in PDF, Excel, or CSV formats</li>
          <li>• Create custom dashboards using the Custom Report Builder</li>
        </ul>
      </div>
    </div>
  )
}
