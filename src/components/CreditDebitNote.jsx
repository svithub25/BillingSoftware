import React, { useState, useReducer } from 'react';
import { PlusCircle, Search, Trash2, FileText, X, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify'; // Assume toast is available globally

// --- 1. State Management & Reducer (Simulating Backend/Database) ---

const initialNotes = [
    { id: 'CN101', type: 'Credit Note', invoiceId: 'INV-2025-015', date: '2025-11-15', amount: 450.00, reason: 'Returned defective goods', status: 'Approved' },
    { id: 'DN102', type: 'Debit Note', invoiceId: 'INV-2025-030', date: '2025-11-18', amount: 85.50, reason: 'Price miscalculation on invoice', status: 'Pending' },
    { id: 'CN103', type: 'Credit Note', invoiceId: 'INV-2025-045', date: '2025-11-20', amount: 120.00, reason: 'Customer granted loyalty discount', status: 'Approved' },
];
const mockInventory = [
    { id: 101, name: 'LED Monitor 27"', sku: 'MON-27', unit: 'Pcs', stock: { 1: 50, 2: 15, 3: 5 } },
    { id: 102, name: 'Wireless Keyboard', sku: 'KB-WIR', unit: 'Pcs', stock: { 1: 150, 2: 40, 3: 20 } },
    { id: 103, name: 'Gaming Mouse Pad', sku: 'MP-GM', unit: 'Pcs', stock: { 1: 300, 2: 80, 3: 100 } },
    { id: 104, name: 'RJ45 Cable 10m', sku: 'CBL-RJ45', unit: 'Rolls', stock: { 1: 80, 2: 10, 3: 50 } },
];

const notesReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_NOTE':
            const newId = Math.max(...state.map(n => n.id), 0) + 1;
            return [...state, { ...action.payload, id: newId, status: 'Pending' }];
        case 'DELETE_NOTE':
            return state.filter(note => note.id !== action.payload);
        case 'UPDATE_STATUS':
            return state.map(note =>
                note.id === action.payload.id ? { ...note, status: action.payload.status } : note
            );
        default:
            return state;
    }
};

// --- 2. Modal Form Component ---

