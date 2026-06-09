import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Upload, ChevronDown, X, FileText, Loader2 } from 'lucide-react';
import { ContractFormValues, getContractSchema } from '../lib/contractSchema';
import { useContractFormData } from '../hook/useContactByDepartment';

import { titleCase } from 'text-case';
import {
  MAX_CONTRACT_FILES_TOTAL_BYTES,
  calculateRenewalFrequencyMonths,
  formatAttachmentFileSize,
  formatContractValueThousands,
  sanitizeContractValueInput,
  validateContractFile,
  resolveDepartmentAndContractType,
  isPdfAttachment,
  isPdfFileName,
} from '../utils/contractFormHelpers';
import { getAllowedDepartments } from '../utils/departmentAccess';
import { calculateDaysRemaining, formatDate, pluralS } from '../utils/contractUtils';
import toast from 'react-hot-toast';
import type { UserProfile } from '../services/userService';
import { mockContractStatuses, mockPartners } from '../data/mockData';
import { CustomSelect } from './ui/CustomSelect';

type ContractFormRHFValues = Omit<ContractFormValues, 'attachments'> & {
  attachments?: File[]
}

export interface UploadedFile {
  file: File;
  id: string;
  fileId?: number;
  displaySize?: number;
  uploadedAt?: string;
  uploadedByName?: string;
}

export interface ContractFormProps {
  defaultValues?: Partial<ContractFormValues>;
  onSubmit: (data: ContractFormValues, departmentId: number, contractTypeId: number) => Promise<void> | void;
  onSecondaryAction?: () => void;
  submitLabel?: string;
  secondaryLabel?: string;
  uploadedFiles: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  insideModal?: boolean;
  onReplaceExistingFile?: (fileId: number, nextFile: File) => Promise<void> | void;
  hideStatus?: boolean;
  requireAttachments?: boolean;
  editPartner?: boolean;
  currentUser?: UserProfile | null;
  readOnly?: boolean;
  onDownloadFile?: (fileId: number, fileName: string) => void;
  downloadingFileIds?: Set<number>;
  /** Read-only extras shown in view mode (legacy contract details fields) */
  viewMeta?: {
    msChannelTitle?: string | null;
    msChannelUrl?: string | null;
    alertDays?: number | string | null;
  };
  /** Links header submit buttons to this form (e.g. Contract Details toolbar) */
  formId?: string;
  /** Hide Save/Cancel footer; actions live in parent header */
  hideFooter?: boolean;
}

const DEFAULT_VALUES: ContractFormValues = {
  title: '',
  contractType: '',
  department: '',
  personInCharge: '',
  contractTerms: '',
  effectiveDate: '',
  expiryDate: '',
  contractValue: '',
  attachments: [],
  autoAlertDays: '15',
  confidential: false,
  autoRenew: false,
  remarks: '',
  partners: [{
    partnerName: '',
    contactPerson: '',
    contactNumber: ''
  }],
  manualAlertDates: [{ value: '' }],
};

const ErrorMsg = ({ message }: { message?: string }) =>
  message ? <p className="text-red-500 text-sm mt-1">{message}</p> : null;

const readOnlyBoxClass = 'px-4 py-2 rounded-lg bg-gray-50 min-h-11'

const ReadOnlyTextBlock = ({ value, emptyLabel = 'N/A' }: { value: string; emptyLabel?: string }) => {
  const text = value.trim()
  return (
    <div className={readOnlyBoxClass}>
      {text ? (
        <p className="text-gray-900 whitespace-pre-wrap wrap-break-word leading-relaxed">{text}</p>
      ) : (
        <p className="text-gray-500">{emptyLabel}</p>
      )}
    </div>
  )
}

