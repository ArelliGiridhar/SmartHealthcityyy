
import React, { useState } from 'react';
import { User } from '../types';

interface LoginProps {
  role: 'citizen' | 'admin';
  onLogin: (role: 'citizen' | 'admin', userId?: string) => void;
  onGoToSignup: () => void;
  onBackToRoles: () => void;
}

const Login: React.FC<LoginProps> = ({ role, onLogin, onGoToSignup, onBackToRoles }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const usersRaw = localStorage.getItem('smart_city_users');
    const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
    
    const foundUser = users.find(u => 
      u.email === username && 
      u.passwordHash === password && 
      u.role === role
    );

    if (foundUser) {
      onLogin(role, foundUser.id);
    } else {
      if (role === 'admin' && username === 'admin@ghmc.gov.in' && password === 'admin123') {
        onLogin('admin', 'demo-admin');
      } else if (role === 'citizen' && username === 'citizen@gmail.com' && password === 'citizen123') {
        onLogin('citizen', 'demo-citizen');
      } else {
        setError(`Invalid access credentials. Ensure your ${role === 'admin' ? 'Officer @ghmc.gov.in email' : 'registered email'} is correct.`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 modern-form-font">
      <div className="max-w-md w-full bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn">
        <div className={`${role === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} p-12 text-center text-white relative`}>
          <button onClick={onBackToRoles} className="absolute left-8 top-10 text-white/50 hover:text-white transition-all hover:scale-110 active:scale-90">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="inline-block p-5 bg-white/20 rounded-[2rem] mb-6 backdrop-blur-md shadow-xl">
            <i className={`fas ${role === 'admin' ? 'fa-shield-halved' : 'fa-user-check'} text-4xl`}></i>
          </div>
          <h1 className="text-3xl font-black tracking-tight heading-font">
            {role === 'admin' ? 'Officer Access' : 'Citizen Access'}
          </h1>
          <p className="text-blue-100 opacity-80 mt-2 font-black uppercase tracking-[0.2em] text-[10px]">Localized Governance Console</p>
        </div>

        <div className="p-12">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] mb-2 ml-1">Official Identifier</label>
              <div className="relative group">
                <i className="fas fa-id-card absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"></i>
                <input
                  type="email"
                  required
                  className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 shadow-sm"
                  placeholder={role === 'admin' ? "id@ghmc.gov.in" : "name@gmail.com"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] mb-2 ml-1">Secure Passkey</label>
              <div className="relative group">
                <i className="fas fa-key absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"></i>
                <input
                  type="password"
                  required
                  className="w-full pl-16 pr-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-red-200 flex items-center gap-4 animate-shake">
                <i className="fas fa-circle-exclamation text-base"></i>
                <span className="leading-tight">{error}</span>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-6 ${role === 'admin' ? 'bg-slate-900 hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2rem] shadow-2xl transition-all active:scale-[0.98] mt-4`}
            >
              Sign In
            </button>
          </form>

          <div className="mt-12 pt-10 border-t border-slate-100 text-center">
            <button 
              onClick={onGoToSignup}
              className={`text-[10px] font-black uppercase tracking-[0.3em] ${role === 'admin' ? 'text-slate-800' : 'text-blue-600'} hover:opacity-70 transition-opacity active:scale-95`}
            >
              New User ? Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;