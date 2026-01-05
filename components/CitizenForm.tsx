
import React, { useState, useRef, useMemo } from 'react';
import { Complaint, ComplaintCategory, ComplaintStatus, User, CATEGORY_POINTS } from '../types';
import { verifyComplaintImage, editComplaintImage, generateAnimateVideo, getFullAddressFromCoords, analyzeProblemFromImage } from '../services/geminiService';

interface CitizenFormProps {
  onSubmission: (complaint: Complaint) => void;
  currentUser: User;
  myComplaints: Complaint[];
  onUpdateUser: (user: User) => void;
}

const CitizenForm: React.FC<CitizenFormProps> = ({ onSubmission, currentUser, myComplaints, onUpdateUser }) => {
  const [activeTab, setActiveTab] = useState<'report' | 'profile' | 'problems' | 'points'>('report');
  const [category, setCategory] = useState<ComplaintCategory>(ComplaintCategory.GARBAGE);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number, fullAddress?: string} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setImage(base64);
        handleAutoAIAnalysis(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoAIAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeProblemFromImage(base64);
      if (result.category) {
        setCategory(result.category as ComplaintCategory);
      }
      if (result.description) {
        setDescription(result.description);
      }
    } catch (err) {
      console.error("AI Auto-detection failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

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

  const detectLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const fullAddr = await getFullAddressFromCoords(lat, lng);
          setLocation({ lat, lng, fullAddress: fullAddr });
        } catch (e) {
          setLocation({ lat, lng });
        }
        setIsLocating(false);
      },
      () => {
        setLocationError("Permission denied.");
        setIsLocating(false);
      }
    );
  };

  const handleAnimate = async () => {
    if (!image) return;
    if (!(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
    }
    setIsAnimating(true);
    try {
      const videoUrl = await generateAnimateVideo(image);
      return videoUrl;
    } catch (err) {
      alert("AI Video generation failed.");
    } finally {
      setIsAnimating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !location) return;

    setIsVerifying(true);
    try {
      const verification = await verifyComplaintImage(image, category);
      
      const newComplaint: Complaint = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        category,
        description,
        image,
        location: { ...location, address: `${currentUser.city}, ${currentUser.state}` },
        state: currentUser.state,
        city: currentUser.city,
        status: verification.isLegitimate ? ComplaintStatus.PENDING : ComplaintStatus.REJECTED,
        timestamp: Date.now(),
        verificationResult: verification,
        pointsAwarded: CATEGORY_POINTS[category]
      };

      onSubmission(newComplaint);
      
      setImage(null);
      setDescription('');
      setCategory(ComplaintCategory.GARBAGE);
      setLocation(null);
      setActiveTab('problems');
      
    } catch (error) {
      alert("Submission encountered an error.");
    } finally {
      setIsVerifying(false);
    }
  };

  const resolvedPoints = currentUser.points || 0;

  return (
    <div className="space-y-6">
      <div className="flex bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
        {['report', 'profile', 'problems', 'points'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-800 hover:bg-slate-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'report' && (
        <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-fadeIn">
          <div className="p-10">
            <div className="mb-10 p-8 bg-blue-50/50 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between border border-blue-100 gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
                  <i className="fas fa-map-location-dot text-xl"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Deployment Zone</p>
                  <p className="text-xl font-black text-blue-900">{currentUser.city}</p>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Potential Impact Reward</p>
                <p className="text-2xl font-black text-emerald-700">+{CATEGORY_POINTS[category]} PTS</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="space-y-12">
                {/* Visual Evidence Section Moved to Top */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Visual Evidence (GPS Photo)</label>
                    <div className={`relative h-80 border-4 border-dashed rounded-[3.5rem] transition-all flex items-center justify-center bg-slate-50/50 ${image ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-blue-400 hover:bg-white shadow-inner'}`}>
                      {image ? (
                        <div className="h-full w-full relative group">
                          <img src={image} className="h-full w-full object-cover rounded-[3rem]" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 rounded-[3rem] backdrop-blur-sm">
                             <div className="flex gap-3">
                               <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 active:scale-95 transition-all">Gallery</button>
                               <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 active:scale-95 transition-all">Camera</button>
                             </div>
                             <button type="button" onClick={handleAnimate} disabled={isAnimating} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all">AI Scan Evidence</button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center text-blue-600 text-3xl mb-6 mx-auto border border-slate-200">
                            <i className="fas fa-camera"></i>
                          </div>
                          <div className="flex gap-4 justify-center">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm">From Gallery</button>
                            <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-sm">Open Camera</button>
                          </div>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                      <input type="file" ref={cameraInputRef} onChange={handleImageChange} accept="image/*" capture="environment" className="hidden" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Deployment Coordinates</label>
                    <button type="button" onClick={detectLocation} disabled={isLocating} className={`w-full py-5 rounded-[2.5rem] border-2 font-black uppercase tracking-[0.2em] text-[10px] transition-all shadow-sm active:scale-[0.98] ${location ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-emerald-100' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                      {isLocating ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-crosshairs-gps mr-3"></i>}
                      {location ? "GPS Lock Established" : locationError || "Establish Map Coordinates"}
                    </button>
                    {location && (
                      <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 space-y-6 animate-slideDown shadow-2xl relative overflow-hidden h-[18rem]">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                        <div className="flex items-center gap-4 relative z-10">
                           <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                             <i className="fas fa-satellite"></i>
                           </div>
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Spatial Data Hub</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6 relative z-10">
                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">NORTH LATITUDE</span>
                            <span className="text-sm font-mono font-bold text-white">{location.lat.toFixed(8)}</span>
                          </div>
                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">EAST LONGITUDE</span>
                            <span className="text-sm font-mono font-bold text-white">{location.lng.toFixed(8)}</span>
                          </div>
                        </div>
                        {location.fullAddress && (
                          <div className="pt-6 border-t border-white/10 relative z-10">
                            <p className="text-xs text-blue-200 font-bold leading-relaxed">{location.fullAddress}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Problem Selection and Summary Sections Below */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Identify Problem Type</label>
                      {isAnalyzing && <span className="text-[9px] font-black text-blue-700 animate-pulse uppercase"><i className="fas fa-sparkles mr-2"></i> AI Detecting...</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.values(ComplaintCategory).map((cat) => (
                        <button 
                          key={cat} 
                          type="button" 
                          onClick={() => setCategory(cat)} 
                          className={`p-5 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${category === cat ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-400'}`}
                        >
                          {cat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                       <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Incident Summary</label>
                       {isAnalyzing && <span className="text-[9px] font-black text-blue-700 animate-pulse uppercase"><i className="fas fa-pen-nib mr-2"></i> AI Drafting...</span>}
                     </div>
                     <textarea className="w-full h-52 p-8 rounded-[3rem] border-2 border-slate-200 bg-slate-50/30 outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-500 font-bold text-slate-900 transition-all resize-none shadow-inner" placeholder="Provide context of the infrastructure issue..." value={description} onChange={(e) => setDescription(e.target.value)} required />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isVerifying || !image || !location} 
                className="w-full py-7 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-[2.5rem] shadow-2xl shadow-blue-200 transition-all disabled:opacity-50 active:scale-[0.98] uppercase tracking-[0.1em]"
              >
                {isVerifying ? <i className="fas fa-circle-notch fa-spin"></i> : "Submit Municipal Report"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-[3.5rem] p-16 border border-slate-100 shadow-2xl animate-fadeIn">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="relative group mb-8">
              <div className="w-44 h-44 rounded-[4rem] bg-blue-50 flex items-center justify-center text-7xl text-blue-200 border-8 border-white shadow-2xl overflow-hidden relative">
                {currentUser.profileImage ? (
                  <img src={currentUser.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <i className="fas fa-user-circle"></i>
                )}
              </div>
              <div className="absolute -bottom-4 flex gap-4">
                 <button 
                   onClick={() => profileImageInputRef.current?.click()}
                   className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white"
                   title="Select Image"
                 >
                   <i className="fas fa-images"></i>
                 </button>
                 <button 
                   onClick={() => profileCameraInputRef.current?.click()}
                   className="w-14 h-14 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-4 border-white"
                   title="Open Camera"
                 >
                   <i className="fas fa-camera"></i>
                 </button>
              </div>
              <input type="file" ref={profileImageInputRef} className="hidden" accept="image/*" onChange={handleProfileImageChange} />
              <input type="file" ref={profileCameraInputRef} className="hidden" accept="image/*" capture="user" onChange={handleProfileImageChange} />
            </div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tight">{currentUser.name} {currentUser.surname}</h2>
            <div className="mt-4 px-8 py-2.5 bg-slate-200 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-slate-800 border border-slate-300">Public Servant ID: {currentUser.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            <div className="space-y-8">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] border-l-4 border-blue-600 pl-6">Profile Metadata</h3>
              <div className="space-y-4">
                <div className="p-7 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-200 group hover:bg-white transition-all">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Mobile Contact</span>
                  <span className="text-sm font-black text-slate-900">{currentUser.mobile}</span>
                </div>
                <div className="p-7 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-200 group hover:bg-white transition-all">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Gmail Access</span>
                  <span className="text-sm font-black text-slate-900 break-all ml-10">{currentUser.email}</span>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.3em] border-l-4 border-emerald-600 pl-6">Jurisdiction</h3>
              <div className="space-y-4">
                <div className="p-7 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-200 group hover:bg-white transition-all">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Active State</span>
                  <span className="text-sm font-black text-slate-900">{currentUser.state}</span>
                </div>
                <div className="p-7 bg-slate-50/50 rounded-[2.5rem] flex justify-between items-center border border-slate-200 group hover:bg-white transition-all">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Municipal Hub</span>
                  <span className="text-sm font-black text-slate-900">{currentUser.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'problems' && (
        <div className="space-y-10 animate-fadeIn">
          <div className="flex items-center justify-between px-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">My Active Cases</h2>
            <div className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">{myComplaints.length} Total Logs</div>
          </div>
          {myComplaints.length === 0 ? (
            <div className="bg-white p-32 text-center rounded-[4rem] border-4 border-dashed border-slate-200 flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-100 rounded-[3rem] flex items-center justify-center text-slate-400 text-4xl mb-8">
                 <i className="fas fa-layer-group"></i>
              </div>
              <p className="text-slate-800 font-black uppercase tracking-[0.3em] text-sm">No municipal reports filed yet.</p>
              <button onClick={() => setActiveTab('report')} className="mt-10 px-10 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">Begin First Report</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
              {myComplaints.map(c => (
                <div key={c.id} className="bg-white rounded-[3.5rem] border border-slate-200 p-8 flex flex-col sm:flex-row gap-8 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] transition-all group relative overflow-hidden">
                  <div className="w-full sm:w-44 h-44 rounded-[3rem] overflow-hidden shadow-inner flex-shrink-0 relative">
                    <img src={c.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute top-4 left-4 px-4 py-1.5 bg-white/95 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border border-slate-200">{c.category.replace('_', ' ')}</div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center py-2">
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-5 py-1.5 rounded-full shadow-sm border ${
                        c.status === ComplaintStatus.RESOLVED ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        c.status === ComplaintStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-800 border-blue-300' :
                        c.status === ComplaintStatus.REJECTED ? 'bg-red-50 text-red-800 border-red-300' :
                        'bg-amber-50 text-amber-800 border-amber-300'
                      }`}>{c.status}</span>
                      <span className="text-[10px] font-black text-slate-600">TOKEN: #{c.id.slice(0, 5).toUpperCase()}</span>
                    </div>
                    <p className="text-base font-bold text-slate-900 line-clamp-2 leading-relaxed mb-6">{c.description}</p>
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                       <div className="flex items-center gap-2">
                         <i className="fas fa-clock text-blue-600"></i>
                         <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                       </div>
                       {c.assignedTeamId && (
                         <div className="flex items-center gap-2">
                           <i className="fas fa-truck-fast text-blue-600"></i>
                           <span>Unit Active</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'points' && (
        <div className="bg-white rounded-[5rem] p-24 border border-slate-200 shadow-2xl animate-fadeIn text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-50 rounded-full translate-x-1/2 -translate-y-1/2 opacity-30"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-48 h-48 bg-white shadow-2xl rounded-[4rem] mb-12 border border-slate-100 relative group cursor-pointer active:scale-95 transition-all">
              <i className="fas fa-trophy text-7xl text-amber-400 group-hover:rotate-12 transition-transform"></i>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center font-black border-8 border-white shadow-2xl">
                 <i className="fas fa-star text-lg"></i>
              </div>
            </div>
            <h2 className="text-8xl font-black text-slate-900 mb-4 tracking-tighter">{resolvedPoints} <span className="text-3xl text-slate-400 tracking-widest ml-2">CREDITS</span></h2>
            <p className="text-slate-800 font-black uppercase tracking-[0.5em] text-[12px] mb-16">Verified Municipal Impact Balance</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 text-left max-w-4xl mx-auto">
              <div className="p-12 bg-slate-900 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase mb-8 tracking-[0.3em] flex items-center gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <i className="fas fa-chart-line text-xs"></i>
                  </div>
                  Reward Matrix
                </h4>
                <div className="space-y-6">
                  {Object.entries(CATEGORY_POINTS).map(([cat, pts]) => (
                    <div key={cat} className="flex justify-between items-center text-[12px] font-black uppercase tracking-widest group cursor-default">
                      <span className="text-slate-300 group-hover:text-white transition-colors">{cat.replace('_', ' ')}</span>
                      <span className="text-emerald-400 bg-emerald-500/10 px-4 py-1 rounded-full border border-emerald-500/20">+{pts}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-12 bg-blue-600 rounded-[3.5rem] text-white flex flex-col justify-center text-center shadow-2xl shadow-blue-200 group hover:-translate-y-2 transition-all">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] mb-6 text-blue-100">Civic Tier Rank</p>
                <p className="text-5xl font-black mb-4 tracking-tight">Municipal Guardian</p>
                <div className="w-full bg-white/10 h-3 rounded-full overflow-hidden mt-8 border border-white/10 p-0.5">
                   <div className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${Math.min(100, (resolvedPoints % 100))}%` }}></div>
                </div>
                <p className="text-[11px] font-black mt-8 uppercase text-blue-50 tracking-[0.2em]">{100 - (resolvedPoints % 100)} PTS until next echelon</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenForm;
