import './App.css'
import { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { DemoModeProvider } from '@/lib/DemoModeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import OnboardingModal from '@/components/OnboardingModal';
import { User } from '@/entities/all';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError, isAuthenticated, navigateToLogin, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  // Check if user needs onboarding
  useEffect(() => {
    const checkUserProfile = async () => {
      if (isAuthenticated && user) {
        try {
          const profile = await User.me();
          // Show onboarding if user doesn't have a username set
          if (!profile?.username) {
            setShowOnboarding(true);
          }
        } catch (error) {
          // If profile fetch fails, show onboarding
          setShowOnboarding(true);
        }
      }
      setIsCheckingProfile(false);
    };

    if (!isLoadingAuth && isAuthenticated) {
      checkUserProfile();
    } else if (!isLoadingAuth) {
      setIsCheckingProfile(false);
    }
  }, [isLoadingAuth, isAuthenticated, user]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingAuth || isCheckingProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // Don't auto-redirect for auth_required - let the user click login
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Force reload to get updated user data
    window.location.reload();
  };

  // Render the main app
  return (
    <>
      {showOnboarding && user && (
        <OnboardingModal user={user} onComplete={handleOnboardingComplete} />
      )}
      <Routes>
        <Route path="/" element={
          <LayoutWrapper currentPageName={mainPageKey}>
            <MainPage />
          </LayoutWrapper>
        } />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <DemoModeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <VisualEditAgent />
        </QueryClientProvider>
      </DemoModeProvider>
    </AuthProvider>
  )
}

export default App
