import React from 'react';
import { User, Award, CheckCircle, TrendingUp, ShieldCheck, MapPin } from 'lucide-react';
import { UserProfile, GarbageReport } from '../types';
import { cn } from '../lib/utils';

interface ProfileProps {
  user: UserProfile;
  reports: GarbageReport[];
}

export function Profile({ user, reports }: ProfileProps) {
  const achievements = [
    { title: 'First Report', icon: Award, color: 'text-yellow-600', bg: 'bg-yellow-50', completed: true },
    { title: 'Cleanliness Hero', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-50', completed: user.reportsCount > 10 },
    { title: '10 Reports Verified', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', completed: user.reportsCount >= 10 },
    { title: 'Top 1% Contributor', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', completed: false },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
          <User className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{user.displayName}</h2>
        <p className="text-sm font-medium text-blue-600 mt-1 uppercase tracking-wider">{user.rank}</p>
        
        <div className="grid grid-cols-2 gap-4 w-full mt-8">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Points</p>
            <p className="text-2xl font-bold text-gray-900">{user.points}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reports</p>
            <p className="text-2xl font-bold text-gray-900">{user.reportsCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />
          Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const Icon = achievement.icon;
            return (
              <div 
                key={achievement.title} 
                className={cn(
                  "p-4 rounded-2xl border flex items-center gap-4 transition-all",
                  achievement.completed ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-transparent opacity-50 grayscale"
                )}
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", achievement.bg)}>
                  <Icon className={cn("w-6 h-6", achievement.color)} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{achievement.title}</p>
                  <p className="text-xs text-gray-500">{achievement.completed ? 'Unlocked' : 'Locked'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          My Recent Reports
        </h3>
        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.slice(0, 5).map((report) => (
              <div key={report.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <img src={report.imageUrl} alt="Report" className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate text-sm">
                    {report.location.address || 'Unknown Location'}
                  </p>
                  {(report.location.city || report.location.district || report.location.state || report.location.country) && (
                    <div className="flex flex-wrap gap-x-1.5 text-[8px] font-bold uppercase text-gray-400 mt-0.5">
                      {report.location.city && <span>{report.location.city}</span>}
                      {report.location.district && <span>• {report.location.district}</span>}
                      {report.location.state && <span>• {report.location.state}</span>}
                      {report.location.country && <span>• {report.location.country}</span>}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(report.timestamp).toLocaleString()} • {report.analysis.severity.toUpperCase()}
                  </p>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                  report.status === 'cleaned' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                )}>
                  {report.status}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 text-sm py-4">No reports yet. Start by reporting garbage in your area!</p>
          )}
        </div>
      </div>

      <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
        <h3 className="text-lg font-bold mb-2">Impact Summary</h3>
        <p className="text-sm opacity-90 leading-relaxed">
          Your contributions have helped clean over {(user.reportsCount * 0.1).toFixed(1)} tons of urban waste and prevented major dumping incidents. Keep it up!
        </p>
        <button className="mt-4 bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors">
          Share Progress
        </button>
      </div>
    </div>
  );
}
