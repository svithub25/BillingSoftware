import React, { useRef, useEffect } from 'react';

const CustomerFormModal = ({
  isOpen,
  isEditing,
  customerForm,
  customerErrors,
  setCustomerForm,
  setCustomerErrors,
  onSubmit,
  onClose
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getFieldClass = (error) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
    }`;

  const handleInputChange = (field, value) => {
    setCustomerForm({ ...customerForm, [field]: value.trim() === '' ? null : value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              ref={inputRef}
              type="text"
              value={customerForm.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={getFieldClass(customerErrors.name)}
            />
            {customerErrors.name && (
              <p className="text-red-600 text-xs mt-1">{customerErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
            <input
              type="text"
              value={customerForm.contact || ''}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              className={getFieldClass(customerErrors.contact)}
            />
            {customerErrors.contact && (
              <p className="text-red-600 text-xs mt-1">{customerErrors.contact}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={customerForm.email || ''}
              onChange={e => handleInputChange('email', e.target.value)}
              className={getFieldClass(customerErrors.email)}
            />
            {customerErrors.email && <p className="text-red-600 text-xs mt-1">{customerErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
            <input
              type="text"
              value={customerForm.gstin || ''}
              onChange={e => handleInputChange('gstin', e.target.value)}
              className={getFieldClass(customerErrors.gstin)}
              placeholder="GSTIN"
            />
            {customerErrors.gstin && (
              <p className="text-red-600 text-xs mt-1">{customerErrors.gstin}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={customerForm.address || ''}
              onChange={e => handleInputChange('address', e.target.value)}
              className={getFieldClass(customerErrors.address)}
              rows={2}
              placeholder="Main address"
            />
            {customerErrors.address && (
              <p className="text-red-600 text-xs mt-1">{customerErrors.address}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              value={customerForm.state || ''}
              onChange={e => handleInputChange('state', e.target.value)}
              className={getFieldClass(customerErrors.state)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={customerForm.city || ''}
              onChange={e => handleInputChange('city', e.target.value)}
              className={getFieldClass(customerErrors.city)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <input
              type="text"
              value={customerForm.country || 'India'}
              onChange={e => handleInputChange('country', e.target.value)}
              className={getFieldClass(customerErrors.country)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
            <input
              type="text"
              value={customerForm.pincode || ''}
              onChange={e => handleInputChange('pincode', e.target.value)}
              className={getFieldClass(customerErrors.pincode)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
            <input
              type="number"
              onWheel={e => e.target.blur()}
              value={customerForm.credit_limit || ''}
              onChange={e => handleInputChange('credit_limit', e.target.value)}
              className={getFieldClass(customerErrors.credit_limit)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
            <input
              type="number"
              onWheel={e => e.target.blur()}
              value={customerForm.credit_days || ''}
              onChange={e => handleInputChange('credit_days', e.target.value)}
              className={getFieldClass(customerErrors.credit_days)}
            />
          </div>

        </div>
        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {isEditing ? 'Update' : 'Add'} Customer
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

export default CustomerFormModal;