
import React from 'react';
import { Complaint, ComplaintStatus } from '../types';

interface StatsCardsProps {
  complaints: Complaint[];
}

const StatsCards: React.FC<StatsCardsProps> = ({ complaints }) => {
  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === ComplaintStatus.PENDING).length,
    progress: complaints.filter(c => c.status === ComplaintStatus.IN_PROGRESS).length,
    resolved: complaints.filter(c => c.status === ComplaintStatus.RESOLVED).length,
  };

  const cards = [
    { label: 'Total Reports', value: stats.total, icon: 'fa-file-lines', color: 'blue' },
    { label: 'Pending', value: stats.pending, icon: 'fa-hourglass-half', color: 'yellow' },
    { label: 'In Progress', value: stats.progress, icon: 'fa-gears', color: 'indigo' },
    { label: 'Resolved', value: stats.resolved, icon: 'fa-circle-check', color: 'green' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-${card.color}-100 text-${card.color}-600`}>
            <i className={`fas ${card.icon}`}></i>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
