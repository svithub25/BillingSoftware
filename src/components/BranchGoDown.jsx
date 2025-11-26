import React, { useState, useReducer, useMemo } from 'react';
import { PlusCircle, Search, Trash2, Repeat, X, CheckCircle, Package } from 'lucide-react';
import { toast } from 'react-toastify'; 

// --- 1. Mock Data (Simulating Inventory and Locations) ---

const mockLocations = [
    { id: 1, name: 'Main Warehouse' },
    { id: 2, name: 'Retail Store A' },
    { id: 3, name: 'Remote Godown B' },
];

// Item inventory structure: stock field maps location ID to quantity
const mockInventory = [
    { id: 101, name: 'LED Monitor 27"', sku: 'MON-27', unit: 'Pcs', stock: { 1: 50, 2: 15, 3: 5 } },
    { id: 102, name: 'Wireless Keyboard', sku: 'KB-WIR', unit: 'Pcs', stock: { 1: 150, 2: 40, 3: 20 } },
    { id: 103, name: 'Gaming Mouse Pad', sku: 'MP-GM', unit: 'Pcs', stock: { 1: 300, 2: 80, 3: 100 } },
    { id: 104, name: 'RJ45 Cable 10m', sku: 'CBL-RJ45', unit: 'Rolls', stock: { 1: 80, 2: 10, 3: 50 } },
];
 
const initialTransfers = [
    { id: 1, date: '2025-11-19', item: 'LED Monitor 27"', itemId: 101, quantity: 10, source: 'Main Warehouse', destination: 'Retail Store A', ref: 'TRF-A123', status: 'Completed' },
    { id: 2, date: '2025-11-20', item: 'Wireless Keyboard', itemId: 102, quantity: 5, source: 'Retail Store A', destination: 'Remote Godown B', ref: 'TRF-B456', status: 'Pending' },
];

// --- 2. Reducer (State Management Logic) ---

const transferReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_TRANSFER':
            const newId = Math.max(...state.map(n => n.id), 0) + 1;
            return [...state, { ...action.payload, id: newId, status: 'Pending' }];
        case 'DELETE_TRANSFER':
            return state.filter(transfer => transfer.id !== action.payload);
        case 'UPDATE_STATUS':
            return state.map(transfer =>
                transfer.id === action.payload.id ? { ...transfer, status: action.payload.status } : transfer
            );
        default:
            return state;
    }
};

// --- 3. Modal Form Component ---

