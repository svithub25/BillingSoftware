import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import UnitFormModal from '../modals/UnitFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const UnitsTab = () => {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: '' });
  const [unitErrors, setUnitErrors] = useState({});
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => {}
  });

  const fetchUnits = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getUnits();
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('Failed to load units');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleCloseModal = () => {
    setShowUnitForm(false);
    setUnitForm({ name: '' });
    setUnitErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setUnitForm({ name: '' });
        setShowUnitForm(true);
      } else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showUnitForm) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showUnitForm]);

  const handleAddUnit = async () => {
    const nameValid = unitForm.name && unitForm.name.trim().length > 0;
    if (!nameValid) {
      setUnitErrors({ name: 'Unit name is required' });
      toast.error('Please enter unit name');
      return;
    }
    if (!window.electronAPI) return;

    try {
      const newUnit = await window.electronAPI.addUnit(unitForm);
      toast.success('Unit added successfully');
      setUnits((prev) => [...prev, newUnit]);
      handleCloseModal();
    } catch (error) {
      toast.error('Error adding unit');
      console.error('Error adding unit:', error);
    }
  };

  const handleDeleteUnit = (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to delete this unit?',
      onConfirm: async () => {
        if (!window.electronAPI) return;
        try {
          await window.electronAPI.deleteUnit(id);
          toast.success('Unit deleted successfully');
          setUnits((prev) => prev.filter((u) => u.id !== id));
        } catch (error) {
          console.error('Error deleting unit:', error);
          toast.error('Failed to delete unit');
        } finally {
          setConfirmState({ open: false, message: '', onConfirm: () => {} });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Unit Management</h2>
        <button
          onClick={() => {
            setUnitForm({ name: '' });
            setShowUnitForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {units.map((unit) => (
          <div key={unit.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <span className="font-medium">{unit.name}</span>
            <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-600 hover:text-red-900">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <UnitFormModal
        isOpen={showUnitForm}
        unitForm={unitForm}
        unitErrors={unitErrors}
        setUnitForm={setUnitForm}
        setUnitErrors={setUnitErrors}
        onSubmit={handleAddUnit}
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

export default UnitsTab;

