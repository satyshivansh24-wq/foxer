import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import foxerLogo from '@/assets/foxer-logo.png';

interface ResetPasswordScreenProps {
    onBack: () => void;
    onSuccess: () => void;
}

export function ResetPasswordScreen({ onBack, onSuccess }: ResetPasswordScreenProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sessionChecked, setSessionChecked] = useState(false);

    // Check if user has a valid session from the reset link
    useEffect(() => {
        const checkSession = async () => {
            try {
                // Get parameters from hash (Supabase sends them in hash)
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);

                // Also check query string
                const searchParams = new URLSearchParams(window.location.search);

                const type = params.get('type') || searchParams.get('type');
                const token = params.get('access_token') || searchParams.get('token');
                const errorParam = params.get('error') || searchParams.get('error');
                const errorDescription = params.get('error_description') || searchParams.get('error_description');

                // Check for error parameters from Supabase
                if (errorParam) {
                    const errorMsg = errorDescription
                        ? decodeURIComponent(errorDescription).replace(/\+/g, ' ')
                        : errorParam;
                    setError(`${errorMsg}`);
                    setSessionChecked(true);
                    return;
                }

                // Check if this is a recovery/reset password flow
                if (type === 'recovery' && token) {
                    // Valid reset link, Supabase automatically handles the session
                    // Give it a moment to establish the session
                    await new Promise(resolve => setTimeout(resolve, 800));

                    // Check if session was established
                    const { data } = await supabase.auth.getSession();
                    if (data.session) {
                        setSessionChecked(true);
                        // Clear the hash from URL
                        window.history.replaceState({}, document.title, window.location.pathname);
                        return;
                    }

                    // If session still not established, allow proceeding anyway
                    setSessionChecked(true);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                // Also check if user has a valid session (already authenticated)
                const { data } = await supabase.auth.getSession();
                if (data.session) {
                    setSessionChecked(true);
                    window.history.replaceState({}, document.title, window.location.pathname);
                    return;
                }

                // No valid reset link and no session, redirect back
                setError('Invalid or expired reset link. Please request a new one.');
                setTimeout(() => onBack(), 2000);
            } catch (err) {
                console.error('Session check error:', err);
                setError('Error validating reset link. Please try again.');
                setTimeout(() => onBack(), 2000);
            }
        };

        checkSession();
    }, [onBack]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        // Additional password strength validation
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            setError('Password must contain uppercase, lowercase, and numbers');
            return;
        }

        setIsLoading(true);

        try {
            // Update the user's password
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                console.error('Password update error:', error);
                setError(error.message || 'Failed to reset password. Please try again.');
                setIsLoading(false);
                return;
            }

            toast.success('Password reset successfully!');

            // Sign out and redirect to login
            await supabase.auth.signOut();

            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    if (!sessionChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-6">
                <div className="text-center max-w-sm">
                    {error ? (
                        <>
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Error</h3>
                            <p className="text-muted-foreground text-sm mb-6">{error}</p>
                            <Button onClick={onBack} className="w-full">
                                Back to Login
                            </Button>
                        </>
                    ) : (
                        <>
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <p className="text-muted-foreground">Validating reset link...</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="flex items-center gap-4 p-4 border-b border-border">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
                    disabled={isLoading}
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-semibold">Reset Password</h1>
            </header>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="flex justify-center mb-8 animate-scale-in">
                        <div className="w-16 h-16">
                            <img
                                src={foxerLogo}
                                alt="Foxer Logo"
                                className="w-full h-full object-contain dark:invert"
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold mb-2">Create New Password</h2>
                        <p className="text-sm text-muted-foreground">
                            Enter a strong password to secure your account
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">
                        <div>
                            <label className="block text-sm font-medium mb-2">New Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter new password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                At least 6 characters with uppercase, lowercase, and numbers
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Confirm Password</label>
                            <div className="relative">
                                <Input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={isLoading}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-destructive text-center">{error}</p>
                        )}

                        <Button
                            type="submit"
                            variant="hero"
                            className="w-full mt-6"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                'Reset Password'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground mt-6">
                        Your password reset link will expire in 24 hours. Make sure to update your password within this timeframe.
                    </p>
                </div>
            </div>
        </div>
    );
}
