import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import CategoryFormModal from '../modals/CategoryFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const initialFilters = { name: '' };

const validateCategoryForm = (form) => {
  const errors = {};
  if (!form.name || String(form.name).trim().length < 2) errors.name = 'Category name is required';
  return errors;
};

const CategoriesTab = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [categoryErrors, setCategoryErrors] = useState({});
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => {}
  });

  const fetchCategories = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const data = await window.electronAPI.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCloseModal = () => {
    setShowCategoryForm(false);
    setCategoryForm({ name: '' });
    setCategoryErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setCategoryForm({ name: '' });
        setShowCategoryForm(true);
      } else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showCategoryForm) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showCategoryForm]);

  const handleAddCategory = async () => {
    const errors = validateCategoryForm(categoryForm);
    if (Object.keys(errors).length) {
      setCategoryErrors(errors);
      toast.error('Please enter category name');
      return;
    }
    if (!window.electronAPI) return;

    try {
      const nameExists = await window.electronAPI.checkCategoryExists(categoryForm.name);
      if (nameExists) {
        setCategoryErrors({ name: 'Category already exists' });
        toast.error('Category already exists');
        return;
      }
      const newCategory = await window.electronAPI.addCategory(categoryForm);
      toast.success('Category added successfully');
      setCategories((prev) => [...prev, newCategory]);
      handleCloseModal();
    } catch (error) {
      toast.error('Error adding category');
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = (id) => {
    setConfirmState({
      open: true,
      message: 'Are you sure you want to delete this category?',
      onConfirm: async () => {
        if (!window.electronAPI) return;
        try {
          await window.electronAPI.deleteCategory(id);
          toast.success('Category deleted successfully');
          setCategories((prev) => prev.filter((c) => c.id !== id));
        } catch (error) {
          console.error('Error deleting category:', error);
          toast.error('Failed to delete category');
        } finally {
          setConfirmState({ open: false, message: '', onConfirm: () => {} });
        }
      }
    });
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        !filters.name || category.name.toLowerCase().includes(filters.name.toLowerCase())
    );
  }, [categories, filters]);

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
        <input
          type="text"
          placeholder="Category Name"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
        <button
          onClick={() => setFilters(initialFilters)}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg mt-2"
        >
          Clear Filters
        </button>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Category Management</h2>
        <button
          onClick={() => {
            setCategoryForm({ name: '' });
            setShowCategoryForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <span className="font-medium">{category.name}</span>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <CategoryFormModal
        isOpen={showCategoryForm}
        categoryForm={categoryForm}
        categoryErrors={categoryErrors}
        setCategoryForm={setCategoryForm}
        setCategoryErrors={setCategoryErrors}
        onSubmit={handleAddCategory}
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

export default CategoriesTab;

