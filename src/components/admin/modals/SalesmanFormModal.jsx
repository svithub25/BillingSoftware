import React from 'react';

const SalesmanFormModal = ({
  isOpen,
  isEditing,
  salesmanForm,
  salesmanErrors,
  setSalesmanForm,
  setSalesmanErrors,
  onSubmit,
  onClose
}) => {
  if (!isOpen) return null;

  const getFieldClass = (error) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Salesman' : 'Add New Salesman'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={salesmanForm.name}
              onChange={(e) => setSalesmanForm({ ...salesmanForm, name: e.target.value })}
              className={getFieldClass(salesmanErrors.name)}
            />
            {salesmanErrors.name && (
              <p className="text-red-600 text-xs mt-1">{salesmanErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Info</label>
            <input
              type="text"
              value={salesmanForm.contact_info}
              onChange={(e) => setSalesmanForm({ ...salesmanForm, contact_info: e.target.value })}
              className={getFieldClass(salesmanErrors.contact_info)}
            />
            {salesmanErrors.contact_info && (
              <p className="text-red-600 text-xs mt-1">{salesmanErrors.contact_info}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={salesmanForm.email || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, email: e.target.value })}
              className={getFieldClass(salesmanErrors.email)}
            />
            {salesmanErrors.email && <p className="text-red-600 text-xs mt-1">{salesmanErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
            <input
              type="text"
              value={salesmanForm.gstin || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, gstin: e.target.value })}
              className={getFieldClass(salesmanErrors.gstin)}
            />
            {salesmanErrors.gstin && <p className="text-red-600 text-xs mt-1">{salesmanErrors.gstin}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={salesmanForm.address || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, address: e.target.value })}
              className={getFieldClass(salesmanErrors.address)}
              rows={2}
              placeholder="Main address"
            />
            {salesmanErrors.address && (
              <p className="text-red-600 text-xs mt-1">{salesmanErrors.address}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={salesmanForm.city || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, city: e.target.value })}
              className={getFieldClass(salesmanErrors.city)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              value={salesmanForm.state || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, state: e.target.value })}
              className={getFieldClass(salesmanErrors.state)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <input
              type="text"
              value={salesmanForm.country || 'India'}
              onChange={e => setSalesmanForm({ ...salesmanForm, country: e.target.value })}
              className={getFieldClass(salesmanErrors.country)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
            <input
              type="text"
              value={salesmanForm.pincode || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, pincode: e.target.value })}
              className={getFieldClass(salesmanErrors.pincode)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
            <input
              type="number"
              value={salesmanForm.credit_limit || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, credit_limit: e.target.value })}
              className={getFieldClass(salesmanErrors.credit_limit)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
            <input
              type="number"
              value={salesmanForm.credit_days || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, credit_days: e.target.value })}
              className={getFieldClass(salesmanErrors.credit_days)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Joining Date</label>
            <input
              type="date"
              value={
                salesmanForm.joining_date ||
                new Date().toISOString().slice(0, 10)
              }
              onChange={e => setSalesmanForm({ ...salesmanForm, joining_date: e.target.value })}
              className={getFieldClass(salesmanErrors.joining_date)}
            />
            {salesmanErrors.joining_date && (
              <p className="text-red-600 text-xs mt-1">{salesmanErrors.joining_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Area</label>
            <input
              type="text"
              value={salesmanForm.working_area || ''}
              onChange={e => setSalesmanForm({ ...salesmanForm, working_area: e.target.value })}
              className={getFieldClass(salesmanErrors.working_area)}
              placeholder="Area of operation"
            />
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {isEditing ? 'Update' : 'Add'} Salesman
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesmanFormModal;

