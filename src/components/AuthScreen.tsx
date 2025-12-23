import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

import { toast } from 'sonner';
import foxerLogo from '@/assets/foxer-logo.png';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  mode: AuthMode;
  onBack: () => void;
  onToggleMode: () => void;
}

export function AuthScreen({ mode, onBack, onToggleMode }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
 
  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password');
          } else {
            setError(error.message);
          }
          return;
        }
        toast.success('Welcome back!');
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes('already registered')) {
            setError('This email is already registered');
          } else {
            setError(error.message);
          }
          return;
        }
        toast.success('Account created successfully!');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 border-b border-border">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h1>
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

          {/* Form */}
         <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up">
  <div>
    <label className="block text-sm font-medium mb-2">Email</label>
    <Input
      type="email"
      placeholder="Enter your email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      autoComplete="email"
    />
  </div>

  <div>
    <label className="block text-sm font-medium mb-2">Password</label>
    <div className="relative">
      <Input
        type={showPassword ? 'text' : 'password'}
        placeholder="Enter your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={isLogin ? 'current-password' : 'new-password'}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent transition-colors"
      >
        {showPassword ? (
          <EyeOff className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Eye className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
    </div>
  </div>

  {!isLogin && (
    <div>
      <label className="block text-sm font-medium mb-2">Confirm Password</label>
      <Input
        type="password"
        placeholder="Confirm your password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
      />
    </div>
  )}

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
      <span className="animate-pulse-subtle">
        {isLogin ? 'Signing in...' : 'Creating account...'}
      </span>
    ) : (
      isLogin ? 'Sign In' : 'Create Account'
    )}
  </Button>
</form>

{isLogin && (
  <p className="mt-4 text-sm text-gray-500 text-center">
    Forgot your password?{' '}
    <a
      href="mailto:satyshivansh39@gmail.com?subject=Foxer%20Password%20Help"
      className="text-blue-600 font-medium hover:underline"
    >
      Contact support@foxer.in
    </a>
  </p>
)}

          {/* Toggle */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={onToggleMode}
              className="font-medium text-foreground hover:underline"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      {/* Forgot Password Dialog */}
     
    </div>
  );
}
