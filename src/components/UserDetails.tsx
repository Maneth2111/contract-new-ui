import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Calendar, Clock, Edit2, History, Mail, PencilLine, UserPlus } from 'lucide-react'
import type { Audit } from '../services/userService'
import { User, UserFormValues } from '../types/user'
import { useUserDetail, useUpdateUser } from '../hook/useUser'
import { useUserForm } from '../hook/useUserForm'
import { UserForm } from './UserForm'
import { mapApiUserToFormValues } from '../utils/userDetailFormMappers'
import { mapApiUserToUser, UserProfile, UserRequest } from '../services/userService'
import { getPermissionFlagsFromUser } from '../utils/appProfileHelpers'
export type UserDetailsFormMode = 'view' | 'edit'

type ViewTab = 'user details' | 'audit information'

interface UserDetailsProps {
  userId: number
  onClose: () => void
  onUpdate?: () => void
  onUpdateUser?: (user: User) => void
  canEdit?: boolean
  initialFormMode?: UserDetailsFormMode
  currentUser?: UserProfile | null
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
}

function formatDateTime(dateTime: string) {
  if (!dateTime) return 'N/A'
  const date = new Date(dateTime)
  if (Number.isNaN(date.getTime())) return dateTime
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(dateTime: string) {
  if (!dateTime) return ''
  const date = new Date(dateTime)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?'
}

type AuditEventType = 'created' | 'updated'

interface AuditEvent {
  id: string
  type: AuditEventType
  by: string
  email: string
  at: string
}

function buildAuditEvents(audit: Audit): AuditEvent[] {
  const events: AuditEvent[] = []

  if (audit.createdDateTime) {
    events.push({
      id: 'created',
      type: 'created',
      by: audit.createdBy?.trim() || 'System',
      email: audit.createdByEmail?.trim() || '',
      at: audit.createdDateTime,
    })
  }

  const hasDistinctUpdate =
    Boolean(audit.lastUpdatedDateTime) &&
    (audit.lastUpdatedDateTime !== audit.createdDateTime ||
      (audit.lastUpdatedBy?.trim() || '') !== (audit.createdBy?.trim() || ''))

  if (hasDistinctUpdate && audit.lastUpdatedDateTime) {
    events.push({
      id: 'updated',
      type: 'updated',
      by: audit.lastUpdatedBy?.trim() || 'Unknown',
      email: audit.lastUpdatedByEmail?.trim() || '',
      at: audit.lastUpdatedDateTime,
    })
  }

  return events
}

function AuditEventCard({ event }: { event: AuditEvent }) {
  const isCreated = event.type === 'created'

  return (
    <div className="border-l-4 border-primary pl-4 py-2">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs rounded font-medium ${isCreated
                ? 'bg-green-100 text-green-800'
                : 'bg-primary/10 text-brand-navy'
                }`}
            >
              {isCreated ? 'Created' : 'Updated'}
            </span>
            <span className="text-gray-500 text-sm">
              {formatDateTime(event.at)}
            </span>
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
  )
}

function UserAuditPanel({ audit }: { audit: Audit | undefined }) {
  if (!audit) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
        <History className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">No audit information available</p>
        <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">
          Activity for this user will appear here once the account is created or updated.
        </p>
      </div>
    )
  }

  const events = buildAuditEvents(audit)

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
        <History className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">No activity recorded yet</p>
      </div>
    )
  }

  const lastActivityAt = audit.lastUpdatedDateTime || audit.createdDateTime

  return (
    <div className="space-y-8">
      {/* First created summary card — now below the timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-green-50 to-white p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-green-800/80">First created</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatDateTime(audit.createdDateTime)}</p>
              <p className="text-sm text-gray-600 mt-1 truncate" title={audit.createdBy ?? undefined}>
                by {audit.createdBy || 'System'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-primary/5 to-white p-5">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-brand-navy flex items-center justify-center shrink-0">
              <PencilLine className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-navy/80">Last activity</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {lastActivityAt ? formatDateTime(lastActivityAt) : 'N/A'}
              </p>
              <p className="text-sm text-gray-600 mt-1 truncate" title={audit.lastUpdatedBy ?? audit.createdBy ?? undefined}>
                by {audit.lastUpdatedBy || audit.createdBy || '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Activity timeline */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-800">Activity timeline</h3>
        </div>

        <div className="relative">
          {[...events].reverse().map((event, index, arr) => {
            const isCreated = event.type === 'created'
            const Icon = isCreated ? UserPlus : PencilLine
            const nodeClass = isCreated
              ? 'bg-green-100 text-green-700 ring-green-200'
              : 'bg-primary/10 text-primary ring-primary/25'

            return (
              <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
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
            )
          })}
        </div>
      </div>


    </div>
  )
}

export function UserDetails({
  userId,
  onClose,
  onUpdate,
  onUpdateUser,
  canEdit = false,
  initialFormMode = 'view',
  currentUser,
}: UserDetailsProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('user details')
  const [formMode, setFormMode] = useState<UserDetailsFormMode>(initialFormMode)
  const [formKey, setFormKey] = useState(0)
  const [canSubmit, setCanSubmit] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const { user: detail, loading: detailLoading, refetch: refetchDetail } = useUserDetail(userId)

  const permissions = getPermissionFlagsFromUser(currentUser ?? null)
  const isOwnProfile = userId === Number(currentUser?.id)
  const isFormActive = formMode === 'edit'

  const userFormProps = useUserForm(emptyFormValues, { isEdit: true })
  const { form, departments, roles } = userFormProps
  const { handleUpdate, loading: updating } = useUpdateUser(() => {
    void refetchDetail()
    onUpdate?.()
  })

  useEffect(() => {
    setFormMode(initialFormMode)
    setCanSubmit(initialFormMode === 'edit')
  }, [userId, initialFormMode])

  useEffect(() => {
    if (formMode !== 'edit') {
      setCanSubmit(false)
      return
    }
    const timer = window.setTimeout(() => setCanSubmit(true), 150)
    return () => window.clearTimeout(timer)
  }, [formMode])

  useEffect(() => {
    if (!detail || !roles || roles.length === 0) return
    form.reset(mapApiUserToFormValues(detail, roles))
    setFormKey((k) => k + 1)
  }, [detail, roles, form])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const exitFormMode = () => {
    if (initialFormMode === 'edit' && formMode === 'edit') {
      onClose()
      return
    }
    if (detail && roles?.length) {
      form.reset(mapApiUserToFormValues(detail, roles))
    }
    setFormMode('view')
    setFormKey((k) => k + 1)
  }

  const handleBack = () => {
    if (isFormActive) {
      exitFormMode()
      return
    }
    onClose()
  }

  const enterEditMode = () => {
    setActiveTab('user details')
    setFormMode('edit')
    setFormKey((k) => k + 1)
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const onSubmit = async (data: UserFormValues) => {
    if (!canSubmit) return

    const payload: UserRequest = {
      fullName: data.fullName,
      employeeId: data.employeeId,
      email: data.email,
      phoneNumber: data.phoneNumber ?? '',
      jobTitle: data.jobTitle,
      status: data.status,
      departmentId: data.departmentId,
      roleIds: roles?.filter((r) => data.roleNames.includes(r.roleName)).map((r) => r.roleId) ?? [],
      moduleDepartmentIds: data.deptAccessIds,
      permissionIds: [...new Set([...data.contractPermissionIds, ...data.userPermissionIds])],
    }
    const success = await handleUpdate(userId, payload)
    if (!success) return

    const mapped = detail ? mapApiUserToUser(detail) : null
    const deptName = departments.find((d) => d.departmentId === data.departmentId)?.departmentName
      ?? mapped?.department
      ?? ''

    if (mapped) {
      onUpdateUser?.({
        ...mapped,
        ...data,
        department: deptName,
        status: data.status === 'ACTIVE' ? 'Active' : data.status === 'INACTIVE' ? 'Inactive' : 'Disabled',
      })
    }

    if (initialFormMode === 'edit') {
      onClose()
      return
    }
    setFormMode('view')
    setFormKey((k) => k + 1)
    await refetchDetail()
  }

  const detailsFormId = `user-details-form-${userId}`
  const displayName = detail?.fullName ?? 'User'
  const displayEmployeeId = detail?.employeeId ?? ''

  const renderForm = () => {
    if (detailLoading || !detail) {
      return <p className="py-8 text-gray-500">Loading user…</p>
    }
    const sharedFormProps = {
      ...userFormProps,
      insideModal: false as const,
      isEdit: true as const,
      editingUserId: userId,
      isOwnProfile,
      currentUserPermissions: permissions,
    }

    if (formMode === 'view') {
      return (
        <UserForm
          key={`view-${formKey}`}
          {...sharedFormProps}
          readOnly
        />
      )
    }
    return (
      <form
        id={detailsFormId}
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full"
      >
        <UserForm
          key={`edit-${formKey}`}
          {...sharedFormProps}
        />
      </form>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col h-dvh">
      <div className="flex flex-col h-full min-h-0 bg-white">
        <div className="shrink-0 bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 pt-4 pb-4 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-center">
              <div className="flex items-start gap-6 min-w-0">
                <button
                  type="button"
                  onClick={handleBack}
                  className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg text-gray-700 hover:bg-gray-100 cursor-pointer"
                  aria-label="Back"
                >
                  <ArrowLeft className="w-8 h-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium text-xl">
                    {isFormActive ? 'Edit User' : 'User Details'}
                  </h2>
                  <p className="text-gray-600 truncate">
                    {displayName}
                    {displayEmployeeId ? ` · ${displayEmployeeId}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 mr-10 min-w-0">
                {isFormActive ? (
                  <>
                    <button
                      type="submit"
                      form={detailsFormId}
                      disabled={updating || !canSubmit}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm disabled:opacity-50"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={exitFormMode}
                      className="px-4 py-2 text-gray-700 rounded-lg bg-gray-200 hover:bg-gray-300 cursor-pointer text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  canEdit && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        enterEditMode()
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 cursor-pointer text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit User
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {!isFormActive && (
            <div className="px-4 sm:px-6 max-w-350 mx-auto w-full">
              <div className="flex gap-1">
                {(['user details', 'audit information'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors cursor-pointer capitalize ${activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          ref={contentRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 max-w-350 mx-auto w-full"
        >
          {isFormActive || activeTab === 'user details' ? renderForm() : <UserAuditPanel audit={detail?.audit} />}
        </div>
      </div>
    </div>
  )
}