const TransferFormModal = ({ isOpen, onClose, dispatch }) => {
    const [formData, setFormData] = useState({
        itemId: '',
        quantity: '',
        sourceId: '',
        destinationId: '',
        date: new Date().toISOString().substring(0, 10),
        ref: '',
    });
    const [error, setError] = useState('');

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const labelClass = "block text-sm font-medium text-gray-700 mb-2";

    // Find the currently selected item object and its stock at the source
    const selectedItem = mockInventory.find(item => String(item.id) === String(formData.itemId));
    const availableStock = selectedItem 
        ? selectedItem.stock[Number(formData.sourceId)] || 0 
        : 0;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const qtyNum = parseInt(formData.quantity);

        // Validation
        if (!selectedItem || !qtyNum || !formData.sourceId || !formData.destinationId) {
            setError('Please select an item, source, destination, and quantity.');
            return;
        }
        if (formData.sourceId === formData.destinationId) {
            setError('Source and Destination locations must be different.');
            return;
        }
        if (qtyNum <= 0) {
            setError('Quantity must be greater than zero.');
            return;
        }
        if (qtyNum > availableStock) {
            setError(`Insufficient stock in the source location. Available: ${availableStock} ${selectedItem.unit}.`);
            return;
        }

        // Prepare payload
        const sourceName = mockLocations.find(l => String(l.id) === String(formData.sourceId)).name;
        const destinationName = mockLocations.find(l => String(l.id) === String(formData.destinationId)).name;

        dispatch({
            type: 'ADD_TRANSFER',
            payload: {
                ...formData,
                item: selectedItem.name,
                quantity: qtyNum,
                source: sourceName,
                destination: destinationName,
                unit: selectedItem.unit,
                ref: formData.ref || `TRF-${new Date().getTime()}` // Auto-generate ref if empty
            }
        });

        toast.success(`Transfer of ${qtyNum} ${selectedItem.unit} saved successfully.`);
        
        // Reset form and close modal
        setFormData({
            itemId: '',
            quantity: '',
            sourceId: '',
            destinationId: '',
            date: new Date().toISOString().substring(0, 10),
            ref: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transition-transform duration-300 transform scale-100">
                
                {/* Modal Header */}
                <div className="p-5 rounded-t-xl border-b bg-indigo-50 border-indigo-200">
                    <h3 className="text-xl font-bold text-indigo-800 flex items-center">
                        <Repeat className="w-5 h-5 mr-2" />
                        Record Stock Transfer (Godown/Branch)
                    </h3>
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 p-1 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <p className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-lg">
                            🛑 {error}
                        </p>
                    )}

                    {/* Row 1: Item and Quantity */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 flex flex-col">
                            <label htmlFor="itemId" className={labelClass}>Item to Transfer *</label>
                            <select
                                id="itemId"
                                name="itemId"
                                value={formData.itemId}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            >
                                <option value="">Select Item</option>
                                {mockInventory.map(item => (
                                    <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="quantity" className={labelClass}>Quantity *</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    id="quantity" 
                                    name="quantity" 
                                    value={formData.quantity} 
                                    onChange={handleChange} 
                                    className={inputClass + ' pr-16'} 
                                    min="1" 
                                    required 
                                />
                                <span className="absolute right-0 top-0 mt-2 mr-3 text-xs text-gray-500 pointer-events-none">
                                    {selectedItem ? selectedItem.unit : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Available Stock Indicator */}
                    <div className="text-sm font-medium text-gray-600 border-b pb-2">
                        {formData.sourceId && selectedItem ? (
                            <span className={availableStock > 0 ? 'text-green-600' : 'text-red-600'}>
                                Current Stock at Source: **{availableStock} {selectedItem.unit}**
                            </span>
                        ) : (
                            <span className="text-gray-500">Select Item and Source to check stock.</span>
                        )}
                    </div>

                    {/* Row 2: Source and Destination */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label htmlFor="sourceId" className={labelClass}>Source Location (From Godown/Branch) *</label>
                            <select 
                                id="sourceId" 
                                name="sourceId" 
                                value={formData.sourceId} 
                                onChange={handleChange} 
                                className={inputClass} 
                                required 
                            >
                                <option value="">Select Source</option>
                                {mockLocations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="destinationId" className={labelClass}>Destination Location (To Godown/Branch) *</label>
                            <select 
                                id="destinationId" 
                                name="destinationId" 
                                value={formData.destinationId} 
                                onChange={handleChange} 
                                className={inputClass} 
                                required 
                            >
                                <option value="">Select Destination</option>
                                {mockLocations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Date and Reference */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label htmlFor="date" className={labelClass}>Date of Transfer *</label>
                            <input 
                                type="date" 
                                id="date" 
                                name="date" 
                                value={formData.date} 
                                onChange={handleChange} 
                                className={inputClass} 
                                required 
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="ref" className={labelClass}>Reference / Tracking ID (Optional)</label>
                            <input 
                                type="text" 
                                id="ref" 
                                name="ref" 
                                value={formData.ref} 
                                onChange={handleChange} 
                                className={inputClass} 
                                placeholder="TRF-XYZ-123"
                            />
                        </div>
                    </div>

                    {/* Modal Footer (Action Button) */}
                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center px-4 py-3 font-semibold text-white rounded-lg transition duration-150 shadow-md bg-indigo-600 hover:bg-indigo-700"
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Record Transfer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- 4. Main Page Component ---

const StockTransfer = () => {
    const [transfers, dispatch] = useReducer(transferReducer, initialTransfers);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Utility Classes ---
    const tableHeaderClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableDataClass = "px-6 py-4 text-sm text-gray-900";

    const handleDelete = (id) => {
        if (window.confirm(`Are you sure you want to delete Transfer ID #${id}?`)) {
            dispatch({ type: 'DELETE_TRANSFER', payload: id });
            toast.info(`Transfer #${id} deleted.`);
        }
    };

    // --- Filtering/Searching ---
    const filteredTransfers = useMemo(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        if (!lowerSearchTerm) return transfers;

        return transfers.filter(t =>
            String(t.id).includes(lowerSearchTerm) ||
            t.ref.toLowerCase().includes(lowerSearchTerm) ||
            t.item.toLowerCase().includes(lowerSearchTerm) ||
            t.source.toLowerCase().includes(lowerSearchTerm) ||
            t.destination.toLowerCase().includes(lowerSearchTerm)
        );
    }, [transfers, searchTerm]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">
            
            {/* Header and Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <h1 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Stock Transfer Registry</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Record New Transfer
                </button>
            </div>

            {/* Search Bar and Table Container */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                
                {/* Search */}
                <div className="relative mb-6 max-w-lg">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input 
                        type="text"
                        placeholder="Search by Item, Reference, or Location..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Transfers Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className={tableHeaderClass + ' w-20'}>ID</th>
                                <th scope="col" className={tableHeaderClass}>Date</th>
                                <th scope="col" className={tableHeaderClass}>Item Details</th>
                                <th scope="col" className={tableHeaderClass}>Source (From)</th>
                                <th scope="col" className={tableHeaderClass}>Destination (To)</th>
                                <th scope="col" className={tableHeaderClass + ' text-right'}>Quantity</th>
                                <th scope="col" className={tableHeaderClass}>Ref/Tracking</th>
                                <th scope="col" className={tableHeaderClass}>Status</th>
                                <th scope="col" className={tableHeaderClass + ' text-right'}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTransfers.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-8 text-gray-500">No matching stock transfers found.</td>
                                </tr>
                            ) : (
                                filteredTransfers.map(t => {
                                    const isCompleted = t.status === 'Completed';
                                    const statusColor = isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

                                    return (
                                        <tr key={t.id} className="hover:bg-indigo-50/50">
                                            <td className={tableDataClass + ' font-semibold'}>{t.id}</td>
                                            <td className={tableDataClass}>{t.date}</td>
                                            <td className={tableDataClass}>
                                                <div className="font-medium text-gray-900">{t.item}</div>
                                                <div className="text-gray-500 text-xs">{t.itemId}</div>
                                            </td>
                                            <td className={tableDataClass + ' font-medium text-blue-700'}>{t.source}</td>
                                            <td className={tableDataClass + ' font-medium text-indigo-700'}>{t.destination}</td>
                                            <td className={tableDataClass + ` font-bold text-right text-base`}>
                                                {t.quantity} {t.unit}
                                            </td>
                                            <td className={tableDataClass + ' text-gray-600'}>{t.ref}</td>
                                            <td className={tableDataClass}>
                                                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className={tableDataClass + ' text-right space-x-2'}>
                                                <button 
                                                    onClick={() => dispatch({ type: 'UPDATE_STATUS', payload: { id: t.id, status: isCompleted ? 'Pending' : 'Completed' } })}
                                                    className="text-indigo-600 hover:text-indigo-900 transition duration-150 text-sm"
                                                    title="Toggle Completion Status"
                                                >
                                                    {isCompleted ? 'Mark Pending' : 'Mark Complete'}
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(t.id)}
                                                    className="text-red-600 hover:text-red-900 transition duration-150 p-1 rounded-full hover:bg-red-50"
                                                    title="Delete Transfer Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div> 
            </div>

            {/* Modal */}
            <TransferFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                dispatch={dispatch} 
            />

        </div>
    );
};

export default StockTransfer;