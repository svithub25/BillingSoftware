import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Search, X, ChevronDown, User, Users, Building2, Briefcase, Clock, Plus } from 'lucide-react';

const PartyComboBox = forwardRef(({ value, onChange, voucherType, disabled = false, error = null, onAddContact }, ref) => {
  const [parties, setParties] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    refreshAndSelect: async (newContactId) => {
      await loadParties(newContactId);
    }
  }));

  useEffect(() => {
    loadParties();
  }, []);

  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadParties = async (selectContactId = null) => {
    setLoading(true);
    try {
      const contacts = await window.electronAPI.getContacts();
      const mappedParties = (contacts || []).map(c => ({
        id: c.id,
        name: c.name,
        contact: c.phone || c.email || '',
        type: c.account_group_name || 'Contact',
        source_type: 'contact',
        description: c.address || ''
      }));
      setParties(mappedParties);
      setFilteredParties(mappedParties);
      if (selectContactId) {
        const newlyAdded = mappedParties.find(p => p.id === selectContactId);
        if (newlyAdded) {
          handleSelectParty(newlyAdded);
        }
      }
    } catch (error) {
      console.error('Error loading parties:', error);
      setParties([]);
      setFilteredParties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);
    onChange(searchValue, null);

    if (!searchValue.trim()) {
      setFilteredParties(parties);
      return;
    }

    const filtered = parties.filter(party => 
      party.name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      party.contact?.toLowerCase().includes(searchValue.toLowerCase()) ||
      party.type?.toLowerCase().includes(searchValue.toLowerCase())
    );
    setFilteredParties(filtered);
  };

  const handleSelectParty = (party) => {
    setSearchTerm(party.name);
    onChange(party.name, party);
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    onChange('', null);
    setFilteredParties(parties);
    inputRef.current?.focus();
  };

  const getSourceIcon = (sourceType) => {
    switch (sourceType) {
      case 'contact':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'customer':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'supplier':
        return <Building2 className="w-4 h-4 text-green-600" />;
      case 'salesman':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'category':
        return <Briefcase className="w-4 h-4 text-orange-600" />;
      case 'recent':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSourceBadgeColor = (sourceType) => {
    switch (sourceType) {
      case 'contact':
        return 'bg-indigo-100 text-indigo-700';
      case 'customer':
        return 'bg-blue-100 text-blue-700';
      case 'supplier':
        return 'bg-green-100 text-green-700';
      case 'salesman':
        return 'bg-purple-100 text-purple-700';
      case 'category':
        return 'bg-orange-100 text-orange-700';
      case 'recent':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Filter suggestions based on voucher type
  const getSuggestedParties = () => {
    return filteredParties;
  };

  const displayParties = getSuggestedParties();

  return (
    <div className="relative" ref={dropdownRef}>
      <div className={`relative ${disabled ? 'opacity-50' : ''}`}>
        <div className="flex items-center">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type or select party name..."
            disabled={disabled}
            className={`w-full pl-10 pr-20 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded"
                title="Clear"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Show suggestions"
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                showDropdown ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {onAddContact && (
            <div className="p-2 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">Select Party</span>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  onAddContact(searchTerm || '');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Alter
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading parties...</p>
            </div>
          ) : displayParties.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No parties found</p>
              {onAddContact ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    onAddContact(searchTerm || '');
                  }}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add "{searchTerm || 'New Alter'}" as Contact
                </button>
              ) : (
                <p className="text-xs mt-1">Please select an existing contact</p>
              )}
            </div>
          ) : (
            <div>
              {/* Grouped by source type */}
              {['contact', 'category', 'customer', 'supplier','salesman', 'recent'].map(sourceType => {
                const groupParties = displayParties.filter(p => p.source_type === sourceType);
                if (groupParties.length === 0) return null;

                return (
                  <div key={sourceType}>
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        {sourceType === 'contact' ? 'Contacts' :
                         sourceType === 'category' ? 'Categories' :
                         sourceType === 'customer' ? 'Customers' :
                         sourceType === 'supplier' ? 'Suppliers' :
                         sourceType === 'salesman' ? 'Salesmen' :
                         'Recent Transactions'}
                      </span>
                    </div>
                    {groupParties.map((party, index) => (
                      <button
                        key={`${sourceType}-${index}`}
                        type="button"
                        onClick={() => handleSelectParty(party)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getSourceIcon(party.source_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {party.name}
                            </p>
                            {party.contact && (
                              <p className="text-xs text-gray-500 truncate">
                                {party.contact}
                              </p>
                            )}
                            {party.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {party.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          getSourceBadgeColor(party.source_type)
                        }`}>
                          {party.type}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Create new contact option when typed name not found */}
          {searchTerm && !displayParties.find(p => p.name?.toLowerCase() === searchTerm.toLowerCase()) && onAddContact && (
            <div className="border-t border-gray-200 p-2 bg-blue-50">
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false);
                  onAddContact(searchTerm);
                }}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add "{searchTerm}" as New Contact / Alter
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
});

export default PartyComboBox;