import React from 'react';

const MaintenanceForm: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Maintenance Form</h1>
      <p className="text-gray-600 mb-6">Create and edit maintenance records</p>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Form Overview</h2>
        <p className="text-gray-600">This is the maintenance form page.</p>
        <p className="text-sm text-green-600 mt-2">✅ Route is working correctly!</p>
      </div>
    </div>
  );
};

export default MaintenanceForm;
