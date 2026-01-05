
import React, { useState, useRef } from 'react';
import { Complaint, ComplaintCategory, ComplaintStatus, User, CATEGORY_POINTS } from '../types';
import { verifyComplaintImage, generateAnimateVideo, getFullAddressFromCoords, analyzeProblemFromImage } from '../services/geminiService';

interface CitizenFormProps {
  currentUser: User;
  myComplaints: Complaint[];
  onUpdateUser: (user: User) => void;
  onAddComplaint: (complaint: Complaint) => void;
}

const CitizenForm: React.FC<CitizenFormProps> = ({ currentUser, myComplaints, onUpdateUser, onAddComplaint }) => {
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
      if (result.category) setCategory(result.category as ComplaintCategory);
      if (result.description) setDescription(result.description);
    } catch (err) {
      console.error("AI Auto-detection failed", err);
    } finally {
      setIsAnalyzing(false);
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
    setIsAnimating(true);
    try {
      const videoUrl = await generateAnimateVideo(image);
      alert(`AI Evidence Enhancement Video Created!`);
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

      onAddComplaint(newComplaint);
      
      setImage(null);
      setDescription('');
      setCategory(ComplaintCategory.GARBAGE);
      setLocation(null);
      setActiveTab('problems');
      
    } catch (error: any) {
      alert(`Submission error: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const resolvedPoints = currentUser.points || 0;

  return (
    <div className="space-y-6 modern-form-font">
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
                  <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Active Zone</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Visual Evidence (GPS Photo)</label>
                    <div className={`relative h-80 border-4 border-dashed rounded-[3.5rem] transition-all flex items-center justify-center bg-slate-50/50 ${image ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 hover:border-blue-400 hover:bg-white shadow-inner'}`}>
                      {image ? (
                        <div className="h-full w-full relative group">
                          <img src={image} className="h-full w-full object-cover rounded-[3rem]" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 rounded-[3rem] backdrop-blur-sm">
                             <div className="flex gap-3">
                               <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">Gallery</button>
                               <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-6 py-3 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">Camera</button>
                             </div>
                             <button type="button" onClick={handleAnimate} disabled={isAnimating} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all">
                                {isAnimating ? <i className="fas fa-spinner fa-spin"></i> : "AI Analyze"}
                             </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-8">
                          <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center text-blue-600 text-3xl mb-6 mx-auto border border-slate-200">
                            <i className="fas fa-camera"></i>
                          </div>
                          <div className="flex gap-4 justify-center">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">From Gallery</button>
                            <button type="button" onClick={() => cameraInputRef.current?.click()} className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Open Camera</button>
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
                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">LATITUDE</span>
                            <span className="text-sm font-mono font-bold text-white">{location.lat.toFixed(6)}</span>
                          </div>
                          <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                            <span className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">LONGITUDE</span>
                            <span className="text-sm font-mono font-bold text-white">{location.lng.toFixed(6)}</span>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Problem Category</label>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.values(ComplaintCategory).map((cat) => (
                        <button 
                          key={cat} 
                          type="button" 
                          onClick={() => setCategory(cat)} 
                          className={`p-5 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all ${category === cat ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-800 hover:bg-slate-50'}`}
                        >
                          {cat.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                     <label className="block text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Incident Summary</label>
                     <textarea className="w-full h-52 p-8 rounded-[3rem] border-2 border-slate-200 bg-slate-50/30 outline-none focus:border-blue-500 font-bold text-slate-900 transition-all resize-none shadow-inner" placeholder="Provide context..." value={description} onChange={(e) => setDescription(e.target.value)} required />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isVerifying || !image || !location} className="w-full py-7 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-[2.5rem] shadow-2xl transition-all disabled:opacity-50 uppercase tracking-[0.1em]">
                {isVerifying ? <i className="fas fa-circle-notch fa-spin"></i> : "Submit To Command"}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="bg-white rounded-[3.5rem] p-16 border border-slate-100 shadow-2xl animate-fadeIn">
          <h2 className="text-5xl font-black text-slate-900 tracking-tight text-center mb-8 heading-font">{currentUser.name} {currentUser.surname}</h2>
          <div className="max-w-md mx-auto p-8 bg-slate-50 rounded-[3rem] space-y-4">
            <div className="flex justify-between border-b pb-4"><span className="font-black uppercase text-[10px] text-slate-400">Email</span><span className="font-bold">{currentUser.email}</span></div>
            <div className="flex justify-between border-b pb-4"><span className="font-black uppercase text-[10px] text-slate-400">Mobile</span><span className="font-bold">{currentUser.mobile}</span></div>
            <div className="flex justify-between border-b pb-4"><span className="font-black uppercase text-[10px] text-slate-400">Role</span><span className="font-bold uppercase text-blue-600">{currentUser.role}</span></div>
            <div className="flex justify-between pt-4"><span className="font-black uppercase text-[10px] text-slate-400">City</span><span className="font-bold">{currentUser.city}</span></div>
          </div>
        </div>
      )}

      {activeTab === 'problems' && (
        <div className="space-y-10 animate-fadeIn">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter px-8 heading-font">My Reported Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
            {myComplaints.map(c => (
              <div key={c.id} className="bg-white rounded-[3.5rem] border border-slate-200 p-8 flex flex-col sm:flex-row gap-8 shadow-sm">
                <div className="w-full sm:w-44 h-44 rounded-[3rem] overflow-hidden flex-shrink-0">
                  <img src={c.image} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-slate-100 mb-4 inline-block">{c.status}</span>
                  <p className="font-bold text-slate-900 line-clamp-2 leading-relaxed mb-4">{c.description}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(c.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'points' && (
        <div className="bg-white rounded-[5rem] p-24 border border-slate-200 shadow-2xl text-center">
          <i className="fas fa-trophy text-7xl text-amber-400 mb-8"></i>
          <h2 className="text-8xl font-black text-slate-900 mb-4 tracking-tighter heading-font">{resolvedPoints} PTS</h2>
          <p className="text-slate-800 font-black uppercase tracking-[0.5em] text-[12px]">Total Verified Impact Score</p>
        </div>
      )}
    </div>
  );
};

export default CitizenForm;
