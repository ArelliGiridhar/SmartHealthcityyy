
import React from 'react';
import { User } from '../types';

interface HeaderProps {
  currentView: 'citizen' | 'admin';
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, user, onLogout }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-100">
            <i className="fas fa-city text-xl"></i>
          </div>
          <div className="hidden sm:block">
            <span className="font-bold text-xl tracking-tight text-slate-800 block leading-tight">SmartCity</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
              {user?.role === 'admin' ? 'Admin Control' : 'Citizen Portal'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
            {user?.profileImage ? (
              <img 
                src={user.profileImage} 
                alt="Profile" 
                className="w-8 h-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
                <i className={`fas ${user?.role === 'admin' ? 'fa-user-shield' : 'fa-user'}`}></i>
              </div>
            )}
            <span className="text-sm font-semibold text-slate-700 capitalize hidden md:inline">
              {user?.role}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all"
          >
            <i className="fas fa-right-from-bracket"></i>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
