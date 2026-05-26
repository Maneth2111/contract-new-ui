import { useState } from "react";
import { PaginationBar } from "./PaginationBar";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ContractNotification {
  id: number;
  code: string;
  title: string;
  pic: string;
  dept: string;
  partner: string;
  expiry: string;      // "YYYY-MM-DD"
  status: "OVERDUE" | "EXPIRING_SOON";
  alertedAt: string;   // ISO datetime – drives "X ago" label
}

type FilterKey = "all" | "overdue" | "30" | "60" | "90";

interface NotificationCenterProps {
  onSelectContract?: (contractId: number) => void;
  isLoggedIn?: boolean;
  onUnreadChange?: (count: number) => void;
}

// ─── Mock data ───────────────────────────────────────────────────────────────

const NOW = new Date("2026-05-26T10:30:00");

const MOCK_CONTRACTS: ContractNotification[] = [
  { id: 56, code: "CCF-2026-049", title: "Test Contract",     pic: "Test User",  dept: "CEO Office",         partner: "YTest Corp",      expiry: "2026-05-16", status: "OVERDUE",       alertedAt: "2026-05-26T10:28:00" },
  { id: 50, code: "CCF-2026-046", title: "Legal Contract",    pic: "John",       dept: "Legal & Compliance", partner: "Global Software",  expiry: "2026-08-19", status: "EXPIRING_SOON", alertedAt: "2026-05-26T08:00:00" },
  { id: 49, code: "CCF-2026-045", title: "Contract Testing",  pic: "John",       dept: "Legal & Compliance", partner: "Training Experts", expiry: "2026-07-21", status: "EXPIRING_SOON", alertedAt: "2026-05-25T09:15:00" },
  { id: 48, code: "CCF-2026-044", title: "Lease Agreement",   pic: "John",       dept: "Admin & Marketing",  partner: "Global Software",  expiry: "2026-08-19", status: "EXPIRING_SOON", alertedAt: "2026-05-24T14:00:00" },
  { id: 46, code: "CCF-2026-042", title: "Testing Agreement", pic: "Test User",  dept: "Legal & Compliance", partner: "YTest Corp",       expiry: "2026-06-18", status: "EXPIRING_SOON", alertedAt: "2026-05-26T09:30:00" },
  { id: 43, code: "CCF-2026-039", title: "Testing",           pic: "John Smith", dept: "IT Department",      partner: "ABC Company",      expiry: "2026-07-18", status: "EXPIRING_SOON", alertedAt: "2026-05-23T07:45:00" },
  { id: 42, code: "CCF-2026-038", title: "Test Contract B",   pic: "Test User",  dept: "CEO Office",         partner: "YTest Corp",       expiry: "2026-07-16", status: "EXPIRING_SOON", alertedAt: "2026-05-20T11:00:00" },
  { id: 40, code: "CCF-2026-036", title: "VG Agreement",      pic: "Menghok",    dept: "CEO Office",         partner: "EE Solutions",     expiry: "2026-06-30", status: "EXPIRING_SOON", alertedAt: "2026-05-26T10:00:00" },
];

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysDiff(expiry: string): number {
  const a = new Date(new Date(NOW).toDateString());
  const b = new Date(new Date(expiry).toDateString());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function timeAgo(alertedAt: string): string {
  const diff  = NOW.getTime() - new Date(alertedAt).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return formatDate(alertedAt);
}

// ─── Warning config ───────────────────────────────────────────────────────────

interface Warning {
  label: string;
  badgeClass: string;
  accentClass: string;
  daysColorClass: string;
}

function getWarning(days: number): Warning {
  if (days < 0)   return { label: "Overdue",          badgeClass: "badge-overdue", accentClass: "accent-overdue", daysColorClass: "text-red-600"    };
  if (days <= 30) return { label: "30 days warning",  badgeClass: "badge-30",      accentClass: "accent-30",      daysColorClass: "text-red-500"    };
  if (days <= 60) return { label: "60 days warning",  badgeClass: "badge-60",      accentClass: "accent-60",      daysColorClass: "text-orange-600" };
  return               { label: "90 days warning",  badgeClass: "badge-90",      accentClass: "accent-90",      daysColorClass: "text-yellow-600" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterPills({
  current,
  onChange,
}: {
  current: FilterKey;
  onChange: (f: FilterKey) => void;
}) {
  const filters: { key: FilterKey; label: string }[] = [
    { key: "all",     label: "All"       },
    { key: "overdue", label: "Overdue"   },
    { key: "30",      label: "≤ 30 days" },
    { key: "60",      label: "≤ 60 days" },
    { key: "90",      label: "≤ 90 days" },
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`rounded-sm px-4 py-1 text-sm border border-primary transition-colors ${
            current === f.key
              ? "bg-primary text-white border-primary"
              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

interface ContractCardProps {
  contract: ContractNotification & { days: number };
  isRead: boolean;
  onRead: (id: number) => void;
  onSelectContract?: (contractId: number) => void;
}

function ContractCard({ contract, isRead, onRead, onSelectContract }: ContractCardProps) {
  const w   = getWarning(contract.days);
  const abs = Math.abs(contract.days);
  const daysText   = contract.days < 0
    ? `${abs} day${abs !== 1 ? "s" : ""} overdue`
    : `${contract.days} day${contract.days !== 1 ? "s" : ""} remaining`;
  const expiryColor = contract.days < 0
    ? "text-red-600"
    : contract.days <= 30
    ? "text-red-500"
    : contract.days <= 60
    ? "text-orange-600"
    : "text-yellow-600";

  const accentColors: Record<string, string> = {
    "accent-overdue": "bg-red-600",
    "accent-30":      "bg-red-500",
    "accent-60":      "bg-orange-600",
    "accent-90":      "bg-yellow-500",
  };
  const badgeColors: Record<string, string> = {
    "badge-overdue": "bg-red-100 text-red-600",
    "badge-30":      "bg-red-50 text-red-500",
    "badge-60":      "bg-orange-50 text-orange-600",
    "badge-90":      "bg-yellow-50 text-yellow-600",
  };

  const handleClick = () => {
    // Mark as read
    onRead(contract.id);
    // Navigate to contract details
    onSelectContract?.(contract.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-50 transition-colors cursor-pointer ${
        isRead ? "bg-white" : "bg-blue-50/40"
      }`}
    >
      <div className="flex">
        {/* Colored left accent bar */}
        <div className={`w-1 shrink-0 ${accentColors[w.accentClass]}`} />

        <div className="flex-1 p-4">
          {/* Top row */}
          <div className="flex items-start gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-5 flex-1 min-w-0">
              {/* Unread dot */}
              {!isRead && (
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-0.5" aria-label="Unread" />
              )}
              <span className="bg-gray-100 text-gray-600 text-xs font-medium rounded-md px-2.5 py-1">
                {contract.code}
              </span>
              <span className={`text-xs font-medium rounded-md px-2.5 py-1 ${badgeColors[w.badgeClass]}`}>
                {w.label}
              </span>
            </div>
            {/* Time ago – top right */}
            <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeAgo(contract.alertedAt)}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-2">
            {[
              { label: "Department",       value: contract.dept,    color: "" },
              { label: "Person in charge", value: contract.pic,     color: "" },
              { label: "Partner",          value: contract.partner, color: "" },
              { label: contract.days < 0 ? "Expired on" : "Expiry date", value: formatDate(contract.expiry), color: expiryColor },
              { label: "Days",             value: daysText,         color: w.daysColorClass },
            ].map(m => (
              <div key={m.label}>
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className={`text-sm font-${isRead ? "normal" : "medium"} ${m.color || "text-gray-900"}`}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NotificationCenter({ onSelectContract }: NotificationCenterProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [page,   setPage  ] = useState(1);
  // All contracts start as unread; set stores IDs that have been read
  const [readIds, setReadIds] = useState<Set<number>>(new Set());

  const enriched = MOCK_CONTRACTS.map(c => ({ ...c, days: daysDiff(c.expiry) }));

  const filtered = enriched.filter(c => {
    if (filter === "overdue") return c.days < 0;
    if (filter === "30")      return c.days >= 0 && c.days <= 30;
    if (filter === "60")      return c.days > 30  && c.days <= 60;
    if (filter === "90")      return c.days > 60  && c.days <= 90;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const unreadCount = enriched.filter(c => !readIds.has(c.id)).length;

  function handleFilter(f: FilterKey) { setFilter(f); setPage(1); }

  function handleRead(id: number) {
    setReadIds(prev => new Set(prev).add(id));
  }

  function handleMarkAllRead() {
    setReadIds(new Set(enriched.map(c => c.id)));
  }

  return (
    <div className="space-y-4">
      {/* Header row with unread count + mark all read */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            Mark all as read
          </button>
        )}
      </div>

      <FilterPills current={filter} onChange={handleFilter} />

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
              isRead={readIds.has(c.id)}
              onRead={handleRead}
              onSelectContract={onSelectContract}
            />
          ))}
        </div>
      )}

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