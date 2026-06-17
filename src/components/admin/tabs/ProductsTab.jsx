import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit3, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import ProductFormModal from '../modals/ProductFormModal';
import ConfirmModal from '../modals/ConfirmModal';

const initialProductForm = {
  name: '',
  sku: '',
  hsn_code: '',
  description: '',
  unit: '',
  mrp: '',
  purchase_rate: '',
  sale_rate: '',
  gst_percentage: '',
  category_id: '',
  current_stock: '',
  minimum_stock: 10
};

const initialProductFilters = { name: '', sku: '', category: '', gst: '' };

const validateProductForm = (form) => {
  const errors = {};
  const isEmpty = (v) => v === '' || v === null || v === undefined;

  if (isEmpty(form.name) || String(form.name).trim().length < 2) errors.name = 'Name is required';
  if (isEmpty(form.sku) || String(form.sku).trim().length < 1) errors.sku = 'SKU is required';
  if (isEmpty(form.unit)) errors.unit = 'Unit is required';
  if (isEmpty(form.category_id)) errors.category_id = 'Category is required';

  const pr = parseFloat(form.purchase_rate);
  if (isNaN(pr) || pr <= 0) errors.purchase_rate = 'Purchase rate must be greater than 0';


  if (isEmpty(form.gst_percentage) && form.gst_percentage !== 0) {
    errors.gst_percentage = 'GST rate is required';
  }

  return errors;
};

const buildProductPayload = (form) => ({
  name: String(form.name).trim(),
  sku: String(form.sku).trim(),
  hsn_code: String(form.hsn_code || '').trim(),
  description: String(form.description || '').trim(),
  unit: String(form.unit),
  mrp: Math.max(0, parseFloat(form.mrp) || 0),
  purchase_rate: Math.max(0, parseFloat(form.purchase_rate) || 0),
  sale_rate: Math.max(0, parseFloat(form.sale_rate) || 0),
  gst_percentage: parseFloat(form.gst_percentage) || 0,
  category_id: parseInt(form.category_id, 10),
  current_stock: Math.max(0, parseInt(form.current_stock, 10) || 0),
  minimum_stock: Math.max(0, parseInt(form.minimum_stock, 10) || 0)
});

