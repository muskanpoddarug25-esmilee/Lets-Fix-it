import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { setDoc, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { db, auth } from "../firebase";
import { 
  Shield, Sparkles, AlertCircle, Phone, Lock, User, Mail, 
  FileText, CheckCircle, Loader2, ArrowRight, MapPin, Briefcase, Sun, Moon, ArrowLeft
} from "lucide-react";
import Logo from "./Logo";
import CustomCaptcha from "./CustomCaptcha";
import ThemeToggle from "./ThemeToggle";

const INDIAN_CITIES = [
  "New Delhi",
  "Mumbai",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Patna",
  "Bhopal",
  "Guwahati"
];

const PEPPER = "LetsFixIt@India#2026!";

function generateSalt(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(PEPPER + salt + password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface LoginAttemptRecord {
  email: string;
  attempts: number;
  lastAttempt: any;
  lockedUntil: any;
  suspended: boolean;
}

// Check limit: returns { allowed: boolean, error?: string }
async function checkLoginRateLimit(email: string, isAdmin: boolean = false): Promise<{ allowed: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(db, "loginAttempts", cleanEmail);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { allowed: true };
    }
    const data = snap.data() as LoginAttemptRecord;
    if (data.suspended) {
      return { allowed: false, error: "Account suspended. Contact support at support@letsfixit.gov.in" };
    }
    const now = Date.now();
    if (data.lockedUntil) {
      const lockedTime = typeof data.lockedUntil === 'string' ? new Date(data.lockedUntil).getTime() : data.lockedUntil;
      if (now < lockedTime) {
        const remainingMin = Math.ceil((lockedTime - now) / 60000);
        return { 
          allowed: false, 
          error: `Account is temporarily locked. Please try again in ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.` 
        };
      }
    }
    return { allowed: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.toLowerCase().includes("offline") ||
      errMsg.toLowerCase().includes("network") ||
      errMsg.toLowerCase().includes("unreachable") ||
      errMsg.toLowerCase().includes("failed-precondition")
    ) {
      console.warn("Firestore offline when checking rate limit:", errMsg);
    } else {
      console.error("Error checking rate limit: ", err);
    }
    return { allowed: true };
  }
}

// Record failure: returns lock message
async function recordLoginFailure(email: string, isAdmin: boolean = false): Promise<string | null> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(db, "loginAttempts", cleanEmail);
    const snap = await getDoc(docRef);
    let attempts = 1;
    let suspended = false;
    let lockedUntil: number | null = null;
    
    if (snap.exists()) {
      const data = snap.data() as LoginAttemptRecord;
      attempts = (data.attempts || 0) + 1;
      suspended = data.suspended || false;
    }
    
    if (attempts >= 10) {
      suspended = true;
    } else if (isAdmin) {
      if (attempts >= 3) {
        lockedUntil = Date.now() + 30 * 60 * 1000; // 30 mins
        console.warn(`[SECURITY ALERT] Admin login failure threshold exceeded for ${cleanEmail}! Locking for 30 mins.`);
      }
    } else {
      if (attempts >= 5) {
        lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins
      }
    }
    
    await setDoc(docRef, {
      email: cleanEmail,
      attempts,
      lastAttempt: Date.now(),
      lockedUntil: lockedUntil ? new Date(lockedUntil).toISOString() : null,
      suspended
    }, { merge: true });
    
    if (suspended) {
      return "Account suspended. Contact support at support@letsfixit.gov.in";
    }
    if (lockedUntil) {
      const mins = isAdmin ? 30 : 15;
      return `Too many failed attempts. Account locked for ${mins} minutes.`;
    }
    return null;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.toLowerCase().includes("offline") ||
      errMsg.toLowerCase().includes("network") ||
      errMsg.toLowerCase().includes("unreachable") ||
      errMsg.toLowerCase().includes("failed-precondition")
    ) {
      console.warn("Firestore offline when recording failure:", errMsg);
    } else {
      console.error("Error recording failure: ", err);
    }
    return null;
  }
}

// Record success: reset attempts
async function recordLoginSuccess(email: string): Promise<void> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const docRef = doc(db, "loginAttempts", cleanEmail);
    await setDoc(docRef, {
      attempts: 0,
      lockedUntil: null,
      lastAttempt: Date.now()
    }, { merge: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.toLowerCase().includes("offline") ||
      errMsg.toLowerCase().includes("network") ||
      errMsg.toLowerCase().includes("unreachable") ||
      errMsg.toLowerCase().includes("failed-precondition")
    ) {
      console.warn("Firestore offline when recording success:", errMsg);
    } else {
      console.error("Error recording success: ", err);
    }
  }
}

function resetAllCaptchas() {
  const g = (window as any).grecaptcha;
  if (g) {
    try {
      g.reset();
    } catch (e) {
      console.warn("reCAPTCHA reset notice:", e);
    }
  }
}

interface ReCaptchaProps {
  id: string;
}

