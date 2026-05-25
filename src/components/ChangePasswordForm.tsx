import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast, { Toaster } from 'react-hot-toast';
import { ChangePasswordFormValues, changePasswordSchema } from '../lib/changePasswordSchema';

interface ChangePasswordProps {
  onSubmit: (
    currentPassword: string, 
    newPassword: string, 
    confirmPassword: string
) => Promise<void>; 
  onCancel?: () => void;
}

const ErrorMsg = ({ message }: { message?: string }) =>
    message ? <p className="text-red-500 text-sm mt-1">{message}</p> : null;

export function ChangePasswordForm({ onSubmit, onCancel }: ChangePasswordProps) {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
    });

    const onFormSubmit = async (data: ChangePasswordFormValues) => {
        try {
            await onSubmit(data.currentPassword, data.newPassword, data.confirmPassword); 
            toast.success('Password changed successfully!');
            reset();
        } catch (error: any) {
            const errData = error?.response?.data;
            const message = errData?.errors && typeof errData.errors === 'object'
                ? Object.values(errData.errors).join(', ')
                : errData?.detail ?? errData?.message ?? errData?.title ?? 'Failed to change password';
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-gray-900 mb-2">Reset New Password</h1>
                    <p className="text-gray-600">Enter your current and new password</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">

                    {/* Current Password */}
                    <div>
                        <label className="block text-gray-700 mb-2">Current Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                {...register('currentPassword')}
                                type={showCurrent ? 'text' : 'password'}
                                disabled={isSubmitting}
                                placeholder="Enter your current password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <ErrorMsg message={errors.currentPassword?.message} />
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-gray-700 mb-2">New Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                {...register('newPassword')}
                                type={showNew ? 'text' : 'password'}
                                disabled={isSubmitting}
                                placeholder="Enter your new password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <ErrorMsg message={errors.newPassword?.message} />
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-gray-700 mb-2">Confirm New Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input
                                {...register('confirmPassword')}
                                type={showConfirm ? 'text' : 'password'}
                                disabled={isSubmitting}
                                placeholder="Confirm your new password"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                            >
                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <ErrorMsg message={errors.confirmPassword?.message} />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                            {isSubmitting ? 'Reseting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}