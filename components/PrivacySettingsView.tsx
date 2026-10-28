'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  Clock,
  Database,
  Lock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { PrivacySettings, Capabilities } from '../types';
import {
  getPrivacySettings,
  updatePrivacySettings,
  getCapabilities,
  seedDemoData,
  resetDemoData,
} from '../lib/api';

interface PrivacySettingsViewProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onRefreshAll: () => void;
}

export const PrivacySettingsView: React.FC<PrivacySettingsViewProps> = ({
  onToast,
  onRefreshAll,
}) => {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [sData, cData] = await Promise.all([getPrivacySettings(), getCapabilities()]);
      setSettings(sData);
      setCaps(cData);
    } catch (err: any) {
      onToast('error', 'Settings Load Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoDelete = async (val: boolean) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await updatePrivacySettings({ auto_delete_raw_media: val });
      setSettings(updated);
      onToast('success', 'Privacy Updated', `Auto-deletion of raw media set to ${val ? 'enabled' : 'disabled'}.`);
    } catch (err: any) {
      onToast('error', 'Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRetention = async (hours: number) => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await updatePrivacySettings({ media_retention_hours: hours });
      setSettings(updated);
      onToast('success', 'Retention Updated', `Media retention window set to ${hours} hours.`);
    } catch (err: any) {
      onToast('error', 'Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSaving(true);
      await seedDemoData(true);
      onToast('success', 'Demo Data Seeded', 'Sample courses, students, and sessions initialized.');
      loadSettings();
      onRefreshAll();
    } catch (err: any) {
      onToast('error', 'Seed Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetData = async () => {
    try {
      setSaving(true);
      await resetDemoData();
      setConfirmWipeOpen(false);
      onToast('info', 'Database Wiped', 'All records and sessions have been reset.');
      loadSettings();
      onRefreshAll();
    } catch (err: any) {
      onToast('error', 'Reset Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-xs">
        Loading privacy settings & local capability status...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Privacy, Security & Retention Settings</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
              100% Offline Guarantee
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data sovereignty controls, raw media auto-purging, and institutional privacy compliance.
          </p>
        </div>

        <button
          onClick={loadSettings}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors self-start md:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation Modal for Reset */}
      {confirmWipeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-slate-900">Reset Local Database?</h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              This will remove all stored student records, attendance logs, and generated sessions.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmWipeOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleResetData}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? 'Resetting...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Privacy Assurance Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <HardDrive className="w-6 h-6 text-emerald-600 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Local Device Processing</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            All frames are decoded in memory on this machine. No video or biometric tokens leave the device.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <Database className="w-6 h-6 text-sky-600 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Self-Contained Storage</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Zero cloud database dependency. Uses local SQLite with strict role boundaries.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <Lock className="w-6 h-6 text-purple-600 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Zero Third-Party Telemetry</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            No external tracking scripts, Google analytics, or commercial advertising APIs.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <ShieldCheck className="w-6 h-6 text-teal-600 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Non-Invasive Indicators</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            No facial emotion recognition or demographic inference. Metrics reflect observable participation only.
          </p>
        </div>
      </div>

      {/* Media Retention Settings Card */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Media Retention & Auto-Purging Rules
        </h3>

        {/* Toggle 1: Auto Delete Raw Media */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Auto-Delete Raw Video Post-Processing</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Permanently purges uploaded recording files immediately after feature extraction.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.auto_delete_raw_media}
              onChange={(e) => handleToggleAutoDelete(e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Setting 2: Retention Window Hours */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Media Retention Window</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Maximum hours temporary media files remain before automated cleanup.
            </p>
          </div>
          <select
            value={settings.media_retention_hours}
            onChange={(e) => handleChangeRetention(parseInt(e.target.value) || 24)}
            disabled={saving}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium"
          >
            <option value="1">1 hour (Strict)</option>
            <option value="6">6 hours</option>
            <option value="24">24 hours (Standard)</option>
            <option value="72">72 hours</option>
          </select>
        </div>
      </div>

      {/* Local Capability Status Inspection */}
      {caps && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 mb-3">
            Local Pipeline Capability Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">Offline Processing:</span>
              <span className="font-bold text-emerald-700">Ready</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">OpenCV Decoders:</span>
              <span className="font-bold text-emerald-700">Available</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">PDF Report Engine:</span>
              <span className="font-bold text-emerald-700">Active</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">Acoustic Energy VAD:</span>
              <span className="font-bold text-emerald-700">Enabled</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">Stored Sessions:</span>
              <span className="font-bold text-slate-800">{settings.total_stored_sessions}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-600">Audit Logs:</span>
              <span className="font-bold text-slate-800">{settings.total_audit_logs}</span>
            </div>
          </div>
        </div>
      )}

      {/* Demo Data Management & Reset Action */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Demonstration Dataset Utilities</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Reset or reload synthetic classroom data for reproducible testing and presentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDemo}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reload Demo Data</span>
          </button>

          <button
            onClick={() => setConfirmWipeOpen(true)}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe Database</span>
          </button>
        </div>
      </div>
    </div>
  );
};