const ReadOnlyDateDisplay = ({ dateString, showRemaining = false }: { dateString: string; showRemaining?: boolean }) => {
  const trimmed = dateString.trim()
  if (!trimmed) {
    return (
      <div className={readOnlyBoxClass}>
        <p className="text-gray-500">N/A</p>
      </div>
    )
  }
  const formatted = formatDate(trimmed)
  if (!showRemaining) {
    return (
      <div className={readOnlyBoxClass}>
        <p className="text-gray-900">{formatted}</p>
      </div>
    )
  }
  const daysRemaining = calculateDaysRemaining(trimmed)
  const remainingLabel = daysRemaining < 0
    ? `${Math.abs(daysRemaining)} day${pluralS(Math.abs(daysRemaining))} overdue`
    : `${daysRemaining} day${pluralS(daysRemaining)} remaining`
  return (
    <div className={readOnlyBoxClass}>
      <p className={daysRemaining < 0 ? 'text-red-600' : 'text-gray-900'}>
        {formatted} ({remainingLabel})
      </p>
    </div>
  )
}


export function ContractForm({
  defaultValues,
  onSubmit,
  onSecondaryAction,
  submitLabel = 'Register Contract',
  secondaryLabel = 'Reset Form',
  uploadedFiles,
  onFilesChange,
  insideModal = false,
  onReplaceExistingFile,
  hideStatus = false,
  requireAttachments,
  editPartner = false,
  currentUser,
  readOnly = false,
  onDownloadFile,
  downloadingFileIds,
  viewMeta,
  formId,
  hideFooter = false,
}: ContractFormProps) {
  const {
    departments,
    contractTypesByDepartment,
    departmentList,
    contractTypeList,
    isLoading: formDataLoading,
    error: formDataError,
  } = useContractFormData();
  const [partnerOptionsMap, setPartnerOptionsMap] = useState<Record<number, any[]>>({});
  const statuses = mockContractStatuses;
  const [fileError, setFileError] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<{
    id: string
    fileId?: number
  } | null>(null)
  const replaceInputRef = useRef<HTMLInputElement | null>(null)

  const shouldRequireAttachments = requireAttachments ?? !(defaultValues && Object.keys(defaultValues).length > 0)

  const { register, handleSubmit, control, watch, setValue, setError, clearErrors, reset, formState: { errors, isSubmitting }, } = useForm<ContractFormRHFValues>({
    resolver: zodResolver(getContractSchema({ requireAttachments: shouldRequireAttachments })) as any,
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    register('attachments')
  }, [register])

  useEffect(() => {
    if (defaultValues) reset({ ...DEFAULT_VALUES, ...defaultValues });
  }, [defaultValues, reset]);

  const uploadedFileIds = uploadedFiles.map((f) => f.id).join(',')

  useEffect(() => {
    const files = uploadedFiles.map((f) => f.file)
    setValue('attachments', files, { shouldValidate: true })
  }, [uploadedFileIds, setValue])

  useEffect(() => {
    if (uploadedFiles.length > 0 && fileError) setFileError(null)
  }, [uploadedFileIds, fileError])

  const {
    fields: partnerFields,
    append: appendPartner,
    remove: removePartnerField,
  } = useFieldArray({
    control,
    name: 'partners',
  });

  const { fields: alertDateFields, append: appendAlertDate, remove: removeAlertDate } = useFieldArray({ control, name: 'manualAlertDates' as any });

  // Handle Search Partner if partner exist take Its Id but not create new
  const handlePartnerSearch = async (query: string, index: number) => {
    const currentPartnerId = watch(`partners.${index}.partnerId`)
    const hasPartnerId = currentPartnerId !== null && currentPartnerId !== undefined
    const isEditPartner = editPartner && hasPartnerId

    setValue(`partners.${index}.partnerName`, query, { shouldDirty: true, shouldValidate: true })
    if (!isEditPartner) {
      setValue(`partners.${index}.partnerId`, null, { shouldDirty: true, shouldValidate: true })
    }
    if (!query) {
      setPartnerOptionsMap(prev => ({ ...prev, [index]: [] }))
      return
    }
    try {
      const lowerQuery = query.trim().toLowerCase();
      const items = mockPartners
        .filter((p) => p.partnerName.toLowerCase().includes(lowerQuery))
        .slice(0, 5);

      setPartnerOptionsMap(prev => ({ ...prev, [index]: items }))

      const existingPartner = items.find(
        (p) => p.partnerName.toLowerCase() === lowerQuery
      );

      if (!isEditPartner) {
        if (existingPartner) {
          setValue(`partners.${index}.contactPerson`, existingPartner.contactPerson, { shouldDirty: true, shouldValidate: true })
          setValue(`partners.${index}.contactNumber`, existingPartner.contactNumber, { shouldDirty: true, shouldValidate: true })
          setValue(`partners.${index}.partnerId`, existingPartner.partnerId, { shouldDirty: true, shouldValidate: true })
        } else {
          setValue(`partners.${index}.contactPerson`, '', { shouldDirty: true, shouldValidate: true })
          setValue(`partners.${index}.contactNumber`, '', { shouldDirty: true, shouldValidate: true })
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setPartnerOptionsMap(prev => ({ ...prev, [index]: [] }))
      } else {
        console.error('Failed to search partners', error);
      }
    }
  };

  const handlePartnerSelect = (partner: any, index: number) => {
    setValue(`partners.${index}.partnerId`, partner.partnerId, { shouldDirty: true, shouldValidate: true });
    setValue(`partners.${index}.partnerName`, partner.partnerName, { shouldDirty: true, shouldValidate: true });
    setValue(`partners.${index}.contactPerson`, partner.contactPerson, { shouldDirty: true, shouldValidate: true });
    setValue(`partners.${index}.contactNumber`, partner.contactNumber, { shouldDirty: true, shouldValidate: true });
    setPartnerOptionsMap(prev => ({ ...prev, [index]: [] }));
  };

  const watchedDepartment = watch('department');
  const watchedContractType = watch('contractType');
  const watchedEffectiveDate = watch('effectiveDate');
  const watchedExpiryDate = watch('expiryDate');
  const watchedRemarks = watch('remarks') ?? '';
  const watchedContractTerms = watch('contractTerms') ?? '';


  const moduleAccess = useMemo(
    () => currentUser?.moduleAccess ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser?.moduleAccess?.map((m) => m.id).join(',')]
  )

  const {
    allowedDepartments,
    isSingleDepartment,
    hasRestrictedAccess,
  } = useMemo(
    () => getAllowedDepartments(departmentList, moduleAccess),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departmentList.map((d) => d.departmentId).join(','), moduleAccess]
  )

  const selectableDepartmentNames = useMemo(
    () => allowedDepartments.map((d) => d.departmentName),
    [allowedDepartments.map((d) => d.departmentName).join(',')]
  )

  const filteredDepartments = useMemo(
    () => hasRestrictedAccess
      ? selectableDepartmentNames
      : departments.filter((d) => d !== 'All Departments'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectableDepartmentNames.join(','), hasRestrictedAccess, departments.join(',')]
  )

  const singleDepartmentName =
    isSingleDepartment && allowedDepartments[0]
      ? allowedDepartments[0].departmentName
      : ''

  const renewalFrequency = calculateRenewalFrequencyMonths(watchedEffectiveDate, watchedExpiryDate);
  useEffect(() => {
    if (!watchedDepartment) return
    const availableTypes = contractTypesByDepartment[watchedDepartment]
    if (!availableTypes?.length) return
    if (!watchedContractType || !availableTypes.includes(watchedContractType)) {
      setValue('contractType', availableTypes[0], { shouldDirty: true, shouldValidate: true })
    }
  }, [contractTypesByDepartment, watchedContractType, watchedDepartment, setValue])
  useEffect(() => {
    if (defaultValues || watchedDepartment) return

    // If user has access to exactly one department, auto-select it.
    if (isSingleDepartment && singleDepartmentName) {
      setValue('department', singleDepartmentName, { shouldDirty: true, shouldValidate: true })
      const initialType = contractTypesByDepartment[singleDepartmentName]?.[0] ?? ''
      if (initialType) setValue('contractType', initialType, { shouldDirty: true, shouldValidate: true })
      return
    }

    // If user has multiple department access, let them choose (show "Select Department").
    if (hasRestrictedAccess && allowedDepartments.length > 1) return

    // No module access restriction (fallback): auto-select first department.
    const initialDept = selectableDepartmentNames[0] ?? ''
    if (!initialDept) return
    setValue('department', initialDept, { shouldDirty: true, shouldValidate: true })
    const initialType = contractTypesByDepartment[initialDept]?.[0] ?? ''
    if (initialType) setValue('contractType', initialType, { shouldDirty: true, shouldValidate: true })
  }, [
    contractTypesByDepartment,
    !!defaultValues,
    isSingleDepartment,
    allowedDepartments.length,
    hasRestrictedAccess,
    selectableDepartmentNames.join(','),
    watchedDepartment,
    setValue,
    singleDepartmentName,
  ]);

  // Department change 
  const handleDepartmentChange = (department: string) => {
    setValue('department', department, { shouldDirty: true, shouldValidate: true });
    const availableTypes = contractTypesByDepartment[department];
    setValue('contractType', availableTypes?.[0] ?? '', { shouldDirty: true, shouldValidate: true });
  };

  // Partner removal
  const handleRemovePartner = (index: number) => {
    removePartnerField(index);
  };

  // File handling 
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles: UploadedFile[] = [];
    let totalSize = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileError = validateContractFile(file);
      if (fileError) {
        toast.error(fileError);
        continue;
      }

      if (totalSize + file.size > MAX_CONTRACT_FILES_TOTAL_BYTES) {
        toast.error('Total file size exceeds 50MB limit.');
        break;
      }

      newFiles.push({
        file,
        id: `${Date.now()}-${i}`,
        uploadedAt: new Date().toISOString(),
        uploadedByName: currentUser?.fullName,
      });
      totalSize += file.size;
    }

    const nextFiles = [...uploadedFiles, ...newFiles];
    if (nextFiles.length > 0) setFileError(null);
    onFilesChange(nextFiles);
    event.target.value = '';
  };

  const openReplacePicker = (file: UploadedFile) => {
    setReplaceTarget({ id: file.id, fileId: file.fileId })
    replaceInputRef.current?.click()
  }

  const handleReplaceSelected = async (nextFile: File) => {
    const target = replaceTarget
    if (!target) return
    const fileError = validateContractFile(nextFile)

    if (fileError) {
      toast.error(fileError)
      setReplaceTarget(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
      return
    }

    const existing = uploadedFiles.find((f) => f.id === target.id)
    if (!existing) {
      setReplaceTarget(null)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
      return
    }

    if (target.fileId && onReplaceExistingFile) {
      try {
        await onReplaceExistingFile(target.fileId, nextFile)
      } catch {
        toast.error('Failed to replace file')
        setReplaceTarget(null)
        if (replaceInputRef.current) replaceInputRef.current.value = ''
        return
      }
    }

    const nextFiles = uploadedFiles.map((f) =>
      f.id === target.id
        ? {
          file: nextFile,
          id: f.id,
          fileId: f.fileId,
          displaySize: nextFile.size,
          uploadedAt: f.uploadedAt ?? new Date().toISOString(),
          uploadedByName: currentUser?.fullName ?? f.uploadedByName,
        }
        : f
    )
    onFilesChange(nextFiles)
    setFileError(null)
    setReplaceTarget(null)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  // Handle Submit 
  const handleFormSubmit = async (data: ContractFormRHFValues) => {
    if (uploadedFiles.length === 0) {
      const message = 'File upload is required'
      setFileError(message)
      setError('attachments', { type: 'manual', message })
      return
    }
    clearErrors('attachments')
    const resolved = resolveDepartmentAndContractType(
      departmentList,
      contractTypeList,
      data.department,
      data.contractType,
    )

    if (!resolved) {
      toast.error('Please select a contract type that belongs to the chosen department.')
      return
    }

    await onSubmit(
      { ...data, attachments: data.attachments ?? [] } as ContractFormValues,
      resolved.department.departmentId,
      resolved.contractType.contractTypeId,
    );
  };

  const fileInputId = insideModal ? 'fileInputModal' : 'fileInputMain';

  const scrollableBody = insideModal
    ? 'p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto'
    : 'space-y-6';

  const footer = insideModal
    ? 'flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50'
    : 'flex gap-3 pt-4';

  const fieldClass = readOnly
    ? 'w-full px-4 py-2 rounded-lg bg-gray-50 text-gray-900 cursor-default focus:outline-none'
    : 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary'

  const selectClass = readOnly
    ? `${fieldClass} appearance-none pr-4`
    : 'w-full px-4 py-2 border border-gray-300 rounded-lg appearance-none bg-white pr-8 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer'

  const readOnlyShell = readOnly
    ? '[&_label_.text-red-500]:hidden'
    : ''

  const body = (
    <div className={`${scrollableBody} ${readOnlyShell}`.trim()}>
      {formDataLoading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
          Loading departments and contract types...
        </div>
      )}
      {formDataError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {formDataError}
        </div>
      )}
      {/* Contract Information */}
      <section className="space-y-4">
        <h3 className="font-semibold text-gray-800">Contract Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="block text-gray-700 mb-2">
              Contract Title <span className="text-red-500">*</span>
            </label>
            <input
              {...register('title')}
              type="text"
              maxLength={200}
              disabled={readOnly}
              readOnly={readOnly}
              className={fieldClass}
              placeholder={readOnly ? undefined : 'e.g. Cloud Storage Services'}
            />
            <ErrorMsg message={errors.title?.message} />
          </div>

          {/* Contract Type */}
          <div className='min-w-0'>
            <label className="block text-gray-700 mb-2">
              Contract Type <span className="text-red-500">*</span>
            </label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{watchedContractType || 'N/A'}</div>
            ) : (
              <Controller
                name="contractType"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ''}
                    onChange={(value) => field.onChange(value)}
                    options={(contractTypesByDepartment[watchedDepartment] ?? []).map((type) => ({
                      key: type,
                      label: type,
                    }))}
                    placeholder={formDataLoading ? 'Loading contract types...' : !watchedDepartment ? 'Select Department First' : 'Select Contract Type'}
                    showPlaceholder={false}
                    disabled={!watchedDepartment || formDataLoading || Boolean(formDataError)}
                  />
                )}
              />
            )}
            <ErrorMsg message={errors.contractType?.message} />
          </div>

          {/* Department */}
          <div>
            <label className="block text-gray-700 mb-2">
              Department <span className="text-red-500">*</span>
            </label>
            {readOnly ? (
              <div className={readOnlyBoxClass}>{watchedDepartment || 'N/A'}</div>
            ) : (
              <Controller
                name="department"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value ?? ''}
                    onChange={(value) => {
                      field.onChange(value);
                      handleDepartmentChange(value);
                    }}
                    options={filteredDepartments.map((dept) => ({
                      key: dept,
                      label: dept,
                    }))}
                    placeholder={formDataLoading ? 'Loading departments...' : 'Select Department'}
                    showPlaceholder={false}
                    disabled={isSingleDepartment || formDataLoading || Boolean(formDataError)}
                  />
                )}
              />
            )}
            <ErrorMsg message={errors.department?.message} />
          </div>

          {/* Person In Charge */}
          <div>
            <label className="block text-gray-700 mb-2">
              Person In Charge <span className="text-red-500">*</span>
            </label>
            <input
              {...register('personInCharge')}
              type="text"
              disabled={readOnly}
              readOnly={readOnly}
              className={fieldClass}
              placeholder='e.g. John Smith'
            />
            <ErrorMsg message={errors.personInCharge?.message} />
          </div>

          {readOnly && viewMeta && (
            <>
              <div>
                <label className="block text-gray-700 mb-2">Microsoft Channel</label>
                {viewMeta.msChannelUrl ? (
                  <a
                    href={viewMeta.msChannelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 rounded-lg bg-gray-50 text-primary hover:underline break-all"
                  >
                    {viewMeta.msChannelTitle ?? 'N/A'}
                  </a>
                ) : (
                  <p className="px-4 py-2  rounded-lg bg-gray-50 text-gray-500">N/A</p>
                )}
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Alert Days</label>
                <p className="px-4 py-2  rounded-lg bg-gray-50 text-gray-900">
                  {viewMeta.alertDays != null && viewMeta.alertDays !== ''
                    ? String(viewMeta.alertDays)
                    : 'N/A'}
                </p>
              </div>
            </>
          )}

          {/* Contract status */}
          {defaultValues && Object.keys(defaultValues).length > 0 && !hideStatus && !readOnly && (
            <div>
              <CustomSelect
                label="Status"
                value={watch('status') ?? ''}
                onChange={(val) => setValue('status', val)}
                disabled={readOnly}
                showPlaceholder={false}
                options={statuses
                  .filter(status => {
                    const current = defaultValues?.status;
                    if (current) {
                      return status.key === current || status.key === 'CLOSED';
                    }
                    return false;
                  })
                  .map(status => ({
                    key: status.key,
                    label: titleCase(status.label),
                  }))
                }
              />
              <ErrorMsg message={errors.status?.message} />
            </div>
          )}

        </div>

        {/* Contract Terms */}
        <div>
          <label className="block text-gray-700 mb-2">Contract Terms</label>
          {readOnly ? (
            <ReadOnlyTextBlock value={watchedContractTerms} />
          ) : (
            <textarea
              {...register('contractTerms')}
              rows={3}
              placeholder="Briefly describe the contract terms"
              className={fieldClass}
            />
          )}
        </div>
      </section>

      {/* Partner Information  */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Partner / Vendor Information</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => appendPartner({ partnerName: '', contactPerson: '', contactNumber: '' })}
              className="flex items-center gap-2 px-3 py-1 text-primary hover:bg-primary/5 rounded-lg cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Partner
            </button>
          )}
        </div>

        <ErrorMsg message={errors.partners?.message} />

        {partnerFields.map((field, index) => (
          <div key={field.id} className="p-4 border border-gray-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 font-medium">Partner {index + 1}</span>
              {!readOnly && partnerFields.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemovePartner(index)}
                  className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-700 mb-1">
                  Partner Name <span className="text-red-500">*</span>
                </label>
                <div className="relative w-full">
                  <input
                    {...register(`partners.${index}.partnerName`)}
                    type="text"
                    onChange={(e) => {
                      register(`partners.${index}.partnerName`).onChange(e);
                      handlePartnerSearch(e.target.value, index);
                    }}
                    autoComplete="off"
                    placeholder={readOnly ? undefined : 'e.g. Training Experts'}
                    disabled={readOnly}
                    readOnly={readOnly}
                    className={fieldClass}
                  />
                  {!readOnly && (partnerOptionsMap[index]?.length > 0) && (
                    <ul className="absolute left-0 top-full border border-gray-300 rounded-lg mt-1 max-h-48 overflow-y-auto bg-white z-10 w-full">
                      {partnerOptionsMap[index].map((p, idx) => (
                        <li
                          key={p.partnerId ?? idx}
                          className="px-3 py-2 hover:bg-primary/10 cursor-pointer"
                          onClick={() => handlePartnerSelect(p, index)}
                        >
                          {p.partnerName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <ErrorMsg message={errors.partners?.[index]?.partnerName?.message} />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Contact Person <span className="text-red-500">*</span>
                </label>
                <input
                  {...register(`partners.${index}.contactPerson`)}
                  type="text"
                  placeholder={readOnly ? undefined : 'e.g. Kim Long'}
                  disabled={readOnly}
                  readOnly={readOnly}
                  className={fieldClass}
                />
                <ErrorMsg message={errors.partners?.[index]?.contactPerson?.message} />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register(`partners.${index}.contactNumber`)}
                  type="text"
                  onKeyDown={readOnly ? undefined : (e) => {
                    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '+'];
                    if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder={readOnly ? undefined : 'e.g. +855 or 0102030405'}
                  disabled={readOnly}
                  readOnly={readOnly}
                  className={fieldClass}
                />
                <ErrorMsg message={errors.partners?.[index]?.contactNumber?.message} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Contract Dates & Value */}
      <section className="space-y-4">
        <h3 className="font-semibold text-gray-800">Contract Dates & Value</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 mb-2">
              Effective Date <span className="text-red-500">*</span>
            </label>
            {readOnly ? (
              <ReadOnlyDateDisplay dateString={watchedEffectiveDate} />
            ) : (
              <input
                {...register('effectiveDate')}
                type="date"
                className={fieldClass}
              />
            )}
            <ErrorMsg message={errors.effectiveDate?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            {readOnly ? (
              <ReadOnlyDateDisplay dateString={watchedExpiryDate} showRemaining />
            ) : (
              <input
                {...register('expiryDate')}
                type="date"
                className={fieldClass}
              />
            )}
            <ErrorMsg message={errors.expiryDate?.message} />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Renewal Frequency (months)</label>
            <input
              type="text"
              value={renewalFrequency > 0 ? `${renewalFrequency} month${pluralS(renewalFrequency)}` : 'Auto calculated'}
              disabled
              className={readOnly ? fieldClass : 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500'}
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">
              Total Contract Value (USD) <span className="text-red-500">*</span>
            </label>
            <Controller
              name="contractValue"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  value={formatContractValueThousands(field.value ?? '')}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  readOnly={readOnly}
                  disabled={readOnly}
                  onChange={readOnly ? undefined : (e) => field.onChange(sanitizeContractValueInput(e.target.value))}
                  onKeyDown={readOnly ? undefined : (e) => {
                    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', ',', '.']
                    if (allowed.includes(e.key)) return
                    if (!/^\d$/.test(e.key)) e.preventDefault()
                  }}
                  placeholder={readOnly ? undefined : 'e.g. 5000'}
                  className={fieldClass}
                />
              )}
            />
            <ErrorMsg message={errors.contractValue?.message} />
          </div>
        </div>
      </section>

      {/* Alert Settings */}
      <section className="space-y-4">


        {!readOnly && (
          <>
            <h3 className="font-semibold text-gray-800">Alert Settings</h3>
            <div>
              <label className="block text-gray-700 mb-2">Auto Alert (Days Before Expiry) <span className="text-red-500">*</span></label>
              <input
                {...register('autoAlertDays')}
                type="number"
                min="1"
                className={fieldClass}
              />
              <ErrorMsg message={errors.autoAlertDays?.message} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-gray-700">Manual Alert Dates</label>
                <button
                  type="button"
                  onClick={() => appendAlertDate({ value: '' })}
                  className="flex items-center gap-2 px-3 py-1 text-primary hover:bg-primary/5 rounded-lg cursor-pointer text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Alert Date
                </button>
              </div>

              {alertDateFields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <input
                      {...register(`manualAlertDates.${index}.value`)}
                      type="date"
                      className={fieldClass}
                    />
                    {errors.manualAlertDates?.[index]?.value?.message && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.manualAlertDates[index].value.message}
                      </p>
                    )}
                  </div>
                  {alertDateFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAlertDate(index)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div>
          <label className="block text-gray-700 mb-2">Remarks / Comments</label>
          {readOnly ? (
            <ReadOnlyTextBlock value={watchedRemarks} />
          ) : (
            <>
              <textarea
                {...register('remarks')}
                rows={3}
                maxLength={500}
                placeholder="Add remarks or comments about the contract"
                className={fieldClass}
              />
              <p className="text-gray-500 mt-1">{watchedRemarks.length}/500 characters</p>
            </>
          )}
          <ErrorMsg message={errors.remarks?.message} />
        </div>
      </section>

      {/* Document Attachments */}
      <section className="space-y-4">
        <h3 className="font-semibold text-gray-800">
          Document Attachments {!readOnly && <span className="text-red-500">*</span>}
        </h3>

        {!readOnly && (
          <>
            <input
              ref={replaceInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void handleReplaceSelected(file)
              }}
            />
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileSelect}
              className="hidden"
              id={fileInputId}
            />
            <label
              htmlFor={fileInputId}
              className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 mb-2">Click to upload or drag and drop</p>
              <p className="text-gray-500 mb-4">PDF, DOC, DOCX (Max 10MB per file, total 50MB)</p>
              <span className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Choose Files
              </span>
            </label>
            <ErrorMsg message={errors.attachments?.message ?? fileError ?? undefined} />
          </>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-700">
              Uploaded File{pluralS(uploadedFiles.length)} ({uploadedFiles.length})
            </p>
            {uploadedFiles.map((file) => {
              const fileName = file.file.name
              const isPdf = isPdfAttachment(file.file) || isPdfFileName(fileName)
              const fileSizeLabel = formatAttachmentFileSize(file.displaySize ?? file.file.size)
              const fileMetaLine = (() => {
                if (file.uploadedAt && file.uploadedByName) {
                  return `${fileSizeLabel} · Uploaded ${formatDate(file.uploadedAt)} by ${file.uploadedByName}`
                }
                if (file.uploadedAt) {
                  return `${fileSizeLabel} · Uploaded ${formatDate(file.uploadedAt)}`
                }
                return fileSizeLabel
              })()

              const fileIcon = isPdf ? (
                <img src="/pdf-logo.png" alt="PDF" className="w-5 h-5 shrink-0 object-contain" />
              ) : (
                <FileText className="w-5 h-5 text-primary shrink-0" />
              )

              if (readOnly) {
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {fileIcon}
                      <div className="min-w-0 flex-1">
                        <p className="text-gray-900 truncate" title={fileName}>{fileName}</p>
                        <p className="text-gray-500 text-sm mt-0.5">{fileMetaLine}</p>
                      </div>
                    </div>
                    {file.fileId && onDownloadFile ? (
                      <button
                        type="button"
                        disabled={downloadingFileIds?.has(file.fileId)}
                        onClick={() => onDownloadFile(file.fileId!, fileName)}
                        className="inline-flex items-center gap-2 text-primary hover:text-brand-navy text-sm font-medium cursor-pointer disabled:opacity-50 disabled:pointer-events-none shrink-0"
                      >
                        {downloadingFileIds?.has(file.fileId) ? (
                          <>
                            <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                            <span>Downloading…</span>
                          </>
                        ) : (
                          <span>Download</span>
                        )}
                      </button>
                    ) : null}
                  </div>
                )
              }

              return (
                <div
                  key={file.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openReplacePicker(file)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openReplacePicker(file)
                    }
                  }}
                  title="Click to replace file"
                  className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:border-primary/50 hover:bg-gray-100/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0 pointer-events-none">
                    {fileIcon}
                    <span className="text-gray-900 truncate" title={fileName}>{fileName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-gray-500 text-sm pointer-events-none">{fileSizeLabel}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const nextFiles = uploadedFiles.filter((f) => f.id !== file.id)
                        if (nextFiles.length === 0) setFileError('File upload is required')
                        onFilesChange(nextFiles)
                      }}
                      className="text-red-600 hover:bg-red-50 p-1 rounded cursor-pointer pointer-events-auto"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {readOnly && uploadedFiles.length === 0 && (
          <p className="text-gray-500 text-sm">No documents uploaded</p>
        )}
      </section>
    </div>
  )

  if (readOnly) {
    return <div className="space-y-0">{body}</div>
  }

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(handleFormSubmit as any)}
      className="space-y-0"
    >
      {body}
      {!hideFooter && (
        <div className={footer}>
          {onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="px-6 py-2 text-primary rounded-lg bg-white border border-primary hover:bg-primary/10 cursor-pointer transition-colors"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      )}
    </form>
  )
}