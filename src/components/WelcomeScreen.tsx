import { Button } from '@/components/ui/button';
import foxerLogo from '@/assets/foxer-logo.png';

interface WelcomeScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export function WelcomeScreen({ onLogin, onSignup }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div className="animate-scale-in mb-8">
          <div className="w-20 h-20">
            <img 
              src={foxerLogo} 
              alt="Foxer Logo" 
              className="w-full h-full object-contain dark:invert"
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center mb-12 animate-fade-in-up stagger-1 opacity-0">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Foxer
          </h1>
        </div>


        {/* Buttons */}
        <div className="w-full space-y-3 animate-fade-in-up stagger-3 opacity-0">
          <Button 
            variant="hero" 
            className="w-full"
            onClick={onSignup}
          >
            Create Account
          </Button>
          <Button 
            variant="heroOutline" 
            className="w-full"
            onClick={onLogin}
          >
            Sign In
          </Button>
        </div>
        {/* Beta Disclaimer */}
<footer className="mt-10 text-center text-xs text-muted-foreground">
  © 2025 Foxer • Beta Version
  <br />
  Storage limits are subject to fair usage.
</footer>

      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
