import React from 'react';
import { formatCurrency, pluralS } from '../utils/contractUtils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, DollarSign, CheckCircle, AlertTriangle, Clock, Users } from 'lucide-react';
import {
  mockContracts as RAW_CONTRACTS,
  mockPartners,
  type Contract as MockContract,
} from '../data/mockData';

// ── Derive all stats ──────────────────────────────────────────────────────────
const totalContracts = RAW_CONTRACTS.length;
const activeContracts = RAW_CONTRACTS.filter(c => c.status === 'ACTIVE').length;
const overdueContracts = RAW_CONTRACTS.filter(c => c.status === 'OVERDUE').length;
const closedContracts = RAW_CONTRACTS.filter(c => c.status === 'CLOSED' || c.status === 'Closed').length;
const expiringSoonAll = RAW_CONTRACTS.filter(c => c.status === 'EXPIRING_SOON').length;
const totalValue = RAW_CONTRACTS.reduce((sum, c) => sum + c.contractValue, 0);
const uniquePartners = mockPartners.length;

const expiringSoon30 = RAW_CONTRACTS.filter(c => c.remainingDays >= 0 && c.remainingDays <= 30).length;
const expiringSoon60 = RAW_CONTRACTS.filter(c => c.remainingDays > 30 && c.remainingDays <= 60).length;
const expiringSoon90 = RAW_CONTRACTS.filter(c => c.remainingDays > 60 && c.remainingDays <= 90).length;
const max30_60_90 = Math.max(expiringSoon30, expiringSoon60, expiringSoon90, 1);

const statusCounts = RAW_CONTRACTS.reduce(
  (acc, c) => {
    if (c.status === 'ACTIVE') acc.active += 1;
    else if (c.status === 'EXPIRING_SOON') acc.expiringSoon += 1;
    else if (c.status === 'EXPIRED') acc.expired += 1;
    else if (c.status === 'OVERDUE') acc.overdue += 1;
    else if (c.status === 'CLOSED' || c.status === 'Closed') acc.closed += 1;
    return acc;
  },
  { active: 0, expiringSoon: 0, expired: 0, overdue: 0, closed: 0 }
);

const deptCountMap: Record<string, number> = {};
for (const c of RAW_CONTRACTS) {
  const name = c.department.departmentName;
  deptCountMap[name] = (deptCountMap[name] ?? 0) + 1;
}
const departmentData = Object.entries(deptCountMap)
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count);
const maxDepartmentCount = Math.max(...departmentData.map(d => d.count), 1);

const DEPT_COLORS = ['#0fbab5', '#32527b', '#de6ea0'];

const statusData = [
  { name: 'Closed', value: statusCounts.closed, color: '#d4d4d8' },
  { name: 'Expiring', value: statusCounts.expiringSoon, color: '#ff8904' },
  { name: 'Active', value: statusCounts.active, color: '#0fbab5' },
  { name: 'Overdue', value: statusCounts.overdue, color: '#e7000b' },
].filter(d => d.value > 0);

