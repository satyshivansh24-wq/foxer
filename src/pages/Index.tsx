import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AuthScreen } from '@/components/AuthScreen';
import { Dashboard } from '@/components/Dashboard';
// import { ResetPasswordScreen } from '@/components/ResetPasswordScreen';
import { useAuth } from '@/contexts/AuthContext';

type Screen = 'splash' | 'welcome' | 'login' | 'signup' | 'dashboard';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [splashComplete, setSplashComplete] = useState(false);

  // Handle splash screen completion
  const handleSplashComplete = () => {
    setSplashComplete(true);
  };

  // Watch for auth state changes after splash
  useEffect(() => {
    if (splashComplete && !loading) {
      // Check if user is in password reset flow from email link
      // Parameters can be in hash (#) or query string (?)
     
      } else if (user) {
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('welcome');
      }
    }
  }, [splashComplete, user, loading]);

  // Watch for auth changes when already past splash
  useEffect(() => {
    if (splashComplete && !loading) {
      if (user && currentScreen !== 'dashboard') {
        setCurrentScreen('dashboard');
      } else if (!user && currentScreen === 'dashboard') {
        setCurrentScreen('welcome');
      }
    }
  }, [user, loading, splashComplete]);

  const handleLogout = async () => {
    await signOut();
    setCurrentScreen('welcome');
  };

  if (currentScreen === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onLogin={() => setCurrentScreen('login')}
        onSignup={() => setCurrentScreen('signup')}
      />
    );
  }

  if (currentScreen === 'login' || currentScreen === 'signup') {
    return (
      <AuthScreen
        mode={currentScreen}
        onBack={() => setCurrentScreen('welcome')}
        onToggleMode={() => setCurrentScreen(currentScreen === 'login' ? 'signup' : 'login')}
      />
    );
  }

 

  return <Dashboard onLogout={handleLogout} />;
};

export default Index;
