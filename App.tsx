
import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import CitizenForm from './components/CitizenForm';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import Signup from './components/Signup';
import { Complaint, ComplaintStatus, User } from './types';

const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white animate-fadeIn">
      <div className="w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl animate-pulse mb-8">
        <i className="fas fa-city text-5xl"></i>
      </div>
      <h1 className="text-5xl font-black text-slate-900 tracking-tighter animate-bounce heading-font">Smart City</h1>
    </div>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appRole, setAppRole] = useState<'citizen' | 'admin' | null>(null);
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);

  // Initialize data from LocalStorage
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 3000);

    const savedComplaints = localStorage.getItem('smart_city_complaints');
    if (savedComplaints) {
      setComplaints(JSON.parse(savedComplaints));
    }

    const savedSession = localStorage.getItem('smart_city_session');
    if (savedSession) {
      const { user, role } = JSON.parse(savedSession);
      setCurrentUser(user);
      setAppRole(role);
      setIsAuthenticated(true);
    }

    setLoading(false);
    return () => clearTimeout(splashTimer);
  }, []);

  // Persist complaints to LocalStorage
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('smart_city_complaints', JSON.stringify(complaints));
    }
  }, [complaints, loading]);

  const handleLogin = (role: 'citizen' | 'admin', user: User) => {
    setCurrentUser(user);
    setAppRole(role);
    setIsAuthenticated(true);
    localStorage.setItem('smart_city_session', JSON.stringify({ user, role }));
  };

  const handleSignup = (user: User) => {
    const usersRaw = localStorage.getItem('smart_city_users');
    const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
    users.push(user);
    localStorage.setItem('smart_city_users', JSON.stringify(users));
    handleLogin(user.role, user);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    const usersRaw = localStorage.getItem('smart_city_users');
    if (usersRaw) {
      const users: User[] = JSON.parse(usersRaw);
      const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
      localStorage.setItem('smart_city_users', JSON.stringify(updatedUsers));
    }
    localStorage.setItem('smart_city_session', JSON.stringify({ user: updatedUser, role: appRole }));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAppRole(null);
    setView('login');
    localStorage.removeItem('smart_city_session');
  };

  const handleAddComplaint = (complaint: Complaint) => {
    setComplaints(prev => [complaint, ...prev]);
  };

  const updateComplaintStatus = (id: string, s: ComplaintStatus, assignedTeamId?: string) => {
    setComplaints(prev => prev.map(c => {
      if (c.id === id) {
        const updated = { ...c, status: s, assignedTeamId: assignedTeamId || c.assignedTeamId };
        
        // Award points if resolved
        if (s === ComplaintStatus.RESOLVED && c.status !== ComplaintStatus.RESOLVED) {
          const usersRaw = localStorage.getItem('smart_city_users');
          if (usersRaw) {
            const users: User[] = JSON.parse(usersRaw);
            const userIndex = users.findIndex(u => u.id === c.userId);
            if (userIndex !== -1) {
              users[userIndex].points = (users[userIndex].points || 0) + (c.pointsAwarded || 0);
              localStorage.setItem('smart_city_users', JSON.stringify(users));
              
              // If current user is the one who reported, update their state too
              if (currentUser && currentUser.id === c.userId) {
                setCurrentUser({ ...currentUser, points: users[userIndex].points });
              }
            }
          }
        }
        return updated;
      }
      return c;
    }));
  };

  const handleDeleteComplaint = (id: string) => {
    setComplaints(prev => prev.filter(c => c.id !== id));
  };

  const myComplaints = useMemo(() => {
    if (!currentUser) return [];
    return complaints.filter(c => c.userId === currentUser.id);
  }, [complaints, currentUser]);

  if (showSplash) return <SplashScreen />;
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase text-xs tracking-widest text-slate-400">Loading Local System...</div>;

  if (!isAuthenticated) {
    if (!appRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 modern-form-font">
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
            <button 
              onClick={() => setAppRole('citizen')}
              className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <i className="fas fa-users text-4xl text-blue-600"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 heading-font">Citizen</h2>
              <p className="text-slate-700 font-bold uppercase tracking-widest text-xs">Report Issues & Earn Rewards</p>
              <div className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest group-hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">Get Started</div>
            </button>
            <button 
              onClick={() => setAppRole('admin')}
              className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <i className="fas fa-shield-halved text-4xl text-slate-800"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 heading-font">Officer</h2>
              <p className="text-slate-700 font-bold uppercase tracking-widest text-xs">Control Center & Duty Management</p>
              <div className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest group-hover:bg-black transition-colors shadow-lg shadow-slate-200">Access Console</div>
            </button>
          </div>
        </div>
      );
    }

    return view === 'login' ? (
      <Login 
        role={appRole} 
        onLogin={handleLogin}
        onGoToSignup={() => setView('signup')} 
        onBackToRoles={() => setAppRole(null)} 
      />
    ) : (
      <Signup 
        role={appRole} 
        onSignup={handleSignup}
        onBackToLogin={() => setView('login')} 
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        currentView={currentUser?.role as 'citizen' | 'admin'} 
        user={currentUser} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {currentUser?.role === 'citizen' ? (
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center animate-fadeIn">
              <h1 className="text-4xl font-black text-slate-900 mb-2 heading-font">Voice Of {currentUser.city}</h1>
              <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">Bridging infrastructure gaps in {currentUser.state}</p>
            </div>
            <CitizenForm 
              currentUser={currentUser} 
              myComplaints={myComplaints}
              onUpdateUser={handleUpdateUser}
              onAddComplaint={handleAddComplaint}
            />
          </div>
        ) : currentUser ? (
          <AdminDashboard 
            complaints={complaints} 
            onUpdateStatus={updateComplaintStatus}
            onDelete={handleDeleteComplaint}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
          />
        ) : null}
      </main>

      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <i className="fas fa-city text-blue-500 text-2xl"></i>
             <span className="font-black text-2xl tracking-tighter heading-font">Smart City</span>
          </div>
          <p className="text-slate-300 text-sm max-w-md mx-auto">Localized governance powered by Secure Local Storage for {currentUser?.state || 'a better tomorrow'}.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
