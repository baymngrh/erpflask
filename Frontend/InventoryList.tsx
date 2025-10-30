import { useGetInventoryQuery, useGetStockSummaryQuery } from '../../services/api'

export default function InventoryList() {
  const { data: inventory, isLoading } = useGetInventoryQuery({})
  const { data: summary } = useGetStockSummaryQuery({})

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {summary.stock_summary?.length || 0}
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product Code</th>
                  <th>Product Name</th>
                  <th>Location</th>
                  <th>Quantity</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Batch Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inventory?.inventory?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.product_code}</td>
                    <td>{item.product_name}</td>
                    <td>{item.location_code}</td>
                    <td>{item.quantity}</td>
                    <td className="text-green-600 font-medium">{item.available_quantity}</td>
                    <td className="text-orange-600">{item.reserved_quantity}</td>
                    <td>{item.batch_number || '-'}</td>
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
