import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { db, auth, storage, OperationType, handleFirestoreError } from "./firebase";
import { Report, UserProfile } from "./types";
import {
  MapPin,
  Sparkles,
  TrendingUp,
  Plus,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  Award,
  Shield,
  Bell,
  Sun,
  Moon,
  ShieldAlert,
  Menu,
  Search,
  Filter,
  Check,
  ChevronRight,
  Info,
  Calendar,
  Building,
  Gamepad2,
  LogOut,
  User,
  Flame,
  Ambulance,
  Phone,
  Activity,
  Wrench,
  Zap,
  Droplet,
  Trash2,
  FlameKindling,
  Train,
  Compass,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import EarthGlobe from "./components/EarthGlobe";
import StatsDashboard from "./components/StatsDashboard";
import AdminPanel from "./components/AdminPanel";
import AIChatExplorer from "./components/AIChatExplorer";
import FloatingChat from "./components/FloatingChat";
import ReportModal from "./components/ReportModal";
import NotificationPanel, { SimulatedNotification } from "./components/NotificationPanel";
import AuthScreen from "./components/AuthScreen";
import Logo from "./components/Logo";
import ThemeToggle from "./components/ThemeToggle";
import SplashScreen from "./components/SplashScreen";
import GamificationHub from "./components/GamificationHub";
import ProfilePanel from "./components/ProfilePanel";

// Fallback Key if not injected
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  "AIzaSyAxfKGkS_B6zjxHyc02GJbGGicIEkV0iw4";

// Initial Demo/Mock Data to load in case Firestore is fresh
const INITIAL_DEMO_REPORTS: Report[] = [
  {
    id: "delhi-pothole",
    title: "Crater-sized Pothole on Saket Main Road",
    description: "Extremely deep pothole posing severe risks for two-wheelers. Water is pooling inside, masking its depth.",
    category: "potholes",
    status: "Reported",
    imageUrl: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 28.6139,
      lng: 77.2090,
      city: "Delhi NCR",
      address: "Saket Block M Main Road, New Delhi",
    },
    upvotes: 24,
    upvotedBy: [],
    createdBy: "citizen_delhi",
    creatorEmail: "citizen1@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "potholes",
      severity: "High",
      reasoning: "Deep erosion threatens small vehicles. High traffic speeds amplify collision risk.",
      repairCostToday: 800,
      repairCostSixMonths: 7500,
      damageSaved: 6700,
      vehicleDamageRisk: "High",
      accidentProbability: "High",
      waterloggingRisk: "Medium",
    },
  },
  {
    id: "delhi-garbage-ghazipur",
    title: "Uncontrolled Open Garbage Burning at Ghazipur Border",
    description: "Illegal burning of municipal solid waste at the landfill perimeter causing massive toxic smoke clouds. The intense smog is enveloping adjacent residential colonies, creating severe health hazards and reducing visibility on the neighboring expressway.",
    category: "garbage",
    status: "Reported",
    imageUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 28.6256,
      lng: 77.3213,
      city: "Delhi NCR",
      address: "Ghazipur Border Main Road, Near Anand Vihar, New Delhi",
    },
    upvotes: 48,
    upvotedBy: [],
    createdBy: "citizen_delhi_2",
    creatorEmail: "citizen.delhi2@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "garbage",
      severity: "High",
      reasoning: "Landfill emissions and toxic particulates present extreme respiratory hazards. Smoke accumulation on high-speed expressways drastically increases pile-up risks.",
      repairCostToday: 4500,
      repairCostSixMonths: 35000,
      damageSaved: 30500,
      vehicleDamageRisk: "Low",
      accidentProbability: "High",
      waterloggingRisk: "Low",
    },
  },
  {
    id: "delhi-brokenstreetlights-dwarka",
    title: "Metro Transit Corridor Blackout at Dwarka Sector 10",
    description: "Over 15 successive streetlights are non-functional on the primary transit lane and pedestrian walking corridor leading from Dwarka Sector 10 Metro Station. The complete darkness is causing severe safety risks for women commuters and pedestrian traffic.",
    category: "broken streetlights",
    status: "In Progress",
    imageUrl: "https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 28.5810,
      lng: 77.0588,
      city: "Delhi NCR",
      address: "Service Lane near Metro Station, Dwarka Sector 10, New Delhi",
    },
    upvotes: 32,
    upvotedBy: [],
    createdBy: "citizen_delhi_3",
    creatorEmail: "citizen.delhi3@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "broken streetlights",
      severity: "High",
      reasoning: "Critical public safety hazard on a high-traffic metro walking route. High risk of criminal activity and pedestrian accidents in total blackout conditions.",
      repairCostToday: 1800,
      repairCostSixMonths: 5000,
      damageSaved: 3200,
      vehicleDamageRisk: "Low",
      accidentProbability: "High",
      waterloggingRisk: "Low",
    },
  },
  {
    id: "delhi-waterleak-karolbagh",
    title: "Potable Water Pipeline Burst in Karol Bagh Market",
    description: "A primary underground drinking water distribution pipe has ruptured beneath the main commercial lane in Karol Bagh. Hundreds of gallons of clean drinking water are actively gushing onto the streets, causing deep erosion of the subgrade and flooding nearby merchant basements.",
    category: "water leakage",
    status: "Verified",
    imageUrl: "https://images.unsplash.com/photo-1508873696983-2df519f0397e?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 28.6500,
      lng: 77.1900,
      city: "Delhi NCR",
      address: "Ajmal Khan Road, Karol Bagh Market, New Delhi",
    },
    upvotes: 19,
    upvotedBy: [],
    createdBy: "citizen_delhi_4",
    creatorEmail: "citizen.delhi4@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "water leakage",
      severity: "Medium",
      reasoning: "Massive wastage of clean drinking water. Persistent pooling can lead to severe subgrade asphalt failure, creating sudden sinkholes in a heavily crowded market area.",
      repairCostToday: 5000,
      repairCostSixMonths: 45000,
      damageSaved: 40000,
      vehicleDamageRisk: "Medium",
      accidentProbability: "Medium",
      waterloggingRisk: "High",
    },
  },
  {
    id: "delhi-infra-lajpat",
    title: "Foul Waterlogging & Sewer Line Collapse in Lajpat Nagar II",
    description: "A collapsed main sewage conduit has caused dirty blackwater to overflow directly onto Central Market Lane. The persistent pool of toxic water is creating an intense stench, attracting stray animal hazards, and blocking entry to over a dozen local retail shops.",
    category: "public infrastructure",
    status: "Reported",
    imageUrl: "https://images.unsplash.com/photo-1584267326895-d88975a6b04a?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 28.5700,
      lng: 77.2400,
      city: "Delhi NCR",
      address: "Central Market Lane 3, Lajpat Nagar II, New Delhi",
    },
    upvotes: 27,
    upvotedBy: [],
    createdBy: "citizen_delhi_5",
    creatorEmail: "citizen.delhi5@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "public infrastructure",
      severity: "High",
      reasoning: "Extreme health hazard from exposed raw sewage. High risk of waterborne illnesses and severe local business disruption due to blocked market entrances.",
      repairCostToday: 8500,
      repairCostSixMonths: 65000,
      damageSaved: 56500,
      vehicleDamageRisk: "Medium",
      accidentProbability: "Medium",
      waterloggingRisk: "High",
    },
  },
  {
    id: "delhi-potholes-aiims",
    title: "Dangerous Pothole Cluster on Ring Road near AIIMS Flyover",
    description: "A cluster of 4 deep, sharp-edged potholes has formed on the immediate descent of the AIIMS flyover. Vehicles descending at speed are forced to make sudden evasive lane-changes or brake violently, creating severe traffic bottlenecks and critical accident risks during rush hours.",
    category: "potholes",
    status: "In Progress",
    imageUrl: "https://images.unsplash.com/photo-1599740831644-67bc0681d5b0?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 28.5672,
      lng: 77.2100,
      city: "Delhi NCR",
      address: "Ring Road Descent, Westbound near AIIMS Flyover, New Delhi",
    },
    upvotes: 54,
    upvotedBy: [],
    createdBy: "citizen_delhi_6",
    creatorEmail: "citizen.delhi6@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "potholes",
      severity: "High",
      reasoning: "High-speed descent point on Delhi's major ring road. Abrupt braking causes high probability of rear-end pile-ups and heavy suspension damage to light vehicles.",
      repairCostToday: 1200,
      repairCostSixMonths: 11000,
      damageSaved: 9800,
      vehicleDamageRisk: "High",
      accidentProbability: "High",
      waterloggingRisk: "Medium",
    },
  },
  {
    id: "mumbai-leak",
    title: "Main Water Pipeline Burst in Bandra West",
    description: "Drinking water pipeline leakage flowing for 3 days. Flooding local shops and turning asphalt muddy.",
    category: "water leakage",
    status: "In Progress",
    imageUrl: "https://images.unsplash.com/photo-1542060748-10c28b629f6f?q=80&w=600&auto=format&fit=crop",
    location: {
      lat: 19.0760,
      lng: 72.8777,
      city: "Mumbai",
      address: "Linking Road near KFC, Bandra West, Mumbai",
    },
    upvotes: 18,
    upvotedBy: [],
    createdBy: "citizen_mumbai",
    creatorEmail: "citizen2@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "water leakage",
      severity: "Medium",
      reasoning: "Constant flow weakens soil foundations. Water waste is significant.",
      repairCostToday: 2500,
      repairCostSixMonths: 15000,
      damageSaved: 12500,
      vehicleDamageRisk: "Low",
      accidentProbability: "Medium",
      waterloggingRisk: "High",
    },
  },
  {
    id: "bangalore-lights",
    title: "Complete Blackout due to Broken Streetlights",
    description: "Over 10 streetlights are broken. Extreme safety risk for women and pedestrians walking from the metro.",
    category: "broken streetlights",
    status: "Reported",
    location: {
      lat: 12.9716,
      lng: 77.5946,
      city: "Bengaluru",
      address: "100 Feet Road, Indiranagar, Bengaluru",
    },
    upvotes: 35,
    upvotedBy: [],
    createdBy: "citizen_blr",
    creatorEmail: "citizen3@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "broken streetlights",
      severity: "High",
      reasoning: "Dark street pose a severe security hazard. Low visibility increases collision risks.",
      repairCostToday: 4500,
      repairCostSixMonths: 9000,
      damageSaved: 4500,
      vehicleDamageRisk: "Low",
      accidentProbability: "High",
      waterloggingRisk: "Low",
    },
  },
  {
    id: "chennai-garbage",
    title: "Overflowing Garbage Dump near T-Nagar Market",
    description: "Huge pile of public waste lying uncollected for 5 days. Foul smell and stray animal menace blocking the lane.",
    category: "garbage",
    status: "Resolved",
    location: {
      lat: 13.0827,
      lng: 80.2707,
      city: "Chennai",
      address: "Ranganathan Street near Station, T-Nagar, Chennai",
    },
    upvotes: 42,
    upvotedBy: [],
    createdBy: "citizen_chennai",
    creatorEmail: "citizen4@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "garbage",
      severity: "Medium",
      reasoning: "Waste heaps pose public health hazards. Stray animals block the narrow pedestrian street.",
      repairCostToday: 1200,
      repairCostSixMonths: 10000,
      damageSaved: 8800,
      vehicleDamageRisk: "Low",
      accidentProbability: "Medium",
      waterloggingRisk: "Medium",
    },
  },
  {
    id: "kolkata-infra",
    title: "Damaged Pedestrian Guardrail on Salt Lake Bypass",
    description: "Metal guardrail broken and hanging onto the fast lane. Poses serious crash hazard for incoming traffic.",
    category: "public infrastructure",
    status: "In Progress",
    location: {
      lat: 22.5726,
      lng: 88.3639,
      city: "Kolkata",
      address: "Salt Lake Sector V Bypass, Kolkata",
    },
    upvotes: 15,
    upvotedBy: [],
    createdBy: "citizen_kolkata",
    creatorEmail: "citizen5@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "public infrastructure",
      severity: "High",
      reasoning: "Hanging metal can pierce windshields. Fast-moving traffic has no reaction time.",
      repairCostToday: 3000,
      repairCostSixMonths: 18000,
      damageSaved: 15000,
      vehicleDamageRisk: "High",
      accidentProbability: "High",
      waterloggingRisk: "Low",
    },
  },
  {
    id: "hyderabad-leak",
    title: "Major Sewer Water Logging on Gachibowli Road",
    description: "Continuous drainage overflow covering half of the road. Vehicles are skidding, and heavy traffic jam has formed.",
    category: "water leakage",
    status: "Reported",
    location: {
      lat: 17.3850,
      lng: 78.4867,
      city: "Hyderabad",
      address: "DLF Cyber City Road, Gachibowli, Hyderabad",
    },
    upvotes: 29,
    upvotedBy: [],
    createdBy: "citizen_hyd",
    creatorEmail: "citizen6@letsfixit.in",
    createdAt: new Date(),
    updatedAt: new Date(),
    aiAnalysis: {
      category: "water leakage",
      severity: "High",
      reasoning: "Water logging ruins the subgrade soil, causing rapid pothole formation and road erosion.",
      repairCostToday: 5500,
      repairCostSixMonths: 35000,
      damageSaved: 29500,
      vehicleDamageRisk: "High",
      accidentProbability: "High",
      waterloggingRisk: "High",
    },
  }
];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const [reports, setReports] = useState<Report[]>(INITIAL_DEMO_REPORTS);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("letsfixit_logged_user"));
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("letsfixit_logged_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [notifications, setNotifications] = useState<SimulatedNotification[]>([
    {
      id: "notif-1",
      type: "alert",
      title: "Pothole Alert near Saket",
      message: "High priority pothole reported nearby. Caution requested for two-wheelers.",
      time: "2m ago",
      read: false,
    },
    {
      id: "notif-2",
      type: "badge",
      title: "First Report badge unlocked!",
      message: "Congratulations! You earned +100 civic points.",
      time: "10m ago",
      read: true,
    },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // UI state managers
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync dark mode class with root element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [activeTab, setActiveTab] = useState<"home" | "issues" | "map" | "dashboard" | "ai" | "admin" | "gamification" | "profile">("home");
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userProfile?.fullName || userProfile?.name || "Citizen";
    if (hour >= 5 && hour < 12) {
      return `Namaste, ${name}! 🙏`;
    } else if (hour >= 12 && hour < 17) {
      return `Good Afternoon, ${name}!`;
    } else if (hour >= 17 && hour < 22) {
      return `Good Evening, ${name}!`;
    } else {
      return `Good Night, ${name}!`;
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      const updatedProfile = { ...userProfile, photoURL: base64data };
      setUserProfile(updatedProfile);
      localStorage.setItem("letsfixit_logged_user", JSON.stringify(updatedProfile));

      try {
        const { ref: storageRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
        const profilePicRef = storageRef(storage, `users/${userProfile.id}/profile.jpg`);
        const snapshot = await uploadBytes(profilePicRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        const finalProfile = { ...userProfile, photoURL: downloadURL };
        setUserProfile(finalProfile);
        localStorage.setItem("letsfixit_logged_user", JSON.stringify(finalProfile));

        try {
          const userDocRef = doc(db, "users", userProfile.id);
          await updateDoc(userDocRef, { photoURL: downloadURL });
        } catch (dbErr) {
          console.error("Failed to update user profile photoURL in firestore:", dbErr);
        }
      } catch (uploadErr) {
        console.error("Firebase storage upload failed, using local base64 fallback:", uploadErr);
        try {
          const userDocRef = doc(db, "users", userProfile.id);
          await updateDoc(userDocRef, { photoURL: base64data });
        } catch (dbErr) {
          console.error("Failed to update user base64 photoURL in firestore:", dbErr);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Issues Tab Filtering State
  const [issuesSearchQuery, setIssuesSearchQuery] = useState("");
  const [issuesCategoryFilter, setIssuesCategoryFilter] = useState<string>("all");
  const [issuesSeverityFilter, setIssuesSeverityFilter] = useState<string>("all");
  const [issuesStatusFilter, setIssuesStatusFilter] = useState<string>("all");

  const getFilteredReports = () => {
    return reports.filter((report) => {
      const matchesSearch =
        report.title.toLowerCase().includes(issuesSearchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(issuesSearchQuery.toLowerCase()) ||
        report.location.address.toLowerCase().includes(issuesSearchQuery.toLowerCase());

      const matchesCategory =
        issuesCategoryFilter === "all" || report.category === issuesCategoryFilter;

      const matchesSeverity =
        issuesSeverityFilter === "all" || report.aiAnalysis?.severity === issuesSeverityFilter;

      const matchesStatus =
        issuesStatusFilter === "all" || report.status === issuesStatusFilter;

      // City filter for citizens: New Delhi citizens only see issues of New Delhi (Delhi)
      const matchesCity = userProfile?.role === "admin" || (
        userProfile?.city 
          ? (report.location.city.toLowerCase().includes(userProfile.city.toLowerCase().replace("new ", "").trim()) || 
             report.location.address.toLowerCase().includes(userProfile.city.toLowerCase().replace("new ", "").trim()) ||
             (report.location.city.toLowerCase().includes("delhi") && userProfile.city.toLowerCase().includes("delhi")))
          : true
      );

      return matchesSearch && matchesCategory && matchesSeverity && matchesStatus && matchesCity;
    });
  };

  // Simulated Login State Managers
  const [isSimulatedLoggedIn, setIsSimulatedLoggedIn] = useState(false);
  const [showAuthHelpModal, setShowAuthHelpModal] = useState(true);
  const [authErrorMessage, setAuthErrorMessage] = useState("");

  // Authenticate anonymously or load from localStorage
  useEffect(() => {
    // Standard firebase auth state syncing (if any real provider is used)
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user && !userProfile) {
        let fullName = user.displayName || "Civic Citizen";
        let points = 150;
        let badges = ["First Citizen"];
        let city = "New Delhi";
        let role: "citizen" | "admin" = "citizen";
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            fullName = data.fullName || data.name || fullName;
            points = data.points !== undefined ? data.points : points;
            badges = data.badges || badges;
            city = data.city || city;
            role = data.role || role;
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (
            errMsg.toLowerCase().includes("offline") ||
            errMsg.toLowerCase().includes("network") ||
            errMsg.toLowerCase().includes("unreachable") ||
            errMsg.toLowerCase().includes("failed-precondition")
          ) {
            console.warn("Firestore offline when fetching user profile, using defaults:", errMsg);
          } else {
            console.error("Error fetching user profile", e);
          }
        }

        const profile: UserProfile = {
          id: user.uid,
          name: fullName,
          fullName: fullName,
          email: user.email || "citizen@letsfixit.in",
          points: points,
          badges: badges,
          createdAt: new Date(),
          role: role,
          city: city
        };
        setUserProfile(profile);
        setIsLoggedIn(true);
        localStorage.setItem("letsfixit_logged_user", JSON.stringify(profile));
      }
    });

    return () => unsub();
  }, [userProfile]);

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("letsfixit_logged_user");
      setUserProfile(null);
      setIsLoggedIn(false);
      await signOut(auth).catch(() => {});
    } catch (err) {
      console.error("Sign Out failed:", err);
    }
  };

  // Sync reports from Firestore
  useEffect(() => {
    const path = "reports";
    try {
      const unsub = onSnapshot(
        collection(db, path),
        (snapshot) => {
          const cloudReports: Report[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cloudReports.push({
              id: doc.id,
              ...data,
            } as Report);
          });
          // Merge cloud reports with demo reports
          if (cloudReports.length > 0) {
            const merged = [...cloudReports];
            INITIAL_DEMO_REPORTS.forEach((demo) => {
              if (!merged.some((r) => r.id === demo.id)) {
                merged.push(demo);
              }
            });
            setReports(merged);
          }
        },
        (error) => {
          const errMsg = error instanceof Error ? error.message : String(error);
          const errCode = (error && typeof error === "object" && "code" in error) ? (error as any).code : "";
          if (
            errCode === "unavailable" ||
            errCode === "failed-precondition" ||
            errMsg.toLowerCase().includes("offline") ||
            errMsg.toLowerCase().includes("network") ||
            errMsg.toLowerCase().includes("unreachable") ||
            errMsg.toLowerCase().includes("failed-precondition") ||
            errMsg.toLowerCase().includes("could not be completed") ||
            errMsg.toLowerCase().includes("could not reach")
          ) {
            console.warn("Firestore client is offline or restricted. Operating in local-first demo mode.", errMsg);
          } else {
            handleFirestoreError(error, OperationType.GET, path);
          }
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn("Firestore listener fallback:", err);
    }
  }, []);

  // Sync notifications from Firestore
  useEffect(() => {
    if (!userProfile) return;
    try {
      const q = query(
        collection(db, "notifications"),
        where("userId", "in", [userProfile.id, "global", ""])
      );
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const cloudNotifs: SimulatedNotification[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cloudNotifs.push({
              id: doc.id,
              type: data.type || "alert",
              title: data.title || "",
              message: data.message || "",
              time: data.time || "Just now",
              read: data.read || false,
              issueId: data.issueId || "",
              linkTo: data.linkTo || "",
            });
          });
          
          setNotifications((prev) => {
            const merged = [...cloudNotifs];
            // Retain local static mock notifications (e.g. notif-1, notif-2)
            prev.forEach((local) => {
              if (local.id.startsWith("notif-") && !merged.some(c => c.id === local.id)) {
                merged.push(local);
              }
            });
            return merged;
          });
        },
        (error) => {
          console.warn("Firestore notifications sync failed or offline:", error);
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn("Firestore notifications query setup error:", err);
    }
  }, [userProfile]);

  // Update report status (Admin function)
  const handleUpdateStatus = async (
    reportId: string,
    newStatus: "Reported" | "In Progress" | "Resolved"
  ) => {
    // Local state fallback update
    const updatedReports = reports.map((r) => {
      if (r.id === reportId) {
        // Trigger simulated notification
        const notif: SimulatedNotification = {
          id: String(Date.now()),
          type: "status_change",
          title: `Status Update: ${r.title}`,
          message: `Your reported issue has been verified and marked as "${newStatus}" by Gov Authority.`,
          time: "Just now",
          read: false,
          issueId: reportId,
          linkTo: `/issue/${reportId}`,
        };
        setNotifications((prev) => [notif, ...prev]);

        // Write to Firestore for the reporter
        addDoc(collection(db, "notifications"), {
          userId: r.createdBy || "",
          type: "status_change",
          title: `Status Update: ${r.title}`,
          message: `Your reported issue has been verified and marked as "${newStatus}" by Gov Authority.`,
          time: "Just now",
          read: false,
          issueId: reportId,
          linkTo: `/issue/${reportId}`,
          createdAt: new Date(),
        }).catch((err) => console.warn("Firestore notif save failed:", err));

        // Push geo-alerts to nearby citizens if verified
        if (newStatus === "In Progress" || newStatus === "Resolved") {
          const broadcast: SimulatedNotification = {
            id: String(Date.now() + 1),
            type: "alert",
            title: `Safety Alert: Dispatch active!`,
            message: `A dispatch crew has been assigned to address "${r.title}" near ${r.location.address}. Caution requested.`,
            time: "Just now",
            read: false,
            issueId: reportId,
            linkTo: `/issue/${reportId}`,
          };
          setNotifications((prev) => [broadcast, ...prev]);

          // Write global broadcast to Firestore
          addDoc(collection(db, "notifications"), {
            userId: "global",
            type: "alert",
            title: `Safety Alert: Dispatch active!`,
            message: `A dispatch crew has been assigned to address "${r.title}" near ${r.location.address}. Caution requested.`,
            time: "Just now",
            read: false,
            issueId: reportId,
            linkTo: `/issue/${reportId}`,
            createdAt: new Date(),
          }).catch((err) => console.warn("Firestore broadcast save failed:", err));
        }

        return { ...r, status: newStatus };
      }
      return r;
    });

    setReports(updatedReports);

    // Save to Firestore if database document exists
    try {
      await updateDoc(doc(db, "reports", reportId), {
        status: newStatus,
        updatedAt: new Date(),
      });
    } catch (err) {
      console.warn("No Firestore update support for local records:", err);
    }
  };

  // Submit new report to database
  const handleAddReport = async (
    newReport: Omit<Report, "id" | "upvotes" | "upvotedBy" | "createdAt" | "updatedAt">
  ) => {
    const reportData = {
      ...newReport,
      upvotes: 0,
      upvotedBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Increase citizen points
    setUserProfile((prev) => {
      if (!prev) return prev;
      const currentPoints = prev.points + 100;
      const badges = [...prev.badges];
      if (currentPoints >= 500 && !badges.includes("Infrastructure Sentinel")) {
        badges.push("Infrastructure Sentinel");
        const alertNotif: SimulatedNotification = {
          id: String(Date.now() + 2),
          type: "badge",
          title: "Badge unlocked: Infrastructure Sentinel",
          message: "You've earned 500+ points and unlocked civic sentinel recognition!",
          time: "Just now",
          read: false,
          linkTo: "profile",
        };
        setNotifications((prevNotif) => [alertNotif, ...prevNotif]);

        // Save to Firestore
        addDoc(collection(db, "notifications"), {
          userId: prev.id,
          type: "badge",
          title: "Badge unlocked: Infrastructure Sentinel",
          message: "You've earned 500+ points and unlocked civic sentinel recognition!",
          time: "Just now",
          read: false,
          linkTo: "profile",
          createdAt: new Date(),
        }).catch((err) => console.warn("Firestore badge notif save failed:", err));
      }
      return { ...prev, points: currentPoints, badges };
    });

    try {
      const docRef = await addDoc(collection(db, "reports"), reportData);
      setReports((prev) => [
        { id: docRef.id, ...reportData } as Report,
        ...prev,
      ]);

      // Save success toast notification to Firestore with issueId!
      addDoc(collection(db, "notifications"), {
        userId: userProfile?.id || "",
        type: "status_change",
        title: "Report Filed Successfully!",
        message: `Your report on '${newReport.title}' is published with standard cost estimates.`,
        time: "Just now",
        read: false,
        issueId: docRef.id,
        linkTo: `/issue/${docRef.id}`,
        createdAt: new Date(),
      }).catch((err) => console.warn("Firestore success notif save failed:", err));

      // Trigger local notification
      const successToast: SimulatedNotification = {
        id: String(Date.now()),
        type: "status_change",
        title: "Report Filed Successfully!",
        message: `Your report on '${newReport.title}' is published with standard cost estimates.`,
        time: "Just now",
        read: false,
        issueId: docRef.id,
        linkTo: `/issue/${docRef.id}`,
      };
      setNotifications((prev) => [successToast, ...prev]);

    } catch (err) {
      // Local fallback in case Firestore is offline
      const tempId = `local-${Date.now()}`;
      setReports((prev) => [{ id: tempId, ...reportData } as Report, ...prev]);

      // Trigger local notification with fallback tempId
      const successToast: SimulatedNotification = {
        id: String(Date.now()),
        type: "status_change",
        title: "Report Filed Successfully!",
        message: `Your report on '${newReport.title}' is published with standard cost estimates.`,
        time: "Just now",
        read: false,
        issueId: tempId,
        linkTo: `/issue/${tempId}`,
      };
      setNotifications((prev) => [successToast, ...prev]);
    }
  };

  // Upvoting system to prevent spam and verify real issues
  const handleUpvote = async (reportId: string) => {
    const userId = userProfile.id;
    const updatedReports = reports.map((r) => {
      if (r.id === reportId) {
        const upvotedBy = r.upvotedBy || [];
        if (upvotedBy.includes(userId)) {
          alert("You have already upvoted this reported issue.");
          return r;
        }
        // Citizen gets points for verification
        setUserProfile((prev) => ({ ...prev, points: prev.points + 20 }));

        return {
          ...r,
          upvotes: r.upvotes + 1,
          upvotedBy: [...upvotedBy, userId],
        };
      }
      return r;
    });

    setReports(updatedReports);

    try {
      const r = reports.find((rep) => rep.id === reportId);
      if (r) {
        await updateDoc(doc(db, "reports", reportId), {
          upvotes: r.upvotes + 1,
          upvotedBy: [...(r.upvotedBy || []), userId],
        });
      }
    } catch (err) {
      console.warn("Local upvote synchronized.");
    }
  };

  if (!isLoggedIn || !userProfile) {
    return (
      <>
        {showSplash && <SplashScreen />}
        <AuthScreen
          isDarkMode={isDarkMode}
          toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onAuthSuccess={(user) => {
            setUserProfile(user);
            setIsLoggedIn(true);
            setActiveTab(user.role === "admin" ? "admin" : "home");
            localStorage.setItem("letsfixit_logged_user", JSON.stringify(user));
          }}
        />
      </>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen />}
      {/* Live Community Radar as a background of the dashboard/page */}
      <div 
        className="pointer-events-none fixed inset-0 w-full h-full" 
        style={{ zIndex: 0, opacity: 0.18 }}
      >
        <EarthGlobe />
      </div>

      <div className={`min-h-screen ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"} font-sans transition-all flex flex-col relative z-10`}>
        {/* Decorative backdrop gradients */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none z-0"></div>

        {/* Top Navbar */}
        <header className="relative z-30 flex items-center justify-between px-6 py-4 bg-slate-900/40 backdrop-blur-md border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-1.5 hover:bg-slate-800/50 rounded-lg cursor-pointer text-slate-300 md:hidden"
            >
              <Menu className="h-5.5 w-5.5" />
            </button>
            <Logo size={36} />
            <span className="font-oswald text-xl font-bold tracking-wider text-orange-500">LetsFixIt</span>
          </div>

          {/* Center Greeting */}
          <div className="hidden md:block text-center flex-1 mx-4">
            <h2 className="text-base font-bold text-white flex items-center justify-center gap-2">
              {getGreeting()}
            </h2>
          </div>

          {/* Profiles and widgets */}
          <div className="flex items-center gap-3">
            {/* Points display */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 hidden sm:flex items-center gap-2 shadow-inner">
              <Award className="h-4 w-4 text-yellow-400" />
              <div>
                <span className="block text-[8px] text-slate-500 font-mono leading-none uppercase">MY SCORE</span>
                <span className="text-xs font-extrabold text-white mt-0.5 leading-none block">{userProfile.points} Points</span>
              </div>
            </div>

            {/* User Profile Pill */}
            <div ref={profileRef} className="relative">
              <div 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-1.5 pr-3 rounded-xl cursor-pointer transition-all select-none"
              >
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.fullName || userProfile.name}
                    className="h-7 w-7 rounded-full object-cover border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-7 w-7 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full flex items-center justify-center font-bold text-xs p-1">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
                <div className="text-left leading-none">
                  <span className="text-xs font-extrabold text-white block">{userProfile.fullName || userProfile.name}</span>
                </div>
              </div>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <>
                  <div 
                    onClick={() => setShowProfileDropdown(false)}
                    className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px] cursor-default"
                  />
                  <div 
                    className="absolute right-0 mt-2 w-64 rounded-xl border p-4 shadow-2xl z-[9999] animate-fadeIn space-y-4 text-left"
                    style={{ 
                      background: isDarkMode ? '#1a1a2e' : '#ffffff',
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                      color: isDarkMode ? '#f0f0f0' : '#111111'
                    }}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">Logged In As</p>
                      <h4 className="text-sm font-black" style={{ color: isDarkMode ? '#ffffff' : '#111111' }}>
                        {userProfile.fullName || userProfile.name}
                      </h4>
                      <p className="text-xs font-mono text-slate-400 truncate">{userProfile.email}</p>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setActiveTab("profile");
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-500/15 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                        style={{ color: isDarkMode ? '#f0f0f0' : '#333333' }}
                      >
                        <User className="h-4 w-4 text-orange-500" />
                        <span>My Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("gamification");
                          setShowProfileDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-slate-500/15 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                        style={{ color: isDarkMode ? '#f0f0f0' : '#333333' }}
                      >
                        <Gamepad2 className="h-4 w-4 text-amber-500" />
                        <span>Play Games & Trivia</span>
                      </button>
                    </div>

                    {/* FIX 2: LOGOUT BUTTON AT BOTTOM OF PROFILE DROPDOWN */}
                    <div className="border-t border-slate-800/80 pt-3 flex justify-center">
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false);
                          handleSignOut();
                        }}
                        style={{
                          color: '#ef4444',
                          background: 'transparent',
                          border: '1px solid #ef4444',
                          borderRadius: '8px',
                          padding: '10px 24px',
                          fontWeight: 'bold',
                          width: '100%',
                          textAlign: 'center',
                          cursor: 'pointer',
                        }}
                        className="hover:bg-red-500/10 transition-colors text-xs flex items-center justify-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Broadcasts/Notification Center */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextState = !showNotifications;
                  setShowNotifications(nextState);
                  if (nextState) {
                    // Mark all as read immediately when opening, erasing the red badge
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                  }
                }}
                className="p-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition-all relative cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-slate-950 animate-pulse"></span>
                )}
              </button>
              {showNotifications && (
                <>
                  {/* FIX 1: Solid overlay div behind the panel */}
                  <div 
                    onClick={() => setShowNotifications(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      background: 'rgba(0,0,0,0.4)',
                      zIndex: 9998
                    }}
                  />
                  <div ref={notifRef} style={{ position: 'absolute', right: 0, top: '48px', zIndex: 9999 }}>
                    <NotificationPanel
                      notifications={notifications}
                      isDarkMode={isDarkMode}
                      onMarkAllAsRead={() => {
                        setNotifications(notifications.map((n) => ({ ...n, read: true })));
                        notifications.forEach(async (n) => {
                          if (!n.read && !n.id.startsWith("notif-")) {
                            try {
                              await updateDoc(doc(db, "notifications", n.id), { read: true });
                            } catch (err) {
                              console.warn("Failed to mark notification read in Firestore:", err);
                            }
                          }
                        });
                      }}
                      onItemClick={async (id) => {
                        const found = notifications.find((n) => n.id === id);
                        if (found) {
                          // Mark as read in local state
                          setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
                          
                          // Mark as read in Firestore
                          if (!id.startsWith("notif-")) {
                            try {
                              await updateDoc(doc(db, "notifications", id), { read: true });
                            } catch (err) {
                              console.warn("Failed to mark notification read in Firestore:", err);
                            }
                          }

                          // Navigate based on issueId / linkTo
                          const issueId = found.issueId || (found.linkTo && found.linkTo.startsWith("/issue/") ? found.linkTo.replace("/issue/", "") : "");
                          if (issueId) {
                            const report = reports.find((r) => r.id === issueId);
                            if (report) {
                              setActiveTab("map");
                              setSelectedReport(report);
                            } else {
                              setToastMessage("This issue is no longer available");
                            }
                          } else if (found.linkTo) {
                            const tab = found.linkTo.replace("/", "") as any;
                            const validTabs = ["home", "issues", "map", "dashboard", "ai", "admin", "gamification", "profile", "commute-safety"];
                            if (validTabs.includes(tab)) {
                              setActiveTab(tab);
                            } else {
                              setActiveTab("home");
                            }
                          } else {
                            // Fallback based on type
                            const type = found.type;
                            if (type === "status_change" || type === "new_vote") {
                              setActiveTab("issues");
                            } else if (type === "points_earned") {
                              setActiveTab("gamification");
                            } else if (type === "badge_unlocked") {
                              setActiveTab("profile");
                            } else {
                              setActiveTab("home");
                            }
                          }
                        }
                        setShowNotifications(false);
                      }}
                      onClose={() => setShowNotifications(false)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Light/Dark mode */}
            <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
          </div>
        </header>

        {/* Hidden input for avatar upload */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Sidebar + Main Content Layout container */}
        <div className="flex-1 flex flex-col md:flex-row relative z-10 w-full">
          {/* LEFT SIDEBAR - Only visible when not on the Dashboard home page */}
          {activeTab !== "home" && (
            <aside className={`md:w-[220px] transition-all duration-300 shrink-0 border-r flex flex-col z-20 ${
              isSidebarOpen ? "w-full md:w-[220px] p-4" : "w-0 overflow-hidden border-none p-0"
            } ${
              isDarkMode ? "bg-[#0B0B16]/95 border-slate-800 text-slate-100" : "bg-white/95 border-slate-200 text-slate-900"
            }`}>
              <div className="flex flex-col h-full justify-between gap-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-wider mb-2 px-4 hidden md:block">Navigation</span>
                  
                  <button
                    onClick={() => { setActiveTab("home"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "home" 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Building className="h-4 w-4" />
                    <span>Home</span>
                  </button>

                  {/* 2. Report Issue (with plus/pin SVG icon) */}
                  <button
                    onClick={() => { setShowReportModal(true); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      showReportModal 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <PlusCircle className="h-4 w-4 text-orange-500" />
                    <span>Report Issue</span>
                  </button>

                  {/* 3. View Issues */}
                  <button
                    onClick={() => { setActiveTab("issues"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "issues" 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>View Issues</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("dashboard"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "dashboard" 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Damage & Savings</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("map"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "map" 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>Live Heatmap</span>
                  </button>

                  {userProfile.role === "admin" && (
                    <button
                      onClick={() => { setActiveTab("admin"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === "admin" 
                          ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                          : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Admin Portal</span>
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveTab("gamification"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "gamification" 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Gamepad2 className="h-4 w-4" />
                    <span>LetsFixIt Playroom</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("commute-safety"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "commute-safety" 
                        ? "bg-[#FF6B00] text-white shadow-md shadow-orange-500/20" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Compass className="h-4 w-4" />
                    <span>Commute Safety Guard</span>
                  </button>
                </div>

                {/* BOTTOM PROFILE + LOGOUT with divider */}
                <div className={`pt-4 border-t space-y-2 ${isDarkMode ? "border-slate-800/60" : "border-slate-200"}`}>
                  <button
                    onClick={() => { setActiveTab("profile"); if (window.innerWidth < 768) setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === "profile" 
                        ? "bg-[#FF6B00] text-white shadow-md" 
                        : isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-[#ef4444] hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 w-full pt-6 pb-10 px-6 md:px-8 relative z-10">

            {activeTab === "home" && (
              <div className="space-y-6">
                {/* Civic Dashboard Welcome Banner */}
                <div 
                  className="border rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn"
                  style={{
                    backgroundColor: isDarkMode ? "rgba(30, 30, 46, 0.6)" : "#ffffff",
                    backdropFilter: isDarkMode ? "blur(12px)" : "none",
                    borderColor: "var(--card-border)"
                  }}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-mono rounded uppercase font-bold">
                        Dashboard
                      </span>
                      {userProfile.role === "admin" && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono rounded uppercase font-bold">
                          Gov Official Portal
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-orange-500 flex items-center gap-2">
                      {getGreeting()}
                    </h2>
                    <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                      Logged in as <strong className="font-mono" style={{ color: "var(--text-primary)" }}>{userProfile.email}</strong> • City of <strong style={{ color: "var(--text-primary)" }}>{userProfile.city || "New Delhi"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* View Existing Issues Button */}
                    <button
                      onClick={() => setActiveTab("issues")}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
                    >
                      <MapPin className="h-4 w-4 text-orange-500" />
                      <span>View Existing Issues ({reports.length})</span>
                    </button>
                  </div>
                </div>

                {/* Prominent saffron orange Report an Issue button/banner */}
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full p-4 bg-[#FF6B00] hover:bg-[#E05300] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all duration-200 hover:scale-[1.01] active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 border border-[#FFCCBC]/20"
                >
                  <MapPin className="h-5 w-5" />
                  <span>Report an Issue</span>
                </button>

                {/* Citizen Profile ID Card */}
                <div 
                  className="relative p-6 rounded-2xl border shadow-2xl overflow-hidden bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white flex flex-col md:flex-row items-stretch justify-between gap-6"
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)"
                  }}
                >
                  {/* Left edge Tricolor stripe */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 flex flex-col">
                    <div className="h-1/3 bg-[#FF9933]" />
                    <div className="h-1/3 bg-white" />
                    <div className="h-1/3 bg-[#138808]" />
                  </div>

                  {/* Left Content Area: Profile Photo + Name + City */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 pl-4 flex-1">
                    <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
                      {userProfile.photoURL ? (
                        <img 
                          src={userProfile.photoURL} 
                          alt={userProfile.fullName || userProfile.name} 
                          className="h-20 w-20 rounded-full object-cover border-2 border-white/20 shadow-md group-hover:border-[#FF9933] transition-all" 
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-slate-800 border-2 border-white/10 flex items-center justify-center text-slate-300 group-hover:border-[#FF9933] transition-all p-2">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-slate-400">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity">
                        Change
                      </div>
                    </div>

                    <div className="text-center sm:text-left space-y-1.5">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[#FF9933] font-mono text-xs font-bold tracking-widest uppercase">
                        <Shield className="h-4 w-4 fill-current text-[#FF9933]" />
                        <span>CITIZEN IDENTITY VERIFIED</span>
                      </div>
                      
                      <h3 className="text-xl font-black tracking-tight">{userProfile.fullName || userProfile.name || "Civic Citizen"}</h3>
                      
                      <p className="text-xs text-slate-400 font-medium">
                        City Jurisdiction: <span className="text-white font-bold">{userProfile.city || "New Delhi"}</span>
                      </p>

                      {/* Earned Badges under left content */}
                      <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-2">
                        {(userProfile.badges || ["First Citizen"]).map((badge) => (
                          <span key={badge} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                            🏆 {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Divider on desktop */}
                  <div className="hidden md:block w-[1px] bg-white/10 self-stretch my-2" />

                  {/* Right Content Area: Citizen ID, Points, Rank Badge, Checked logo */}
                  <div className="flex flex-col justify-between items-center md:items-end text-center md:text-right gap-4 md:w-80">
                    <div className="space-y-1">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">National Citizen ID</div>
                      <div className="text-sm font-black font-mono text-white tracking-wider">
                        IND-{String(userProfile.id || "0000").substring(0, 10).toUpperCase()}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-center md:text-right">
                        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Honor Points</div>
                        <div className="text-xl font-black text-[#FF9933] font-mono">{userProfile.points || 0}</div>
                      </div>
                      
                      <div className="h-8 w-[1px] bg-white/10" />

                      <div className="text-center md:text-right">
                        <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">National Rank</div>
                        <div className="text-[10px] font-black text-[#138808] uppercase tracking-wide bg-[#138808]/10 border border-[#138808]/20 px-2 py-0.5 rounded mt-0.5">
                          Civic Protector 🇮🇳
                        </div>
                      </div>
                    </div>

                    {/* Verified badge */}
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 fill-current" />
                      <span>MUNICIPALITY VERIFIED</span>
                    </div>
                  </div>
                </div>

                {/* Bento Quick Actions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
                  {/* Action 1 */}
                  <div 
                    onClick={() => setActiveTab("issues")}
                    className="p-6 rounded-2xl border hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-44"
                    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl w-10 h-10 flex items-center justify-center border border-orange-500/15 group-hover:bg-orange-500 group-hover:text-white transition-all">
                      <PlusCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider group-hover:text-orange-500 transition-colors" style={{ color: "var(--text-primary)" }}>Browse Issues</h4>
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        Inspect verified citizen pothole, light, garbage reports and vote to coordinate fixes.
                      </p>
                    </div>
                  </div>

                  {/* Action 2 */}
                  <div 
                    onClick={() => setActiveTab("map")}
                    className="p-6 rounded-2xl border hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-44"
                    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl w-10 h-10 flex items-center justify-center border border-indigo-500/15 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider group-hover:text-indigo-500 transition-colors" style={{ color: "var(--text-primary)" }}>Live Risk Heatmap</h4>
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        Explore spatial overlays of civic risk predictive models plotted directly on high-precision maps.
                      </p>
                    </div>
                  </div>

                  {/* Action 3 */}
                  <div 
                    onClick={() => setActiveTab("ai")}
                    className="p-6 rounded-2xl border hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-44"
                    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl w-10 h-10 flex items-center justify-center border border-emerald-500/15 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider group-hover:text-emerald-500 transition-colors" style={{ color: "var(--text-primary)" }}>LetsFixIt AI Advisor</h4>
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        Query Gemini-powered structural audits, costing, priority timelines, and civic resolutions.
                      </p>
                    </div>
                  </div>

                  {/* Action 4 */}
                  <div 
                    onClick={() => setActiveTab("dashboard")}
                    className="p-6 rounded-2xl border hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-44"
                    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl w-10 h-10 flex items-center justify-center border border-amber-500/15 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider group-hover:text-amber-500 transition-colors" style={{ color: "var(--text-primary)" }}>Damage & Savings Stats</h4>
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        Analyze financial impact analytics showing taxpayers money saved through predictive maintenance.
                      </p>
                    </div>
                  </div>

                  {/* Action 5: Gamification Hub */}
                  <div 
                    onClick={() => setActiveTab("gamification")}
                    className="p-6 rounded-2xl border hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-44"
                    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl w-10 h-10 flex items-center justify-center border border-yellow-500/15 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider group-hover:text-yellow-500 transition-colors" style={{ color: "var(--text-primary)" }}>LetsFixIt Playroom</h4>
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        Play Pothole Patrol, Swachh Waste Sorter, and National Civic Trivia to earn rewards!
                      </p>
                    </div>
                  </div>

                  {/* Action 6: Commute Safety Guard */}
                  <div 
                    onClick={() => setActiveTab("commute-safety")}
                    className="p-6 rounded-2xl border hover:shadow-xl hover:scale-[1.01] transition-all cursor-pointer group flex flex-col justify-between h-44"
                    style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                  >
                    <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-xl w-10 h-10 flex items-center justify-center border border-cyan-500/15 group-hover:bg-cyan-500 group-hover:text-white transition-all">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider group-hover:text-cyan-500 transition-colors" style={{ color: "var(--text-primary)" }}>COMMUTE SAFETY GUARD</h4>
                      <p className="text-[10px] mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                        Ask if your daily route is safe — AI checks nearby reports, construction, and lighting before you head out.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Info Bar */}
                <div className="p-6 rounded-2xl border border-dashed text-xs leading-relaxed space-y-1 mt-6" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                  <h4 className="font-bold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                    <Shield className="h-4 w-4 text-orange-500" /> Dynamic Crowdsourced Auditing Protocol
                  </h4>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Your reports are run through on-device computer vision and evaluated against local municipality budgets to forecast decay costs. Upvote existing issues to confirm them to government officers.
                  </p>
                </div>
              </div>
            )}

        {activeTab === "issues" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Search and Filters Header */}
            <div className="p-6 rounded-2xl border backdrop-blur-md shadow-xl flex flex-col gap-6" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-orange-500" />
                    Community Issue Directory
                  </h2>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    Search and filter crowdsourced civic issues reported by fellow citizens. Upvote verified concerns.
                  </p>
                  {userProfile?.role !== "admin" && (
                    <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/25 text-[#FF6600] rounded-xl text-xs font-bold w-fit">
                      <MapPin className="h-4 w-4" />
                      <span>Showing verified issues of {userProfile?.city || "New Delhi"} only to upvote.</span>
                    </div>
                  )}
                </div>
                
                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search title, description, address..."
                    value={issuesSearchQuery}
                    onChange={(e) => setIssuesSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Filters Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-dashed" style={{ borderColor: "var(--card-border)" }}>
                {/* Category Filter */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Category</span>
                  <select
                    value={issuesCategoryFilter}
                    onChange={(e) => setIssuesCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500/50 cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    <option value="potholes">Potholes & Roads</option>
                    <option value="water leakage">Water Leakage</option>
                    <option value="broken streetlights">Streetlights</option>
                    <option value="garbage">Garbage Pile</option>
                    <option value="public infrastructure">Public Infra</option>
                  </select>
                </div>

                {/* Severity Filter */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Priority Severity</span>
                  <div className="flex gap-1.5">
                    {["all", "High", "Medium", "Low"].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setIssuesSeverityFilter(sev)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          issuesSeverityFilter === sev
                            ? "bg-slate-800 border-orange-500/50 text-orange-400"
                            : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {sev === "all" ? "All" : sev}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold">Resolution Status</span>
                  <select
                    value={issuesStatusFilter}
                    onChange={(e) => setIssuesStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-orange-500/50 cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Reported">Reported</option>
                    <option value="Verified">Verified</option>
                    <option value="Assigned to Department">Assigned</option>
                    <option value="Work In Progress">Work In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grid of Issues Cards */}
            {getFilteredReports().length === 0 ? (
              <div className="p-12 text-center rounded-2xl border" style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}>
                <AlertTriangle className="h-10 w-10 text-orange-500 mx-auto opacity-65 mb-3" />
                <h3 className="text-sm font-bold text-white">No Matching Issues Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your keywords or active filters to view other reports recorded in this area.
                </p>
                <button
                  onClick={() => {
                    setIssuesSearchQuery("");
                    setIssuesCategoryFilter("all");
                    setIssuesSeverityFilter("all");
                    setIssuesStatusFilter("all");
                  }}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-orange-400 border border-slate-700 rounded-xl cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFilteredReports().map((report) => {
                  const hasUpvoted = report.upvotedBy?.includes(userProfile.id);
                  const isHigh = report.aiAnalysis?.severity === "High";
                  const isMedium = report.aiAnalysis?.severity === "Medium";

                  const severityBadgeClass = isHigh
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : isMedium
                    ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

                  const categoryIcon: Record<string, React.ReactNode> = {
                    potholes: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-orange-500">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    ),
                    "water leakage": (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-500">
                        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-13-7-13S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                      </svg>
                    ),
                    "broken streetlights": (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-500">
                        <circle cx="12" cy="12" r="5"/>
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                      </svg>
                    ),
                    garbage: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-500">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    ),
                    "public infrastructure": (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-500">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
                        <line x1="9" y1="22" x2="9" y2="16"/>
                        <line x1="15" y1="22" x2="15" y2="16"/>
                        <line x1="9" y1="16" x2="15" y2="16"/>
                        <path d="M9 6h6M9 10h6"/>
                      </svg>
                    ),
                  };

                  return (
                    <div
                      key={report.id}
                      className="rounded-2xl border overflow-hidden flex flex-col justify-between shadow-lg hover:shadow-2xl transition-all"
                      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
                    >
                      <div className="p-6 space-y-4">
                        {/* Card Header Info */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center">
                              {categoryIcon[report.category] || <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-orange-500"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 capitalize font-semibold">
                              {report.category.replace("_", " ")}
                            </span>
                            {report.isAIVerified && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] border border-emerald-500/20 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5 text-emerald-400" /> AI Verified
                              </span>
                            )}
                          </div>
                          
                          {/* Priority Severity Badge */}
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-lg border uppercase ${severityBadgeClass}`}>
                            {report.aiAnalysis?.severity || "Medium"} Priority
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 className="text-sm font-black text-white leading-snug">{report.title}</h3>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                            <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                            <span className="truncate">{report.location.address}</span>
                          </p>
                          <p className="text-xs text-slate-300 mt-2.5 line-clamp-3 leading-relaxed">
                            {report.description}
                          </p>
                        </div>

                        {/* Image Preview if available */}
                        {report.imageUrl && (
                          <div className="w-full h-36 rounded-xl overflow-hidden border relative group bg-slate-950/40" style={{ borderColor: "var(--card-border)" }}>
                            <img
                              src={report.imageUrl}
                              alt={report.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        )}

                        {/* Timeline / Progress Tracker */}
                        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase">
                            <span>Status Journey</span>
                            <span className="font-extrabold text-orange-400">{report.status}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mt-1 flex gap-0.5">
                            <div className="h-full bg-orange-500 rounded-full flex-1"></div>
                            <div className={`h-full flex-1 ${report.status !== "Reported" ? "bg-amber-500" : "bg-slate-800"}`}></div>
                            <div className={`h-full flex-1 ${["Resolved", "Under Review", "Work In Progress"].includes(report.status) ? "bg-yellow-500" : "bg-slate-800"}`}></div>
                            <div className={`h-full rounded-full flex-1 ${report.status === "Resolved" ? "bg-emerald-500" : "bg-slate-800"}`}></div>
                          </div>
                        </div>

                        {/* Dynamic Estimator Cost Block */}
                        <div className="bg-slate-950/60 p-3.5 rounded-xl border space-y-2 border-slate-900">
                          <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block">AI Taxpayer Estimator Values</span>
                          <div className="grid grid-cols-3 gap-1.5">
                            <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-900 text-center">
                              <span className="text-[8px] text-slate-500 font-mono block">Repair Cost</span>
                              <span className="text-[11px] font-bold text-white">₹{report.aiAnalysis?.repairCostToday?.toLocaleString("en-IN") || "0"}</span>
                            </div>
                            <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-900 text-center">
                              <span className="text-[8px] text-slate-500 font-mono block">If Ignored</span>
                              <span className="text-[11px] font-bold text-red-400">₹{report.aiAnalysis?.repairCostSixMonths?.toLocaleString("en-IN") || "0"}</span>
                            </div>
                            <div className="bg-slate-900/40 p-1.5 rounded-lg border border-slate-900 text-center">
                              <span className="text-[8px] text-slate-500 font-mono block">Tax Savings</span>
                              <span className="text-[11px] font-extrabold text-emerald-400">₹{report.aiAnalysis?.damageSaved?.toLocaleString("en-IN") || "0"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-4 border-t flex items-center justify-between gap-3 bg-slate-950/[0.1]" style={{ borderColor: "var(--card-border)" }}>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {report.createdAt ? (
                            <span>Reported {new Date(report.createdAt.seconds * 1000).toLocaleDateString()}</span>
                          ) : (
                            <span>Recent Entry</span>
                          )}
                        </div>

                        <button
                          onClick={() => handleUpvote(report.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer border ${
                            hasUpvoted
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : "bg-orange-600 hover:bg-orange-500 border-orange-500/10 text-white shadow-md hover:-translate-y-0.5"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {hasUpvoted ? "Upvoted" : "Upvote to Verify"} ({report.upvotes})
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "map" && (
          <div className="space-y-6">
            <div className="space-y-4">
              {/* Maps Container with AI Heatmap explanation */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-md flex flex-col h-[650px] relative overflow-hidden shadow-2xl">
                <div className="absolute top-4 right-4 z-10 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-3 space-y-2 max-w-xs shadow-lg">
                  <span className="text-[9px] font-mono text-slate-400 uppercase">AI Predictor Heatmap</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span className="text-[10px] text-slate-300 font-semibold">High Risk Zone (Potholes / Flood)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span>
                      <span className="text-[10px] text-slate-300 font-semibold">Medium Risk (Broken Lights)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                      <span className="text-[10px] text-slate-300 font-semibold">Safe Route / Resolved</span>
                    </div>
                  </div>
                </div>

                {/* Google Maps Embed Provider */}
                <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                  <Map
                    defaultCenter={{ lat: 20.5937, lng: 78.9629 }} // Center of India
                    defaultZoom={5} // Zoom level 5 to show all of India clearly
                    mapId="DEMO_MAP_ID"
                    internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                    style={{ width: "100%", height: "100%", borderRadius: "12px" }}
                  >
                  {/* Render Reports with Glowing custom Heatmap Marker overlays */}
                  {reports.map((report) => {
                    const riskColor =
                      report.aiAnalysis?.severity === "High"
                        ? "rgba(239, 68, 68, 0.45)" // Red
                        : report.aiAnalysis?.severity === "Medium"
                        ? "rgba(249, 115, 22, 0.4)" // Orange
                        : "rgba(16, 185, 129, 0.35)"; // Emerald Green

                    return (
                      <AdvancedMarker
                        key={report.id}
                        position={{ lat: report.location.lat, lng: report.location.lng }}
                        onClick={() => setSelectedReport(report)}
                      >
                        {/* Glowing pulsing heatmap ring */}
                        <div className="relative flex items-center justify-center cursor-pointer">
                          <div
                            className="absolute rounded-full animate-ping opacity-60"
                            style={{
                              width: "30px",
                              height: "30px",
                              backgroundColor: riskColor,
                            }}
                          ></div>
                          <div
                            className="h-5 w-5 rounded-full border border-white flex items-center justify-center shadow-lg"
                            style={{
                              backgroundColor:
                                report.aiAnalysis?.severity === "High"
                                  ? "#ef4444"
                                  : report.aiAnalysis?.severity === "Medium"
                                  ? "#f97316"
                                  : "#10b981",
                            }}
                          >
                            <span className="text-[7px] font-black text-white">
                              {report.category === "potholes" ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-2.5 h-2.5"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2"/></svg>
                              )}
                            </span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            </div>
          </div>

          {/* Selected / Highlighted active report details drawer */}
          {selectedReport && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4 animate-slideUp">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 text-[9px] font-mono rounded border ${
                      selectedReport.aiAnalysis?.severity === "High"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                    }`}>
                      {selectedReport.aiAnalysis?.severity} Priority
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1">{selectedReport.title}</h3>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3 text-orange-500"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {selectedReport.location.address}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="text-xs text-slate-500 hover:text-white font-mono cursor-pointer"
                  >
                    Close [x]
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.description}</p>

                {/* Status Progress Bar */}
                <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 uppercase">
                    <span>Verification Timeline</span>
                    <span className="font-extrabold text-orange-400">{selectedReport.status}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-850 rounded-full overflow-hidden mt-1.5 flex gap-1">
                    <div className="h-full bg-orange-500 rounded-full flex-1"></div>
                    <div className={`h-full rounded-full flex-1 ${selectedReport.status !== "Reported" ? "bg-yellow-500" : "bg-slate-800"}`}></div>
                    <div className={`h-full rounded-full flex-1 ${selectedReport.status === "Resolved" ? "bg-emerald-500" : "bg-slate-800"}`}></div>
                  </div>
                </div>

                {/* Estimator outputs */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2.5">
                  <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider block">AI Taxpayer Estimator Values</span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-center">
                      <span className="text-[8px] text-slate-500 font-mono block">Cost Today</span>
                      <span className="text-xs font-bold text-white">₹{selectedReport.aiAnalysis?.repairCostToday?.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-center">
                      <span className="text-[8px] text-slate-500 font-mono block">If Ignored</span>
                      <span className="text-xs font-bold text-red-400">₹{selectedReport.aiAnalysis?.repairCostSixMonths?.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.01] text-center">
                      <span className="text-[8px] text-emerald-400 font-mono block">Tax Savings</span>
                      <span className="text-xs font-extrabold text-emerald-400">₹{selectedReport.aiAnalysis?.damageSaved?.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 justify-end">
                  <button
                    onClick={() => handleUpvote(selectedReport.id)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Upvote to Verify ({selectedReport.upvotes})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "dashboard" && (
          <div className="w-full">
            <StatsDashboard reports={reports} />
          </div>
        )}

        {activeTab === "ai" && (
          <AIChatExplorer reports={reports} userCity={userProfile?.city || "New Delhi"} onClose={() => setActiveTab("home")} />
        )}

        {activeTab === "commute-safety" && (
          <div className="w-full animate-fadeIn">
            <AIChatExplorer reports={reports} userCity={userProfile?.city || "New Delhi"} />
          </div>
        )}

        {activeTab === "gamification" && (
          <div className="w-full animate-fadeIn">
            <GamificationHub 
              userProfile={userProfile} 
              onUpdatePoints={(earned) => {
                const updated = { ...userProfile, points: userProfile.points + earned };
                setUserProfile(updated);
                localStorage.setItem("letsfixit_logged_user", JSON.stringify(updated));
              }} 
              isDarkMode={isDarkMode} 
            />
          </div>
        )}

        {activeTab === "profile" && (
          <div className="w-full animate-fadeIn">
            <ProfilePanel 
              userProfile={userProfile} 
              onUpdateProfile={(updated) => {
                setUserProfile(updated);
                localStorage.setItem("letsfixit_logged_user", JSON.stringify(updated));
              }} 
              onSignOut={handleSignOut} 
              isDarkMode={isDarkMode} 
            />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="w-full">
            <AdminPanel reports={reports} onUpdateStatus={handleUpdateStatus} isDarkMode={isDarkMode} />
          </div>
        )}
      </main>
        </div>

      {/* Redesigned Minimal Footer */}
      <footer 
        className="mt-16 relative z-20 flex flex-col items-center gap-2 text-center"
        style={{ 
          borderTop: isDarkMode ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0",
          backgroundColor: isDarkMode ? "rgba(11, 11, 22, 0.4)" : "#f8fafc",
          padding: "20px 32px",
          color: isDarkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
          fontSize: "12px",
          letterSpacing: "0.4px",
          fontFamily: "var(--font-sans)",
          fontStyle: "italic",
          fontWeight: 300
        }}
      >
        <div>© 2026 LetsFixIt India • Built for Bharat 🇮🇳</div>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
          <a href="tel:1533" className="hover:underline">Pothole & Roads: 1533 (NHAI)</a>
          <span>|</span>
          <a href="tel:1912" className="hover:underline">Street Lights: 1912</a>
          <span>|</span>
          <a href="tel:1916" className="hover:underline">Water Supply: 1916</a>
          <span>|</span>
          <a href="tel:1533" className="hover:underline">Waste Management: 1533</a>
          <span>|</span>
          <a href="tel:14420" className="hover:underline">Sanitation: 14420</a>
          <span>|</span>
          <a href="tel:1906" className="hover:underline">Gas Leak: 1906</a>
        </div>
      </footer>

      {/* Floating modals */}
      <AnimatePresence>
        {showReportModal && (
          <ReportModal
            onClose={() => setShowReportModal(false)}
            onSubmitReport={handleAddReport}
            existingReports={reports}
          />
        )}

        {showAuthHelpModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-black text-white">Verification & Quick Login</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Firebase Google Auth status and fallback modes</p>
                </div>
                <button
                  onClick={() => setShowAuthHelpModal(false)}
                  className="text-xs text-slate-500 hover:text-white font-mono bg-slate-950 px-2 py-1 rounded-md border border-slate-800 cursor-pointer"
                >
                  Close [x]
                </button>
              </div>

              {authErrorMessage && (
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-3.5 rounded-xl text-xs space-y-1">
                  <p className="font-bold">Google Auth Provider Info:</p>
                  <p className="text-[11px] opacity-90 leading-relaxed">{authErrorMessage}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1.5 leading-tight">
                    💡 Tip: You can configure this in your Firebase console under Authentication &gt; Sign-In Method &gt; Add Provider &gt; Google.
                  </p>
                </div>
              )}

              <div className="space-y-3.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Choose a Demo Persona</span>
                
                <div className="space-y-2">
                  {[
                    {
                      name: "Meera Sen",
                      role: "District Admin / Commissioner",
                      email: "meera.sen@delhi.gov.in",
                      points: 750,
                      badges: ["Gold Badge", "City Architect"],
                      avatarText: "MS",
                      color: "from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400"
                    },
                    {
                      name: "Rajesh Sharma",
                      role: "Municipal Dispatch Engineer",
                      email: "sharma.r@ndmc.gov.in",
                      points: 610,
                      badges: ["Speed Responder", "Field Commander"],
                      avatarText: "RS",
                      color: "from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400"
                    },
                    {
                      name: "Arjun Kumar",
                      role: "Active Citizen Lead",
                      email: "arjun.k@citizen.org.in",
                      points: 340,
                      badges: ["Pothole Buster", "Verifying Hero"],
                      avatarText: "AK",
                      color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400"
                    }
                  ].map((persona, index) => (
                    <button
                      key={index}
                      onClick={() => handleDemoSignIn(persona)}
                      className={`w-full text-left p-3 rounded-xl border bg-gradient-to-r ${persona.color} hover:opacity-95 transition-all flex items-center gap-3 group cursor-pointer`}
                    >
                      <div className="h-9 w-9 bg-slate-950/60 rounded-lg flex items-center justify-center font-black text-sm border border-slate-800">
                        {persona.avatarText}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-white">{persona.name}</span>
                          <span className="text-[8px] font-mono uppercase bg-slate-950/40 px-1.5 py-0.5 rounded border border-slate-850 text-slate-400">
                            {persona.points} Pts
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">{persona.role}</p>
                        <p className="text-[9px] text-slate-500 font-mono truncate">{persona.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 font-mono text-center">
                All interactions persist in client-side state / Firestore.
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
      {toastMessage && (
        <div className="fixed bottom-5 right-5 bg-slate-950 border border-red-500/30 text-white px-4 py-3 rounded-xl shadow-2xl z-[99999] animate-fadeIn flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
          <span className="text-xs font-bold font-mono">{toastMessage}</span>
        </div>
      )}
      <FloatingChat />
      </div>
    </>
  );
}
