import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type StepType = 'email' | 'reset-sent' | 'error';

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<StepType>('email');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email) {
            setErrorMessage('Please enter your email address');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setErrorMessage('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            // Send password reset email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/`,
            });

            if (error) {
                setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
                setStep('error');
            } else {
                setStep('reset-sent');
                toast.success('Reset email sent successfully!');
            }
        } catch (err) {
            setErrorMessage('An unexpected error occurred. Please try again.');
            setStep('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setEmail('');
        setErrorMessage('');
        setStep('email');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                {step === 'email' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Reset Your Password</DialogTitle>
                            <DialogDescription>
                                Enter your email address and we'll send you a link to reset your password.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="email"
                                />
                            </div>

                            {errorMessage && (
                                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{errorMessage}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="hero"
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                            </div>
                        </form>
                    </>
                )}

                {step === 'reset-sent' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Check Your Email</DialogTitle>
                            <DialogDescription>
                                We've sent a password reset link to <strong>{email}</strong>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-950">
                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold">Reset link sent!</h3>
                                <p className="text-sm text-muted-foreground">
                                    Click the link in your email to reset your password. The link will expire in 24 hours.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 pt-4">
                            <p className="text-sm text-muted-foreground">
                                Didn't receive the email? Check your spam folder or try again with a different email.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleReset}
                            >
                                Try Again
                            </Button>
                            <Button
                                type="button"
                                className="w-full"
                                onClick={() => onOpenChange(false)}
                            >
                                Done
                            </Button>
                        </div>
                    </>
                )}

                {step === 'error' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Something Went Wrong</DialogTitle>
                            <DialogDescription>
                                We encountered an error while processing your request.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="font-semibold">Error</h3>
                                <p className="text-sm text-muted-foreground">{errorMessage}</p>
                            </div>
                        </div>

                        <Button
                            type="button"
                            className="w-full"
                            onClick={handleReset}
                        >
                            Try Again
                        </Button>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
