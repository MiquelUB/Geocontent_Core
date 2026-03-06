"use client";

import { useState, useEffect, useCallback } from "react";
import { HomeScreen } from "../components/screens/HomeScreen";
import { LegendsScreen } from "../components/screens/LegendsScreen";
import { LegendDetailScreen } from "../components/screens/LegendDetailScreen";
import { MapScreen } from "../components/screens/MapScreen";
import { ProfileScreen } from "../components/screens/ProfileScreen";
import { SplashScreen } from "../components/screens/SplashScreen";
import { ErrorScreen } from "../components/screens/ErrorScreen";
import { BottomNavigation } from "../components/BottomNavigation";
import { useGeolocation } from "../hooks/useGeolocation";
import { SimpleLogin } from "../components/auth/SimpleLogin";
import { OnboardingModal } from "../components/OnboardingModal";
import { useOnboarding } from "../hooks/useOnboarding";
import { getAppBranding } from "@/lib/actions";




export default function Home() {
  const [currentScreen, setCurrentScreen] = useState("splash");
  const [navigationData, setNavigationData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [errorType, setErrorType] = useState<"no-connection" | "gps-denied" | "general" | null>(null);

  const { location, error: geoError } = useGeolocation();
  const { isOpen: isOnboardingOpen, completeOnboarding, skipOnboarding, reopenOnboarding } = useOnboarding(currentScreen === "home");



  useEffect(() => {
    if (geoError) {
      console.log("Geolocation error:", geoError);
      // Optional: handle GPS error state here if strict dependency
    }
  }, [geoError]);

  // Simulació de càrrega inicial i comprovacions
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isOnline = navigator.onLine;
        if (!isOnline) {
          setErrorType("no-connection");
          return;
        }

        // Check if returning from magic link auth callback
        const urlParams = new URLSearchParams(window.location.search);
        const authSuccess = urlParams.get('auth_success');
        const uid = urlParams.get('uid');

        if (authSuccess === '1' && uid) {
          console.log("Auth callback detected, loading profile for:", uid);
          try {
            const { getUserProfile } = await import("@/lib/actions");
            const profile = await getUserProfile(uid);
            if (profile) {
              setCurrentUser(profile);
              localStorage.setItem("core_user", JSON.stringify(profile));
              console.log("Magic link login successful:", profile);
            }
          } catch (err) {
            console.error("Error loading profile after magic link:", err);
          }
          // Clean URL params
          window.history.replaceState({}, '', '/');
        } else {
          // Check for persisted user session with VALIDATION
          const savedUserString = localStorage.getItem("core_user");
          if (savedUserString) {
            try {
              const { getUserProfile } = await import("@/lib/actions");
              const savedUser = JSON.parse(savedUserString);
              if (savedUser?.id) {
                console.log("Validating session for:", savedUser.id);
                const profile = await getUserProfile(savedUser.id);
                if (profile) {
                  console.log("Session valid.");
                  setCurrentUser(profile);
                } else {
                  console.warn("Invalid session found. Clearing.");
                  localStorage.removeItem("core_user");
                  setCurrentUser(null);
                }
              } else {
                localStorage.removeItem("core_user");
                setCurrentUser(null);
              }
            } catch (err) {
              console.error("Error parsing/validating user session:", err);
              localStorage.removeItem("core_user");
              setCurrentUser(null);
            }
          }
        }

        // Fetch branding data
        const brands = await getAppBranding();
        setBrand(brands);

        setIsLoaded(true);
      } catch (e) {
        console.error("Error en inicialitzar:", e);
        setErrorType("general");
      }
    };

    checkStatus();
  }, []);


  const handleNavigate = (screen: string, data?: any) => {
    setNavigationData(data);
    setCurrentScreen(screen);
  };

  const handleSplashComplete = useCallback(() => {
    // If data is still loading, wait (splash will retry via its own loop)
    if (!isLoaded && !errorType) {
      console.log("Splash finished but brand not ready. Waiting...");
      return;
    }

    if (errorType) {
      setCurrentScreen("error");
    } else if (currentUser || process.env.NEXT_PUBLIC_AUDIT_MODE === 'true') {
      setCurrentScreen("home");
    } else {
      setCurrentScreen("login");
    }
  }, [isLoaded, errorType, currentUser]);

  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setCurrentScreen("home");
  };

  const handleRetry = () => {
    setErrorType(null);
    setCurrentScreen("splash");
    // Tornar a executar la lògica de càrrega
    window.location.reload();
  };

  const handleUserUpdate = (updatedUser: any) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("core_user", JSON.stringify(updatedUser));
  };

  // Renderitzat condicionals de pantalles
  const renderScreen = () => {
    switch (currentScreen) {
      case "splash":
        return <SplashScreen onComplete={handleSplashComplete} brand={brand} />;
      case "login":
        return <SimpleLogin onLoginSuccess={handleLoginSuccess} />;
      case "home":
        return <HomeScreen onNavigate={handleNavigate} onOpenHelp={reopenOnboarding} brand={brand} userLocation={location} error={geoError} />;

      case "legends":
        return <LegendsScreen onNavigate={handleNavigate} brand={brand} />;
      case "legend-detail":
        return <LegendDetailScreen legend={navigationData} onNavigate={handleNavigate} userLocation={location} currentUser={currentUser} onUserUpdate={handleUserUpdate} />;
      case "map":
        return <MapScreen onNavigate={handleNavigate} focusLegend={navigationData} brand={brand} userLocation={location} onOpenHelp={reopenOnboarding} />;

      case "profile":
        return <ProfileScreen onNavigate={handleNavigate} currentUser={currentUser} onUserUpdate={handleUserUpdate} />;
      case "error":
        return (
          <ErrorScreen
            type={errorType || "general"}
            onRetry={handleRetry}
            onNavigate={handleNavigate}
          />
        );
      default:
        return <HomeScreen onNavigate={handleNavigate} onOpenHelp={reopenOnboarding} />;
    }
  };

  // Determinar si cal mostrar la navegació inferior
  // Show on all screens EXCEPT splash and error
  const showBottomNav = !["splash", "error", "login"].includes(currentScreen);



  return (
    <div className="mobile-app bg-background text-foreground h-screen w-full flex flex-col">
      <main className={`flex-1 relative ${currentScreen === 'legend-detail' ? 'overflow-y-auto' : 'overflow-auto'} scrollbar-hide`}>
        {renderScreen()}
      </main>

      {showBottomNav && (
        <div className="flex flex-col items-center mb-4">
          <div className="mb-2 opacity-30 select-none pointer-events-none">
            <span className="text-[9px] font-serif italic tracking-[0.15em] text-stone-500 uppercase">
              Projecte Xino Xano
            </span>
          </div>
          <BottomNavigation
            currentScreen={currentScreen}
            onScreenChange={handleNavigate}
          />
        </div>
      )}

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
        onNavigate={handleNavigate}
      />

    </div>
  );
}
