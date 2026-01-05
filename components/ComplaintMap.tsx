
import React, { useState } from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface ComplaintMapProps {
  complaints: Complaint[];
}

const ComplaintMap: React.FC<ComplaintMapProps> = ({ complaints }) => {
  const [selected, setSelected] = useState<Complaint | null>(null);

  // Note: For a real app, we'd use Leaflet or Google Maps.
  // This is a high-fidelity visual simulation of a map.
  
  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden select-none">
      {/* Simulation Background: Abstract City Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray" strokeWidth="2" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Main roads */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="gray" strokeWidth="15" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="gray" strokeWidth="15" />
        </svg>
      </div>

      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur p-2 rounded-lg border border-slate-200 text-[10px] font-bold shadow-sm">
        SIMULATED MAP VIEW (LAT/LNG GRID)
      </div>

      {/* Markers */}
      {complaints.map((complaint) => {
        // Simple mapping from lat/lng to container %
        // Using arbitrary bounds for demo: lat 12-13, lng 77-78 (roughly Bangalore region)
        const x = ((complaint.location.lng % 1) * 100);
        const y = (100 - (complaint.location.lat % 1) * 100);

        return (
          <div
            key={complaint.id}
            onClick={() => setSelected(complaint)}
            className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-125 z-20"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div className={`relative flex items-center justify-center`}>
              <i className={`fas fa-location-pin text-2xl ${
                complaint.status === ComplaintStatus.RESOLVED ? 'text-green-500' :
                complaint.status === ComplaintStatus.IN_PROGRESS ? 'text-blue-500' :
                complaint.status === ComplaintStatus.REJECTED ? 'text-red-500' :
                'text-yellow-500'
              }`}></i>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[80%] text-[8px] text-white font-bold">
                <i className={`fas ${
                  complaint.category === 'GARBAGE' ? 'fa-trash' : 'fa-info'
                }`}></i>
              </div>
            </div>
          </div>
        );
      })}

      {/* Popup / Detail Tooltip */}
      {selected && (
        <div className="absolute bottom-4 right-4 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-30 animate-slideUp overflow-hidden">
          <div className="relative h-32">
            <img src={selected.image} className="w-full h-full object-cover" />
            <button 
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full flex items-center justify-center"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>
          <div className="p-4">
            <h5 className="font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-circle text-[6px] text-blue-500"></i>
              {selected.category.replace('_', ' ')}
            </h5>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{selected.description}</p>
            
            {selected.verificationResult && (
              <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">AI Insights</p>
                <p className="text-[10px] text-slate-600 italic">"{selected.verificationResult.reason}"</p>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-400">
                <i className="fas fa-clock mr-1"></i>
                {new Date(selected.timestamp).toLocaleTimeString()}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                selected.status === ComplaintStatus.RESOLVED ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {selected.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {complaints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-medium">
          No markers to display on map
        </div>
      )}
    </div>
  );
};

export default ComplaintMap;
