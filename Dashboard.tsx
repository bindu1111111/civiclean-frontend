import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { GarbageReport, RiskZone } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle2, Map as MapIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardProps {
  reports: GarbageReport[];
  riskZones: RiskZone[];
}

export function Dashboard({ reports, riskZones }: DashboardProps) {
  const stats = [
    { label: 'Total Reports', value: reports.length, icon: MapIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'High Risk Zones', value: riskZones.filter(z => z.riskLevel > 70).length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Verified Cleaned', value: reports.filter(r => r.status === 'cleaned').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Alerts', value: reports.filter(r => r.status === 'pending').length, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  const severityData = [
    { name: 'Low', value: reports.filter(r => r.analysis.severity === 'low').length },
    { name: 'Medium', value: reports.filter(r => r.analysis.severity === 'medium').length },
    { name: 'High', value: reports.filter(r => r.analysis.severity === 'high').length },
  ];

  const COLORS = ['#FBBF24', '#F97316', '#EF4444'];

  const timeData = [
    { time: '08:00', count: 4 },
    { time: '10:00', count: 7 },
    { time: '12:00', count: 12 },
    { time: '14:00', count: 8 },
    { time: '16:00', count: 15 },
    { time: '18:00', count: 9 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <div className={stat.bg + " w-10 h-10 rounded-xl flex items-center justify-center mb-3"}>
                <Icon className={stat.color + " w-6 h-6"} />
              </div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Severity Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {severityData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-xs font-medium text-gray-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Dumping Trends (24h)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Reports</h3>
        <div className="space-y-4">
          {reports.slice(0, 5).map((report) => (
            <div key={report.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <img src={report.imageUrl} alt="Report" className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">
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
                <p className="text-xs text-gray-500 mt-1">
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
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-6">High Risk Zones (Predictive)</h3>
        <div className="space-y-4">
          {riskZones.map((zone) => (
            <div key={zone.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center font-bold", zone.riskLevel > 70 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600')}>
                  {zone.riskLevel}%
                </div>
                <div>
                  <p className="font-bold text-gray-900">Zone {zone.id.slice(0, 4)}</p>
                  <p className="text-sm text-gray-500 italic">"{zone.prediction}"</p>
                </div>
              </div>
              <button className="text-blue-600 font-bold text-sm hover:underline">View on Map</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