function ReCaptcha({ id }: ReCaptchaProps) {
  useEffect(() => {
    let active = true;
    const renderWidget = () => {
      const g = (window as any).grecaptcha;
      const el = document.getElementById(id);
      if (g && el && active) {
        try {
          if (el.children.length === 0) {
            g.render(id, {
              sitekey: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MWXIm"
            });
          }
        } catch (err) {
          console.warn("reCAPTCHA render notice:", err);
        }
      }
    };

    const timer1 = setTimeout(renderWidget, 100);
    const timer2 = setTimeout(renderWidget, 500);
    const timer3 = setTimeout(renderWidget, 1000);

    return () => {
      active = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [id]);

  return (
    <div className="flex justify-center my-3 scale-90 sm:scale-100">
      <div id={id} className="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MWXIm"></div>
    </div>
  );
}

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

export default function AuthScreen({ onAuthSuccess, isDarkMode = true, toggleDarkMode }: AuthScreenProps) {
  const [currentScreen, setCurrentScreen] = useState<
    "ROLE_SELECTION" | "CITIZEN_LOGIN" | "CITIZEN_SIGNUP" | "ADMIN_LOGIN" | "EMAIL_VERIFICATION_SENT"
  >("ROLE_SELECTION");

  // Custom Captcha States
  const [captchaInputCitizenEmail, setCaptchaInputCitizenEmail] = useState("");
  const [captchaInputCitizenMobile, setCaptchaInputCitizenMobile] = useState("");
  const [captchaInputAdmin, setCaptchaInputAdmin] = useState("");
  const [captchaInputCitizenSignup, setCaptchaInputCitizenSignup] = useState("");

  const [captchaCodeCitizenEmail, setCaptchaCodeCitizenEmail] = useState("");
  const [captchaCodeCitizenMobile, setCaptchaCodeCitizenMobile] = useState("");
  const [captchaCodeAdmin, setCaptchaCodeAdmin] = useState("");
  const [captchaCodeCitizenSignup, setCaptchaCodeCitizenSignup] = useState("");

  const [captchaKey, setCaptchaKey] = useState(0);

  // Citizen Login Tabs: "email" | "phone"
  const [citizenTab, setCitizenTab] = useState<"email" | "phone">("email");

  // Form Field States
  const [name, setName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCity, setSelectedCity] = useState("New Delhi");

  // Phone OTP States
  const [mobile, setMobile] = useState("");
  const [phoneStep, setPhoneStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("123456");
  const [useSimulatedOtp, setUseSimulatedOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Admin Login States
  const [adminEmployeeId, setAdminEmployeeId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminMobile, setAdminMobile] = useState("");

  // Common UI States
  const [error, setError] = useState<string | null>(null);
  const [emailNotFoundError, setEmailNotFoundError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Google Login Setup Modal States
  const [googleUserTemp, setGoogleUserTemp] = useState<any | null>(null);
  const [showGoogleSetupModal, setShowGoogleSetupModal] = useState(false);
  const [googleCity, setGoogleCity] = useState("New Delhi");
  const [googleUserType, setGoogleUserType] = useState<"Citizen" | "Government Official">("Citizen");

  // Handle Google Sign-in Redirect Result on page load
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          const user = result.user;
          let userDocSnap: any = null;
          try {
            userDocSnap = await getDoc(doc(db, "users", user.uid));
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            if (
              errMsg.toLowerCase().includes("offline") ||
              errMsg.toLowerCase().includes("network") ||
              errMsg.toLowerCase().includes("unreachable") ||
              errMsg.toLowerCase().includes("failed-precondition")
            ) {
              console.warn("Firestore offline when querying redirect user:", errMsg);
            } else {
              console.error("Failed to query Firestore for redirect user:", e);
            }
          }

          if (!userDocSnap || !userDocSnap.exists()) {
            setGoogleUserTemp({
              uid: user.uid,
              name: user.displayName || "Citizen",
              email: user.email || "",
              photoURL: user.photoURL || undefined
            });
            setShowGoogleSetupModal(true);
          } else {
            onAuthSuccess(userDocSnap.data() as UserProfile);
          }
        }
      } catch (err: any) {
        console.error("Error processing Google redirect login:", err);
        setError(err.message || "Google Redirect Sign-In failed.");
      }
    };
    checkRedirect();
  }, []);

  // Forgot Password Modal States
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Seed default admin
  useEffect(() => {
    async function seedAdmin() {
      try {
        const adminDocRef = doc(db, "admins", "GOV-2024-0001");
        const adminSnap = await getDoc(adminDocRef);
        // Guarantee Admin@2026 password is pre-seeded and matches
        if (!adminSnap.exists() || adminSnap.data()?.passwordPlain !== "Admin@2026") {
          const salt = generateSalt();
          const hashedPassword = await hashPassword("Admin@2026", salt);
          await setDoc(adminDocRef, {
            employeeId: "GOV-2024-0001",
            email: "admin@letsfixit.gov.in",
            mobile: "9876543210",
            city: "Delhi",
            department: "Municipal Corporation",
            passwordSalt: salt,
            passwordHash: hashedPassword,
            passwordPlain: "Admin@2026"
          }, { merge: true });
          console.log("[LetsFixIt Database] Default admin GOV-2024-0001 seeded securely with Admin@2026 password.");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (
          errMsg.toLowerCase().includes("offline") ||
          errMsg.toLowerCase().includes("network") ||
          errMsg.toLowerCase().includes("unreachable") ||
          errMsg.toLowerCase().includes("failed-precondition")
        ) {
          console.warn("[LetsFixIt Database] Admin pre-seeding skipped because client is offline.");
        } else {
          console.error("[LetsFixIt Database] Error pre-seeding admin:", err);
        }
      }
    }
    seedAdmin();
  }, []);

  // Listen to auth state changed and redirect if verified
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user && user.emailVerified) {
        try {
          const userDocSnap = await getDoc(doc(db, "users", user.uid));
          if (userDocSnap.exists()) {
            onAuthSuccess(userDocSnap.data() as UserProfile);
          } else {
            const fallbackProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Citizen",
              email: user.email || "citizen@letsfixit.in",
              points: 100,
              badges: ["First Citizen"],
              createdAt: new Date().toISOString(),
              role: "citizen",
              userType: "Citizen",
              city: "Delhi",
            };
            onAuthSuccess(fallbackProfile);
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (
            errMsg.toLowerCase().includes("offline") ||
            errMsg.toLowerCase().includes("network") ||
            errMsg.toLowerCase().includes("unreachable") ||
            errMsg.toLowerCase().includes("failed-precondition") ||
            errMsg.toLowerCase().includes("could not reach")
          ) {
            console.warn("AuthScreen offline during auto-login check, falling back to offline profile:", errMsg);
            const fallbackProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split("@")[0] || "Citizen",
              email: user.email || "citizen@letsfixit.in",
              points: 100,
              badges: ["First Citizen"],
              createdAt: new Date().toISOString(),
              role: "citizen",
              userType: "Citizen",
              city: "Delhi",
            };
            onAuthSuccess(fallbackProfile);
          } else {
            console.error("AuthScreen auto-login error:", e);
          }
        }
      }
    });
    return () => unsub();
  }, [onAuthSuccess]);

  // OTP Countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (currentScreen === "CITIZEN_LOGIN" && citizenTab === "phone" && phoneStep === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [currentScreen, citizenTab, phoneStep, countdown]);

  // Reset errors and captchas when screen changes
  useEffect(() => {
    setError(null);
    setEmailNotFoundError(false);
    setCaptchaInputCitizenEmail("");
    setCaptchaInputCitizenMobile("");
    setCaptchaInputAdmin("");
    setCaptchaInputCitizenSignup("");
    resetAllCaptchas();
  }, [currentScreen, citizenTab]);

  // Citizen Sign Up Handler
  const handleCitizenSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailNotFoundError(false);

    // Validate CAPTCHA
    if (captchaInputCitizenSignup.toLowerCase() !== captchaCodeCitizenSignup.toLowerCase()) {
      setLoading(false);
      setError("Incorrect CAPTCHA code, please try again.");
      setCaptchaInputCitizenSignup("");
      setCaptchaKey(prev => prev + 1);
      return;
    }

    if (passwordInput !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      resetAllCaptchas();
      return;
    }

    if (passwordInput.length < 6) {
      setError("Password must be at least 6 characters long.");
      resetAllCaptchas();
      return;
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    setLoading(true);

    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, createUserWithEmailAndPassword, sendEmailVerification, updateProfile } = await import('firebase/auth');
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      
      const firebaseConfig = {
        apiKey: "AIzaSyAc_qpFcwk7Wt4ZjQUzQUvN78GaCiJL3Sc",
        authDomain: "letsfixit-91195.firebaseapp.com",
        projectId: "letsfixit-91195",
        storageBucket: "letsfixit-91195.firebasestorage.app",
        messagingSenderId: "26992210997",
        appId: "1:26992210997:web:129a120e185cc4263e2d7c"
      };
      
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);
      
      const result = await createUserWithEmailAndPassword(authInstance, cleanEmail, passwordInput);
      const user = result.user;
      
      await updateProfile(user, { displayName: name });
      await sendEmailVerification(user);
      
      await setDoc(doc(dbInstance, 'users', user.uid), {
        id: user.uid,
        fullName: name,
        email: cleanEmail,
        city: selectedCity,
        createdAt: new Date().toISOString(),
        totalScore: 0,
        authenticReports: 0,
        role: "citizen",
        userType: "Citizen",
        points: 100,
        badges: ["First Citizen"]
      });
      
      await authInstance.signOut();
      
      // Show verification screen
      setCurrentScreen("EMAIL_VERIFICATION_SENT");
      
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError('Sign up failed: ' + (err.message || err.code || 'Unknown error'));
      }
    } finally {
      setLoading(false); // ALWAYS runs — stops spinner
    }
  };

  // Citizen Sign In Handler
  const handleCitizenSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailNotFoundError(false);

    // Validate CAPTCHA
    if (captchaInputCitizenEmail.toLowerCase() !== captchaCodeCitizenEmail.toLowerCase()) {
      setLoading(false);
      setError("Incorrect CAPTCHA code, please try again.");
      setCaptchaInputCitizenEmail("");
      setCaptchaKey(prev => prev + 1);
      return;
    }

    const cleanEmail = emailInput.trim().toLowerCase();
    setLoading(true);

    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getFirestore, doc, getDoc, setDoc } = await import('firebase/firestore');
      
      const firebaseConfig = {
        apiKey: "AIzaSyAc_qpFcwk7Wt4ZjQUzQUvN78GaCiJL3Sc",
        authDomain: "letsfixit-91195.firebaseapp.com",
        projectId: "letsfixit-91195",
        storageBucket: "letsfixit-91195.firebasestorage.app",
        messagingSenderId: "26992210997",
        appId: "1:26992210997:web:129a120e185cc4263e2d7c"
      };
      
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);
      
      const result = await signInWithEmailAndPassword(authInstance, cleanEmail, passwordInput);
      const user = result.user;
      
      if (!user.emailVerified) {
        setError('Please verify your email first. Check your inbox.');
        await authInstance.signOut();
        return;
      }
      
      // SUCCESS — go to dashboard
      const defaultProfile: UserProfile = {
        id: user.uid,
        name: user.displayName || cleanEmail.split("@")[0],
        email: cleanEmail,
        points: 100,
        badges: ["First Citizen"],
        createdAt: new Date().toISOString(),
        role: "citizen",
        userType: "Citizen",
        city: selectedCity,
      };

      try {
        const userDocRef = doc(dbInstance, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          onAuthSuccess(profile);
        } else {
          try {
            await setDoc(doc(dbInstance, "users", user.uid), defaultProfile);
          } catch (setErr) {
            console.warn("[AuthScreen] Failed to save default user doc in offline/restricted sandbox:", setErr);
          }
          onAuthSuccess(defaultProfile);
        }
      } catch (dbErr: any) {
        console.warn("[AuthScreen] Firestore unreachable during sign-in. Falling back to offline local profile.", dbErr);
        onAuthSuccess(defaultProfile);
      }
      
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait and try again.');
      } else {
        setError('Sign in failed: ' + (err.message || err.code || 'Unknown error'));
      }
    } finally {
      setLoading(false); // ALWAYS runs — stops spinner
    }
  };

  // Resend Verification Email
  const handleResendVerification = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setError("Verification email resent successfully! Please check your inbox.");
      } else {
        setError("User session not found. Please log in again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };

  // Check if verified now
  const handleCheckVerification = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          const defaultProfile: UserProfile = {
            id: user.uid,
            name: user.email?.split("@")[0] || "Citizen",
            email: user.email || "",
            points: 100,
            badges: ["First Citizen"],
            createdAt: new Date().toISOString(),
            role: "citizen",
            userType: "Citizen",
            city: "New Delhi",
          };

          try {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists()) {
              onAuthSuccess(userDocSnap.data() as UserProfile);
            } else {
              try {
                await setDoc(doc(db, "users", user.uid), defaultProfile);
              } catch (setErr) {
                console.warn("[AuthScreen] Failed to save default user in offline mode:", setErr);
              }
              onAuthSuccess(defaultProfile);
            }
          } catch (dbErr) {
            console.warn("[AuthScreen] Firestore unreachable during verification check. Logging in offline:", dbErr);
            onAuthSuccess(defaultProfile);
          }
        } else {
          setError("Email not verified yet. Please check your inbox.");
        }
      } else {
        setError("Please enter email & password to sign in again.");
        setCurrentScreen("CITIZEN_LOGIN");
      }
    } catch (err: any) {
      setError(err.message || "Verification check failed.");
    } finally {
      setLoading(false);
    }
  };

  // Google Login popup
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    // Authorized domains note: The AI Studio preview URL must be added to Firebase Console -> Authentication -> Settings -> Authorized Domains
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      let user = null;
      try {
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      } catch (popupErr: any) {
        console.warn("Google popup failed/blocked, attempting redirect fallback...", popupErr);
        // If popup is blocked by browser, automatically fall back to signInWithRedirect(auth, provider)
        if (popupErr.code === "auth/popup-blocked" || popupErr.code === "auth/cancelled-popup-request") {
          await signInWithRedirect(auth, provider);
          return;
        } else {
          // Show friendly hackathon message
          setError("Google Sign-In requires the app to be deployed. Please use Email & Password login for now, or click Publish first then try Google login.");
          return;
        }
      }

      if (!user) {
        setError("Google Sign-In was cancelled or failed to retrieve user info.");
        return;
      }

      let userDocSnap: any = null;
      let isOfflineGoogle = false;

      try {
        userDocSnap = await getDoc(doc(db, "users", user.uid));
      } catch (e) {
        isOfflineGoogle = true;
      }

      if (isOfflineGoogle || !userDocSnap || !userDocSnap.exists()) {
        setGoogleUserTemp({
          uid: user.uid,
          name: user.displayName || "Citizen",
          email: user.email || "",
          photoURL: user.photoURL || undefined
        });
        setShowGoogleSetupModal(true);
      } else {
        onAuthSuccess(userDocSnap.data() as UserProfile);
      }
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      setError("Google Sign-In requires the app to be deployed. Please use Email & Password login for now, or click Publish first then try Google login.");
      resetAllCaptchas();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUserTemp) return;

    setLoading(true);
    setError(null);

    try {
      const isGov = googleUserType === "Government Official";
      const finalProfile: UserProfile = {
        id: googleUserTemp.uid,
        name: googleUserTemp.name,
        email: googleUserTemp.email.toLowerCase(),
        photoURL: googleUserTemp.photoURL,
        points: 100,
        badges: ["First Citizen"],
        createdAt: new Date().toISOString(),
        role: isGov ? "admin" : "citizen",
        userType: isGov ? "Government Official" : "Citizen",
        city: googleCity,
        salt: "",
        passwordHash: "",
      };

      await setDoc(doc(db, "users", googleUserTemp.uid), finalProfile);
      setShowGoogleSetupModal(false);
      setGoogleUserTemp(null);
      onAuthSuccess(finalProfile);
    } catch (err: any) {
      setError(err.message || "Google profile setup failed.");
    } finally {
      setLoading(false);
    }
  };

  // Citizen Mobile OTP OTP code request
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate CAPTCHA
    if (captchaInputCitizenMobile.toLowerCase() !== captchaCodeCitizenMobile.toLowerCase()) {
      setLoading(false);
      setError("Incorrect CAPTCHA code, please try again.");
      setCaptchaInputCitizenMobile("");
      setCaptchaKey(prev => prev + 1);
      return;
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, "");
    if (cleanMobile.length !== 10) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      resetAllCaptchas();
      return;
    }

    setLoading(true);
    const fullMobile = `+91${cleanMobile}`;

    try {
      let appVerifier: RecaptchaVerifier | null = null;
      let phoneAuthSuccess = false;

      try {
        const container = document.getElementById("recaptcha-container");
        if (container) {
          container.innerHTML = "";
        }
        appVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible"
        });
      } catch (err) {
        console.warn("reCAPTCHA verifier failed to load. Defaulting to simulated OTP.");
      }

      if (appVerifier) {
        try {
          const confirmation = await signInWithPhoneNumber(auth, fullMobile, appVerifier);
          setConfirmationResult(confirmation);
          setUseSimulatedOtp(false);
          phoneAuthSuccess = true;
        } catch (phoneErr: any) {
          console.warn("Firebase phone auth failed. Using simulated fallback:", phoneErr.message);
        }
      }

      if (!phoneAuthSuccess) {
        setGeneratedOtp("123456");
        setUseSimulatedOtp(true);
        setConfirmationResult(null);
      }

      setPhoneStep("otp");
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError("Unexpected error occurred while dispatching OTP.");
      resetAllCaptchas();
    } finally {
      setLoading(false);
    }
  };

  // Citizen Mobile OTP verify
  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (useSimulatedOtp || !confirmationResult) {
      if (otpCode !== "123456" && otpCode !== generatedOtp) {
        setError("Invalid OTP code. Please enter the correct code (123456).");
        setLoading(false);
        return;
      }
    } else {
      try {
        await confirmationResult.confirm(otpCode);
      } catch (confirmErr) {
        setError("Verification failed. The OTP code entered is invalid or expired.");
        setLoading(false);
        return;
      }
    }

    const cleanMobile = mobile.replace(/[^0-9]/g, "");
    const cleanMobile10 = cleanMobile.slice(-10);
    const uid = "uid_" + cleanMobile10;

    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const defaultProfile: UserProfile = {
          id: uid,
          name: name.trim() || `Citizen ${cleanMobile10}`,
          fullName: name.trim() || `Citizen ${cleanMobile10}`,
          email: `mobile_${cleanMobile10}@letsfixit.in`,
          points: 100,
          badges: ["First Citizen"],
          createdAt: new Date().toISOString(),
          role: "citizen",
          userType: "Citizen",
          city: "New Delhi",
          mobile: cleanMobile10,
        };
        await setDoc(doc(db, "users", uid), defaultProfile);
        onAuthSuccess(defaultProfile);
      } else {
        onAuthSuccess(userDocSnap.data() as UserProfile);
      }
    } catch (err) {
      const fallbackProfile: UserProfile = {
        id: uid,
        name: name.trim() || `Citizen ${cleanMobile10}`,
        fullName: name.trim() || `Citizen ${cleanMobile10}`,
        email: `mobile_${cleanMobile10}@letsfixit.in`,
        points: 100,
        badges: ["First Citizen"],
        createdAt: new Date().toISOString(),
        role: "citizen",
        userType: "Citizen",
        city: "New Delhi",
        mobile: cleanMobile10,
      };
      onAuthSuccess(fallbackProfile);
    } finally {
      setLoading(false);
    }
  };

  // Government Admin Login Handler
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate CAPTCHA
    if (captchaInputAdmin.toLowerCase() !== captchaCodeAdmin.toLowerCase()) {
      setLoading(false);
      setError("Incorrect CAPTCHA code, please try again.");
      setCaptchaInputAdmin("");
      setCaptchaKey(prev => prev + 1);
      return;
    }

    const cleanEmail = adminEmail.trim().toLowerCase();
    const cleanEmpId = adminEmployeeId.trim();
    const cleanMobile = adminMobile.trim();
    const normalize = (num: string) => num.replace(/\D/g, "").slice(-10);

    // Check rate limits: lock after 3 failed attempts for 30 minutes
    const limitCheck = await checkLoginRateLimit(cleanEmail, true);
    if (!limitCheck.allowed) {
      setLoading(false);
      setError(limitCheck.error || "Too many failed attempts. Admin access locked.");
      resetAllCaptchas();
      return;
    }

    // 1. Update the hardcoded demo admin fallback credentials and check instantly
    const isHardcodedAdmin = (
      cleanEmpId === "GOV-2024-0001" &&
      cleanEmail === "admin@letsfixit.gov.in" &&
      (adminPassword === "admin@2026" || adminPassword === "Admin@2026") &&
      (normalize(cleanMobile) === normalize("0123456789") || normalize(cleanMobile) === normalize("9876543210"))
    );

    if (isHardcodedAdmin) {
      setLoading(true);
      console.log("[AuthScreen] Direct bypass login successful using hardcoded demo admin credentials.");
      try {
        await recordLoginSuccess(cleanEmail);
      } catch (recErr) {}
      
      const adminProfile: UserProfile = {
        id: "GOV-2024-0001",
        name: "Gov Official (Municipal Corporation)",
        email: "admin@letsfixit.gov.in",
        points: 1000,
        badges: ["Admin Seal", "Govt Liaison"],
        createdAt: new Date().toISOString(),
        role: "admin",
        mobile: cleanMobile || "0123456789",
        city: "Delhi",
        userType: "Government Official"
      };
      
      // Let's also sign in in the background with auth if possible, but don't let it block success
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, adminPassword);
      } catch (authErr) {
        console.warn("[AuthScreen] Dynamic Auth background sign-in bypassed on offline mock", authErr);
      }
      
      onAuthSuccess(adminProfile);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 3. Add a 5 second timeout to the login process. If no response in 5 seconds, stop the spinner and show error message.
    const loginTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Login process timed out. Please check your connection.")), 5000)
    );

    const loginActionPromise = (async () => {
      // 4. Try Firebase Auth signInWithEmailAndPassword
      let authUser: any = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, adminPassword);
        authUser = userCredential.user;
        console.log("[AuthScreen] Firebase Auth sign-in successful:", authUser.uid);
      } catch (authErr: any) {
        console.error("[AuthScreen] Firebase Auth sign-in failed:", authErr);
        throw new Error("Invalid credentials. Please check your details.");
      }

      if (authUser) {
        let adminData: any = null;
        let firestoreError: string | null = null;

        // Try Firestore with a 3 second timeout to verify employeeId
        try {
          const fetchPromise = getDoc(doc(db, "admins", cleanEmpId));
          const dbTimeoutPromise = new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error("Firestore verification timed out")), 3000)
          );
          const adminSnap: any = await Promise.race([fetchPromise, dbTimeoutPromise]);
          if (adminSnap && adminSnap.exists()) {
            adminData = adminSnap.data();
          } else {
            throw new Error("Invalid credentials. Access denied.");
          }
        } catch (verifyErr: any) {
          firestoreError = verifyErr?.message || String(verifyErr);
          console.warn("[AuthScreen] Verification lookup failed or timed out:", firestoreError);
        }

        // If Firestore times out but Firebase Auth succeeded, still allow login
        if (adminData) {
          if (adminData.employeeId !== cleanEmpId) {
            throw new Error("Invalid credentials. Please check your details.");
          }
          const emailMatches = adminData.email?.toLowerCase() === cleanEmail;
          const mobileMatches = normalize(adminData.mobile || "") === normalize(cleanMobile);
          if (!emailMatches || !mobileMatches) {
            throw new Error("Invalid credentials. Please check your details.");
          }
        }

        // Success
        try {
          await recordLoginSuccess(cleanEmail);
        } catch (succErr) {}

        const adminProfile: UserProfile = {
          id: cleanEmpId,
          name: `Gov Official (${(adminData && adminData.department) || "Municipal Corporation"})`,
          email: cleanEmail,
          points: 1000,
          badges: ["Admin Seal", "Govt Liaison"],
          createdAt: new Date().toISOString(),
          role: "admin",
          mobile: cleanMobile,
          city: (adminData && adminData.city) || "Delhi",
          userType: "Government Official"
        };

        onAuthSuccess(adminProfile);
      }
    })();

    try {
      await Promise.race([loginActionPromise, loginTimeoutPromise]);
    } catch (err: any) {
      console.error("Admin portal login error:", err);
      try {
        await recordLoginFailure(cleanEmail, true);
      } catch (failErr) {}
      setError(err.message || "Invalid credentials. Please check your details.");
      resetAllCaptchas();
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Link Request Handler
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccess(null);
    setResetError(null);
    setResetLoading(true);

    const emailVal = resetEmail.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, emailVal);
      setResetSuccess(`✅ Password reset link sent to ${emailVal}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errMsg = "Something went wrong. Please try again.";
      if (err.code === "auth/user-not-found" || (err.message && err.message.includes("user-not-found"))) {
        errMsg = "No account found with this email. Please sign up first.";
      } else if (err.code === "auth/invalid-email" || (err.message && err.message.includes("invalid-email"))) {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === "auth/too-many-requests" || (err.message && err.message.includes("too-many-requests"))) {
        errMsg = "Too many attempts. Please try again after some time.";
      }
      setResetError(errMsg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between relative overflow-x-hidden transition-all duration-300 ${
      isDarkMode 
        ? "bg-[#0D0D0E] text-[#E0E0E0]" 
        : "bg-[#F4F4F2] text-[#0A0A0A]"
    }`} style={{ minHeight: "100vh" }}>
      
      {/* Grid background matching Design template */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: `linear-gradient(${isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)"} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)"} 1px, transparent 1px)`,
          backgroundSize: "50px 50px"
        }}
      />

      {/* RENDER SCREEN 1: ROLE SELECTION */}
      {currentScreen === "ROLE_SELECTION" && (
        <>
          {/* Top Navigation */}
          <nav className="w-full flex justify-between items-center px-6 md:px-12 py-5 border-b-2 border-[#0A0A0A] dark:border-[#E0E0E0] z-20 bg-[#F4F4F2]/50 dark:bg-[#0D0D0E]/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 font-oswald text-xl font-bold tracking-tight text-[#0A0A0A] dark:text-[#E0E0E0]">
              <img
                src="/LetsFixIt.png"
                alt="Logo"
                style={{
                  height: "45px",
                  width: "auto",
                  objectFit: "contain",
                  background: "transparent",
                  border: "none",
                  borderRadius: "0px",
                  boxShadow: "none",
                  padding: "0"
                }}
                className="!rounded-none !shadow-none block"
              />
              <span>GOVERNMENT / 2026</span>
            </div>
            {toggleDarkMode && (
              <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleDarkMode} />
            )}
          </nav>

          {/* Main Layout Content */}
          <div className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
            {/* Left Column: Hero Text */}
            <div className="border-l-8 border-[#FF671F] pl-6 md:pl-12">
              <span
                className="font-mono text-xs font-bold uppercase tracking-wider block mb-2"
                style={{ color: isDarkMode ? "#00C853" : "#138808" }}
                ref={(el) => {
                  if (el) {
                    el.style.setProperty("color", isDarkMode ? "#00C853" : "#138808", "important");
                  }
                }}
              >
                EMPOWERING BHARAT THROUGH TECH
              </span>
              <h1 className="font-oswald text-5xl sm:text-7xl md:text-8xl lg:text-7xl xl:text-8xl font-bold leading-[0.9] tracking-tight">
                <span className="block normal-case">LetsFixIt</span>
                <span className="india hero-india block uppercase" style={{ color: "#FF6600" }}>INDIA</span>
              </h1>
              <p className="mt-6 max-w-lg text-sm sm:text-base md:text-lg leading-relaxed font-semibold text-black dark:text-white">
                Spot it. Report it. Fix it. 🇮🇳
              </p>
              <p className="mt-2 max-w-lg text-xs sm:text-sm leading-relaxed opacity-80 text-black dark:text-white">
                Join thousands of Indians making their cities cleaner, safer & smarter — one report at a time.
              </p>
            </div>

            {/* Right Column: Portal Pane Action Cards */}
            <div className="flex flex-col gap-6 w-full max-w-md lg:ml-auto">
              {/* Card 1: Citizen Access */}
              <div 
                className="border-2 border-[#0A0A0A] dark:border-[#E0E0E0] p-6 md:p-8 flex flex-col transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 shadow-[8px_8px_0_rgba(10,10,10,1)] hover:shadow-[12px_12px_0_#FF671F]"
                style={{ backgroundColor: "#ffffff" }}
              >
                <h3 
                  className="font-oswald text-xl md:text-2xl font-bold uppercase tracking-tight mb-2 text-black force-black"
                >
                  Citizen Access
                </h3>
                <p 
                  className="text-xs md:text-sm mb-6 leading-relaxed"
                  style={{ color: "#444444" }}
                >
                  Register complaints, track repair progress, and earn community recognition points.
                </p>
                <button 
                  onClick={() => setCurrentScreen("CITIZEN_LOGIN")}
                  className="btn btn-citizen w-full py-4 text-center font-oswald uppercase text-sm md:text-base font-bold tracking-wider text-white bg-[#000080] hover:bg-[#000080]/90 border-none cursor-pointer transition-opacity"
                >
                  Login as Citizen
                </button>
              </div>

              {/* Card 2: Department Login */}
              <div 
                className="border-2 border-[#0A0A0A] dark:border-[#E0E0E0] p-6 md:p-8 flex flex-col transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 shadow-[8px_8px_0_rgba(10,10,10,1)] hover:shadow-[12px_12px_0_#FF671F]"
                style={{ backgroundColor: "#ffffff" }}
              >
                <h3 
                  className="font-oswald text-xl md:text-2xl font-bold uppercase tracking-tight mb-2 text-black force-black"
                >
                  Department Login
                </h3>
                <p 
                  className="text-xs md:text-sm mb-6 leading-relaxed"
                  style={{ color: "#444444" }}
                >
                  Authorize dispatch, manage field units, and verify completed municipal works.
                </p>
                <button 
                  onClick={() => setCurrentScreen("ADMIN_LOGIN")}
                  className="btn btn-admin w-full py-4 text-center font-oswald uppercase text-sm md:text-base font-bold tracking-wider text-white bg-[#046A38] hover:bg-[#046A38]/90 border-none cursor-pointer transition-opacity"
                >
                  Login as Government Admin
                </button>
              </div>
            </div>
          </div>

          {/* Redesigned Minimal Footer */}
          <footer 
            className="w-full text-sm py-4 px-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left z-10"
            style={{ 
              borderTop: isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e0e0e0",
              backgroundColor: isDarkMode ? "rgba(15, 15, 25, 0.4)" : "#f8f9fa",
              color: "var(--text-muted)",
              letterSpacing: "0.5px",
              fontWeight: 500
            }}
          >
            <div>© 2026 LetsFixIt India</div>
            <div style={{ color: "#FF6B00" }} className="font-extrabold tracking-wide">
              Spot it. Report it. Fix it.
            </div>
            <div>Built for Bharat 🇮🇳</div>
          </footer>
        </>
      )}

      {/* COMMON CARD FOR SCREEN 2A, 2B, SIGNUP, EMAIL VERIFICATION */}
      {currentScreen !== "ROLE_SELECTION" && (
        <div className="flex-1 w-full flex flex-col justify-center items-center p-4 z-10">
          <div className="w-full max-w-md animate-fadeIn">
            {/* Logo block */}
            <div className="text-center mb-6 flex flex-col items-center">
              <div className="mb-3">
                <Logo size={56} />
              </div>
              <span className="text-[9px] font-mono text-[#FF6B00] dark:text-orange-400 font-extrabold uppercase tracking-widest block">
                LetsFixIt India • Municipal Portal
              </span>
            </div>

            {/* Form card container with neo-brutalist shadow & border */}
            <div className={`p-6 border-2 border-[#0A0A0A] dark:border-[#E0E0E0] shadow-[8px_8px_0_rgba(10,10,10,1)] dark:shadow-[8px_8px_0_rgba(224,224,224,1)] transition-all duration-300 ${
              isDarkMode ? "bg-[#121214]" : "bg-white"
            }`}>
            
            {/* Top Back/Backpack Navigation */}
            <div className="flex items-center justify-between mb-4 border-b pb-3 border-slate-200 dark:border-slate-800/60">
              <button
                onClick={() => {
                  if (currentScreen === "CITIZEN_SIGNUP") {
                    setCurrentScreen("CITIZEN_LOGIN");
                  } else {
                    setCurrentScreen("ROLE_SELECTION");
                  }
                }}
                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-colors ${
                  isDarkMode ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-[#001F5B]"
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>

              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {currentScreen === "CITIZEN_LOGIN" && "Citizen Access"}
                {currentScreen === "CITIZEN_SIGNUP" && "Citizen Sign Up"}
                {currentScreen === "ADMIN_LOGIN" && "Admin Access"}
                {currentScreen === "EMAIL_VERIFICATION_SENT" && "Verification Pending"}
              </span>
            </div>

            {/* Universal Errors display */}
            {error && currentScreen !== "ADMIN_LOGIN" && (
              <div style={{color: '#FF0000', backgroundColor: '#FFE5E5', padding: '10px', borderRadius: '8px', marginTop: '8px', marginBottom: '16px', fontWeight: '600'}}>
                {error}
                {emailNotFoundError && (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setEmailNotFoundError(false);
                      setCurrentScreen("CITIZEN_SIGNUP");
                    }}
                    className="mt-2 px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>Go to Sign Up</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}

            {/* SCREEN 2A: CITIZEN LOGIN SCREEN */}
            {currentScreen === "CITIZEN_LOGIN" && (
              <div className="space-y-4">
                {/* Tabs */}
                <div className={`grid grid-cols-2 p-1 rounded-xl border ${isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-[#FFF8F0] border-[#FFF3E0]"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenTab("email");
                      setError(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      citizenTab === "email"
                        ? isDarkMode 
                          ? "bg-slate-800 text-orange-400 shadow-inner"
                          : "bg-white text-[#FF6B00] shadow-sm font-extrabold"
                        : isDarkMode
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-500 hover:text-[#001F5B]"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      Email & Password
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenTab("phone");
                      setError(null);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      citizenTab === "phone"
                        ? isDarkMode 
                          ? "bg-slate-800 text-orange-400 shadow-inner"
                          : "bg-white text-[#FF6B00] shadow-sm font-extrabold"
                        : isDarkMode
                          ? "text-slate-400 hover:text-white"
                          : "text-slate-500 hover:text-[#001F5B]"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                      Mobile OTP
                    </span>
                  </button>
                </div>

                {/* Email Tab Form */}
                {citizenTab === "email" && (
                  <form onSubmit={handleCitizenSignIn} className="space-y-4">
                    {/* Email Input */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-500 uppercase">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="rajesh@letsfixit.in"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                            isDarkMode
                              ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                              : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-mono text-slate-500 uppercase">Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(emailInput);
                            setResetSuccess(null);
                            setResetError(null);
                            setShowResetModal(true);
                          }}
                          className="text-[10px] text-orange-500 hover:text-orange-600 font-medium cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Enter secret password"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                            isDarkMode
                              ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                              : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                          }`}
                          required
                        />
                      </div>
                    </div>

                    {/* ReCAPTCHA */}
                    <CustomCaptcha
                      key={`captcha-citizen-email-${captchaKey}`}
                      id="captcha-citizen-email"
                      value={captchaInputCitizenEmail}
                      onChange={setCaptchaInputCitizenEmail}
                      onCodeGenerated={setCaptchaCodeCitizenEmail}
                      isDarkMode={isDarkMode}
                    />

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Sign In as Citizen</span>}
                    </button>

                    {error && (
                      <div style={{color: '#FF0000', backgroundColor: '#FFE5E5', padding: '10px', borderRadius: '8px', marginTop: '8px', fontWeight: '600'}}>
                        {error}
                      </div>
                    )}

                    {/* Signup Links */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setCurrentScreen("CITIZEN_SIGNUP")}
                        className="text-[11px] text-slate-500 hover:text-[#FF6B00] font-bold transition-colors"
                      >
                        Don't have an account? Sign Up
                      </button>
                    </div>
                  </form>
                )}

                {/* Mobile OTP Tab Form */}
                {citizenTab === "phone" && (
                  <>
                    {phoneStep === "form" ? (
                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase">YOUR NAME</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="Enter your full name"
                              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                                isDarkMode
                                  ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                                  : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                              }`}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase">Indian Mobile Number (+91)</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                            <input
                              type="tel"
                              value={mobile}
                              onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))}
                              placeholder="99999 99999"
                              maxLength={10}
                              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 font-mono ${
                                isDarkMode
                                  ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                                  : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                              }`}
                              required
                            />
                          </div>
                        </div>

                        {/* ReCAPTCHA */}
                        <CustomCaptcha
                          key={`captcha-citizen-mobile-${captchaKey}`}
                          id="captcha-citizen-mobile"
                          value={captchaInputCitizenMobile}
                          onChange={setCaptchaInputCitizenMobile}
                          onCodeGenerated={setCaptchaCodeCitizenMobile}
                          isDarkMode={isDarkMode}
                        />

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Send OTP</span>}
                        </button>
                      </form>
                    ) : (
                      /* OTP Code input verification */
                      <form onSubmit={handleVerifyAndSubmit} className="space-y-4">
                        <div className="text-center p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl space-y-1">
                          <p className="text-[10px] font-mono text-slate-400">
                            OTP dispatched to <strong>+91 {mobile}</strong>.
                          </p>
                          {useSimulatedOtp && (
                            <p className="text-[9px] font-mono text-amber-500 uppercase font-bold animate-pulse">
                              ⚠️ Sandbox Mode: Enter code <strong>123456</strong>
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase text-center">6-Digit Verification Code</label>
                          <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="X X X X X X"
                            maxLength={6}
                            className={`w-full py-2.5 text-center text-lg font-black tracking-[0.5em] rounded-xl focus:outline-none border focus:ring-1 font-mono ${
                              isDarkMode
                                ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                                : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                            }`}
                            required
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                          <span>
                            {countdown > 0 ? `Expires in ${countdown}s` : "OTP Expired"}
                          </span>
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={!canResend}
                            className={`font-semibold transition-colors ${
                              canResend ? "text-orange-500 hover:text-orange-600" : "text-slate-500 cursor-not-allowed"
                            }`}
                          >
                            Resend Code
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setPhoneStep("form")}
                            className={`py-2.5 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
                              isDarkMode
                                ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                                : "border-[#FFF3E0] hover:bg-[#FFF8F0] text-slate-500"
                            }`}
                          >
                            Edit Mobile
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md"
                          >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Verify & Enter</span>}
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {/* Or Continue with Google */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 border-t border-slate-200 dark:border-slate-800"></div>
                  <span className={`relative px-3 text-[10px] font-mono text-slate-400 uppercase ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                    or
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className={`w-full py-2.5 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    isDarkMode
                      ? "bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-200"
                      : "bg-white hover:bg-[#FFF8F0] border-[#FFF3E0] hover:border-[#FF6B00] text-[#001F5B]"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            )}

            {/* SCREEN 2B: GOVERNMENT ADMIN LOGIN SCREEN */}
            {currentScreen === "ADMIN_LOGIN" && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="text-center pb-2">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    AUTHORIZED OFFICIAL LOGIN ONLY
                  </span>
                </div>

                {/* Employee ID */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Government Employee ID</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="text"
                      value={adminEmployeeId}
                      onChange={(e) => setAdminEmployeeId(e.target.value)}
                      placeholder="GOV-XXXX-XXXX"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 font-mono ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Registered Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@letsfixit.gov.in"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Secret Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Registered Mobile Number */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Registered Mobile (+91)</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="tel"
                      value={adminMobile}
                      onChange={(e) => setAdminMobile(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="9876543210"
                      maxLength={10}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 font-mono ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* CAPTCHA checkbox */}
                <CustomCaptcha
                  key={`captcha-admin-${captchaKey}`}
                  id="captcha-admin"
                  value={captchaInputAdmin}
                  onChange={setCaptchaInputAdmin}
                  onCodeGenerated={setCaptchaCodeAdmin}
                  isDarkMode={isDarkMode}
                />

                {error && (
                  <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '12px', borderRadius: '8px' }} className="text-xs font-bold leading-normal">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Login as Admin</span>}
                </button>
              </form>
            )}

            {/* CITIZEN SIGN UP FLOW */}
            {currentScreen === "CITIZEN_SIGNUP" && (
              <form onSubmit={handleCitizenSignUp} className="space-y-4">
                <div className="text-center pb-2">
                  <span className="text-xs font-black text-[#FF6B00] uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    CREATE SECURE CITIZEN PROFILE
                  </span>
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Rajesh Kumar"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="rajesh@letsfixit.in"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Indian City Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Select City</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 appearance-none cursor-pointer ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                    >
                      {INDIAN_CITIES.map((city) => (
                        <option key={city} value={city} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-[#333]"}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 uppercase">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 text-slate-500 h-4 w-4" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm secret password"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* ReCAPTCHA */}
                <CustomCaptcha
                  key={`captcha-citizen-signup-${captchaKey}`}
                  id="captcha-citizen-signup"
                  value={captchaInputCitizenSignup}
                  onChange={setCaptchaInputCitizenSignup}
                  onCodeGenerated={setCaptchaCodeCitizenSignup}
                  isDarkMode={isDarkMode}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Sign Up as Citizen</span>}
                </button>

                {error && (
                  <div style={{color: '#FF0000', backgroundColor: '#FFE5E5', padding: '10px', borderRadius: '8px', marginTop: '8px', fontWeight: '600'}}>
                    {error}
                  </div>
                )}
              </form>
            )}

            {/* SCREEN: EMAIL VERIFICATION SENT (BLOCKED ZONE) */}
            {currentScreen === "EMAIL_VERIFICATION_SENT" && (
              <div className="space-y-5 text-center py-4">
                <div className="mx-auto w-14 h-14 bg-orange-500/10 border border-orange-500/20 text-[#FF6B00] rounded-full flex items-center justify-center mb-2 animate-bounce">
                  <Mail className="h-7 w-7" />
                </div>
                
                <h3 className="text-base font-black text-[#001F5B] dark:text-white uppercase tracking-wider leading-snug">
                  Verification email sent to <strong className="text-[#FF6B00]">{emailInput || "your email address"}</strong>. Please verify and then click Continue.
                </h3>
                
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Please follow the instructions in the email to activate your civic profile and access LetsFixIt dashboard.
                </p>

                <div className="space-y-3 pt-3">
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>I've Verified / Continue</span>}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className={`w-full py-2.5 border text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isDarkMode
                        ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                        : "border-[#FFF3E0] hover:bg-[#FFF8F0] text-slate-700"
                    }`}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Resend Verification Email</span>}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScreen("CITIZEN_LOGIN");
                    }}
                    className="text-xs font-bold text-[#FF6B00] hover:underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    )}

    {/* Invisible container for Firebase Recaptcha */}
    <div id="recaptcha-container" className="hidden"></div>

      {/* MODAL: FIRST GOOGLE LOGIN PROFILE SETUP */}
      {showGoogleSetupModal && googleUserTemp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn">
          <div className={`border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-[#FFF3E0]"}`}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-[#001F5B]"}`}>Complete Profile Setup</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please confirm your city to finalize your secure LetsFixIt profile.
              </p>
            </div>

            <form onSubmit={handleGoogleSetupSubmit} className="space-y-4">
              {/* Profile Information */}
              <div className="space-y-1">
                <label className="block text-[9px] font-mono text-slate-500 uppercase">Google Account</label>
                <div className={`p-2.5 border rounded-xl text-xs ${isDarkMode ? "bg-slate-950 border-slate-800/60 text-slate-300" : "bg-[#FFF8F0] border-[#FFF3E0] text-slate-700"}`}>
                  {googleUserTemp.name} ({googleUserTemp.email})
                </div>
              </div>

              {/* City */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Select Indian City</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 text-slate-500 h-4 w-4" />
                  <select
                    value={googleCity}
                    onChange={(e) => setGoogleCity(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs focus:outline-none border focus:ring-1 appearance-none cursor-pointer ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                        : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                    }`}
                  >
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c} className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-[#333]"}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* User Type / Role selection */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">I am a</label>
                <div className="relative">
                  <Briefcase className="absolute left-3.5 top-3.5 text-slate-500 h-4 w-4" />
                  <select
                    value={googleUserType}
                    onChange={(e) => setGoogleUserType(e.target.value as "Citizen" | "Government Official")}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs focus:outline-none border focus:ring-1 appearance-none cursor-pointer ${
                      isDarkMode
                        ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                        : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                    }`}
                  >
                    <option value="Citizen" className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-[#333]"}>Citizen</option>
                    <option value="Government Official" className={isDarkMode ? "bg-slate-900 text-white" : "bg-white text-[#333]"}>Government Official</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete & Sign In"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FORGOT PASSWORD RESET */}
      {showResetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-fadeIn">
          <div className={`border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-[#FFF3E0]"}`}>
            <button
              onClick={() => setShowResetModal(false)}
              className={`absolute top-4 right-4 transition-all font-mono text-sm cursor-pointer ${isDarkMode ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-[#001F5B]"}`}
            >
              ✕
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className={`text-base font-bold ${isDarkMode ? "text-white" : "text-[#001F5B]"}`}>Reset Password</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your registered email address and we'll dispatch a secure recovery link.
              </p>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl mb-4 leading-relaxed">
                {resetSuccess}
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs rounded-xl mb-4 leading-relaxed">
                {resetError}
              </div>
            )}

            {!resetSuccess && (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 text-slate-500 h-4 w-4" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="rajesh@letsfixit.in"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl text-xs focus:outline-none border focus:ring-1 ${
                        isDarkMode
                          ? "bg-slate-950 border-slate-800 text-white focus:border-slate-700"
                          : "bg-white border-[#FFF3E0] text-[#333] focus:border-[#FF6B00]"
                      }`}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                </button>
              </form>
            )}

            {resetSuccess && (
              <button
                onClick={() => setShowResetModal(false)}
                className={`w-full py-2.5 font-bold text-xs rounded-xl transition-all cursor-pointer ${isDarkMode ? "bg-slate-800 hover:bg-slate-750 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
              >
                Close Window
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
