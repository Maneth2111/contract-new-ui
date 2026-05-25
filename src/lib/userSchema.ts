import z from "zod";
import { optionalString } from "./contractSchema";

export const PHONE_REGEX = /^0\d{6,14}$/
export const FULL_NAME_EXAMPLE = 'SOK Raksmey' as const
export const FULL_NAME_REGEX = /^[A-Z]{2,}(\s+[a-z]{2,})+$/
export const JOB_TITLE_REGEX = /^[A-Za-z\s]+$/;
export const EDIT_PHONE_REGEX = /^(0\d{8,9}|\+855\d{8,9})$/;
export const EMAIL = 'raksmey.sok@chokchey.com.kh ' as const;
export const CHOKCHEY_WORK_EMAIL_REGEX =
  /^[a-z]+(?:\.[a-z]+)+@chokchey\.com\.kh$/;
export const NAME_REGEX = /^[a-zA-Z ]+$/;

export const userSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, 'Full name is required')
    .max(50, 'Full name must not exceed 50 characters')
    .regex(NAME_REGEX, "Full name must contain only letters")
  ,

  employeeId: z.string()
    .trim()
    .min(1, "Employee ID is required")
    .max(30, "Employee ID must not exceed 30 characters")
    .regex(/^\d+$/, "Employee ID allow only numbers"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(100, "Email must not exceed 100 characters")
    .transform((val) => val.toLowerCase())
    .pipe(z
      .string()
      .regex(
        CHOKCHEY_WORK_EMAIL_REGEX,
        `Invalid email (e.g. ${EMAIL})`,
      ),
    ),

  phoneNumber: optionalString(
    z.string()
  ).refine((val) => !val || EDIT_PHONE_REGEX.test(val), {
    message: "Invalid phone number (e.g. 0123456789 or +855123456789)",
  }),

  jobTitle: z
    .string()
    .trim()
    .refine((val) => val === '' || JOB_TITLE_REGEX.test(val), {
      message: 'Job title can contain only letters and spaces',
    }),

  status: z.string()
    .min(1, "Status is required"),

  departmentId: z.number()
    .min(1, "Department is required"),

  roleNames: z.array(z.string())
    .min(1, "Please select a role"),

  deptAccessIds: z.array(z.number())
    .min(1, "Please select at least one department access"),

  contractPermissionIds: z.array(z.number())
    .min(1, "Select at least one Contract Access"),

  userPermissionIds: z.array(z.number()),
});

export const editUserSchema = userSchema.extend({
  phoneNumber: optionalString(
    z.string()
      .min(1, 'Phone number is required')
  )
    .refine((val) => !val || EDIT_PHONE_REGEX.test(val), {
      message: "Invalid phone number (e.g. 0123456789 or +855123456789)",
    }),
  jobTitle: z
    .string()
    .trim()
    .min(1, 'Job title is required')
    .regex(JOB_TITLE_REGEX, 'Job title can contain only letters and spaces'),
})

