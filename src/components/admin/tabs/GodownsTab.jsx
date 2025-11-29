import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Warehouse, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from 'react-toastify';

const GodownsTab = () => {
  const [godowns, setGodowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGodown, setEditingGodown] = useState(null);

  useEffect(() => {
    fetchGodowns();
  }, []);

  const fetchGodowns = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getGodowns();
      if (result.success) {
        setGodowns(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch godowns');
      }
    } catch (error) {
      console.error('Error fetching godowns:', error);
      toast.error('Failed to fetch godowns');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingGodown(null);
    setIsModalOpen(true);
  };

  const handleEdit = (godown) => {
    setEditingGodown(godown);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this godown/branch?')) {
      return;
    }

    try {
      const result = await window.electronAPI.deleteGodown(id);
      if (result.success) {
        toast.success('Godown deleted successfully');
        fetchGodowns();
      } else {
        toast.error(result.error || 'Failed to delete godown');
      }
    } catch (error) {
      console.error('Error deleting godown:', error);
      toast.error('Failed to delete godown');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Godowns & Branches</h2>
          <p className="text-sm text-gray-500">Manage warehouse locations and branches</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Location
        </button>
      </div>

      {/* Godowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {godowns.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No godowns or branches found. Add one to get started.
          </div>
        ) : (
          godowns.map((godown) => (
            <div
              key={godown.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Warehouse className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{godown.name}</h3>
                    <p className="text-xs text-gray-500">{godown.code}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {godown.is_default === 1 && (
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                      Default
                    </span>
                  )}
                  {godown.is_active === 0 && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium capitalize bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                    {godown.location_type}
                  </span>
                </div>

                {godown.city && (
                  <div className="flex items-start text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>
                      {godown.city}
                      {godown.state && `, ${godown.state}`}
                    </span>
                  </div>
                )}

                {godown.contact_number && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{godown.contact_number}</span>
                  </div>
                )}

                {godown.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{godown.email}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(godown)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {godown.is_default !== 1 && (
                  <button
                    onClick={() => handleDelete(godown.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <GodownFormModal
          godown={editingGodown}
          onClose={() => {
            setIsModalOpen(false);
            setEditingGodown(null);
          }}
          onSuccess={() => {
            fetchGodowns();
            setIsModalOpen(false);
            setEditingGodown(null);
          }}
        />
      )}
    </div>
  );
};

// ============================================
// FORM MODAL
// ============================================

const GodownFormModal = ({ godown, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location_type: 'godown',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contact_person: '',
    contact_number: '',
    email: '',
    is_active: 1,
    remarks: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (godown) {
      setFormData({
        name: godown.name || '',
        code: godown.code || '',
        location_type: godown.location_type || 'godown',
        address: godown.address || '',
        city: godown.city || '',
        state: godown.state || '',
        pincode: godown.pincode || '',
        contact_person: godown.contact_person || '',
        contact_number: godown.contact_number || '',
        email: godown.email || '',
        is_active: godown.is_active !== undefined ? godown.is_active : 1,
        remarks: godown.remarks || ''
      });
    }
  }, [godown]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.code) {
      setError('Name and Code are required');
      return;
    }

    try {
      let result;
      if (godown) {
        result = await window.electronAPI.updateGodown(godown.id, formData);
      } else {
        result = await window.electronAPI.addGodown(formData);
      }

      if (result.success) {
        toast.success(`Godown ${godown ? 'updated' : 'added'} successfully`);
        onSuccess();
      } else {
        setError(result.error || 'Failed to save godown');
      }
    } catch (error) {
      console.error('Error saving godown:', error);
      setError('Failed to save godown');
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b bg-blue-50 rounded-t-lg">
          <h3 className="text-xl font-bold text-blue-800">
            {godown ? 'Edit' : 'Add'} Godown/Branch
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className={labelClass}>
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClass}
                required
                placeholder="Main Warehouse"
              />
            </div>
            <div>
              <label htmlFor="code" className={labelClass}>
                Code *
              </label>
              <input
                type="text"
                id="code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className={inputClass}
                required
                placeholder="MAIN-001"
              />
            </div>
          </div>

          <div>
            <label htmlFor="location_type" className={labelClass}>
              Location Type
            </label>
            <select
              id="location_type"
              name="location_type"
              value={formData.location_type}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="godown">Godown</option>
              <option value="branch">Branch</option>
              <option value="warehouse">Warehouse</option>
              <option value="shop">Shop</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className={labelClass}>
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className={inputClass}
              rows="2"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className={labelClass}>
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={inputClass}
                placeholder="Mumbai"
              />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={inputClass}
                placeholder="Maharashtra"
              />
            </div>
            <div>
              <label htmlFor="pincode" className={labelClass}>
                Pincode
              </label>
              <input
                type="text"
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                className={inputClass}
                placeholder="400001"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact_person" className={labelClass}>
                Contact Person
              </label>
              <input
                type="text"
                id="contact_person"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                className={inputClass}
                placeholder="Manager name"
              />
            </div>
            <div>
              <label htmlFor="contact_number" className={labelClass}>
                Contact Number
              </label>
              <input
                type="text"
                id="contact_number"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                className={inputClass}
                placeholder="9876543210"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="warehouse@company.com"
            />
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remarks" className={labelClass}>
              Remarks
            </label>
            <textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              className={inputClass}
              rows="2"
              placeholder="Additional notes..."
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active === 1}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              {godown ? 'Update' : 'Add'} Godown
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GodownsTab;
