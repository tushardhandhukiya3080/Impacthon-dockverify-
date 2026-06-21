// Guest landing page component (preserved from original design)
import React from 'react';
import { useAppContext } from '../../context/AppContext';

const GuestLandingPage: React.FC = () => {
  const { dispatch } = useAppContext();

  const showAuth = (mode: 'signin' | 'signup') => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    // Additional auth mode handling can be added here
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-950">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-hero-pattern opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-950 via-brand-900 to-slate-900 opacity-90"></div>
      </div>

      {/* Navigation */}
      <nav className="glass-dark sticky top-0 z-40 w-full border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-brand-400 to-accent-400 p-2 rounded-lg shadow-lg shadow-brand-500/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <span className="text-2xl font-display font-bold text-white tracking-tight">
                Document Portal<span className="text-brand-400">.</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => showAuth('signin')}
                className="text-slate-300 hover:text-white font-medium transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => showAuth('signup')}
                className="bg-white text-brand-900 px-5 py-2.5 rounded-full font-semibold hover:bg-brand-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-brand-200 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
              </span>
              <span>Secure Document Management</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-display font-bold text-white leading-tight">
              Your personal <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-accent-300">
                document vault
              </span>.
            </h1>
            
            <p className="text-xl text-slate-300 max-w-lg leading-relaxed">
              Securely manage, verify, and access your important documents with blockchain-backed authentication and IPFS storage.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => showAuth('signup')}
                className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-lg px-8 py-4 rounded-xl font-semibold shadow-xl shadow-brand-500/20 transition-all transform hover:-translate-y-1"
              >
                Start Managing Documents
              </button>
              <button 
                onClick={() => showAuth('signin')}
                className="glass-dark hover:bg-white/10 text-white text-lg px-8 py-4 rounded-xl font-semibold backdrop-blur-md transition-all"
              >
                Access Your Portal
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
              <div>
                <p className="text-3xl font-display font-bold text-white">100%</p>
                <p className="text-slate-400 text-sm">Secure</p>
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-white">&lt;2s</p>
                <p className="text-slate-400 text-sm">Access Time</p>
              </div>
              <div>
                <p className="text-3xl font-display font-bold text-white">24/7</p>
                <p className="text-slate-400 text-sm">Available</p>
              </div>
            </div>
          </div>

          <div className="relative lg:block hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="bg-white rounded-xl overflow-hidden shadow-inner">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">my-documents.portal</div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-16 w-16 bg-brand-100 rounded-full flex items-center justify-center text-3xl">📄</div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-widest">Status</div>
                      <div className="text-green-600 font-bold flex items-center gap-1 justify-end">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Verified
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-400 font-mono">IPFS: Qm7f...3a29</div>
                      <div className="h-12 w-12 bg-slate-800 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuestLandingPage;