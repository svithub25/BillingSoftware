import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import SalesmanFormModal from '../modals/SalesmanFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const initialFilters = { name: '', contact_info: '' };

const validateSalesmanForm = (form) => {
  const errors = {};
  if (!form.name || String(form.name).trim().length < 2) errors.name = 'Name is required';
  if (!form.contact_info || String(form.contact_info).trim().length < 5)
    errors.contact_info = 'Contact info is required';
  if (!form.joining_date) errors.joining_date = 'Joining date is required';
  return errors;
};

const SalesmanTab = () => {
  const [loading, setLoading] = useState(true);
  const [salesmen, setSalesmen] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [salesmanForm, setSalesmanForm] = useState({
    name: '',
    contact_info: '',
    address: '',
    joining_date: ''
  });
  const [salesmanErrors, setSalesmanErrors] = useState({});
  const [showSalesmanForm, setShowSalesmanForm] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => { }
  });

  const fetchSalesmen = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getSalesmen();
      console.log('Fetched salesmen:', data);
      setSalesmen(data);
    } catch (error) {
      console.error('Error loading salesmen:', error);
      toast.error('Failed to load salesmen');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSalesmen();
  }, [fetchSalesmen]);

  const handleCloseModal = () => {
    setShowSalesmanForm(false);
    setEditingSalesman(null);
    setSalesmanForm({ name: '', contact_info: '', address: '', joining_date: '' });
    setSalesmanErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setSalesmanForm({ name: '', contact_info: '', address: '', joining_date: '' });
        setShowSalesmanForm(true);
      } else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showSalesmanForm || editingSalesman) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSalesmanForm, editingSalesman]);

  const handleAddSalesman = async () => {
    const errors = validateSalesmanForm(salesmanForm);
    if (Object.keys(errors).length) {
      setSalesmanErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    if (!window.electronAPI) return;

    try {
      const newSalesman = await window.electronAPI.addSalesman(salesmanForm);
      toast.success('Salesman added successfully');
      setSalesmen((prev) => [...prev, newSalesman]);
      handleCloseModal();
    } catch (error) {
      toast.error('Error adding salesman');
      console.error('Error adding salesman:', error);
    }
  };

  const handleUpdateSalesman = async () => {
    const errors = validateSalesmanForm(salesmanForm);
    if (Object.keys(errors).length) {
      setSalesmanErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    if (!window.electronAPI || !editingSalesman) return;

    try {
      await window.electronAPI.updateSalesman({ id: editingSalesman, ...salesmanForm });
      toast.success('Salesman updated successfully');
      await fetchSalesmen();
      handleCloseModal();
    } catch (error) {
      toast.error('Error updating salesman');
      console.error('Error updating salesman:', error);
    }
  };

  const handleDeleteSalesman = (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to delete this salesman?',
      onConfirm: async () => {
        if (!window.electronAPI) return;
        try {
          await window.electronAPI.deleteSalesman(id);
          toast.success('Salesman deleted successfully');
          setSalesmen((prev) => prev.filter((s) => s.id !== id));
        } catch (error) {
          toast.error('Error deleting salesman');
          console.error('Error deleting salesman:', error);
        } finally {
          setConfirmState({ open: false, message: '', onConfirm: () => { } });
        }
      }
    });
  };

  const filteredSalesmen = useMemo(() => {
    return salesmen.filter(
      (salesman) =>
        (!filters.name ||
          salesman.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contact_info ||
          salesman.contact_info.toLowerCase().includes(filters.contact_info.toLowerCase()))
    );
  }, [salesmen, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Contact Info"
            value={filters.contact_info}
            onChange={(e) => setFilters({ ...filters, contact_info: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          onClick={() => setFilters(initialFilters)}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg mt-2"
        >
          Clear Filters
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Salesman Management</h2>
        <button
          onClick={() => {
            setSalesmanForm({ name: '', contact_info: '', address: '', joining_date: '' });
            setShowSalesmanForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Salesman
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Joining Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSalesmen.map((salesman) => (
              <tr key={salesman.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {salesman.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {salesman.contact_info}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {salesman.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {salesman.joining_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setEditingSalesman(salesman.id);
                      setSalesmanForm({ 
                        name: salesman.name,
                        contact_info: salesman.contact_info,
                        address: salesman.address,
                        joining_date: salesman.joining_date,
                        email: salesman.email || '',
                        state: salesman.state || '',
                        city: salesman.city || '',
                        country: salesman.country || 'India',
                        pincode: salesman.pincode || '',
                        gstin: salesman.gstin || '',
                        credit_limit: salesman.credit_limit || '',
                        credit_days: salesman.credit_days || '',
                        working_area: salesman.working_area || ''
                      });
                      setShowSalesmanForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSalesman(salesman.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SalesmanFormModal
        isOpen={showSalesmanForm || Boolean(editingSalesman)}
        isEditing={Boolean(editingSalesman)}
        salesmanForm={salesmanForm}
        salesmanErrors={salesmanErrors}
        setSalesmanForm={setSalesmanForm}
        setSalesmanErrors={setSalesmanErrors}
        onSubmit={editingSalesman ? handleUpdateSalesman : handleAddSalesman}
        onClose={handleCloseModal}
      />

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: () => { } })}
      />
    </div>
  );
};

export default SalesmanTab;

