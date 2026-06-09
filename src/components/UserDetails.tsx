import { useEffect, useRef, useState, useMemo } from 'react';
import {
  History,
  Mail,
  PencilLine,
  UserPlus,
  User as UserIcon,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { titleCase } from 'text-case';
import type { Audit } from '../services/userService';
import { User, UserFormValues } from '../types/user';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editUserSchema } from '../lib/userSchema';
import { UserForm } from './UserForm';
import { mapApiUserToUser, UserProfile } from '../services/userService';
import { getPermissionFlagsFromUser } from '../utils/appProfileHelpers';
import { mapApiUserToFormValues } from '../utils/userDetailFormMappers';
import toast from 'react-hot-toast';
import {
  mockDepartments,
  mockRoles,
  mockContractPermissions,
  mockUserPermissions,
  getUserDetailById,
} from '../data/mockData';
import type { UserDetailActions } from '../App';

export type UserDetailsFormMode = 'view' | 'edit';
type ViewTab = 'user details' | 'audit information';

interface UserDetailsProps {
  userId: number;
  onClose: () => void;
  onUpdate?: () => void;
  onUpdateUser?: (user: User) => void;
  canEdit?: boolean;
  initialFormMode?: UserDetailsFormMode;
  currentUser?: UserProfile | null;
  /** 'page' renders inline (no fullscreen overlay). Default is 'fullscreen' for backwards compat. */
  variant?: 'page' | 'fullscreen';
  /** Reports form mode (and optionally user name) back to App */
  onFormModeChange?: (mode: UserDetailsFormMode, name?: string) => void;
  /** Called once so App knows whether to show the Edit button */
  onActionsReady?: (canEdit: boolean) => void;
  /** Ref App writes action callbacks into */
  actionsRef?: React.MutableRefObject<UserDetailActions>;
}

const emptyFormValues: UserFormValues = {
  fullName: '',
  employeeId: '',
  email: '',
  phoneNumber: '',
  jobTitle: '',
  status: 'ACTIVE',
  departmentId: 0,
  roleNames: [],
  deptAccessIds: [],
  contractPermissionIds: [],
  userPermissionIds: [],
};

function formatDateTime(dateTime: string) {
  if (!dateTime) return 'N/A';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Section card primitives ───────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 bg-primary px-4 py-2.5">
      <span className="text-white [&>svg]:w-4 [&>svg]:h-4 shrink-0">{icon}</span>
      <span className="text-xs font-semibold tracking-widest text-white uppercase select-none">
        {title}
      </span>
    </div>
  );
}

function FieldRow({
  label,
  children,
  empty,
}: {
  label: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <tr className="border-b border-gray-100 last:border-b-0 block sm:table-row">
      <td className="block sm:table-cell w-full sm:w-55 sm:min-w-55 px-4 pt-3 pb-1 sm:py-3 border border-r sm:border-r border-gray-100 bg-gray-50">
        <span className="text-xs font-medium text-brand-navy uppercase">{label}</span>
      </td>
      <td className="block sm:table-cell w-full px-4 pb-3 pt-1 sm:py-3 bg-white">
        <span className={empty ? 'text-gray-400 italic text-sm' : 'text-sm text-gray-800'}>
          {children}
        </span>
      </td>
    </tr>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="shadow-sm rounded-lg overflow-hidden mb-4">
      {children}
    </div>
  );
}

function FieldTable({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse">
      <tbody>{children}</tbody>
    </table>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  if (s === 'ACTIVE')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
        Active
      </span>
    );
  if (s === 'INACTIVE')
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        Inactive
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
      Disabled
    </span>
  );
}

// ── Audit panel ───────────────────────────────────────────────────────────────

type AuditEventType = 'created' | 'updated';
interface AuditEvent {
  id: string;
  type: AuditEventType;
  by: string;
  email: string;
  at: string;
}

function buildAuditEvents(audit: Audit): AuditEvent[] {
  const events: AuditEvent[] = [];
  if (audit.createdDateTime) {
    events.push({
      id: 'created',
      type: 'created',
      by: audit.createdBy?.trim() || 'System',
      email: audit.createdByEmail?.trim() || '',
      at: audit.createdDateTime,
    });
  }
  const hasDistinctUpdate =
    Boolean(audit.lastUpdatedDateTime) &&
    (audit.lastUpdatedDateTime !== audit.createdDateTime ||
      (audit.lastUpdatedBy?.trim() || '') !== (audit.createdBy?.trim() || ''));
  if (hasDistinctUpdate && audit.lastUpdatedDateTime) {
    events.push({
      id: 'updated',
      type: 'updated',
      by: audit.lastUpdatedBy?.trim() || 'Unknown',
      email: audit.lastUpdatedByEmail?.trim() || '',
      at: audit.lastUpdatedDateTime,
    });
  }
  return events;
}