const ProductsTab = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [productFilters, setProductFilters] = useState(initialProductFilters);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [productErrors, setProductErrors] = useState({});
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    message: '',
    onConfirm: () => {}
  });

  const fetchData = useCallback(async () => {
    if (!window.electronAPI) return;
    setLoading(true);
    try {
      const [productsData, categoriesData, unitsData, gstData] = await Promise.all([
        window.electronAPI.getInventory(),
        window.electronAPI.getCategories(),
        window.electronAPI.getUnits(),
        window.electronAPI.getGstRates()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setUnits(unitsData);
      setGstRates(gstData);
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error('Failed to load product data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateSku = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
      const nextSku = await window.electronAPI.getNextSku();
      setProductForm((prev) => ({ ...prev, sku: nextSku }));
      setProductErrors((prev) => ({ ...prev, sku: undefined }));
    } catch (error) {
      console.error('Error generating SKU:', error);
    }
  }, []);

  useEffect(() => {
    if (showProductForm && !editingItem) {
      handleGenerateSku();
    }
  }, [showProductForm, editingItem, handleGenerateSku]);

  const handleCloseProductModal = () => {
    setShowProductForm(false);
    setEditingItem(null);
    setProductForm(initialProductForm);
    setProductErrors({});
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl + + to open Add Product form
      if (e.ctrlKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setProductForm(initialProductForm);
        setShowProductForm(true);
      }
      // Ctrl + Delete or Ctrl + Backspace to close form
      else if (e.ctrlKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        if (showProductForm || editingItem) {
          e.preventDefault();
          handleCloseProductModal();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showProductForm, editingItem]);

  const handleAddProduct = async () => {
    const errors = validateProductForm(productForm);
    if (Object.keys(errors).length) {
      setProductErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    if (!window.electronAPI) return;

    try {
      const skuExists = await window.electronAPI.checkSkuExists(productForm.sku);
      if (skuExists) {
        setProductErrors({ ...errors, sku: 'SKU already exists' });
        toast.error('SKU already exists');
        return;
      }

      const payload = buildProductPayload(productForm);
      const newProduct = await window.electronAPI.addItem(payload);

      if (payload.current_stock > 0) {
        await window.electronAPI.setOpeningStock({
          itemId: newProduct.id,
          qty: payload.current_stock,
          rate: payload.purchase_rate,
          date: new Date().toISOString().split('T')[0]
        });
        toast.success('Product added with opening stock');
      } else {
        toast.success('Product added successfully');
      }

      setProducts((prev) => [...prev, newProduct]);
      handleCloseProductModal();
    } catch (error) {
      if (error?.message?.includes('SKU already exists')) {
        setProductErrors({ ...productErrors, sku: 'SKU already exists' });
        toast.error('SKU already exists');
      } else if (error?.message?.includes('locked')) {
        toast.error('Opening stock is locked and cannot be modified');
      } else {
        toast.error('Error adding product');
        console.error('Error adding product:', error);
      }
    }
  };

  const handleUpdateProduct = async () => {
    const errors = validateProductForm(productForm);
    if (Object.keys(errors).length) {
      setProductErrors(errors);
      toast.error('Please fill all required fields');
      return;
    }
    if (!window.electronAPI || !editingItem) return;

    try {
      const skuExists = await window.electronAPI.checkSkuExists(productForm.sku, editingItem);
      if (skuExists) {
        setProductErrors({ ...errors, sku: 'SKU already exists' });
        toast.error('SKU already exists');
        return;
      }

      const existingItem = products.find((p) => p.id === editingItem);
      const payload = { id: editingItem, ...buildProductPayload(productForm) };

      await window.electronAPI.updateItem(payload);

      try {
        const openingStock = await window.electronAPI.getOpeningStock(editingItem);

        if (openingStock.is_locked === 1) {
          toast.warning('Opening stock is locked. Only item details updated.');
        } else if (existingItem) {
          const oldQty = existingItem.current_stock || 0;
          const newQty = payload.current_stock || 0;
          const qtyDifference = newQty - oldQty;
          const currentOpeningQty = openingStock.opening_qty || 0;
          const updatedOpeningQty = currentOpeningQty + qtyDifference;

          if (updatedOpeningQty >= 0) {
            await window.electronAPI.setOpeningStock({
              itemId: editingItem,
              qty: updatedOpeningQty,
              rate: payload.purchase_rate,
              date: openingStock.opening_date || new Date().toISOString().split('T')[0]
            });
            toast.success('Product and opening stock updated');
          } else {
            toast.warning('Opening stock cannot be negative. Only item details updated.');
          }
        }
      } catch (stockError) {
        console.error('Error updating opening stock:', stockError);
        toast.warning('Product updated but opening stock update failed');
      }

      await fetchData();
      handleCloseProductModal();
    } catch (error) {
      if (error?.message?.includes('SKU already exists')) {
        setProductErrors({ ...productErrors, sku: 'SKU already exists' });
        toast.error('SKU already exists');
      } else {
        toast.error('Error updating product');
        console.error('Error updating product:', error);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryName = categories.find((cat) => cat.id === product.category_id)?.name;
      return (
        (!productFilters.name ||
          product.name.toLowerCase().includes(productFilters.name.toLowerCase())) &&
        (!productFilters.sku ||
          product.sku.toLowerCase().includes(productFilters.sku.toLowerCase())) &&
        (!productFilters.category || categoryName === productFilters.category) &&
        (!productFilters.gst || String(product.gst_percentage) === String(productFilters.gst))
      );
    });
  }, [products, categories, productFilters]);

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Name"
            value={productFilters.name}
            onChange={(e) => setProductFilters({ ...productFilters, name: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="SKU"
            value={productFilters.sku}
            onChange={(e) => setProductFilters({ ...productFilters, sku: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={productFilters.category}
            onChange={(e) => setProductFilters({ ...productFilters, category: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={productFilters.gst}
            onChange={(e) => setProductFilters({ ...productFilters, gst: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">GST %</option>
            {gstRates.map((gst) => (
              <option key={gst.id} value={gst.rate}>
                {gst.rate}%
              </option>
            ))}
          </select>
        </div>
        <div className="flex mt-2">
          <button
            onClick={() => setProductFilters(initialProductFilters)}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Product Management</h2>
        <button
          onClick={() => {
            setProductForm(initialProductForm);
            setShowProductForm(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Purchase Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                MRP
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">GST%</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{product.purchase_rate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{product.mrp}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.gst_percentage}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{product.current_stock}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => {
                      setEditingItem(product.id);
                      setProductForm(product);
                      setShowProductForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductFormModal
        isOpen={showProductForm || Boolean(editingItem)}
        isEditing={Boolean(editingItem)}
        productForm={productForm}
        productErrors={productErrors}
        units={units}
        categories={categories}
        gstRates={gstRates}
        products={products}
        setProductForm={setProductForm}
        setProductErrors={setProductErrors}
        onGenerateSku={handleGenerateSku}
        onSubmit={editingItem ? handleUpdateProduct : handleAddProduct}
        onClose={handleCloseProductModal}
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

export default ProductsTab;

