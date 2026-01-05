
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Complaint, ComplaintStatus, User, ComplaintCategory, Team } from '../types';
import { searchGroundingInfo } from '../services/geminiService';
import ComplaintMap from './ComplaintMap';

interface AdminDashboardProps {
  complaints: Complaint[];
  onUpdateStatus: (id: string, status: ComplaintStatus, assignedTeamId?: string) => void;
  onDelete: (id: string) => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ complaints, onUpdateStatus, onDelete, currentUser, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'teams' | 'stats' | 'profile'>('overview');
  const [filter, setFilter] = useState<ComplaintStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [groundingQuery, setGroundingQuery] = useState('');
  const [groundingResult, setGroundingResult] = useState<{text: string, sources: any[]} | null>(null);
  const [isGrounding, setIsGrounding] = useState(false);
  const [selectedReporter, setSelectedReporter] = useState<User | null>(null);
  
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);

  // Departments and Teams simulation as per request
  const [teams, setTeams] = useState<Team[]>([
    { id: 'ROAD-T1', name: 'Road Squad Alpha', department: ComplaintCategory.ROAD_DAMAGE, isAvailable: true },
    { id: 'ROAD-T2', name: 'Road Squad Beta', department: ComplaintCategory.ROAD_DAMAGE, isAvailable: true },
    { id: 'WATER-T1', name: 'Hydraulic Crew 1', department: ComplaintCategory.WATER_LEAKAGE, isAvailable: true },
    { id: 'WATER-T2', name: 'Hydraulic Crew 2', department: ComplaintCategory.WATER_LEAKAGE, isAvailable: true },
    { id: 'GARB-T1', name: 'Sanitation Unit 1', department: ComplaintCategory.GARBAGE, isAvailable: true },
    { id: 'GARB-T2', name: 'Sanitation Unit 2', department: ComplaintCategory.GARBAGE, isAvailable: true },
    { id: 'OTHER-T1', name: 'Support Team 1', department: ComplaintCategory.OTHER, isAvailable: true },
    { id: 'OTHER-T2', name: 'Support Team 2', department: ComplaintCategory.OTHER, isAvailable: true },
  ]);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  useEffect(() => {
    const usersRaw = localStorage.getItem('smart_city_users');
    if (usersRaw) {
      setAllUsers(JSON.parse(usersRaw));
    }
  }, []);

  const localComplaints = useMemo(() => {
    return complaints.filter(c => c.state === currentUser.state && c.city === currentUser.city);
  }, [complaints, currentUser]);

  const filteredComplaints = useMemo(() => {
    return localComplaints.filter(c => {
      const matchesFilter = filter === 'ALL' || c.status === filter;
      const matchesSearch = c.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            c.category.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [localComplaints, filter, searchTerm]);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateUser({ ...currentUser, profileImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSearchGrounding = async () => {
    if (!groundingQuery.trim()) return;
    setIsGrounding(true);
    try {
      const result = await searchGroundingInfo(groundingQuery);
      setGroundingResult(result);
    } catch (e) {
      alert("Grounding Search Failed.");
    } finally {
      setIsGrounding(false);
    }
  };

  const assignTask = (complaint: Complaint) => {
    const freeTeam = teams.find(t => t.department === complaint.category && t.isAvailable);
    if (!freeTeam) {
      alert(`No teams available for ${complaint.category.replace('_', ' ')} right now.`);
      return;
    }
    
    // Mark team as busy
    setTeams(prev => prev.map(t => t.id === freeTeam.id ? { ...t, isAvailable: false } : t));
    
    // Update complaint status
    onUpdateStatus(complaint.id, ComplaintStatus.IN_PROGRESS, freeTeam.id);
  };

  const solveIssue = (complaint: Complaint) => {
    // Free the team
    if (complaint.assignedTeamId) {
      setTeams(prev => prev.map(t => t.id === complaint.assignedTeamId ? { ...t, isAvailable: true } : t));
    }
    
    // Update complaint status to RESOLVED
    // Note: App.tsx handles points addition to Citizen and sync
    onUpdateStatus(complaint.id, ComplaintStatus.RESOLVED);
  };

  const viewReporterProfile = (userId: string) => {
    const reporter = allUsers.find(u => u.id === userId);
    if (reporter) {
      setSelectedReporter(reporter);
    } else {
      alert("Reporter record missing.");
    }
  };

  const totalReports = localComplaints.length;
  const resolvedCount = localComplaints.filter(c => c.status === ComplaintStatus.RESOLVED).length;
  const resolutionRate = totalReports > 0 ? ((resolvedCount / totalReports) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Reporter Details View */}
      {selectedReporter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[4rem] w-full max-w-xl overflow-hidden shadow-2xl animate-scaleIn border border-slate-100">
            <div className="bg-slate-900 p-10 text-white relative">
              <button 
                onClick={() => setSelectedReporter(null)}
                className="absolute top-8 right-8 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
              >
                <i className="fas fa-times"></i>
              </button>
              <div className="flex items-center gap-8">
                <div className="w-28 h-28 rounded-3xl bg-slate-800 flex items-center justify-center text-4xl border-4 border-white/10 overflow-hidden shadow-xl">
                  {selectedReporter.profileImage ? (
                    <img src={selectedReporter.profileImage} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fas fa-user"></i>
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-black">{selectedReporter.name} {selectedReporter.surname}</h3>
                  <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] mt-1">Verified Citizen</p>
                </div>
              </div>
            </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Email</p>
                  <p className="text-sm font-bold text-slate-800 break-all">{selectedReporter.email}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Phone</p>
                  <p className="text-sm font-bold text-slate-800">{selectedReporter.mobile}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Location Address</p>
                <p className="text-sm font-bold text-slate-700 italic">{selectedReporter.address}</p>
              </div>
              <div className="flex justify-between items-center p-6 bg-blue-50/50 rounded-3xl border border-blue-100 mt-4">
                 <div>
                    <p className="text-[10px] font-black text-blue-400 uppercase">Impact Score</p>
                    <p className="text-2xl font-black text-blue-900">{selectedReporter.points} PTS</p>
                 </div>
                 <button onClick={() => setSelectedReporter(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200">Close Profile</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Nav */}
      <div className="flex bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
        {['overview', 'problems', 'teams', 'stats', 'profile'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="bg-slate-900 p-12 rounded-[4rem] text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="relative z-10">
              <h2 className="text-4xl font-black tracking-tight mb-2">Municipal Command: {currentUser.city}</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <i className="fas fa-shield-halved text-blue-500"></i> {currentUser.state} Central Hub
              </p>
            </div>
            <div className="flex gap-6 relative z-10">
              <div className="bg-white/5 backdrop-blur-xl px-8 py-4 rounded-[2.5rem] text-center border border-white/5">
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-1">New Tasks</p>
                <p className="text-4xl font-black">{localComplaints.filter(c => c.status === ComplaintStatus.PENDING).length}</p>
              </div>
              <div className="bg-emerald-600 px-8 py-4 rounded-[2.5rem] text-center shadow-xl shadow-emerald-500/20">
                <p className="text-[10px] uppercase font-black text-emerald-200 tracking-widest mb-1">Resolved</p>
                <p className="text-4xl font-black">{resolvedCount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
               <div className="bg-white p-2 rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden h-[600px]">
                <ComplaintMap complaints={filteredComplaints} />
              </div>
            </div>
            <div className="space-y-8">
              <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl space-y-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-3">
                  <i className="fas fa-brain text-purple-600"></i> Local AI Strategy
                </h3>
                <div className="flex flex-col gap-4">
                  <input 
                    type="text" 
                    placeholder="Ask AI for city solutions..." 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                    value={groundingQuery} 
                    onChange={(e) => setGroundingQuery(e.target.value)} 
                  />
                  <button onClick={handleSearchGrounding} disabled={isGrounding} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98]">
                    {isGrounding ? <i className="fas fa-spinner fa-spin"></i> : "Synthesize Strategy"}
                  </button>
                </div>
                {groundingResult && (
                  <div className="text-[11px] text-slate-600 bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 animate-fadeIn">
                    <p className="leading-relaxed font-medium">{groundingResult.text}</p>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 text-center text-white shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8">Performance Matrix</h3>
                <div className="flex justify-center mb-6">
                  <div className="w-40 h-40 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${resolutionRate}, 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black">{resolutionRate}%</span>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Efficiency</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setActiveTab('stats')} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all">Audit Center</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'problems' && (
        <div className="animate-fadeIn space-y-10">
          <div className="flex flex-col lg:flex-row gap-6 justify-between items-center px-4">
            <div className="relative w-full lg:w-[32rem]">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
              <input type="text" placeholder="Search case database..." className="w-full pl-16 pr-8 py-5 rounded-[2.5rem] border-2 border-slate-100 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar w-full lg:w-auto py-2">
              {['ALL', ...Object.values(ComplaintStatus)].map((s) => (
                <button key={s} onClick={() => setFilter(s as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${filter === s ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 border-slate-900' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {filteredComplaints.map(c => (
              <div key={c.id} className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all flex flex-col group">
                <div className="relative h-64 overflow-hidden">
                  <img src={c.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.2em] border border-slate-50 uppercase shadow-lg">{c.category.replace('_', ' ')}</div>
                  <div className={`absolute bottom-6 right-6 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-2xl ${
                    c.status === ComplaintStatus.RESOLVED ? 'bg-emerald-500 text-white' : 
                    c.status === ComplaintStatus.IN_PROGRESS ? 'bg-blue-600 text-white' : 
                    c.status === ComplaintStatus.REJECTED ? 'bg-red-600 text-white' :
                    'bg-slate-900 text-white'
                  }`}>{c.status}</div>
                </div>
                <div className="p-10 space-y-8 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4">
                     <p className="text-sm font-bold text-slate-700 leading-relaxed line-clamp-2">{c.description}</p>
                     <button 
                        onClick={() => viewReporterProfile(c.userId)}
                        className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all flex-shrink-0 flex items-center justify-center text-lg shadow-sm"
                        title="View Citizen Details"
                      >
                        <i className="fas fa-id-badge"></i>
                      </button>
                  </div>
                  
                  <div className="p-6 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-black">
                       <span className="text-slate-400 uppercase tracking-widest">Case Token</span>
                       <span className="text-slate-800">#{c.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    {c.assignedTeamId && (
                       <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Active Deployment</span>
                          <span className="text-[10px] font-black text-blue-700">{c.assignedTeamId}</span>
                       </div>
                    )}
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    {c.status === ComplaintStatus.PENDING && (
                      <button 
                        onClick={() => assignTask(c)} 
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-[0.98]"
                      >
                        Assign Task
                      </button>
                    )}
                    {c.status === ComplaintStatus.IN_PROGRESS && (
                       <button 
                        onClick={() => solveIssue(c)} 
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-[0.98]"
                       >
                         Issue Solved
                       </button>
                    )}
                    <button onClick={() => onDelete(c.id)} className="w-full py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all">Delete Entry</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'teams' && (
        <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-2xl animate-fadeIn space-y-12">
          <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-10 gap-6">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">On-Duty Municipal Teams</h2>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">Managing Specialized Response Units</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Standby</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Deployed</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {[ComplaintCategory.ROAD_DAMAGE, ComplaintCategory.WATER_LEAKAGE, ComplaintCategory.GARBAGE, ComplaintCategory.OTHER].map((dept) => {
              const deptTeams = teams.filter(t => t.department === dept);
              return (
                <div key={dept} className="space-y-6">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-4">{dept.replace('_', ' ')} Dept.</h4>
                  <div className="space-y-4">
                    {deptTeams.map(team => (
                      <div key={team.id} className={`p-6 rounded-[2.5rem] border transition-all flex items-center justify-between group ${team.isAvailable ? 'bg-slate-50 border-slate-100 hover:border-emerald-200' : 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100'}`}>
                        <div>
                          <p className="text-xs font-black mb-1">{team.name}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${team.isAvailable ? 'text-slate-400' : 'text-blue-200'}`}>{team.id}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 border-white/20 ${team.isAvailable ? 'bg-emerald-500' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-2xl animate-fadeIn space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Municipal Efficiency Matrix</h2>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Aggregated data from {currentUser.city} control center</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              {Object.values(ComplaintCategory).map((category, idx) => {
                const count = localComplaints.filter(c => c.category === category).length;
                const percentage = totalReports > 0 ? (count / totalReports) * 100 : 0;
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
                      <span className="text-slate-500">{category.replace('_', ' ')}</span>
                      <span className="text-slate-900">{count} Reports ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col items-center justify-center relative">
              <div className="relative w-80 h-80 group">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  {Object.values(ComplaintCategory).reduce((acc: {offset: number, paths: React.ReactNode[]}, category, i) => {
                    const count = localComplaints.filter(c => c.category === category).length;
                    const percent = totalReports > 0 ? (count / totalReports) * 100 : 0;
                    const color = `hsl(${210 + (i * 25)}, 80%, 50%)`;
                    acc.paths.push(
                      <path
                        key={category}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={color}
                        strokeWidth="5"
                        strokeDasharray={`${percent}, 100`}
                        strokeDashoffset={-acc.offset}
                        className="transition-all duration-1000"
                        strokeLinecap="round"
                      />
                    );
                    acc.offset += percent;
                    return acc;
                  }, { offset: 0, paths: [] }).paths}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-6xl font-black text-slate-900 tracking-tighter">{totalReports}</p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Active Data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-2xl animate-fadeIn space-y-16">
          <div className="flex flex-col items-center text-center">
            <div className="relative group mb-10">
              <div className="w-44 h-44 rounded-[3.5rem] bg-slate-900 flex items-center justify-center text-6xl text-slate-700 border-8 border-white shadow-2xl overflow-hidden">
                {currentUser.profileImage ? (
                  <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user-shield"></i>
                )}
              </div>
              <div className="absolute -bottom-4 flex gap-4">
                 <button 
                   onClick={() => profileImageInputRef.current?.click()}
                   className="w-14 h-14 bg-white text-slate-900 rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-transform border border-slate-100"
                   title="Select Photo"
                 >
                   <i className="fas fa-images"></i>
                 </button>
                 <button 
                   onClick={() => profileCameraInputRef.current?.click()}
                   className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-transform border-4 border-white"
                   title="Take Photo"
                 >
                   <i className="fas fa-camera"></i>
                 </button>
              </div>
              <input type="file" ref={profileImageInputRef} className="hidden" accept="image/*" onChange={handleProfileImageChange} />
              <input type="file" ref={profileCameraInputRef} className="hidden" accept="image/*" capture="user" onChange={handleProfileImageChange} />
            </div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">{currentUser.name} {currentUser.surname}</h2>
            <div className="mt-4 px-8 py-2.5 bg-slate-900 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-slate-200">GHMC Command Executive</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-6">Credentials</h3>
              <div className="space-y-4">
                <div className="p-8 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Employee ID</span>
                  <span className="text-sm font-black text-slate-800">{currentUser.employeeId}</span>
                </div>
                <div className="p-8 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official GHMC Email</span>
                  <span className="text-sm font-black text-slate-800 break-all ml-4">{currentUser.email}</span>
                </div>
                <div className="p-8 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty Contact</span>
                  <span className="text-sm font-black text-slate-800">{currentUser.mobile}</span>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-emerald-600 pl-6">Mission Deployment</h3>
              <div className="space-y-4">
                <div className="p-8 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Command State</span>
                  <span className="text-sm font-black text-slate-800">{currentUser.state}</span>
                </div>
                <div className="p-8 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service City</span>
                  <span className="text-sm font-black text-slate-800">{currentUser.city}</span>
                </div>
                <div className="p-8 bg-emerald-600 rounded-[2.5rem] flex justify-between items-center text-white shadow-2xl">
                  <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Tasks Resolved</span>
                  <span className="text-3xl font-black">{resolvedCount} Units</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
