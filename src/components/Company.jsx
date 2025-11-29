import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Building2, Lock, Unlock, Save, Upload, Key, Eye, EyeOff, X } from 'lucide-react';

const Company = () => {
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [pin, setPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [formData, setFormData] = useState({});
  const [pinExists, setPinExists] = useState(true);
  const [verifiedPin, setVerifiedPin] = useState(''); // Add this state
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  // Update loadCompanyInfo to check if PIN exists
  const loadCompanyInfo = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.getCompanyInfo();
      if (result.success) {
        setCompanyInfo(result.data);
        setFormData(result.data);
        
        // Set logo preview if exists
        if (result.data.logo_path) {
          setLogoPreview(result.data.logo_path);
          // Convert to base64 for preview
          loadLogoAsDataUrl(result.data.logo_path);
        } else {
          setLogoPreview(null);
          setLogoDataUrl(null);
        }
      } else {
        toast.error('Failed to load company information');
      }
    } catch (error) {
      toast.error('Error loading company information');
    } finally {
      setLoading(false);
    }
  };

  const loadLogoAsDataUrl = async (logoPath) => {
    try {
      // Read file as base64 from backend
      const result = await window.electronAPI.getLogoAsBase64(logoPath);
      if (result.success) {
        setLogoDataUrl(result.dataUrl);
      }
    } catch (error) {
      console.error('Error loading logo:', error);
    }
  };

  const handleVerifyPin = async () => {
    if (!pin) {
      toast.error('Please enter PIN');
      return;
    }

    const result = await window.electronAPI.verifyCompanyPin(pin);
    if (result.success) {
      setEditMode(true);
      setShowPinModal(false);
      setVerifiedPin(pin); // Store the verified PIN
      setPin(''); // Clear the input
      toast.success('PIN verified successfully');
    } else {
      toast.error('Invalid PIN');
    }
  };

  const handleSave = async () => {
    try {
      const result = await window.electronAPI.updateCompanyInfo({
        pin: verifiedPin, // Use the stored verified PIN
        companyData: formData
      });

      if (result.success) {
        toast.success('Company information updated successfully');
        setEditMode(false);
        setVerifiedPin(''); // Clear verified PIN after save
        loadCompanyInfo();
      } else {
        toast.error(result.message || 'Failed to update company information');
      }
    } catch (error) {
      toast.error('Error updating company information');
    }
  };

  const handleChangePin = async () => {
    // Check if new PIN fields are filled
    if (!newPin || !confirmNewPin) {
      toast.error('Please fill new PIN fields');
      return;
    }

    if (newPin.length < 6) {
      toast.error('New PIN must be at least 6 characters');
      return;
    }

    if (newPin !== confirmNewPin) {
      toast.error('New PIN and Confirm PIN do not match');
      return;
    }

    try {
      const result = await window.electronAPI.changeCompanyPin({
        currentPin: currentPin || '', // Send empty if not provided
        newPin
      });

      if (result.success) {
        toast.success(result.message || 'PIN changed successfully');
        setShowChangePinModal(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmNewPin('');
      } else {
        toast.error(result.message || 'Failed to change PIN');
      }
    } catch (error) {
      toast.error('Error changing PIN');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadLogo = async () => {
    try {
      const result = await window.electronAPI.uploadCompanyLogo({ pin: verifiedPin });
      
      if (result.success) {
        toast.success('Logo uploaded successfully');
        setLogoPreview(result.logoPath);
        loadLogoAsDataUrl(result.logoPath);
        loadCompanyInfo();
      } else {
        toast.error(result.message || 'Failed to upload logo');
      }
    } catch (error) {
      toast.error('Error uploading logo');
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const result = await window.electronAPI.removeCompanyLogo({ pin: verifiedPin });
      
      if (result.success) {
        toast.success('Logo removed successfully');
        setLogoPreview(null);
        setLogoDataUrl(null);
        loadCompanyInfo();
      } else {
        toast.error(result.message || 'Failed to remove logo');
      }
    } catch (error) {
      toast.error('Error removing logo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-800">Company Information</h1>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <>
              <button
                onClick={() => setShowPinModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                Edit Information
              </button>
              <button
                onClick={() => setShowChangePinModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Change PIN
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setFormData(companyInfo);
                  setVerifiedPin(''); // Clear verified PIN on cancel
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Company Information Form */}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Logo Section */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Company Logo</h2>
          </div>

          <div className="col-span-2">
            <div className="flex items-center gap-4">
              {logoDataUrl ? (
                <div className="relative">
                  <img 
                    src={logoDataUrl}
                    alt="Company Logo" 
                    className="w-32 h-32 object-contain border border-gray-300 rounded-lg"
                  />
                  {editMode && (
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Remove Logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {editMode && (
                <button
                  onClick={handleUploadLogo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Supported formats: PNG, JPG, JPEG, GIF, BMP, WEBP, SVG (Max size: 5MB recommended)
            </p>
          </div>
          {/* Basic Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Information</h2>
          </div>


          

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
            <input
              type="text"
              value={formData.company_name || ''}
              onChange={(e) => handleInputChange('company_name', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
            <input
              type="text"
              value={formData.tagline || ''}
              onChange={(e) => handleInputChange('tagline', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Address Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Address Information</h2>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
            <input
              type="text"
              value={formData.address_line1 || ''}
              onChange={(e) => handleInputChange('address_line1', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
            <input
              type="text"
              value={formData.address_line2 || ''}
              onChange={(e) => handleInputChange('address_line2', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => handleInputChange('city', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              type="text"
              value={formData.state || ''}
              onChange={(e) => handleInputChange('state', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
            <input
              type="text"
              value={formData.pincode || ''}
              onChange={(e) => handleInputChange('pincode', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <input
              type="text"
              value={formData.country || ''}
              onChange={(e) => handleInputChange('country', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Contact Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
            <input
              type="text"
              value={formData.mobile || ''}
              onChange={(e) => handleInputChange('mobile', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={formData.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Legal Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Legal Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              value={formData.gstin || ''}
              onChange={(e) => handleInputChange('gstin', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PAN</label>
            <input
              type="text"
              value={formData.pan || ''}
              onChange={(e) => handleInputChange('pan', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
            <input
              type="text"
              value={formData.cin || ''}
              onChange={(e) => handleInputChange('cin', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bank Information */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Bank Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input
              type="text"
              value={formData.bank_name || ''}
              onChange={(e) => handleInputChange('bank_name', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              value={formData.bank_account_number || ''}
              onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input
              type="text"
              value={formData.bank_ifsc || ''}
              onChange={(e) => handleInputChange('bank_ifsc', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <input
              type="text"
              value={formData.bank_branch || ''}
              onChange={(e) => handleInputChange('bank_branch', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
  <input
    type="text"
    value={formData.upi_id || ''}
    onChange={(e) => handleInputChange('upi_id', e.target.value)}
    disabled={!editMode}
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
    placeholder="Enter UPI ID"
  />
</div>
          {/* Terms & Conditions */}
          <div className="col-span-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-4">Terms & Conditions</h2>
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{`Term ${i}`}</label>
              <input
                type="text"
                value={formData[`terms_${i}`] || ''}
                onChange={e => handleInputChange(`terms_${i}`, e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter term & condition point ${i}`}
              />
            </div>
          ))}

          {/* Footer Text */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Footer Text</label>
            <textarea
              value={formData.footer_text || ''}
              onChange={(e) => handleInputChange('footer_text', e.target.value)}
              disabled={!editMode}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enter PIN to Edit</h2>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyPin();
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPin('');
                }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPin}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Change PIN</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (min 6 characters)</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowChangePinModal(false);
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmNewPin('');
                }}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePin}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Change PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Company;