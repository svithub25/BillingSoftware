import React, { useRef, useEffect } from 'react';

const SupplierFormModal = ({
  isOpen,
  isEditing,
  supplierForm,
  supplierErrors,
  setSupplierForm,
  setSupplierErrors,
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
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              ref={inputRef}
              type="text"
              value={supplierForm.name}
              onChange={(e) => {
                setSupplierForm({ ...supplierForm, name: e.target.value });
                if (supplierErrors.name) setSupplierErrors({ ...supplierErrors, name: undefined });
              }}
              className={getFieldClass(supplierErrors.name)}
            />
            {supplierErrors.name && <p className="text-red-600 text-xs mt-1">{supplierErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
            <input
              type="text"
              value={supplierForm.contact}
              onChange={(e) => {
                setSupplierForm({ ...supplierForm, contact: e.target.value });
                if (supplierErrors.contact) setSupplierErrors({ ...supplierErrors, contact: undefined });
              }}
              className={getFieldClass(supplierErrors.contact)}
            />
            {supplierErrors.contact && (
              <p className="text-red-600 text-xs mt-1">{supplierErrors.contact}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={supplierForm.email || ''}
              onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
              className={getFieldClass(supplierErrors.email)}
            />
            {supplierErrors.email && <p className="text-red-600 text-xs mt-1">{supplierErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
            <input
              type="text"
              value={supplierForm.gstin}
              onChange={(e) => {
                setSupplierForm({ ...supplierForm, gstin: e.target.value });
                if (supplierErrors.gstin) setSupplierErrors({ ...supplierErrors, gstin: undefined });
              }}
              className={getFieldClass(supplierErrors.gstin)}
            />
            {supplierErrors.gstin && (
              <p className="text-red-600 text-xs mt-1">{supplierErrors.gstin}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              className={getFieldClass(supplierErrors.address)}
              rows={2}
              placeholder="Main address"
            />
            {supplierErrors.address && (
              <p className="text-red-600 text-xs mt-1">{supplierErrors.address}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={supplierForm.city || ''}
              onChange={e => setSupplierForm({ ...supplierForm, city: e.target.value })}
              className={getFieldClass(supplierErrors.city)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <input
              type="text"
              value={supplierForm.state || ''}
              onChange={e => setSupplierForm({ ...supplierForm, state: e.target.value })}
              className={getFieldClass(supplierErrors.state)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <input
              type="text"
              value={supplierForm.country || 'India'}
              onChange={e => setSupplierForm({ ...supplierForm, country: e.target.value })}
              className={getFieldClass(supplierErrors.country)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
            <input
              type="text"
              value={supplierForm.pincode || ''}
              onChange={e => setSupplierForm({ ...supplierForm, pincode: e.target.value })}
              className={getFieldClass(supplierErrors.pincode)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Credit Days</label>
            <input
              type="number"
              value={supplierForm.credit_days || ''}
              onChange={e => setSupplierForm({ ...supplierForm, credit_days: e.target.value })}
              className={getFieldClass(supplierErrors.credit_days)}
            />
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {isEditing ? 'Update' : 'Add'} Supplier
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

export default SupplierFormModal;