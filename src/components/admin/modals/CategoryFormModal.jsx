import React, { useRef, useEffect } from 'react';

const CategoryFormModal = ({
  isOpen,
  categoryForm,
  categoryErrors,
  setCategoryForm,
  setCategoryErrors,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4">Add New Category</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
          <input
            ref={inputRef}
            type="text"
            value={categoryForm.name}
            onChange={(e) => {
              setCategoryForm({ ...categoryForm, name: e.target.value });
              if (categoryErrors.name) setCategoryErrors({ ...categoryErrors, name: undefined });
            }}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
              categoryErrors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="e.g., Stationery"
          />
          {categoryErrors.name && <p className="text-red-600 text-xs mt-1">{categoryErrors.name}</p>}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add Category
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

export default CategoryFormModal;

