import { formatCurrency, pluralS } from '../utils/contractUtils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, DollarSign, CheckCircle, AlertTriangle, Clock, Building2 } from 'lucide-react';
import { useContractsByDepartment, useDashboardSummary, useStatusDistribution, useUpcomingExprirations } from '../hook/useDashboard';

export function Dashboard() {
  const { statusDistrabution } = useStatusDistribution();
  const { upcomingExpirations } = useUpcomingExprirations();
  const { DepartmentCounts } = useContractsByDepartment();
  const { summaryDashboard } = useDashboardSummary();
  const totalContracts = summaryDashboard?.totalContracts ?? 0;
  const totalValue = summaryDashboard?.totalContractValue ?? 0;
  const activeContracts = summaryDashboard?.activeContracts ?? 0;
  const expiringSoon = summaryDashboard?.expiringSoon90Days ?? 0;
  const overdueContracts = summaryDashboard?.overdueContracts ?? 0;
  const uniquePartners = summaryDashboard?.totalPartners ?? 0;
  const formatPercent = (part: number, total: number) =>
    total > 0 ? ((part / total) * 100).toFixed(1) : '0';

  const activePercentage = formatPercent(activeContracts, totalContracts);

  const departmentData = (DepartmentCounts?.map(d => ({
    name: d.department,
    count: Number(d.contractCount) || 0,
  })) ?? [])
    .sort((a, b) => b.count - a.count)

  const maxDepartmentCount = Math.max(...departmentData.map((d) => d.count), 1)

  // Convert API object to array 
  const statusData = statusDistrabution ? [
    { name: 'Active', value: statusDistrabution.active },
    { name: 'Expiring Soon', value: statusDistrabution.expiringSoon },
    { name: 'Expired', value: statusDistrabution.expired },
    { name: 'Closed', value: statusDistrabution.closed },
    { name: 'Overdue', value: statusDistrabution.overdue },
  ].filter(d => d.value > 0) : [];

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);

  const COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444', '#6b7280'];

  const BRAND_COLORS = ['#0fbab5', '#052744', '#de6ea0'] as const;

  function getDepartmentBarColor (departmentName: string): string {
    let hash = 0
    for (let i = 0; i < departmentName.length; i++) {
      hash = departmentName.charCodeAt(i) + ((hash << 5) - hash)
    }
    return BRAND_COLORS[Math.abs(hash) % BRAND_COLORS.length]
  }

  // Format date 
  function formatApiMonth(apiMonth: string): string {
    const [year, month] = apiMonth.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  }
  const currentYear = new Date().getFullYear();
  const monthsOfCurrentYear = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentYear, i, 1);

    return {
      month: date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      }),
      count: 0,
    };
  });

  const expiringByMonth = monthsOfCurrentYear.map(skeleton => {
    const found = upcomingExpirations?.find(
      u => formatApiMonth(u.month) === skeleton.month
    );
    return found ? { month: skeleton.month, count: found.count } : skeleton;
  });

  const maxExpirationCount = Math.max(...expiringByMonth.map((d) => d.count), 0);
  const expirationYAxisMax = Math.max(maxExpirationCount, 3);
  const expirationYTicks = Array.from(
    { length: expirationYAxisMax + 1 },
    (_, i) => i
  );

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Expiring Soon (90 days)</p>
              <p className="mt-2">{expiringSoon}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Overdue Contract{pluralS(overdueContracts)}</p>
              <p className="mt-2">{overdueContracts}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Active Contract{pluralS(activeContracts)}</p>
              <p className="mt-2">{activeContracts} ({activePercentage}%)</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Contract{pluralS(totalContracts)}</p>
              <p className="mt-2">{totalContracts}</p>
            </div>
            <FileText className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Contract Value</p>
              <p className="mt-2">{formatCurrency(totalValue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>


        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500">Total Partner{pluralS(uniquePartners)}</p>
              <p className="mt-2">{uniquePartners}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contracts by Department */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="font-medium text-gray-900">Contracts by Department</h3>
            <span className="text-sm text-gray-500 shrink-0">By contract count</span>
          </div>
          {departmentData.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No department data available</p>
          ) : (
            <ul className="space-y-6 min-h-65">
              {departmentData.map((dept) => {
                const barWidth = (dept.count / maxDepartmentCount) * 100
                const barColor = getDepartmentBarColor(dept.name)
                return (
                  <li key={dept.name}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: barColor }}
                          aria-hidden
                        />
                        <span className="font-medium text-gray-900 truncate" title={dept.name}>
                          {dept.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 tabular-nums shrink-0">
                        {dept.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                        role="progressbar"
                        aria-valuenow={dept.count}
                        aria-valuemin={0}
                        aria-valuemax={maxDepartmentCount}
                        aria-label={`${dept.name}: ${dept.count} contracts`}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatPercent(value, statusTotal)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming Expirations by Month */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="mb-4">Upcoming Expirations by Month</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={expiringByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} domain={[0, expirationYAxisMax]} ticks={expirationYTicks} />
            <Tooltip formatter={(value: number) => [Math.round(value), 'Contracts']} />
            <Bar dataKey="count" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}