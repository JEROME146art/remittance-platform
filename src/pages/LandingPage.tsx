import { useState } from 'react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-800">
      <header className="py-6 px-4 border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-600">RemitLet</h1>
          <nav>
            <ul className="flex gap-4">
              <li><a href="#features" className="text-slate-600 hover:text-brand-600">Features</a></li>
              <li><a href="#about" className="text-slate-600 hover:text-brand-600">About</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <section id="features" className="py-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border rounded-lg p-6 border-slate-200 hover:border-brand-500 transition">
          <h3 className="font-semibold mb-2">Secure & Fast</h3>
          <p className="text-slate-500">Send money across borders securely and quickly.</p>
        </div>
        <div className="border rounded-lg p-6 border-slate-200 hover:border-brand-500 transition">
          <h3 className="font-semibold mb-2">Low Fees</h3>
          <p className="text-slate-500">Competitive exchange rates with low fees.</p>
        </div>
        <div className="border rounded-lg p-6 border-slate-200 hover:border-brand-500 transition">
          <h3 className="font-semibold mb-2">Trusted</h3>
          <p className="text-slate-500">Trusted by millions of users worldwide.</p>
        </div>
      </section>

      <main className="py-16 max-w-7xl mx-auto">
        <div className="text-center">
          <p className="text-lg text-slate-500 mb-6">Join the fastest way to send money abroad.</p>
          <button className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition">
            Get Started
          </button>
        </div>
      </main>

      <footer id="about" className="py-8 px-4 border-t border-slate-200 text-slate-500 text-center">
        <p>© 2026 RemitLet. All rights reserved.</p>
      </footer>
    </div>
  );
}