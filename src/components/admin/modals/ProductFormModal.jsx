import React, { useState, useMemo, useRef, useEffect } from 'react';

const ProductFormModal = ({
  isOpen,
  isEditing,
  productForm,
  productErrors,
  units,
  categories,
  gstRates,
  products = [],
  setProductForm,
  setProductErrors,
  onGenerateSku,
  onSubmit,
  onClose
}) => {
  if (!isOpen) return null;

  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const nameSuggestions = useMemo(() => {
    if (!productForm.name || productForm.name.length < 2) return [];
    const lowerInput = productForm.name.toLowerCase();
    const matches = new Set();
    products.forEach(p => {
      if (p.name && p.name.toLowerCase().includes(lowerInput) && p.name !== productForm.name) {
        matches.add(p.name);
      }
    });
    return Array.from(matches).slice(0, 10);
  }, [productForm.name, products]);

  const renderHighlightedText = (text, highlight) => {
    if (!highlight) return text;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-yellow-200 text-black font-semibold rounded-sm px-[2px]">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  const handleKeyDown = (e) => {
    if (!showNameSuggestions || nameSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => (prev < nameSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (focusedSuggestionIndex >= 0 && focusedSuggestionIndex < nameSuggestions.length) {
        e.preventDefault();
        setProductForm({ ...productForm, name: nameSuggestions[focusedSuggestionIndex] });
        setShowNameSuggestions(false);
        setFocusedSuggestionIndex(-1);
        if (productErrors.name) setProductErrors({ ...productErrors, name: undefined });
      }
    }
  };

  const getFieldClass = (error) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={productForm.name}
              onFocus={() => setShowNameSuggestions(true)}
              onBlur={() => setTimeout(() => setShowNameSuggestions(false), 150)}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setProductForm({ ...productForm, name: e.target.value });
                setShowNameSuggestions(true);
                setFocusedSuggestionIndex(-1);
                if (productErrors.name) setProductErrors({ ...productErrors, name: undefined });
              }}
              className={getFieldClass(productErrors.name)}
              autoComplete="off"
            />
            {showNameSuggestions && nameSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {nameSuggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className={`px-4 py-2 cursor-pointer text-sm ${
                      idx === focusedSuggestionIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
                    }`}
                    onMouseEnter={() => setFocusedSuggestionIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent input blur
                      setProductForm({ ...productForm, name: suggestion });
                      setShowNameSuggestions(false);
                      setFocusedSuggestionIndex(-1);
                      if (productErrors.name) setProductErrors({ ...productErrors, name: undefined });
                    }}
                  >
                    {renderHighlightedText(suggestion, productForm.name)}
                  </li>
                ))}
              </ul>
            )}
            {productErrors.name && <p className="text-red-600 text-xs mt-1">{productErrors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SKU
              <span className="text-xs text-gray-500 ml-1">(Auto-generated or custom)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={productForm.sku}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setProductForm({ ...productForm, sku: value });
                  if (productErrors.sku) setProductErrors({ ...productErrors, sku: undefined });
                }}
                className={getFieldClass(productErrors.sku)}
                placeholder="Auto-generated or enter custom"
              />
              <button
                type="button"
                onClick={onGenerateSku}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                title="Generate next SKU"
              >
                Auto
              </button>
            </div>
            {productErrors.sku && <p className="text-red-600 text-xs mt-1">{productErrors.sku}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">HSN Code</label>
            <input
              type="text"
              value={productForm.hsn_code}
              onChange={(e) => setProductForm({ ...productForm, hsn_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 48025610"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
            <select
              value={productForm.unit}
              onChange={(e) => {
                setProductForm({ ...productForm, unit: e.target.value });
                if (productErrors.unit) setProductErrors({ ...productErrors, unit: undefined });
              }}
              className={getFieldClass(productErrors.unit)}
            >
              <option value="">Select Unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.name}>
                  {unit.name}
                </option>
              ))}
            </select>
            {productErrors.unit && <p className="text-red-600 text-xs mt-1">{productErrors.unit}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={productForm.category_id}
              onChange={(e) => {
                setProductForm({ ...productForm, category_id: e.target.value });
                if (productErrors.category_id)
                  setProductErrors({ ...productErrors, category_id: undefined });
              }}
              className={getFieldClass(productErrors.category_id)}
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {productErrors.category_id && (
              <p className="text-red-600 text-xs mt-1">{productErrors.category_id}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">MRP</label>
            <input
              type="number"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={productForm.mrp}
              onChange={(e) => {
                setProductForm({ ...productForm, mrp: e.target.value });
                if (productErrors.mrp) setProductErrors({ ...productErrors, mrp: undefined });
              }}
              className={getFieldClass(productErrors.mrp)}
              min={0}
            />
            {productErrors.mrp && <p className="text-red-600 text-xs mt-1">{productErrors.mrp}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Rate</label>
            <input
              type="number"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={productForm.purchase_rate}
              onChange={(e) => {
                setProductForm({ ...productForm, purchase_rate: e.target.value });
                if (productErrors.purchase_rate)
                  setProductErrors({ ...productErrors, purchase_rate: undefined });
              }}
              className={getFieldClass(productErrors.purchase_rate)}
              min={0}
            />
            {productErrors.purchase_rate && (
              <p className="text-red-600 text-xs mt-1">{productErrors.purchase_rate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sale Rate</label>
            <input
              type="number"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={productForm.sale_rate}
              onChange={(e) => {
                setProductForm({ ...productForm, sale_rate: e.target.value });
                if (productErrors.sale_rate)
                  setProductErrors({ ...productErrors, sale_rate: undefined });
              }}
              className={getFieldClass(productErrors.sale_rate)}
              min={0}
            />
            {productErrors.sale_rate && (
              <p className="text-red-600 text-xs mt-1">{productErrors.sale_rate}</p>
            )}
          </div>

          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Rate</label>
            <input
              type="number"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={productForm.customer_rate}
              onChange={(e) => {
                setProductForm({ ...productForm, customer_rate: e.target.value });
                if (productErrors.customer_rate)
                  setProductErrors({ ...productErrors, customer_rate: undefined });
              }}
              className={getFieldClass(productErrors.customer_rate)}
              min={0}
            />
            {productErrors.customer_rate && (
              <p className="text-red-600 text-xs mt-1">{productErrors.customer_rate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Salesman Rate</label>
            <input
              type="number"
              step="0.01"
              onWheel={(e) => e.target.blur()}
              value={productForm.salesman_rate}
              onChange={(e) => {
                setProductForm({ ...productForm, salesman_rate: e.target.value });
                if (productErrors.salesman_rate)
                  setProductErrors({ ...productErrors, salesman_rate: undefined });
              }}
              className={getFieldClass(productErrors.salesman_rate)}
              min={0}
            />
            {productErrors.salesman_rate && (
              <p className="text-red-600 text-xs mt-1">{productErrors.salesman_rate}</p>
            )}
          </div> */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GST %</label>
            <select
              value={productForm.gst_percentage}
              onChange={(e) => {
                const value = e.target.value === '' ? '' : parseFloat(e.target.value);
                setProductForm({ ...productForm, gst_percentage: value });
                if (productErrors.gst_percentage)
                  setProductErrors({ ...productErrors, gst_percentage: undefined });
              }}
              className={getFieldClass(productErrors.gst_percentage)}
            >
              <option value="">Select GST %</option>
              {gstRates.map((gst) => (
                <option key={gst.id} value={gst.rate}>
                  {gst.rate}%
                </option>
              ))}
            </select>
            {productErrors.gst_percentage && (
              <p className="text-red-600 text-xs mt-1">{productErrors.gst_percentage}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock</label>
            <input
              type="number"
              onWheel={(e) => e.target.blur()}
              value={productForm.current_stock}
              onChange={(e) => setProductForm({ ...productForm, current_stock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min={0}
              placeholder="Defaults to 0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Stock</label>
            <input
              type="number"
              onWheel={(e) => e.target.blur()}
              value={productForm.minimum_stock}
              onChange={(e) => setProductForm({ ...productForm, minimum_stock: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min={0}
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onSubmit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            {isEditing ? 'Update' : 'Add'} Product
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

export default ProductFormModal;