const NoteFormModal = ({ isOpen, onClose, dispatch }) => {
    const [formData, setFormData] = useState({
        type: 'Credit Note', // Default
        invoiceId: '',
        date: new Date().toISOString().substring(0, 10),
        amount: '',
        reason: '',
    });
    const [error, setError] = useState('');

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const labelClass = "block text-sm font-medium text-gray-700 mb-2";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'type') {
            // Clear validation error on type change
            setError('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.invoiceId || !formData.amount || !formData.reason || !formData.date) {
            setError('Please fill in all required fields.');
            return;
        }
        const amountNum = parseFloat(formData.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setError('Amount must be a positive number.');
            return;
        }

        // Dispatch the action to add the new note
        dispatch({
            type: 'ADD_NOTE',
            payload: {
                ...formData,
                amount: amountNum,
            }
        });

        toast.success(`${formData.type} created successfully!`);

        // Reset form and close modal
        setFormData({
            type: 'Credit Note',
            invoiceId: '',
            date: new Date().toISOString().substring(0, 10),
            amount: '',
            reason: '',
        });
        onClose();
    };

    if (!isOpen) return null;

    const isCredit = formData.type === 'Credit Note';

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg transition-transform duration-300 transform scale-100">

                {/* Modal Header */}
                <div className={`p-5 rounded-t-xl border-b ${isCredit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h3 className={`text-xl font-bold ${isCredit ? 'text-green-800' : 'text-red-800'} flex items-center`}>
                        <FileText className="w-5 h-5 mr-2" />
                        Create New {formData.type}
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

                    {/* Row 1: Type Selection */}
                    <div className="flex flex-col">
                        <label htmlFor="type" className={labelClass}>Note Type:</label>
                        <select
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className={inputClass}
                        >
                            <option value="Credit Note">Credit Note</option>
                            <option value="Debit Note">Debit Note</option>
                        </select>
                    </div>

                    {/* Row 2: Invoice ID and Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <label htmlFor="invoiceId" className={labelClass}>Party Name *</label>
                            <input
                                type="text"
                                id="invoiceId"
                                name="invoiceId"
                                value={formData.invoiceId}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="Party Name"
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label htmlFor="date" className={labelClass}>Date Issued *</label>
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
                    </div>
                    <div className="col-span-2 flex flex-col">
                        <label htmlFor="itemId" className={labelClass}>Item *</label>
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

                    {/* Row 3: Amount */}
                    <div className="flex flex-col">
                        <label htmlFor="amount" className={labelClass}>Amount ($) *</label>
                        <input
                            type="number"
                            id="amount"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            className={inputClass}
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    {/* Row 4: Reason */}
                    <div className="flex flex-col">
                        <label htmlFor="reason" className={labelClass}>Reason / Justification *</label>
                        <textarea
                            id="reason"
                            name="reason"
                            value={formData.reason}
                            onChange={handleChange}
                            rows="3"
                            className={`${inputClass} resize-none`}
                            placeholder="Detailed reason for the adjustment..."
                            required
                        />
                    </div>

                    {/* Modal Footer (Action Button) */}
                    <div className="pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            className={`w-full flex items-center justify-center px-4 py-3 font-semibold text-white rounded-lg transition duration-150 shadow-md ${isCredit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Save {formData.type}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- 3. Main Page Component ---

const AdjustmentNotes = () => {
    const [notes, dispatch] = useReducer(notesReducer, initialNotes);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Utility Functions ---

    const handleDelete = (id, type) => {
        if (window.confirm(`Are you sure you want to delete ${type} #${id}?`)) {
            dispatch({ type: 'DELETE_NOTE', payload: id });
            toast.info(`${type} deleted.`);
        }
    };

    // --- Filtering/Searching ---
    const filteredNotes = notes.filter(note =>
        String(note.id).includes(searchTerm) ||
        note.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- Tailwind Utility Classes ---
    const tableHeaderClass = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
    const tableDataClass = "px-6 py-4 whitespace-nowrap text-sm text-gray-900";

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-gray-50 min-h-screen">

            {/* Header and Action Button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow-md border border-gray-100">
                <h1 className="text-xl font-bold text-gray-900 mb-4 sm:mb-0">Credit & Debit Note Adjustments</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-md"
                >
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Create New Note
                </button>
            </div>

            {/* Search Bar and Table Container */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">

                {/* Search */}
                <div className="relative mb-6 max-w-lg">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, Invoice ID, or Reason..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Notes Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className={tableHeaderClass}>CN/DN</th>
                                <th scope="col" className={tableHeaderClass}>Type</th>
                                <th scope="col" className={tableHeaderClass}>Invoice ID</th>
                                <th scope="col" className={tableHeaderClass}>Date</th>
                                {/* <th scope="col" className={tableHeaderClass + ' text-right'}>Amount ($)</th> */}
                                <th scope="col" className={tableHeaderClass}>Reason</th>
                                <th scope="col" className={tableHeaderClass}>Status</th>
                                <th scope="col" className={tableHeaderClass + ' text-right'}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredNotes.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-8 text-gray-500">No matching adjustment notes found.</td>
                                </tr>
                            ) : (
                                filteredNotes.map(note => {
                                    const isCredit = note.type === 'Credit Note';
                                    const typeColor = isCredit ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
                                    const statusColor = note.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

                                    return (
                                        <tr key={note.id} className="hover:bg-gray-50">
                                            <td className={tableDataClass + ' font-semibold'}>{note.id}</td>
                                            <td className={`${tableDataClass} font-medium ${typeColor} rounded-full text-center px-3`}>
                                                {note.type}
                                            </td>
                                            <td className={tableDataClass}>{note.invoiceId}</td>
                                            <td className={tableDataClass}>{note.date}</td>
                                            {/* <td className={tableDataClass + ` font-bold text-right ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                        ${note.amount.toFixed(2)}
                      </td> */}
                                            <td className={tableDataClass + ' max-w-xs truncate'}>{note.reason}</td>
                                            <td className={tableDataClass}>
                                                <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                    {note.status}
                                                </span>
                                            </td>
                                            <td className={tableDataClass + ' text-right space-x-2'}>
                                                <button
                                                    onClick={() => dispatch({ type: 'UPDATE_STATUS', payload: { id: note.id, status: note.status === 'Approved' ? 'Pending' : 'Approved' } })}
                                                    className="text-indigo-600 hover:text-indigo-900 transition duration-150 text-sm"
                                                    title="Toggle Status"
                                                >
                                                    Change Status
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(note.id, note.type)}
                                                    className="text-red-600 hover:text-red-900 transition duration-150 p-1 rounded-full hover:bg-red-50"
                                                    title="Delete Note"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}


                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <NoteFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                dispatch={dispatch}
            />

        </div>
    );
};

export default AdjustmentNotes;