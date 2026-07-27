import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';

const ContactModal = ({ isOpen, onClose, onSuccess, editingContact = null, initialName = '' }) => {
  const [accountGroups, setAccountGroups] = useState([]);
  const [saving, setSaving] = useState(false);

  const initialFormState = {
    name: '',
    account_group_id: '',
    phone: '',
    email: '',
    gstin: '',
    gst_treatment: 'Regular',
    state: '',
    city: '',
    address: '',
    pincode: '',
    credit_period: 0,
    credit_limit: 0,
    opening_balance: 0,
    opening_balance_type: 'Dr'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      fetchAccountGroups();
      if (editingContact) {
        setFormData({
          ...editingContact,
          opening_balance: Math.abs(editingContact.opening_balance || 0),
          opening_balance_type: (editingContact.opening_balance || 0) < 0 ? 'Cr' : 'Dr'
        });
      } else {
        setFormData({
          ...initialFormState,
          name: initialName || ''
        });
      }
    }
  }, [isOpen, editingContact, initialName]);

  const fetchAccountGroups = async () => {
    try {
      const data = await window.electronAPI.getAccountGroups();
      setAccountGroups(data || []);
    } catch (error) {
      console.error('Error fetching account groups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dataToSubmit = {
        ...formData,
        opening_balance: formData.opening_balance_type === 'Cr' ? -Math.abs(formData.opening_balance) : Math.abs(formData.opening_balance)
      };

      if (editingContact) {
        await window.electronAPI.updateContact(editingContact.id, dataToSubmit);
        toast.success('Contact updated successfully');
        if (onSuccess) onSuccess(editingContact.id, dataToSubmit);
      } else {
        const res = await window.electronAPI.addContact(dataToSubmit);
        toast.success('Contact added successfully');
        if (onSuccess) onSuccess(res?.id, dataToSubmit);
      }
      onClose();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast.error(error.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">{editingContact ? 'Edit Alter / Contact' : 'Add Alter / Contact'}</h2>
          <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-500" disabled={saving}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter party name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Group <span className="text-red-500">*</span></label>
              <select
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.account_group_id}
                onChange={(e) => setFormData({ ...formData, account_group_id: e.target.value })}
              >
                <option value="">Select Group</option>
                {accountGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 uppercase"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Treatment</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.gst_treatment || 'Regular'}
                onChange={(e) => setFormData({ ...formData, gst_treatment: e.target.value })}
              >
                <option value="Regular">Regular</option>
                <option value="Composition">Composition</option>
                <option value="Unregistered">Unregistered</option>
                <option value="Consumer">Consumer</option>
                <option value="Overseas">Overseas</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows="2"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, building, etc."
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Balance</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  onWheel={e => e.target.blur()}
                  step="0.01"
                  min="0"
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  value={formData.opening_balance}
                  onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                />
                <select
                  className="w-28 p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  value={formData.opening_balance_type || 'Dr'}
                  onChange={(e) => setFormData({ ...formData, opening_balance_type: e.target.value })}
                >
                  <option value="Dr">Dr (To Receive)</option>
                  <option value="Cr">Cr (To Pay)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit / Period</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  onWheel={e => e.target.blur()}
                  placeholder="Limit (₹)"
                  className="w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  onWheel={e => e.target.blur()}
                  placeholder="Days"
                  className="w-1/2 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  value={formData.credit_period}
                  onChange={(e) => setFormData({ ...formData, credit_period: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:bg-blue-400"
              disabled={saving}
            >
              {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactModal;
