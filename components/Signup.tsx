
import React, { useState, useMemo } from 'react';
import { INDIAN_STATES, STATE_CITIES, User } from '../types';

interface SignupProps {
  role: 'citizen' | 'admin';
  onSignup: (user: User) => void;
  onBackToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ role, onSignup, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    gender: 'Other',
    state: '',
    city: '',
    address: '',
    employeeId: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCities = useMemo(() => {
    return formData.state ? STATE_CITIES[formData.state] || [] : [];
  }, [formData.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value, ...(name === 'state' ? { city: '' } : {}) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    
    // Check if email already exists locally
    const usersRaw = localStorage.getItem('smart_city_users');
    const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];
    if (users.some(u => u.email.toLowerCase() === formData.email.toLowerCase())) {
      setError("An account with this email already exists.");
      setIsSubmitting(false);
      return;
    }

    setTimeout(() => {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        surname: formData.surname,
        gender: formData.gender,
        state: formData.state,
        city: formData.city,
        address: role === 'citizen' ? formData.address : undefined,
        employeeId: role === 'admin' ? formData.employeeId : undefined,
        mobile: formData.mobile,
        email: formData.email,
        passwordHash: formData.password, // Storing in plain text for this local mock version
        role: role,
        points: 0
      };

      onSignup(newUser);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-16 animate-fadeIn modern-form-font">
      <div className="max-w-3xl w-full bg-white rounded-[4rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className={`${role === 'admin' ? 'bg-slate-900' : 'bg-blue-600'} p-12 text-center text-white relative`}>
           <button onClick={onBackToLogin} className="absolute left-10 top-12 text-white/50 hover:text-white transition-all hover:scale-110">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="inline-block p-6 bg-white/20 rounded-[2.5rem] mb-6 backdrop-blur-md">
            <i className={`fas ${role === 'admin' ? 'fa-shield-halved' : 'fa-user-plus'} text-4xl`}></i>
          </div>
          <h1 className="text-4xl font-black tracking-tight heading-font">
            {role === 'admin' ? 'Officer Registration' : 'Citizen Signup'}
          </h1>
          <p className="text-blue-100 opacity-80 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">Localized Identity Creation</p>
        </div>

        <form onSubmit={handleSubmit} className="p-12 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">First Name</label>
              <input type="text" name="name" placeholder="First Name" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.name} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Sur Name</label>
              <input type="text" name="surname" placeholder="Sur Name" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.surname} onChange={handleChange} />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Select State</label>
              <select name="state" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all appearance-none cursor-pointer" value={formData.state} onChange={handleChange}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Select City</label>
              <select name="city" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all appearance-none cursor-pointer disabled:opacity-50" value={formData.city} onChange={handleChange} disabled={!formData.state}>
                <option value="">Select City</option>
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {role === 'admin' && (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Officer Unique Token</label>
                <input type="text" name="employeeId" placeholder="ID-XXXXXXXX" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.employeeId} onChange={handleChange} />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Mobile Number</label>
              <input type="tel" name="mobile" placeholder="Mobile Number" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.mobile} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Email Address</label>
              <input type="email" name="email" placeholder="Email Address" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.email} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Password</label>
              <input type="password" name="password" placeholder="Password" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.password} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.3em] ml-2">Confirm Password</label>
              <input type="password" name="confirmPassword" placeholder="Confirm Password" required className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-100 focus:border-blue-500 font-bold outline-none transition-all shadow-sm" value={formData.confirmPassword} onChange={handleChange} />
            </div>
          </div>

          {error && (
            <div className="p-6 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-[2rem] border border-red-200 flex items-center gap-4 animate-shake">
              <i className="fas fa-triangle-exclamation text-lg"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-6 pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-6 ${role === 'admin' ? 'bg-slate-900 hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'} text-white font-black text-xs uppercase tracking-[0.4em] rounded-[2.5rem] shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-4 heading-font`}
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : "Sign Up"}
            </button>
            <button type="button" onClick={onBackToLogin} className="w-full py-3 text-slate-700 font-black uppercase tracking-[0.3em] hover:text-slate-900 transition-all text-[10px]">Back to Sign In</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
