import { z } from "zod";

export const optionalString = (schema: z.ZodString)=>
  schema.trim().optional().transform((val) => (val === "" ? undefined : val));
const textRegex = /^[A-Za-z\s]+$/;
const phoneRegex = /^(0\d{8,9}|\+855\d{8,9})$/;
const titleRegex = /^(?!\d+$)[a-zA-Z0-9\s\.\-\(\)]+$/;

const contractValueField = z.preprocess(
  (val) => (typeof val === 'string' ? val.replace(/,/g, '').trim() : val),
  z.string()
    .min(1, 'Contract Value is required')
    .refine((v) => v !== '' && !isNaN(Number(v)), { message: 'Must be a number' })
    .refine((v) => Number(v) > 0, { message: 'Must be greater than 0 ' })
)

export const partnerSchema = z.object({
  partnerId: z.number().nullable().optional(),
  partnerName: z.string()
    .trim()
    .min(1, "Partner name is required")
    .regex(textRegex, "Partner name can contain only letters and spaces"),
  contactPerson: optionalString(
    z.string()
    .trim()
    .min(1, "Contract person is required")
    .regex(textRegex, "Contract person can contain only letters and spaces")
  ) 
    .refine((val) => !val || textRegex.test(val),{
      message: "Contact person can contain only letters and spaces",
    }),
  contactNumber: optionalString(
    z.string()
    .trim()
    .min(1,"Contact Number is required")
  )
    .refine((val) => !val || phoneRegex.test(val), {
      message: "Invalid phone number (e.g. 0123456789 or +855123456789)",
    })
});

export function getContractSchema (opts?: { requireAttachments?: boolean }) {
  const requireAttachments = opts?.requireAttachments ?? true
  return z.object({
    title: z.string()
      .trim()
      .min(1, "Contract title is required")
      .max(250, "Contract title cannot exceed 250 characters")
      .regex(titleRegex, "Contract title can contain letters and numbers alone not allowed"),

    contractType: z.string(),
    department: z.string().min(1, "Department is required"),
    personInCharge: z
      .string()
      .trim()
      .min(1, "Person in charge is required")
      .max(50,"Person in charge cannot exceed 50 characters")
      .regex(textRegex, "Person in charge can contain only letters and spaces"),
    status: z.string().optional(),
    contractTerms: z
      .string()
      .trim()
      .optional(),
    effectiveDate: z
      .string()
      .min(1, "Effective date is required"),
    expiryDate: z
      .string()
      .min(1, "Expiry date is required"),
    contractValue: contractValueField,
    attachments: requireAttachments
      ? z.array(z.instanceof(File), { message: 'File upload is required' }).min(1, 'File upload is required')
      : z.preprocess((val) => val ?? [], z.array(z.instanceof(File))),
    autoAlertDays: z.string()
      .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
        message: "Alert days must be greater than 0",
      }),
    confidential: z.boolean(),
    autoRenew: z.boolean(),
    remarks: z.string()
      .max(500,"Remarks cannot exceed 500 characters")
      .optional(),
    partners: z.array(partnerSchema)
      .min(1, "At least one partner is required"),
    manualAlertDates: z.array(z.object({ value: z.string() })),
  })
    .superRefine((data, ctx) => {
      const hasAutoAlert = Boolean(data.autoAlertDays) && Number(data.autoAlertDays) > 0
      const hasManualAlert = (data.manualAlertDates ?? []).some((d) => Boolean(d.value))
      if (!hasAutoAlert && !hasManualAlert) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Auto Alert at least 1 day before expiry',
          path: ['autoAlertDays'],
        })
      }
    })
}

export const contractSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Contract title is required")
    .max(250, "Contract title cannot exceed 250 characters")
    .regex(titleRegex, "Contract title can contain letters and numbers alone not allowed"),

  contractType: z.string(),
  department: z.string().min(1, "Department is required"),
  personInCharge: z
    .string()
    .trim()
    .min(1, "Person in charge is required")
    .max(50,"Person in charge cannot exceed 50 characters")
    .regex(textRegex, "Person in charge can contain only letters and spaces"),
  status: z.string().optional(),
  contractTerms: z
    .string()
    .trim()
    .optional(),
  effectiveDate: z
    .string()
    .min(1, "Effective date is required"),
  expiryDate: z
    .string()
    .min(1, "Expiry date is required"),
  contractValue: contractValueField,
  attachments: z
    .array(z.instanceof(File), { message: 'File upload is required' })
    .min(1, 'File upload is required'),
  autoAlertDays: z.string()
    .min(1,'Auto Alert at least 1 day before expiry')
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
      message: "Alert days must be greater than 0",
    }),
  confidential: z.boolean(),
  autoRenew: z.boolean(),
  remarks: z.string()
    .max(500,"Remarks cannot exceed 500 characters")
    .optional(),
  partners: z.array(partnerSchema)
    .min(1, "At least one partner is required"),
  manualAlertDates: z.array(z.object({ value: z.string() })),
})
  .superRefine((data, ctx) => {
    const hasAutoAlert = Boolean(data.autoAlertDays) && Number(data.autoAlertDays) > 0
    const hasManualAlert = (data.manualAlertDates ?? []).some((d) => Boolean(d.value))
    if (!hasAutoAlert && !hasManualAlert) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Auto Alert at least 1 day before expiry',
        path: ['autoAlertDays'],
      })
    }
  });


export type ContractFormValues = z.infer<typeof contractSchema>;


export const renewalSchema = z
  .object({
    effectiveDate: z.string().min(1, "Effective date is required"),

    expiryDate: z.string().min(1, "Expiry date is required"),

    contractValue: contractValueField,

    autoAlertDays: z.string()
      .refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
        message: "Alert days must be greater than 0",
      }),

    manualAlertDates: z.array(z.object({ value: z.string() })),

    remarks: z.string()
      .max(500, "Max 500 characters")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const hasAutoAlert = Boolean(data.autoAlertDays) && Number(data.autoAlertDays) > 0
    const hasManualAlert = (data.manualAlertDates ?? []).some((d) => Boolean(d.value))
    if (!hasAutoAlert && !hasManualAlert) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Auto Alert at least 1 day before expiry',
        path: ['autoAlertDays'],
      })
    }
  });

export type RenewalFormValues = z.infer<typeof renewalSchema>;