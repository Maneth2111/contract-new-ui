import { useEffect, useState } from "react";
import { PaginationBar } from "./PaginationBar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContractNotification {
  id: number;
  code: string;
  title: string;
  pic: string;
  dept: string;
  partner: string;
  expiry: string;
  status: "OVERDUE" | "EXPIRING_SOON";
  alertedAt: string;
}

type FilterKey = "all" | "overdue" | "30" | "60" | "90";
type SortKey = "days_asc" | "days_desc" | "date_asc" | "date_desc";

interface NotificationCenterProps {
  onSelectContract?: (contractId: number) => void;
  isLoggedIn?: boolean;
  onUnreadChange?: (count: number) => void;
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const NOW = new Date("2026-05-26T10:30:00");

const MOCK_CONTRACTS: ContractNotification[] = [
  { id: 50, code: "CCF-2026-046", title: "Legal Contract", pic: "John", dept: "Legal & Compliance", partner: "Global Software", expiry: "2026-08-19", status: "EXPIRING_SOON", alertedAt: "2026-05-26T08:00:00" },
  { id: 49, code: "CCF-2026-045", title: "Contract Testing", pic: "John", dept: "Legal & Compliance", partner: "Training Experts", expiry: "2026-07-21", status: "EXPIRING_SOON", alertedAt: "2026-05-25T09:15:00" },
  { id: 48, code: "CCF-2026-044", title: "Lease Agreement", pic: "John", dept: "Admin & Marketing", partner: "Global Software", expiry: "2026-08-19", status: "EXPIRING_SOON", alertedAt: "2026-05-24T14:00:00" },
  { id: 46, code: "CCF-2026-042", title: "Testing Agreement", pic: "Test User", dept: "Legal & Compliance", partner: "YTest Corp", expiry: "2026-06-18", status: "EXPIRING_SOON", alertedAt: "2026-05-26T09:30:00" },
  { id: 43, code: "CCF-2026-039", title: "Testing", pic: "John Smith", dept: "IT Department", partner: "ABC Company", expiry: "2026-07-18", status: "EXPIRING_SOON", alertedAt: "2026-05-23T07:45:00" },
];

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysDiff(expiry: string): number {
  const a = new Date(new Date(NOW).toDateString());
  const b = new Date(new Date(expiry).toDateString());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function timeAgo(alertedAt: string): string {
  const diff = NOW.getTime() - new Date(alertedAt).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(alertedAt);
}

// ─── Warning config ───────────────────────────────────────────────────────────

interface Warning {
  label: string;
  accentBg: string;
  badgeBg: string;
  badgeText: string;
  daysColor: string;
  progressBg: string;
}

function getWarning(days: number): Warning {
  if (days < 0) return { label: "Overdue", accentBg: "bg-red-600", badgeBg: "bg-red-100", badgeText: "text-red-600", daysColor: "text-red-600", progressBg: "bg-red-600" };
  if (days <= 30) return { label: "30-Day Warning", accentBg: "bg-red-500", badgeBg: "bg-red-100", badgeText: "text-red-500", daysColor: "text-red-500", progressBg: "bg-red-500" };
  if (days <= 60) return { label: "60-Day Warning", accentBg: "bg-orange-400", badgeBg: "bg-orange-100", badgeText: "text-orange-500", daysColor: "text-orange-500", progressBg: "bg-orange-400" };
  return { label: "90-Day Warning", accentBg: "bg-yellow-400", badgeBg: "bg-yellow-50", badgeText: "text-yellow-600", daysColor: "text-yellow-600", progressBg: "bg-yellow-400" };
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label, count, sublabel, sublabelColor, accentBar,
}: {
  label: string; count: number; sublabel: string;
  sublabelColor: string; accentBar: string;
}) {
  return (
    <div className="flex-1 min-w-0 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden hover:scale-[1.02] transition-transform duration-200">
      <p className="text-sm font-semibold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{count}</p>
      <p className={`text-xs font-medium ${sublabelColor}`}>{sublabel}</p>
      <div className={`absolute bottom-0 left-0 w-full h-1 ${accentBar} rounded-b-xl`} />
    </div>
  );
}

// ─── Filter Pills ─────────────────────────────────────────────────────────────

function FilterPills({
  current, counts, onChange,
}: {
  current: FilterKey;
  counts: Record<FilterKey, number>;
  onChange: (f: FilterKey) => void;
}) {
  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "overdue", label: "Overdue" },
    { key: "30", label: "≤ 30 days" },
    { key: "60", label: "≤ 60 days" },
    { key: "90", label: "≤ 90 days" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium shadow-sm shadow-gray-200 transition-colors cursor-pointer ${current === f.key
              ? "bg-primary text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
        >
          {f.label}
          <span
            className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full px-1.5 text-xs font-semibold ${current === f.key
                ? "bg-white/20 text-white"
                : "bg-gray-100 text-gray-500"
              }`}
          >
            {counts[f.key]}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Contract Card ────────────────────────────────────────────────────────────

interface ContractCardProps {
  contract: ContractNotification & { days: number };
  maxDays: number;
  isRead: boolean;
  onRead: (id: number) => void;
  onSelectContract?: (contractId: number) => void;
}

function ContractCard({ contract, maxDays, isRead, onRead, onSelectContract }: ContractCardProps) {
  const w = getWarning(contract.days);
  const abs = Math.abs(contract.days);
  const daysText = contract.days < 0
    ? `${abs} day${abs !== 1 ? "s" : ""} overdue`
    : `${contract.days} day${contract.days !== 1 ? "s" : ""} remaining`;

  const progressPct = contract.days < 0
    ? 100
    : maxDays > 0
      ? Math.round((contract.days / maxDays) * 100)
      : 0;

  return (
    <div
      onClick={() => { onRead(contract.id); onSelectContract?.(contract.id); }}
      className={`relative flex items-stretch rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.01] transition-transform duration-200 ${isRead ? "bg-white shadow-sm shadow-gray-200" : "bg-white shadow-md shadow-gray-300"
        }`}
    >
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 ${w.accentBg}`} />