const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const formatPercent = (part: number, total: number) =>
    total > 0 ? ((part / total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">

      {/* ── ATTENTION REQUIRED ── */}
      <section>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Attention Required</p>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* Expiring Soon — wide card with breakdown bars */}
          <div className="lg:col-span-1 relative overflow-hidden bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Expiring Soon</p>
                <p className="text-4xl font-bold text-gray-900">{expiringSoonAll}</p>
                <p className="text-xs text-orange-500 font-medium mt-1">Requires attention soon</p>
              </div>
              <span className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-orange-400" />
              </span>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-2.5 pt-1 border-t border-gray-50">
              {[
                { label: 'Within 30 days', count: expiringSoon30, color: 'bg-red-400' },
                { label: '31 – 60 days', count: expiringSoon60, color: 'bg-orange-400' },
                { label: '61 – 90 days', count: expiringSoon90, color: 'bg-yellow-400' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${max30_60_90 > 0 ? Math.round((count / max30_60_90) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-3 text-right">{count}</span>
                </div>
              ))}
            </div>

            <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-400 rounded-b-xl" />
          </div>

          {/* Overdue */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Overdue</p>
              <span className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </span>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">{overdueContracts}</p>
              <p className="text-xs font-medium mt-1 text-red-400">
                {overdueContracts === 0 ? 'All clear' : 'Immediate action required'}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-red-400 rounded-b-xl" />
          </div>

          {/* Active */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Active</p>
              <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-primary" />
              </span>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">{activeContracts}</p>
              <p className="text-xs font-medium mt-1 text-primary">Currently in progress</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-b-xl" />
          </div>

          {/* Closed */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">Closed</p>
              <span className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-gray-400" />
              </span>
            </div>
            <div>
              <p className="text-4xl font-bold text-gray-900">{closedContracts}</p>
              <p className="text-xs font-medium mt-1 text-gray-400">Completed contracts</p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-300 rounded-b-xl" />
          </div>
        </div>
      </section>

      {/* ── OVERVIEW ── */}
      <section>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Overview</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Total Contracts */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Total Contracts</p>
              <p className="text-3xl font-bold text-gray-900">{totalContracts}</p>
              <p className="text-xs text-gray-400 mt-1">All registered contracts</p>
            </div>
            <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-400" />
            </span>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-400 rounded-b-xl" />
          </div>

          {/* Total Partners */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">Total Partners</p>
              <p className="text-3xl font-bold text-gray-900">{uniquePartners}</p>
              <p className="text-xs text-gray-400 mt-1">Unique organizations</p>
            </div>
            <span className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-purple-400" />
            </span>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-400 rounded-b-xl" />
          </div>

          {/* Total Contract Value */}
          <div className="bg-[#1A2B4A] rounded-xl shadow-sm p-5 flex items-center justify-between hover:scale-[1.01] transition-transform duration-200 relative overflow-hidden">
            <div>
              <p className="text-xs font-semibold tracking-widest text-[#00B5C8] uppercase mb-2">Total Contract Value</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalValue)}</p>
              <p className="text-xs text-[#00B5C8] mt-1">Combined contract worth</p>
            </div>
            <span className="w-10 h-10 rounded-xl bg-[#00B5C8]/20 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-[#00B5C8]" />
            </span>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-[#00B5C8] rounded-b-xl" />
          </div>
        </div>
      </section>

      {/* ── ANALYTICS ── */}
      <section>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">Analytics</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Contracts by Department */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-800">Contracts by Department</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">by contract count</span>
            </div>
            {departmentData.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">No data available</p>
            ) : (
              <ul className="space-y-5">
                {departmentData.map((dept, index) => {
                  const barWidth = (dept.count / maxDepartmentCount) * 100;
                  const color = DEPT_COLORS[index % DEPT_COLORS.length];
                  return (
                    <li key={dept.name}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm text-gray-700 font-medium">{dept.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 w-4 text-right shrink-0">{dept.count}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* X-axis tick marks */}
            <div className="flex justify-between mt-3 mr-5 px-0">
              {Array.from({ length: maxDepartmentCount + 1 }, (_, i) => (
                <span key={i} className="text-xs text-gray-300">{i}</span>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:scale-[1.01] transition-transform duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-800">Status Distribution</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">{statusTotal} total</span>
            </div>

            <div className="flex items-center gap-6">
              {/* Donut chart */}
              <div className="relative shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={68}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map((item, index) => (
                        <Cell key={index} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${formatPercent(value, statusTotal)}%`, '']} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-gray-900">{statusTotal}</span>
                  <span className="text-xs text-gray-400">contracts</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-3">
                {statusData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600 truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">{formatPercent(item.value, statusTotal)}%</span>
                      <span className="text-sm font-semibold text-gray-700 w-4 text-right">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}