import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  TruckIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  ChartBarIcon,
  MapPinIcon,
  CubeIcon,
  CalculatorIcon
} from '@heroicons/react/24/outline'
import { useGetShippingOrdersQuery } from '../../services/shippingApi'

export default function ShippingDashboard() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  
  // Fetch shipping data
  const { data: shippingData, isLoading } = useGetShippingOrdersQuery({
    page: 1,
    per_page: 100
  })

  // Calculate metrics
  const totalShipments = shippingData?.shipping_orders?.length || 0
  const inTransit = shippingData?.shipping_orders?.filter((s: any) => s.status === 'in_transit').length || 0
  const delivered = shippingData?.shipping_orders?.filter((s: any) => s.status === 'delivered').length || 0
  const pending = shippingData?.shipping_orders?.filter((s: any) => s.status === 'preparing').length || 0

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      preparing: 'badge-warning',
      packed: 'badge-info',
      shipped: 'badge-primary',
      in_transit: 'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-danger'
    }
    return statusClasses[status as keyof typeof statusClasses] || 'badge-secondary'
  }

  const getStatusText = (status: string) => {
    const statusTexts = {
      preparing: 'Mempersiapkan',
      packed: 'Dikemas',
      shipped: 'Dikirim',
      in_transit: 'Dalam Perjalanan',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan'
    }
    return statusTexts[status as keyof typeof statusTexts] || status
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Pengiriman</h1>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="input"
          />
          <button 
            onClick={() => navigate('/app/shipping/orders/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Buat Pengiriman Baru
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Shipments */}
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TruckIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-blue-700 truncate">Total Pengiriman</dt>
                <dd className="text-lg font-medium text-blue-900">{totalShipments}</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* In Transit */}
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-yellow-700 truncate">Dalam Perjalanan</dt>
                <dd className="text-lg font-medium text-yellow-900">{inTransit}</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Delivered */}
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-green-700 truncate">Terkirim</dt>
                <dd className="text-lg font-medium text-green-900">{delivered}</dd>
              </dl>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="card bg-orange-50 border-orange-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-orange-700 truncate">Menunggu</dt>
                <dd className="text-lg font-medium text-orange-900">{pending}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/app/shipping/orders/new')}
            className="btn-outline inline-flex items-center justify-center gap-2 p-4"
          >
            <PlusIcon className="h-5 w-5" />
            Buat Pengiriman
          </button>
          <button
            onClick={() => navigate('/app/shipping/tracking')}
            className="btn-outline inline-flex items-center justify-center gap-2 p-4"
          >
            <MapPinIcon className="h-5 w-5" />
            Lacak Pengiriman
          </button>
          <button
            onClick={() => navigate('/app/shipping/calculator')}
            className="btn-outline inline-flex items-center justify-center gap-2 p-4"
          >
            <CalculatorIcon className="h-5 w-5" />
            Kalkulator Biaya
          </button>
          <button
            onClick={() => navigate('/app/shipping/providers')}
            className="btn-outline inline-flex items-center justify-center gap-2 p-4"
          >
            <TruckIcon className="h-5 w-5" />
            Kelola Provider
          </button>
          <button
            onClick={() => navigate('/app/reports?module=shipping')}
            className="btn-outline inline-flex items-center justify-center gap-2 p-4"
          >
            <ChartBarIcon className="h-5 w-5" />
            Laporan Pengiriman
          </button>
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Pengiriman Terbaru</h2>
          <button
            onClick={() => navigate('/app/shipping/orders')}
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Lihat Semua
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. Pengiriman
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pelanggan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Kirim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracking
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shippingData?.shipping_orders?.slice(0, 5).map((shipment: any) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {shipment.shipping_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(shipment.shipping_date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${getStatusBadge(shipment.status)}`}>
                      {getStatusText(shipment.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {shipment.tracking_number || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Peringatan</h3>
          <div className="space-y-3">
            {pending > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
                <span className="text-sm text-yellow-800">
                  {pending} pengiriman menunggu untuk diproses
                </span>
              </div>
            )}
            {inTransit > 5 && (
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <TruckIcon className="h-5 w-5 text-blue-600 mr-3" />
                <span className="text-sm text-blue-800">
                  {inTransit} pengiriman sedang dalam perjalanan
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistik Hari Ini</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pengiriman Baru</span>
              <span className="text-sm font-medium text-gray-900">
                {shippingData?.shipping_orders?.filter((s: any) => 
                  new Date(s.shipping_date).toDateString() === new Date().toDateString()
                ).length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Terkirim Hari Ini</span>
              <span className="text-sm font-medium text-gray-900">
                {delivered}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rata-rata Waktu Kirim</span>
              <span className="text-sm font-medium text-gray-900">2-3 hari</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
