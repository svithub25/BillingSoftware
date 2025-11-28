import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  RefreshCw,
  Eye,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  Search
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const CreditDebitNote = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all', // all, credit, debit
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    loadNotes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const notesData = await window.electronAPI.getCreditDebitNotes({
        type: filters.type,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      });
      setNotes(notesData || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Error loading credit/debit notes');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        const searchMatch = filters.search
          ? (note.note_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
             note.party_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
             note.original_invoice_number?.toLowerCase().includes(filters.search.toLowerCase()))
          : true;
        const typeMatch = filters.type === 'all' || note.note_type === filters.type;
        const dateFromMatch = filters.dateFrom
          ? new Date(note.note_date) >= new Date(filters.dateFrom)
          : true;
        const dateToMatch = filters.dateTo
          ? new Date(note.note_date) <= new Date(filters.dateTo)
          : true;
        return searchMatch && typeMatch && dateFromMatch && dateToMatch;
      })
      .sort((a, b) => b.id - a.id);
  }, [notes, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const currentNotes = filteredNotes.slice(indexOfLastItem - itemsPerPage, indexOfLastItem);

  const handleDelete = async (noteId) => {
    try {
      const result = await window.electronAPI.deleteCreditDebitNote(noteId);
      if (result.success) {
        toast.success('Note deleted successfully!');
        setConfirmDeleteOpen(false);
        setDeleteId(null);
        await loadNotes();
      } else {
        toast.error('Error deleting note');
      }
    } catch (error) {
      console.error(error);
      toast.error('Error deleting note');
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i += 1) {
      pages.push(i);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const selectedNote = notes.find(n => n.id === deleteId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit & Debit Notes</h1>
          <p className="text-gray-600">Manage financial adjustments and returns</p>
        </div>
        <button
          onClick={() => navigate('/credit-debit-note/new')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Note
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search note, party, or invoice"
            />
          </div>
          <select
            value={filters.type}
            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="credit">Credit Notes</option>
            <option value="debit">Debit Notes</option>
          </select>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="From Date"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="To Date"
          />
          <button
            onClick={loadNotes}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Showing {filteredNotes.length ? `${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredNotes.length)}` : 0} of {filteredNotes.length} notes
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Note No.</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Party</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice Ref</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentNotes.map((note) => (
                <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{note.note_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      note.note_type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {note.note_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(note.note_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{note.party_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{note.original_invoice_number || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₹{parseFloat(note.total_amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      note.status_code === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {note.status_code === 0 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => navigate(`/credit-debit-note/${note.id}`)}
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() => navigate(`/credit-debit-note/${note.id}/edit`)}
                      title="Edit Note"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-900"
                      onClick={() => {
                        setDeleteId(note.id);
                        setConfirmDeleteOpen(true);
                      }}
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currentNotes.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No notes found matching your filters</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between mt-4">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`flex items-center px-3 py-2 rounded-md mr-2 ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <div className="flex gap-1">
                {currentPage > 3 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                      1
                    </button>
                    {currentPage > 4 && <span className="px-2 py-2">...</span>}
                  </>
                )}

                {getPageNumbers().map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 rounded-md ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && <span className="px-2 py-2">...</span>}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`flex items-center px-3 py-2 rounded-md ml-2 ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}
      </div>

      {confirmDeleteOpen && selectedNote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Credit/Debit Note</h2>
            <p className="mb-2">
              Are you sure you want to delete this note?
              <br />
              <span className="text-sm text-gray-700">
                <strong>Note No:</strong> {selectedNote.note_number}<br />
                <strong>Type:</strong> {selectedNote.note_type.toUpperCase()}<br />
                <strong>Party:</strong> {selectedNote.party_name}
              </span>
            </p>
            <p className="mb-6 text-xs text-gray-500">
              This action cannot be undone and may affect inventory and financial records.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  setDeleteId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                onClick={() => handleDelete(selectedNote.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditDebitNote;
