import React from 'react'
import { Link } from 'react-router-dom'
import { 
  BeakerIcon, 
  CubeIcon, 
  DocumentTextIcon, 
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useGetRDDashboardQuery, useGetRDAnalyticsQuery } from '../../services/api'

export default function RDDashboard() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useGetRDDashboardQuery()
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useGetRDAnalyticsQuery()

  if (isDashboardLoading || isAnalyticsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const summary = dashboardData?.summary || {}
  const recentProjects = dashboardData?.recent_projects || []
  const recentExperiments = dashboardData?.recent_experiments || []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">R&D Dashboard</h1>
          <p className="text-gray-600 mt-1">Research & Development Management Center</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/app/rd/projects/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            New Project
          </Link>
          <Link
            to="/app/rd/experiments/new"
            className="btn-secondary inline-flex items-center gap-2"
          >
            <BeakerIcon className="h-5 w-5" />
            New Experiment
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Projects Card */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Research Projects</p>
              <p className="text-3xl font-bold text-blue-600">{summary.projects?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.projects?.active || 0} active • {summary.projects?.completed || 0} completed
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">
                {summary.projects?.completion_rate?.toFixed(1) || 0}%
              </span>
              <span className="text-gray-500 ml-1">completion rate</span>
            </div>
          </div>
        </div>

        {/* Experiments Card */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Experiments</p>
              <p className="text-3xl font-bold text-purple-600">{summary.experiments?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.experiments?.successful || 0} successful
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <BeakerIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">
                {summary.experiments?.success_rate?.toFixed(1) || 0}%
              </span>
              <span className="text-gray-500 ml-1">success rate</span>
            </div>
          </div>
        </div>

        {/* Products Card */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Product Development</p>
              <p className="text-3xl font-bold text-green-600">{summary.products?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {summary.products?.launched || 0} launched
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CubeIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">
                {summary.products?.launch_rate?.toFixed(1) || 0}%
              </span>
              <span className="text-gray-500 ml-1">launch rate</span>
            </div>
          </div>
        </div>

        {/* Budget Card */}
        <div className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Utilization</p>
              <p className="text-3xl font-bold text-orange-600">
                {summary.budget?.utilization_rate?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Rp {((summary.budget?.total_spent || 0) / 1000000).toFixed(1)}M spent
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(summary.budget?.utilization_rate || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link
            to="/app/rd/projects"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Projects</span>
          </Link>
          <Link
            to="/app/rd/experiments"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <BeakerIcon className="h-8 w-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Experiments</span>
          </Link>
          <Link
            to="/app/rd/products"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <CubeIcon className="h-8 w-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Products</span>
          </Link>
          <Link
            to="/app/rd/materials"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
          >
            <ClipboardDocumentListIcon className="h-8 w-8 text-yellow-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Materials</span>
          </Link>
          <Link
            to="/app/rd/reports"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
          >
            <DocumentTextIcon className="h-8 w-8 text-indigo-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Reports</span>
          </Link>
          <Link
            to="/app/rd/analytics"
            className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors"
          >
            <ChartBarIcon className="h-8 w-8 text-red-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Analytics</span>
          </Link>
        </div>
      </div>

      {/* Recent Activities & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link to="/app/rd/projects" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentProjects.length > 0 ? (
              recentProjects.map((project: any) => (
                <div key={project.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{project.project_name}</h3>
                    <p className="text-sm text-gray-500">{project.project_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${getStatusBadge(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent projects</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Experiments */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Experiments</h2>
            <Link to="/app/rd/experiments" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentExperiments.length > 0 ? (
              recentExperiments.map((experiment: any) => (
                <div key={experiment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{experiment.experiment_name}</h3>
                    <p className="text-sm text-gray-500">{experiment.experiment_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {experiment.success && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    <span className={`badge ${getStatusBadge(experiment.status)}`}>
                      {experiment.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BeakerIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No recent experiments</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alerts & Notifications</h2>
        <div className="space-y-3">
          {/* Pending Materials */}
          {summary.materials?.pending > 0 && (
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {summary.materials.pending} material requests pending approval
                </p>
              </div>
              <Link to="/app/rd/materials?status=requested" className="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                Review
              </Link>
            </div>
          )}

          {/* Low Budget Utilization */}
          {(summary.budget?.utilization_rate || 0) > 90 && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  Budget utilization is high ({summary.budget.utilization_rate.toFixed(1)}%)
                </p>
              </div>
              <Link to="/app/rd/analytics" className="text-red-600 hover:text-red-800 text-sm font-medium">
                View Details
              </Link>
            </div>
          )}

          {/* No active projects */}
          {(summary.projects?.active || 0) === 0 && (
            <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <ClockIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  No active research projects. Consider starting a new project.
                </p>
              </div>
              <Link to="/app/rd/projects/new" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Create Project
              </Link>
            </div>
          )}

          {/* All good */}
          {summary.materials?.pending === 0 && (summary.budget?.utilization_rate || 0) < 90 && (summary.projects?.active || 0) > 0 && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  All systems running smoothly. No immediate action required.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    planning: 'badge-warning',
    in_progress: 'badge-info',
    testing: 'badge-info',
    completed: 'badge-success',
    on_hold: 'badge-warning',
    cancelled: 'badge-danger',
    planned: 'badge-warning',
    failed: 'badge-danger',
    concept: 'badge-info',
    development: 'badge-info',
    approved: 'badge-success',
    rejected: 'badge-danger',
    draft: 'badge-warning',
    review: 'badge-info',
    published: 'badge-success',
  }
  return badges[status] || 'badge-info'
}
