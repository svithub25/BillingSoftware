import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import GstFormModal from '../modals/GstFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const GstTab = () => {
  const [loading, setLoading] = useState(true);
  const [gstRates, setGstRates] = useState([]);
  const [showGstForm, setShowGstForm] = useState(false);
  const [gstForm, setGstForm] = useState({ rate: 0, description: '' });
  const [gstErrors, setGstErrors] = useState({});
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => {}
  });

  const fetchGstRates = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getGstRates();
      setGstRates(data);
    } catch (error) {
      console.error('Error loading GST rates:', error);
      toast.error('Failed to load GST rates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGstRates();
  }, [fetchGstRates]);

  const handleCloseModal = () => {
    setShowGstForm(false);
    setGstForm({ rate: 0, description: '' });
    setGstErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setGstForm({ rate: 0, description: '' });
        setShowGstForm(true);
      } else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showGstForm) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showGstForm]);

  const handleAddGstRate = async () => {
    if (gstForm.rate === '' || gstForm.rate === null || isNaN(gstForm.rate)) {
      setGstErrors({ rate: 'GST rate is required' });
      toast.error('Please enter GST rate');
      return;
    }
    if (!window.electronAPI) return;

    try {
      const rateExists = await window.electronAPI.checkGstExists(gstForm.rate);
      if (rateExists) {
        setGstErrors({ rate: 'GST rate already exists' });
        toast.error('GST rate already exists');
        return;
      }

      const newGstRate = await window.electronAPI.addGstRate(gstForm);
      toast.success('GST rate added successfully');
      setGstRates((prev) => [...prev, newGstRate]);
      handleCloseModal();
    } catch (error) {
      console.error('Error adding GST rate:', error);
      toast.error('Failed to add GST rate');
    }
  };

  const handleDeleteGstRate = (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to delete this GST rate?',
      onConfirm: async () => {
        if (!window.electronAPI) return;
        try {
          await window.electronAPI.deleteGstRate(id);
          toast.success('GST rate deleted successfully');
          setGstRates((prev) => prev.filter((g) => g.id !== id));
        } catch (error) {
          console.error('Error deleting GST rate:', error);
          toast.error('Failed to delete GST rate');
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
        <h2 className="text-lg font-semibold">GST Rate Management</h2>
        <button
          onClick={() => {
            setGstForm({ rate: 0, description: '' });
            setShowGstForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add GST Rate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gstRates.map((gst) => (
          <div key={gst.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <span className="font-medium">{gst.rate}%</span>
              <p className="text-sm text-gray-600">{gst.description}</p>
            </div>
            <button onClick={() => handleDeleteGstRate(gst.id)} className="text-red-600 hover:text-red-900">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <GstFormModal
        isOpen={showGstForm}
        gstForm={gstForm}
        gstErrors={gstErrors}
        setGstForm={setGstForm}
        setGstErrors={setGstErrors}
        onSubmit={handleAddGstRate}
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

export default GstTab;