      {/* Card body */}
      <div className="flex flex-1 min-w-0 flex-col lg:flex-row lg:items-center gap-3 lg:gap-6 px-4 lg:px-5 py-4">

        {/* Row 1 on mobile: code + badge + time (mobile only shows time here) */}
        <div className="flex items-center justify-between lg:block lg:w-40 lg:shrink-0">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-gray-800">{contract.code}</span>
            <span className={`inline-flex items-center gap-1 self-start text-xs font-semibold rounded-md px-2.5 py-0.5 ${w.badgeBg} ${w.badgeText}`}>
              {contract.days < 0
                ? <span className="text-[10px] leading-none">⚠</span>
                : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                )
              }
              {w.label}
            </span>
          </div>
          {/* Time ago — mobile only (top-right of first row) */}
          <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap lg:hidden">
            {!isRead && <span className="w-2 h-2 rounded-full bg-primary mr-0.5" />}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {timeAgo(contract.alertedAt)}
          </div>
        </div>

        {/* Middle columns: 2-col grid on mobile, flex row on desktop */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:contents">

          {/* Department */}
          <div className="min-w-0 lg:flex-1">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Department</p>
            <p className={`text-sm text-gray-800 wrap-break-word ${isRead ? "font-normal" : "font-medium"}`}>{contract.dept}</p>
          </div>

          {/* Person in Charge */}
          <div className="min-w-0 lg:flex-1">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Person in Charge</p>
            <p className={`text-sm text-gray-800 wrap-break-word ${isRead ? "font-normal" : "font-medium"}`}>{contract.pic}</p>
          </div>

          {/* Partner */}
          <div className="min-w-0 lg:flex-1">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-0.5">Partner</p>
            <p className={`text-sm text-gray-800 wrap-break-word ${isRead ? "font-normal" : "font-medium"}`}>{contract.partner}</p>
          </div>

          {/* Expiry + progress bar */}
          <div className="min-w-0 lg:w-44 lg:shrink-0">
            <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-0.5">
              {contract.days < 0 ? "Expired On" : "Expiry Date"}
            </p>
            <p className="text-sm font-semibold text-gray-800">{formatDate(contract.expiry)}</p>
            <div className="mt-1.5 mb-1 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${w.progressBg}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className={`text-xs font-semibold ${w.daysColor}`}>{daysText}</p>
          </div>

        </div>
      </div>

      {/* Right section: unread dot + time ago — desktop only */}
      <div className="hidden lg:flex flex-col items-end justify-center gap-1.5 pr-5 pl-2 shrink-0">
        {!isRead && (
          <span className="w-2 h-2 rounded-full bg-primary" />
        )}
        <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {timeAgo(contract.alertedAt)}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationCenter({ onSelectContract, onUnreadChange }: NotificationCenterProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("days_asc");
  const [page, setPage] = useState(1);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  const enriched = MOCK_CONTRACTS.map(c => ({ ...c, days: daysDiff(c.expiry) }));

  // Global max across ALL contracts — used for progress bar scaling so bars
  // remain proportionally consistent regardless of which filter is active.
  const globalMaxDays = Math.max(0, ...enriched.map(c => c.days));

  // Summary counts
  const counts: Record<FilterKey, number> = {
    all: enriched.length,
    overdue: enriched.filter(c => c.days < 0).length,
    "30": enriched.filter(c => c.days >= 0 && c.days <= 30).length,
    "60": enriched.filter(c => c.days > 30 && c.days <= 60).length,
    "90": enriched.filter(c => c.days > 60 && c.days <= 90).length,
  };

  // Filter
  const filtered = enriched.filter(c => {
    if (filter === "overdue") return c.days < 0;
    if (filter === "30") return c.days >= 0 && c.days <= 30;
    if (filter === "60") return c.days > 30 && c.days <= 60;
    if (filter === "90") return c.days > 60 && c.days <= 90;
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "days_asc") return a.days - b.days;
    if (sort === "days_desc") return b.days - a.days;
    if (sort === "date_asc") return new Date(a.expiry).getTime() - new Date(b.expiry).getTime();
    return new Date(b.expiry).getTime() - new Date(a.expiry).getTime();
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const unreadCount = enriched.filter(c => !readIds.has(c.id)).length;

  useEffect(() => { onUnreadChange?.(unreadCount); }, [unreadCount, onUnreadChange]);

  function handleFilter(f: FilterKey) { setFilter(f); setPage(1); }
  function handleRead(id: number) { setReadIds(prev => new Set(prev).add(id)); }
  function handleMarkAllRead() { setReadIds(new Set(enriched.map(c => c.id))); }

  const summaryCards: {
    key: FilterKey; label: string; sublabel: string;
    sublabelColor: string; accentBar: string;
  }[] = [
      { key: "overdue", label: "Overdue", sublabel: counts.overdue === 0 ? "All clear" : "Requires immediate action", sublabelColor: "text-red-500", accentBar: "bg-red-500" },
      { key: "30", label: "≤ 30 Days", sublabel: counts["30"] === 0 ? "None expiring" : "Critical — act now", sublabelColor: "text-red-400", accentBar: "bg-red-400" },
      { key: "60", label: "≤ 60 Days", sublabel: counts["60"] === 0 ? "None expiring" : "Urgent attention needed", sublabelColor: "text-orange-400", accentBar: "bg-orange-400" },
      { key: "90", label: "≤ 90 Days", sublabel: counts["90"] === 0 ? "None expiring" : "Plan renewal soon", sublabelColor: "text-yellow-500", accentBar: "bg-yellow-400" },
    ];

  return (
    <div className="space-y-4">

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <SummaryCard
            key={card.key}
            label={card.label}
            count={counts[card.key]}
            sublabel={card.sublabel}
            sublabelColor={card.sublabelColor}
            accentBar={card.accentBar}
          />
        ))}
      </div>

      {/* ── Filter pills + Mark all read ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterPills current={filter} counts={counts} onChange={handleFilter} />
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition duration-150 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* ── Contract cards ── */}
      {pageItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">No contracts match this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {pageItems.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              maxDays={globalMaxDays}
              isRead={readIds.has(c.id)}
              onRead={handleRead}
              onSelectContract={onSelectContract}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      <div className="flex justify-end">
        <PaginationBar
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>

    </div>
  );
}