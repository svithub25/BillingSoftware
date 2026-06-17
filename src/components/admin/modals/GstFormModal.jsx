import React, { useRef, useEffect } from 'react';

const GstFormModal = ({
  isOpen,
  gstForm,
  gstErrors,
  setGstForm,
  setGstErrors,
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
        <h2 className="text-xl font-bold mb-4">Add New GST Rate</h2>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rate (%)</label>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={gstForm.rate}
              onChange={(e) => {
                setGstForm({ ...gstForm, rate: parseFloat(e.target.value) });
                if (gstErrors.rate) setGstErrors({ ...gstErrors, rate: undefined });
              }}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                gstErrors.rate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {gstErrors.rate && <p className="text-red-600 text-xs mt-1">{gstErrors.rate}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <input
              type="text"
              value={gstForm.description}
              onChange={(e) => setGstForm({ ...gstForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Standard rate"
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Add GST Rate
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

export default GstFormModal;