function AuditEventCard({ event }: { event: AuditEvent }) {
  return (
    <div className="border-l-4 border-primary pl-4 py-2">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <span
              className={`px-2 py-0.5 text-xs rounded font-medium ${event.type === 'created'
                ? 'bg-green-100 text-green-800'
                : 'bg-primary/10 text-brand-navy'
                }`}
            >
              {event.type === 'created' ? 'Created' : 'Updated'}
            </span>
            <span className="text-gray-500 text-sm">{formatDateTime(event.at)}</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">By: {event.by}</p>
          {event.email && (
            <a
              href={`mailto:${event.email}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-brand-navy mt-0.5 truncate max-w-full"
            >
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{event.email}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function UserAuditPanel({ audit }: { audit: Audit | undefined }) {
  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
        <History className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">No audit information available</p>
      </div>
    );
  }

  const events = buildAuditEvents(audit);
  const lastActivityAt = audit.lastUpdatedDateTime || audit.createdDateTime;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative rounded-xl border border-gray-200 shadow bg-linear-to-br from-green-50 via-white to-white p-4 sm:p-5">
          <p className="absolute top-4 right-4 text-xs text-green-700/80 font-medium">
            {formatDateTime(audit.createdDateTime)}
          </p>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-green-100 shrink-0">
              <UserPlus className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 pr-16">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-green-700/80">
                First created
              </p>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate">
                by {audit.createdBy || 'System'}
              </p>
            </div>
          </div>
        </div>

        <div className="relative rounded-xl border border-gray-200 shadow bg-linear-to-br from-primary/5 via-white to-white p-4 sm:p-5">
          <p className="absolute top-4 right-4 text-xs text-primary/80 font-medium">
            {lastActivityAt ? formatDateTime(lastActivityAt) : 'N/A'}
          </p>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-primary/10 shrink-0">
              <PencilLine className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 pr-16">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-primary/80">
                Last activity
              </p>
              <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate">
                by {audit.lastUpdatedBy || audit.createdBy || '---'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-5">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Activity timeline</h3>
        </div>
        <div className="relative">
          {[...events].reverse().map((event, index) => {
            const isCreated = event.type === 'created';
            const Icon = isCreated ? UserPlus : PencilLine;
            const nodeClass = isCreated
              ? 'bg-green-100 text-green-700 ring-green-200'
              : 'bg-primary/10 text-primary ring-primary/25';
            return (
              <div key={event.id} className="relative flex gap-4 pb-2 last:pb-0">
                {index < events.length - 1 && (
                  <div
                    className="absolute left-5 top-11 -bottom-1 w-0.5 bg-linear-to-b from-gray-300 to-gray-100"
                    aria-hidden
                  />
                )}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-2 ${nodeClass}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <AuditEventCard event={event} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserDetails({
  userId,
  onClose,
  onUpdate,
  onUpdateUser,
  canEdit = false,
  initialFormMode = 'view',
  currentUser,
  variant = 'fullscreen',
  onFormModeChange,
  onActionsReady,
  actionsRef,
}: UserDetailsProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('user details');
  const [formMode, setFormMode] = useState<UserDetailsFormMode>(initialFormMode);
  const [formKey, setFormKey] = useState(0);
  const [canSubmit, setCanSubmit] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [depAccess, setDepAccess] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const depAccessRef = useRef<HTMLDivElement>(null);

  const isPage = variant === 'page';
  const isFullscreen = variant === 'fullscreen';

  // ── Data ──────────────────────────────────────────────────────────────────
  const detailResponse = useMemo(() => getUserDetailById(userId), [userId]);
  const detail = detailResponse.success ? detailResponse.payload : null;

  const permissions = getPermissionFlagsFromUser(currentUser ?? null);
  const isOwnProfile = userId === Number(currentUser?.id);
  const isFormActive = formMode === 'edit';

  const form = useForm<UserFormValues, any, UserFormValues>({
    defaultValues: emptyFormValues,
    resolver: zodResolver(editUserSchema),
  });
  const formData = form.watch();

  const allContractOn = mockContractPermissions.every(p =>
    formData.contractPermissionIds.includes(p.id)
  );
  const allUserOn = mockUserPermissions.every(p =>
    formData.userPermissionIds.includes(p.id)
  );

  const deptAccessLabel =
    formData.deptAccessIds.length === 0
      ? 'Select departments'
      : mockDepartments
        .filter(d => formData.deptAccessIds.includes(d.departmentId))
        .map(d => d.departmentName)
        .join(', ');

  const onDeptAccessToggle = (id: number) => {
    const current = formData.deptAccessIds;
    form.setValue(
      'deptAccessIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };
  const onContractToggle = (id: number) => {
    const current = formData.contractPermissionIds;
    form.setValue(
      'contractPermissionIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };
  const onAllContract = () => {
    form.setValue(
      'contractPermissionIds',
      allContractOn ? [] : mockContractPermissions.map(p => p.id),
      { shouldDirty: true, shouldValidate: true }
    );
  };
  const onUserToggle = (id: number) => {
    const current = formData.userPermissionIds;
    form.setValue(
      'userPermissionIds',
      current.includes(id) ? current.filter(x => x !== id) : [...current, id],
      { shouldDirty: true, shouldValidate: true }
    );
  };
  const onAllUser = () => {
    form.setValue(
      'userPermissionIds',
      allUserOn ? [] : mockUserPermissions.map(p => p.id),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const roleNames = useMemo(() => detail?.roles.map(r => r.name) ?? [], [detail]);
  const deptAccessNames = useMemo(() => detail?.moduleAccess.map(m => m.name) ?? [], [detail]);
  const contractPermNames = useMemo(() => detail?.permissions.CONTRACT.map(p => p.name) ?? [], [detail]);
  const userPermNames = useMemo(() => detail?.permissions.USER.map(p => p.name) ?? [], [detail]);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!detail) return;
    form.reset(mapApiUserToFormValues(detail, mockRoles));
    setFormKey(k => k + 1);
  }, [detail, form]);

  useEffect(() => {
    setFormMode(initialFormMode);
    setCanSubmit(initialFormMode === 'edit');
  }, [userId, initialFormMode]);

  useEffect(() => {
    if (formMode !== 'edit') { setCanSubmit(false); return; }
    const timer = window.setTimeout(() => setCanSubmit(true), 150);
    return () => window.clearTimeout(timer);
  }, [formMode]);

  // Lock scroll only for fullscreen variant
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isFullscreen]);

  // ── Expose actions + capabilities upward ─────────────────────────────────
  useEffect(() => {
    const resolvedCanEdit = Boolean(canEdit);
    if (actionsRef) {
      actionsRef.current = {
        enterEditMode: () => {
          setFormMode('edit');
          setActiveTab('user details');
          window.requestAnimationFrame(() =>
            contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
          );
        },
        exitFormMode: () => exitFormMode(),
        canEdit: resolvedCanEdit,
      };
    }
    onActionsReady?.(resolvedCanEdit);
  }, [detail, canEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report mode changes upward
  useEffect(() => {
    onFormModeChange?.(formMode, detail?.fullName);
  }, [formMode, detail?.fullName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ───────────────────────────────────────────────────────────────
  const exitFormMode = () => {
    if (initialFormMode === 'edit' && formMode === 'edit') { onClose(); return; }
    if (detail) form.reset(mapApiUserToFormValues(detail, mockRoles));
    setFormMode('view');
    setFormKey(k => k + 1);
  };

  const enterEditMode = () => {
    setActiveTab('user details');
    setFormMode('edit');
    setFormKey(k => k + 1);
    window.requestAnimationFrame(() =>
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    );
  };

  const onSubmit = async (data: UserFormValues) => {
    if (!canSubmit) return;
    setUpdating(true);
    await new Promise(r => setTimeout(r, 400));
    setUpdating(false);

    const mapped = detail ? mapApiUserToUser(detail as any) : null;
    const deptName =
      mockDepartments.find(d => d.departmentId === data.departmentId)?.departmentName ??
      mapped?.department ??
      '';

    if (mapped) {
      onUpdateUser?.({
        ...mapped,
        ...data,
        department: deptName,
        status:
          data.status === 'ACTIVE'
            ? 'Active'
            : data.status === 'INACTIVE'
              ? 'Inactive'
              : 'Disabled',
      });
    }
    onUpdate?.();
    if (initialFormMode === 'edit') { onClose(); return; }
    setFormMode('view');
    setFormKey(k => k + 1);
  };

  const detailsFormId = `user-details-form-${userId}`;
  const displayName = detail?.fullName ?? 'User';
  const displayEmployeeId = detail?.employeeId ?? '';

  const sharedFormProps = {
    form,
    departments: mockDepartments,
    roles: mockRoles,
    contractItems: mockContractPermissions,
    userItems: mockUserPermissions,
    depAccess,
    setDepAccess,
    permissionRef: depAccessRef,
    deptAccessLabel,
    allContractOn,
    allUserOn,
    onDeptAccessToggle,
    onContractToggle,
    onAllContract,
    onUserToggle,
    onAllUser,
    isEdit: true as const,
    editingUserId: userId,
    isOwnProfile,
    currentUserPermissions: permissions,
    insideModal: false as const,
  };

  // ── View-mode sections ────────────────────────────────────────────────────
  const renderViewDetails = () => {
    if (!detail) return <p className="py-8 text-gray-500">Loading user…</p>;

    return (
      <div>
        {/* USER INFORMATION */}
        <SectionCard>
          <SectionHeader icon={<UserIcon />} title="User Information" />
          <FieldTable>
            <FieldRow label="Employee ID" empty={!detail.employeeId}>
              {detail.employeeId ?? 'Not assigned'}
            </FieldRow>
            <FieldRow label="Full Name">{detail.fullName}</FieldRow>
            <FieldRow label="Status">
              {detail.status ? <StatusBadge status={detail.status} /> : <span className="text-gray-400 italic text-sm">Unknown</span>}
            </FieldRow>
            <FieldRow label="Role" empty={roleNames.length === 0}>
              {roleNames.length === 0 ? 'No roles assigned' : (
                <div className="flex flex-wrap gap-1.5">
                  {roleNames.map(r => (
                    <span key={r}>
                      {titleCase(r.replace('ROLE_', '').replace(/_/g, ' '))}
                    </span>
                  ))}
                </div>
              )}
            </FieldRow>
            <FieldRow label="Email">
              <a
                href={`mailto:${detail.email}`}
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-brand-navy truncate max-w-full"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {detail.email}
              </a>
            </FieldRow>
            <FieldRow label="Department" empty={!detail.department?.departmentName}>
              {detail.department?.departmentName || 'Not assigned'}
            </FieldRow>
            <FieldRow label="Job Title" empty={!detail.jobTitle}>
              {detail.jobTitle || 'Not specified'}
            </FieldRow>
            <FieldRow label="Phone Number" empty={!detail.phoneNumber}>
              {detail.phoneNumber ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  {detail.phoneNumber}
                </span>
              ) : 'Not provided'}
            </FieldRow>
          </FieldTable>
        </SectionCard>

        {/* PERMISSIONS */}
        {(contractPermNames.length > 0 || userPermNames.length > 0 || deptAccessNames.length > 0) && (
          <SectionCard>
            <SectionHeader icon={<ShieldCheck />} title="Permissions" />
            <FieldTable>
              {deptAccessNames.length > 0 && (
                <FieldRow label="Department Access">
                  <div className="flex flex-wrap gap-1.5">
                    {deptAccessNames.map(n => (
                      <span key={n} className="inline-flex items-center px-2.5 py-1 bg-primary/8 text-primary border border-primary/20 rounded-md text-xs font-medium whitespace-nowrap shrink-0">
                        {n}
                      </span>
                    ))}
                  </div>
                </FieldRow>
              )}
              {contractPermNames.length > 0 && (
                <FieldRow label="Contract Permissions">
                  <div className="flex flex-wrap gap-1.5">
                    {contractPermNames.map(p => (
                      <span key={p} className="inline-flex items-center px-2.5 py-1 bg-primary/8 text-primary border border-primary/20 rounded-md text-xs font-medium whitespace-nowrap shrink-0">
                        {p.replace('CONTRACT_', '')}
                      </span>
                    ))}
                  </div>
                </FieldRow>
              )}
              {userPermNames.length > 0 && (
                <FieldRow label="User Permissions">
                  <div className="flex flex-wrap gap-1.5">
                    {userPermNames.map(p => (
                      <span key={p} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 bg-brand-navy/8 text-brand-navy border border-brand-navy/5">
                        {p.replace('USER_', '')}
                      </span>
                    ))}
                  </div>
                </FieldRow>
              )}
            </FieldTable>
          </SectionCard>
        )}

        {/* AUDIT INFORMATION */}
        {detail.audit && (
          <SectionCard>
            <SectionHeader icon={<History />} title="Audit Information" />
            <FieldTable>
              <FieldRow label="Last Updated By">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800">
                      {detail.audit.lastUpdatedBy || detail.audit.createdBy || '---'}
                    </span>
                    {detail.audit.lastUpdatedByEmail && (
                      <a href={`mailto:${detail.audit.lastUpdatedByEmail}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-brand-navy mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        {detail.audit.lastUpdatedByEmail}
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5">
                    {detail.audit.lastUpdatedDateTime ? formatDateTime(detail.audit.lastUpdatedDateTime) : '---'}
                  </span>
                </div>
              </FieldRow>
              <FieldRow label="Created By">
                <div className="flex justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-800">
                      {detail.audit.createdBy || 'System'}
                    </span>
                    {detail.audit.createdByEmail && (
                      <a href={`mailto:${detail.audit.createdByEmail}`} className="inline-flex items-center gap-1.5 text-primary hover:text-brand-navy mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        {detail.audit.createdByEmail}
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-0.5">
                    {formatDateTime(detail.audit.createdDateTime)}
                  </span>
                </div>
              </FieldRow>
            </FieldTable>
          </SectionCard>
        )}
      </div>
    );
  };

  const renderEditForm = () => {
    if (!detail) return <p className="py-8 text-gray-500">Loading user…</p>;
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white">
        <form id={detailsFormId} onSubmit={form.handleSubmit(onSubmit)} className="w-full">
          <UserForm key={`edit-${formKey}`} {...sharedFormProps} />
        </form>
      </div>
    );
  };

  // ── Page variant (inline, no overlay) ────────────────────────────────────
  if (isPage) {
    return (
      <div className="flex flex-col">
        {/* Body */}
        <div ref={contentRef}>
          {isFormActive ? renderEditForm() : renderViewDetails()}
        </div>
      </div>
    );
  }

  // ── Fullscreen variant (original behaviour — backwards compat) ────────────
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">
      <div className="flex flex-col h-full min-h-0 bg-white">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 pt-4 pb-4 max-w-350 mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="flex items-start gap-6 min-w-0">
                <button
                  type="button"
                  onClick={() => { if (isFormActive) { exitFormMode(); return; } onClose(); }}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
                  aria-label="Back"
                >
                  ←
                </button>
                <div className="min-w-0 flex-1">
                  {isFormActive ? (
                    <>
                      <h2 className="font-medium text-xl">Edit User <span className="text-brand-navy">{detail?.fullName}</span></h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {detail?.employeeId ? `${displayEmployeeId}` : 'No employee ID'}
                        {detail?.department?.departmentName ? <> · {detail.department.departmentName}</> : null}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-xl leading-tight">{displayName}</h2>
                      {detail?.status && <StatusBadge status={detail.status} />}
                    </div>
                  )}
                  {!isFormActive && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {detail?.employeeId ? `${displayEmployeeId}` : 'No employee ID'}
                      {detail?.department?.departmentName ? <> · {detail.department.departmentName}</> : null}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-start gap-2 min-w-0">
                {isFormActive ? (
                  <>
                    <button type="button" onClick={exitFormMode} className="px-4 py-2 text-primary rounded-lg bg-white border border-primary hover:bg-primary/10 cursor-pointer text-sm transition-colors">Cancel</button>
                    <button type="submit" form={detailsFormId} disabled={updating || !canSubmit} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm disabled:opacity-50">Save Changes</button>
                  </>
                ) : (
                  canEdit && (
                    <button type="button" onMouseDown={e => e.preventDefault()} onClick={e => { e.preventDefault(); e.stopPropagation(); enterEditMode(); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm">
                      Edit User
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 max-w-350 mx-auto w-full">
          {isFormActive ? renderEditForm() : renderViewDetails()}
        </div>
      </div>
    </div>
  );
}