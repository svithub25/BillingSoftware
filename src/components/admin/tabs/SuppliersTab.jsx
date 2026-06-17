import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import SupplierFormModal from '../modals/SupplierFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const initialSupplierForm = { name: '', contact: '', address: '', gstin: '' };
const initialFilters = { name: '', contact: '', gstin: '' };

const validateSupplierForm = (form) => {
  const errors = {};
  const isEmpty = (v) => v === '' || v === null || v === undefined;

  if (isEmpty(form.name) || String(form.name).trim().length < 2) errors.name = 'Name is required';
  if (isEmpty(form.contact) || String(form.contact).trim().length < 5)
    errors.contact = 'Contact is required';
  if (isEmpty(form.gstin) || String(form.gstin).trim().length < 3)
    errors.gstin = 'GSTIN is required';

  return errors;
};

const SuppliersTab = () => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [supplierErrors, setSupplierErrors] = useState({});
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => {}
  });

  const fetchSuppliers = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleCloseModal = () => {
    setShowSupplierForm(false);
    setEditingSupplier(null);
    setSupplierForm(initialSupplierForm);
    setSupplierErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setSupplierForm(initialSupplierForm);
        setShowSupplierForm(true);
      } else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showSupplierForm || editingSupplier) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showSupplierForm, editingSupplier]);

  const handleAddSupplier = async () => {
    const errors = validateSupplierForm(supplierForm);
    if (Object.keys(errors).length) {
      toast.error('Please fill all required fields');
      setSupplierErrors(errors);
      return;
    }
    if (!window.electronAPI) return;

    try {
      const newSupplier = await window.electronAPI.addSupplier(supplierForm);
      toast.success('Supplier added successfully');
      setSuppliers((prev) => [...prev, newSupplier]);
      handleCloseModal();
    } catch (error) {
      toast.error('Error adding supplier');
      console.error('Error adding supplier:', error);
    }
  };

  const handleUpdateSupplier = async () => {
    const errors = validateSupplierForm(supplierForm);
    if (Object.keys(errors).length) {
      toast.error('Please fill all required fields');
      setSupplierErrors(errors);
      return;
    }
    if (!window.electronAPI || !editingSupplier) return;

    try {
      await window.electronAPI.updateSupplier({ id: editingSupplier, ...supplierForm });
      toast.success('Supplier updated successfully');
      await fetchSuppliers();
      handleCloseModal();
    } catch (error) {
      toast.error('Error updating supplier');
      console.error('Error updating supplier:', error);
    }
  };

  const handleDeleteSupplier = (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to delete this supplier?',
      onConfirm: async () => {
        if (!window.electronAPI) return;
        try {
          await window.electronAPI.deleteSupplier(id);
          toast.success('Supplier deleted successfully');
          setSuppliers((prev) => prev.filter((s) => s.id !== id));
        } catch (error) {
          console.error('Error deleting supplier:', error);
          toast.error('Failed to delete supplier');
        } finally {
          setConfirmState({ open: false, message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (supplier) =>
        (!filters.name ||
          supplier.name.toLowerCase().includes(filters.name.toLowerCase())) &&
        (!filters.contact ||
          supplier.contact.toLowerCase().includes(filters.contact.toLowerCase())) &&
        (!filters.gstin ||
          supplier.gstin.toLowerCase().includes(filters.gstin.toLowerCase()))
    );
  }, [suppliers, filters]);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Contact"
            value={filters.contact}
            onChange={(e) => setFilters({ ...filters, contact: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="GSTIN"
            value={filters.gstin}
            onChange={(e) => setFilters({ ...filters, gstin: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex mt-2">
          <button
            onClick={() => setFilters(initialFilters)}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Supplier Management</h2>
        <button
          onClick={() => {
            setSupplierForm(initialSupplierForm);
            setShowSupplierForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GSTIN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {supplier.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {supplier.contact}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {supplier.gstin}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setEditingSupplier(supplier.id);
                      setSupplierForm(supplier);
                      setShowSupplierForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteSupplier(supplier.id)}
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

      <SupplierFormModal
        isOpen={showSupplierForm || Boolean(editingSupplier)}
        isEditing={Boolean(editingSupplier)}
        supplierForm={supplierForm}
        supplierErrors={supplierErrors}
        setSupplierForm={setSupplierForm}
        setSupplierErrors={setSupplierErrors}
        onSubmit={editingSupplier ? handleUpdateSupplier : handleAddSupplier}
        onClose={handleCloseModal}
      />

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ open: false, message: '', onConfirm: () => {} })}
      />
    </div>
  );
};

export default SuppliersTab;

