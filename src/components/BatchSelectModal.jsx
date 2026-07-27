import React, { useState, useEffect, useRef } from 'react';
import { X, Package, Calendar, TrendingUp } from 'lucide-react';

const BatchSelectModal = ({ item, batches, onClose, onSelect, existingSelections = null }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [batchQty, setBatchQty] = useState(batches.map(() => 0));
  const [noBatchQty, setNoBatchQty] = useState(0);
  const modalRef = useRef(null);
  const inputRefs = useRef([]);
  const noBatchInputRef = useRef(null);

  useEffect(() => {
    setSelectedIdx(0);

    // If existingSelections provided, pre-populate
    if (existingSelections) {
      const newBatchQty = batches.map(() => 0);
      existingSelections.forEach(sel => {
        if (sel.batch_id === null) {
          setNoBatchQty(sel.qty);
        } else {
          const idx = batches.findIndex(b => b.id === sel.batch_id);
          if (idx !== -1) newBatchQty[idx] = sel.qty;
        }
      });
      setBatchQty(newBatchQty);
    } else {
      setBatchQty(batches.map(() => 0));
      setNoBatchQty(0);
    }

    // Calculate if general stock is available
    const totalBatchQtyCalc = batches.reduce((sum, batch) => sum + Number(batch.qty_available), 0);
    const generalStockAvailableCalc = Math.max(0, Number(item.current_stock) - totalBatchQtyCalc);
    const hasGeneralStock = generalStockAvailableCalc > 0;

    inputRefs.current = inputRefs.current.slice(0, batches.length + (hasGeneralStock ? 1 : 0));

    // Auto focus the modal container for keyboard navigation
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, [batches, existingSelections, item.current_stock]);

  const handleKeyDown = (e) => {
    // Calculate total batch quantity and remaining general stock for navigation
    const totalBatchQtyNav = batches.reduce((sum, batch) => sum + Number(batch.qty_available), 0);
    const generalStockAvailableNav = Math.max(0, Number(item.current_stock) - totalBatchQtyNav);
    const hasGeneralStock = generalStockAvailableNav > 0;

    // Don't intercept if user is typing in an input field
    if (e.target.tagName === 'INPUT') {
      if (e.key === 'Escape') {
        e.target.blur();
        modalRef.current?.focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        modalRef.current?.focus();
      }
      return;
    }

    const totalRows = batches.length + (hasGeneralStock ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => (i + 1) % totalRows);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => (i - 1 + totalRows) % totalRows);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      // Focus qty input for selected row
      if (hasGeneralStock && selectedIdx === batches.length) {
        // No batch row selected
        noBatchInputRef.current?.focus();
        noBatchInputRef.current?.select();
      } else {
        inputRefs.current[selectedIdx]?.focus();
        inputRefs.current[selectedIdx]?.select();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      handleConfirm();
    }
  };

  const handleQtyChange = (idx, val) => {
    const qtyArr = [...batchQty];
    qtyArr[idx] = Math.max(0, Math.min(val, batches[idx].qty_available));
    setBatchQty(qtyArr);
  };

  const handleQtyInputKeyDown = (e, idx) => {
    // Calculate if general stock row is available
    const totalBatchQtyNav = batches.reduce((sum, batch) => sum + Number(batch.qty_available), 0);
    const generalStockAvailableNav = Math.max(0, Number(item.current_stock) - totalBatchQtyNav);
    const hasGeneralStock = generalStockAvailableNav > 0;
    const totalRows = batches.length + (hasGeneralStock ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (idx + 1) % totalRows;
      setSelectedIdx(nextIdx);
      if (hasGeneralStock && nextIdx === batches.length) {
        noBatchInputRef.current?.focus();
        noBatchInputRef.current?.select();
      } else {
        inputRefs.current[nextIdx]?.focus();
        inputRefs.current[nextIdx]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (idx - 1 + totalRows) % totalRows;
      setSelectedIdx(prevIdx);
      if (hasGeneralStock && prevIdx === batches.length) {
        noBatchInputRef.current?.focus();
        noBatchInputRef.current?.select();
      } else {
        inputRefs.current[prevIdx]?.focus();
        inputRefs.current[prevIdx]?.select();
      }
    }
  };

  const handleConfirm = () => {
    const selections = batches
      .map((batch, idx) => ({ batch, qty: Number(batchQty[idx]) }))
      .filter(b => b.qty > 0);

    // Add no-batch selection if quantity is specified
    if (noBatchQty > 0) {
      selections.push({ batch: null, qty: Number(noBatchQty) });
    }

    if (selections.length === 0) {
      return;
    }
    onSelect(selections);
  };

  // Calculate total batch quantity and remaining general stock
  const totalBatchQty = batches.reduce((sum, batch) => sum + Number(batch.qty_available), 0);
  const generalStockAvailable = Math.max(0, Number(item.current_stock) - totalBatchQty);

  const handleRowClick = (idx) => {
    setSelectedIdx(idx);
    if (generalStockAvailable > 0 && idx === batches.length) {
      noBatchInputRef.current?.focus();
      noBatchInputRef.current?.select();
    } else {
      inputRefs.current[idx]?.focus();
      inputRefs.current[idx]?.select();
    }
  };

  const totalQtySelected = batchQty.reduce((sum, qty) => sum + Number(qty), 0) + Number(noBatchQty);

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Select Batch</h2>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {batches.length === 0 && generalStockAvailable === 0 ? (
            // No batches and no stock
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No stock available</p>
              <p className="text-gray-500 text-sm">This item is currently out of stock</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {batches.length > 0 ? 'Batch Number' : 'Stock Type'}
                    </th>
                    {batches.length > 0 && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Mfg Date
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Exp Date
                          </div>
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Available
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Purchase Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" />
                        MRP
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Select Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batches.map((batch, idx) => (
                    <tr
                      key={batch.id}
                      onClick={() => handleRowClick(idx)}
                      className={`cursor-pointer border-l-4 transition-all ${selectedIdx === idx
                          ? 'bg-blue-50 border-l-blue-500'
                          : 'hover:bg-gray-50 border-l-transparent'
                        }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {batch.batch_number}
                      </td>
                      {batches.length > 0 && (
                        <>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {batch.mfg_date ? new Date(batch.mfg_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {batch.exp_date ? new Date(batch.exp_date).toLocaleDateString('en-GB') : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {batch.qty_available}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        ₹{Number(batch.purchase_rate).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        ₹{Number(batch.mrp).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          ref={el => inputRefs.current[idx] = el}
                          id={`batch-qty-${idx}`}
                          type="number"
                          min={0}
                          max={batch.qty_available}
                          value={batchQty[idx]}
                          onChange={e => handleQtyChange(idx, Number(e.target.value))}
                          onKeyDown={e => handleQtyInputKeyDown(e, idx)}
                          onFocus={() => setSelectedIdx(idx)}
                          onClick={(e) => e.stopPropagation()}
                          onWheel={e => e.target.blur()}
                          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}

                  {/* No Batch Row - Only show if there's general stock available */}
                  {generalStockAvailable > 0 && (
                    <tr
                      onClick={() => handleRowClick(batches.length)}
                      className={`cursor-pointer transition-colors border-t-2 border-gray-300 ${selectedIdx === batches.length
                          ? 'bg-green-50 border-l-4 border-l-green-500'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                        }`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900" colSpan={batches.length > 0 ? 3 : 1}>
                        <div className="flex items-center gap-2">
                          <span>No Batch (General Stock)</span>
                          {batches.length > 0 && (
                            <span className="text-xs text-gray-500 font-normal">
                              (Stock: {item.current_stock} - Batches: {totalBatchQty})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-700">
                        {generalStockAvailable}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        ₹{Number(item.purchase_rate || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        ₹{Number(item.mrp || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          ref={noBatchInputRef}
                          id="no-batch-qty"
                          type="number"
                          min={0}
                          max={generalStockAvailable}
                          value={noBatchQty}
                          onChange={e => setNoBatchQty(Math.max(0, Math.min(Number(e.target.value), generalStockAvailable)))}
                          onKeyDown={e => handleQtyInputKeyDown(e, batches.length)}
                          onFocus={() => setSelectedIdx(batches.length)}
                          onClick={(e) => e.stopPropagation()}
                          onWheel={e => e.target.blur()}
                          className="w-20 px-3 py-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  )}
                  {/* Message when no general stock is available */}
                  {batches.length > 0 && generalStockAvailable === 0 && (
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={7} className="px-4 py-3 text-sm text-center text-gray-600 italic">
                        All stock ({item.current_stock}) is tracked in batches above
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Total Quantity Selected: </span>
              <span className="text-lg font-semibold text-blue-600">{totalQtySelected}</span>
            </div>
            <div className="text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">↑↓</kbd> Navigate
              <span className="mx-2">•</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Enter</kbd> Select
              <span className="mx-2">•</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">C</kbd> Confirm
              <span className="mx-2">•</span>
              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Esc</kbd> Close
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={totalQtySelected === 0}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${totalQtySelected === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
            >
              Confirm Selection ({totalQtySelected})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchSelectModal;