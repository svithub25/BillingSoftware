import React, { useEffect, useState } from 'react';
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'react-toastify';

const SETTINGS_KEYS = {
  gst_on_sale: 'Apply GST On Sale Bills',
  gst_on_purchase: 'Apply GST On Purchase Bills'
};

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [settings, setSettings] = useState({
    gst_on_sale: '0',
    gst_on_purchase: '0'
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const rows = await window.electronAPI.getSettings();
      const next = { gst_on_sale: '0', gst_on_purchase: '0' };
      (rows || []).forEach((row) => {
        if (row.key in next) {
          next[row.key] = String(row.value || '0');
        }
      });
      setSettings(next);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async (key) => {
    const nextValue = settings[key] === '1' ? '0' : '1';
    setSavingKey(key);
    try {
      await window.electronAPI.updateSetting(key, nextValue);
      setSettings((prev) => ({ ...prev, [key]: nextValue }));
      toast.success('Setting updated');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSavingKey('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Control app-wide GST behavior for billing and purchase.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-700 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Tax Settings</h2>
        </div>

        <div className="space-y-4">
          {Object.entries(SETTINGS_KEYS).map(([key, label]) => {
            const enabled = settings[key] === '1';
            const isSaving = savingKey === key;
            return (
              <div
                key={key}
                className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">Key: {key}</p>
                </div>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleToggle(key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-gray-300'
                  } ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  title={enabled ? 'Enabled' : 'Disabled'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Settings;
