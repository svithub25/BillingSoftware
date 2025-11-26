import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  Calendar,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PinProtected from './reusables/PinProtected';
// Simple custom confirmation modal
const ConfirmModal = ({ open, onConfirm, onCancel, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
        <p className="mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
            onClick={onConfirm}
          >
            Yes, Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// --- PIN Modal (same as in Export.jsx) ---


const Backup = () => {
  // --- Module protection state ---



  const [loading, setLoading] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState(null);
  const [dbSize, setDbSize] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // --- Module protection handlers ---


  useEffect(() => {
    
      loadLastBackupDate();
      loadDbSize();

    // eslint-disable-next-line
  }, []);

  const loadLastBackupDate = async () => {
    try {
      const date = await window.electronAPI.getLastBackupDate();
      setLastBackupDate(date);
    } catch (error) {
      console.error('Error loading last backup date:', error);
    }
  };

  const loadDbSize = async () => {
    try {
      const size = await window.electronAPI.getDatabaseSize();
      setDbSize(size);
    } catch (error) {
      setDbSize(null);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.backupDatabase();
      if (result.success) {
        toast.success('Database backup created successfully!');
        await loadLastBackupDate();
      } else {
        toast.error('Backup was cancelled or failed.');
      }
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Backup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show modal instead of window.confirm
  const handleRestore = () => {
    setShowConfirm(true);
  };

  const confirmRestore = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const result = await window.electronAPI.restoreDatabase();
      if (result.success) {
        toast.success('Database restored successfully! Please restart the application.');
      } else if (result.error) {
        toast.error(`Restore failed: ${result.error}`);
      } else {
        toast.error('Restore was cancelled.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Restore failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTimeSinceLastBackup = () => {
    if (!lastBackupDate) return null;

    const now = new Date();
    const backup = new Date(lastBackupDate);
    const diffTime = Math.abs(now - backup);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const getBackupStatus = () => {
    if (!lastBackupDate) return 'warning';

    const now = new Date();
    const backup = new Date(lastBackupDate);
    const diffTime = Math.abs(now - backup);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) return 'good';
    if (diffDays <= 30) return 'warning';
    return 'danger';
  };

  const backupStatus = getBackupStatus();

  // --- Module protection UI ---
  
 
  return (
    //  <PinProtected message="This module is protected and requires PIN verification to access." modulename="Backup & Restore">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Backup & Restore</h1>
          <p className="text-gray-600">Manage your database backups and restore from previous versions</p>
        </div>
      </div>

      {/* Backup Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Shield className="w-6 h-6 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Backup Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${backupStatus === 'good' ? 'bg-green-100' :
                backupStatus === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
              {backupStatus === 'good' ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <AlertTriangle className={`w-8 h-8 ${backupStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                  }`} />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Last Backup</h3>
              <p className="text-sm text-gray-600">
                {lastBackupDate ? (
                  <>
                    {new Date(lastBackupDate).toLocaleDateString()} ({getTimeSinceLastBackup()})
                  </>
                ) : (
                  'No backup found'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Database Size</h3>
              <p className="text-sm text-gray-600">
                Active database with all transaction data
                {dbSize !== null && (
                  <>
                    <br />
                    ( {(dbSize / 1024 / 1024).toFixed(2)} MB ) 
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {backupStatus !== 'good' && (
          <div className={`mt-4 p-4 rounded-lg ${backupStatus === 'warning' ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'
            }`}>
            <div className="flex items-center">
              <AlertTriangle className={`w-5 h-5 mr-2 ${backupStatus === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              <p className={`text-sm font-medium ${backupStatus === 'warning' ? 'text-yellow-800' : 'text-red-800'
                }`}>
                {backupStatus === 'warning'
                  ? 'Your last backup is getting old. Consider creating a new backup.'
                  : 'Your backup is very old or missing. Create a backup immediately to protect your data.'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Backup Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Backup */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Download className="w-6 h-6 text-green-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Create Backup</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Create a complete backup of your database including all inventory, sales, purchase, and configuration data.
          </p>

          <div className="bg-green-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-green-900 mb-2">What's included:</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• All inventory items and stock levels</li>
              <li>• Complete sales and purchase history</li>
              <li>• Supplier and customer information</li>
              <li>• System settings and configurations</li>
            </ul>
          </div>

          <button
            onClick={handleBackup}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Create Backup
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Upload className="w-6 h-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Restore Backup</h2>
          </div>

          <p className="text-gray-600 mb-6">
            Restore your database from a previously created backup file. This will replace all current data.
          </p>

          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-900 mb-2">Important Warning:</h3>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• This will permanently replace all current data</li>
              <li>• Create a backup first if you want to keep current data</li>
              <li>• The application will need to be restarted after restore</li>
              <li>• Make sure you have the correct backup file</li>
            </ul>
          </div>

          <button
            onClick={handleRestore}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 mr-2" />
            )}
            Restore from Backup
          </button>
        </div>
      </div>

      {/* Best Practices */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Calendar className="w-6 h-6 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Backup Best Practices</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Recommended Schedule</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Daily:</strong> For active businesses with frequent transactions</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Weekly:</strong> For moderate transaction volume</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span><strong>Monthly:</strong> For low transaction volume or backup purposes</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Storage Tips</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Store backups in multiple locations (local + cloud)</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Keep at least 3 recent backup copies</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Test restore process periodically</span>
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span>Label backup files with date and description</span>
              </li>
            </ul>
          </div> 
        </div>
      </div> 
      <ConfirmModal 
        open={showConfirm}
        onConfirm={confirmRestore}
        onCancel={() => setShowConfirm(false)}
        message="Restoring will replace all current data. Are you sure you want to continue?"
      />
      {/* <ToastContainer position="top-right" autoClose={3000} /> */}
    </div>
    // </PinProtected>
  );
};

export default Backup;