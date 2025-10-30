import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, CalculatorIcon, EyeIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useGetPayrollPeriodsQuery, useCalculatePayrollMutation } from '../../services/api'

export default function PayrollList() {
  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState('')
  const { data, isLoading, refetch } = useGetPayrollPeriodsQuery({
    status: selectedStatus || undefined
  })
  const [calculatePayroll] = useCalculatePayrollMutation()

  const handleCalculatePayroll = async (periodId: number) => {
    try {
      await calculatePayroll(periodId).unwrap()
      refetch()
      alert('Payroll calculated successfully!')
    } catch (error) {
      alert('Error calculating payroll')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      draft: 'badge-secondary',
      processing: 'badge-warning',
      completed: 'badge-success',
      locked: 'badge-info'
    }
    return statusClasses[status as keyof typeof statusClasses] || 'badge-secondary'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
        <button 
          onClick={() => navigate('/app/hr/payroll/periods/new')}
          className="btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Payroll Period
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payroll Periods Table */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Period Name</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Employees</th>
                  <th>Gross Salary</th>
                  <th>Net Salary</th>
                  <th>Processed Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.periods?.map((period: any) => (
                  <tr key={period.id}>
                    <td className="font-medium">{period.period_name}</td>
                    <td>
                      {new Date(period.start_date).toLocaleDateString()} - {' '}
                      {new Date(period.end_date).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(period.status)}`}>
                        {period.status}
                      </span>
                    </td>
                    <td>{period.total_employees}</td>
                    <td>Rp {period.total_gross_salary?.toLocaleString()}</td>
                    <td>Rp {period.total_net_salary?.toLocaleString()}</td>
                    <td>
                      {period.processed_at 
                        ? new Date(period.processed_at).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn-sm btn-outline inline-flex items-center gap-1"
                          title="View Records"
                        >
                          <EyeIcon className="h-4 w-4" />
                          View
                        </button>
                        {period.status === 'draft' && (
                          <button
                            onClick={() => handleCalculatePayroll(period.id)}
                            className="btn-sm btn-primary inline-flex items-center gap-1"
                            title="Calculate Payroll"
                          >
                            <CalculatorIcon className="h-4 w-4" />
                            Calculate
                          </button>
                        )}
                        {period.status === 'processing' && (
                          <button
                            className="btn-sm btn-success inline-flex items-center gap-1"
                            title="Approve Payroll"
                          >
                            <CheckIcon className="h-4 w-4" />
                            Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
