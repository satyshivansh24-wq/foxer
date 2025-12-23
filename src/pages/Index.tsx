import { useState, useEffect } from 'react';
import { SplashScreen } from '@/components/SplashScreen';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { AuthScreen } from '@/components/AuthScreen';
import { Dashboard } from '@/components/Dashboard';
import { useAuth } from '@/contexts/AuthContext';

type Screen = 'splash' | 'welcome' | 'login' | 'signup' | 'dashboard';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [splashComplete, setSplashComplete] = useState(false);

  // Splash complete handler
  const handleSplashComplete = () => {
    setSplashComplete(true);
  };

  // After splash: decide initial screen
  useEffect(() => {
    if (!splashComplete || loading) return;

    if (user) {
      setCurrentScreen('dashboard');
    } else {
      setCurrentScreen('welcome');
    }
  }, [splashComplete, loading, user]);

  // Handle auth state changes
  useEffect(() => {
    if (!splashComplete || loading) return;

    if (user && currentScreen !== 'dashboard') {
      setCurrentScreen('dashboard');
    }

    if (!user && currentScreen === 'dashboard') {
      setCurrentScreen('welcome');
    }
  }, [user, loading, splashComplete, currentScreen]);

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
        onToggleMode={() =>
          setCurrentScreen(currentScreen === 'login' ? 'signup' : 'login')
        }
      />
    );
  }

  return <Dashboard onLogout={handleLogout} />;
};

export default Index;

