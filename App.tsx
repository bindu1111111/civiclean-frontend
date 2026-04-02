/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext, Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { MapView } from './components/MapView';
import { ReportForm } from './components/ReportForm';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { GarbageReport, RiskZone, UserProfile } from './types';
import { getPredictiveInsights } from './services/gemini';
import { auth, db, googleProvider, signInWithPopup, onAuthStateChanged, collection, onSnapshot, query, orderBy, addDoc, setDoc, doc, getDoc, handleFirestoreError, OperationType, User } from './firebase';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "{}");
        if (parsed.error) displayMessage = `Error: ${parsed.error}`;
      } catch (e) {
        displayMessage = this.state.errorInfo || displayMessage;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-red-50">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h1 className="text-xl font-bold text-red-900 mb-2">Application Error</h1>
          <p className="text-red-700 text-center max-w-md mb-6">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Auth Context
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reports, setReports] = useState<GarbageReport[]>([]);
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Create initial profile
            const newProfile: UserProfile = {
              id: currentUser.uid,
              displayName: currentUser.displayName || 'Anonymous User',
              points: 0,
              reportsCount: 0,
              rank: 'New Citizen'
            };
            await setDoc(doc(db, 'users', currentUser.uid), newProfile);
            setUserProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user) {
      setReports([]);
      setRiskZones([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const reportsQuery = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GarbageReport));
      setReports(reportsData);
      setDataLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reports');
    });

    const unsubscribeZones = onSnapshot(collection(db, 'riskZones'), (snapshot) => {
      const zonesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RiskZone));
      setRiskZones(zonesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'riskZones');
    });

    return () => {
      unsubscribeReports();
      unsubscribeZones();
    };
  }, [user]);

  // Predictive Insights Trigger
  useEffect(() => {
    if (reports.length > 0 && user) {
      const updatePredictions = async () => {
        try {
          // Only update if no zones or if last update was long ago
          if (riskZones.length === 0) {
            const insights = await getPredictiveInsights(reports);
            for (const insight of insights) {
              await addDoc(collection(db, 'riskZones'), {
                ...insight,
                lastUpdated: Date.now()
              });
            }
          }
        } catch (error) {
          console.error("Predictive insights update failed", error);
        }
      };
      updatePredictions();
    }
  }, [reports.length, user]);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleReportSubmit = async (newReport: any) => {
    if (!user || !userProfile) return;
    
    // Helper to remove undefined values recursively
    const sanitize = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(sanitize);
      if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
          Object.entries(obj)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, sanitize(v)])
        );
      }
      return obj;
    };

    try {
      const reportData = sanitize({
        userId: user.uid,
        ...newReport,
        status: 'pending'
      });
      await addDoc(collection(db, 'reports'), reportData);
      
      // Update user points
      const updatedProfile = {
        ...userProfile,
        points: userProfile.points + 50,
        reportsCount: userProfile.reportsCount + 1,
        rank: (userProfile.reportsCount + 1) > 10 ? 'Cleanliness Hero' : 'Active Citizen'
      };
      await setDoc(doc(db, 'users', user.uid), updatedProfile);
      setUserProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-lg font-bold text-gray-900">CivicClean AI+</p>
        <p className="text-sm text-gray-500">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome</h1>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Join the proactive movement to keep our cities clean using AI behavior tracking and predictive analytics.
          </p>
          <button 
            onClick={signIn}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6 bg-white rounded-full p-1" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ user, userProfile, loading: authLoading, signIn, signOut: handleSignOut }}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<MapView reports={reports} riskZones={riskZones} onQuickReport={handleReportSubmit} />} />
              <Route path="/report" element={<ReportForm onReportSubmit={handleReportSubmit} />} />
              <Route path="/dashboard" element={<Dashboard reports={reports} riskZones={riskZones} />} />
              <Route path="/profile" element={userProfile ? <Profile user={userProfile} reports={reports.filter(r => r.userId === user.uid)} /> : <Loader2 className="animate-spin mx-auto" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </Router>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}


