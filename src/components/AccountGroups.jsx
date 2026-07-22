import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

const AccountGroups = () => {
  const [accountGroups, setAccountGroups] = useState([]);
  const [masterAccounts, setMasterAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const initialFormState = {
    name: '',
    master_account_id: '',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchData = async () => {
    try {
      const groups = await window.electronAPI.getAccountGroups();
      setAccountGroups(groups);
      const masters = await window.electronAPI.getMasterAccounts();
      setMasterAccounts(masters);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load account groups');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (group = null) => {
    if (group) {
      if (group.is_primary) {
        toast.warning('Cannot edit system primary groups');
        return;
      }
      setEditingGroup(group);
      setFormData({
        name: group.name,
        master_account_id: group.master_account_id,
        description: group.description || ''
      });
    } else {
      setEditingGroup(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingGroup(null);
    setFormData(initialFormState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await window.electronAPI.updateAccountGroup(editingGroup.id, formData);
        toast.success('Account group updated');
      } else {
        await window.electronAPI.addAccountGroup(formData);
        toast.success('Account group created');
      }
      handleCloseModal();
      fetchData();
    } catch (error) {
      console.error('Error saving account group:', error);
      toast.error(error.message || 'Failed to save account group');
    }
  };

  const handleDelete = async (id, isPrimary) => {
    if (isPrimary) {
      toast.error('Cannot delete system primary groups');
      return;
    }
    if (window.confirm('Are you sure you want to delete this group? Check if it has any associated contacts or ledgers.')) {
      try {
        await window.electronAPI.deleteAccountGroup(id);
        toast.success('Account group deleted');
        fetchData();
      } catch (error) {
        console.error('Error deleting group:', error);
        toast.error(error.message || 'Failed to delete account group');
      }
    }
  };

  // Group by Master Account for display
  const groupedByMaster = masterAccounts.map(master => {
    return {
      ...master,
      groups: accountGroups.filter(g => g.master_account_id === master.id)
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Groups</h1>
          <p className="text-gray-600">Manage ledger categories and accounting structure</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Custom Group
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groupedByMaster.map(master => (
          <div key={master.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <FolderTree className="w-5 h-5 mr-2 text-blue-600" />
                {master.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{master.description}</p>
            </div>
            <ul className="divide-y divide-gray-100">
              {master.groups.map(group => (
                <li key={group.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-900">{group.name}</span>
                    {group.is_primary === 1 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        System Default
                      </span>
                    )}
                    {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
                  </div>
                  {!group.is_primary && (
                    <div className="flex space-x-3">
                      <button onClick={() => handleOpenModal(group)} className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(group.id, group.is_primary)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {master.groups.length === 0 && (
                <li className="p-4 text-sm text-gray-500 text-center italic">No groups defined</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{editingGroup ? 'Edit Account Group' : 'Add Account Group'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400" />
                  <p className="ml-3 text-sm text-blue-700">
                    Custom groups help you categorize contacts or ledgers. For example, "North India Customers" under Assets.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-md"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Employee Advances"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Under Master Account *</label>
                <select
                  required
                  className="w-full p-2 border rounded-md bg-gray-50"
                  value={formData.master_account_id}
                  onChange={(e) => setFormData({...formData, master_account_id: e.target.value})}
                  disabled={editingGroup != null} // Master account can't be changed after creation easily
                >
                  <option value="">Select Master Account</option>
                  {masterAccounts.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional details about this group"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingGroup ? 'Update Group' : 'Save Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountGroups;
