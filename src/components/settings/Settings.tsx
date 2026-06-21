// Settings component
import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Settings</h2>
        
        <div className="space-y-8">
          {/* Notifications */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">Email Notifications</p>
                  <p className="text-sm text-slate-500">Receive updates about your documents via email</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-600 transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">SMS Notifications</p>
                  <p className="text-sm text-slate-500">Receive verification updates via SMS</p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-300 transition-colors">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Security */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                </div>
                <button className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                  Enable
                </button>
              </div>
            </div>
          </div>

          {/* Privacy */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Privacy</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-700">Data Export</p>
                  <p className="text-sm text-slate-500">Download a copy of your data</p>
                </div>
                <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;