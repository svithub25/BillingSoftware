import React, { useState, useEffect } from 'react';

const BatchSelectModal = ({ item, batches, onClose, onSelect }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [batchQty, setBatchQty] = useState(batches.map(() => 0));

  useEffect(() => {
    setSelectedIdx(0);
    setBatchQty(batches.map(() => 0));
  }, [batches]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedIdx(i => (i + 1) % batches.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIdx(i => (i - 1 + batches.length) % batches.length);
    } else if (e.key === 'Enter') {
      // Focus qty input for selected batch
      document.getElementById(`batch-qty-${selectedIdx}`)?.focus();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleQtyChange = (idx, val) => {
    const qtyArr = [...batchQty];
    qtyArr[idx] = Math.max(0, Math.min(val, batches[idx].qty_available));
    setBatchQty(qtyArr);
  };

  const handleConfirm = () => {
    const selections = batches
      .map((batch, idx) => ({ batch, qty: Number(batchQty[idx]) }))
      .filter(b => b.qty > 0);
    if (selections.length === 0) return;
    onSelect(selections);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg">
        <h2 className="text-lg font-bold mb-4">Select Batch for {item.name}</h2>
        <table className="w-full text-xs border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Batch No</th>
              <th className="p-2">Mfg</th>
              <th className="p-2">Exp</th>
              <th className="p-2">Qty Avail</th>
              <th className="p-2">Rate</th>
              <th className="p-2">MRP</th>
              <th className="p-2">Select Qty</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch, idx) => (
              <tr key={batch.id} className={selectedIdx === idx ? 'bg-blue-50' : ''}>
                <td className="p-2">{batch.batch_number}</td>
                <td className="p-2">{batch.mfg_date || '-'}</td>
                <td className="p-2">{batch.exp_date || '-'}</td>
                <td className="p-2">{batch.qty_available}</td>
                <td className="p-2">₹{batch.purchase_rate}</td>
                <td className="p-2">₹{batch.mrp}</td>
                <td className="p-2">
                  <input
                    id={`batch-qty-${idx}`}
                    type="number"
                    min={0}
                    max={batch.qty_available}
                    value={batchQty[idx]}
                    onChange={e => handleQtyChange(idx, Number(e.target.value))}
                    className="w-14 px-1 py-1 border border-gray-300 rounded text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm Selection
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Use arrow keys to select batch, Enter to focus qty, Esc to close.</p>
      </div>
    </div>
  );
};

export default BatchSelectModal;