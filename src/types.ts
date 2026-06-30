export interface AIAnalysis {
  category: "potholes" | "water leakage" | "broken streetlights" | "garbage" | "public infrastructure";
  severity: "High" | "Medium" | "Low";
  reasoning: string;
  repairCostToday: number;
  repairCostSixMonths: number;
  damageSaved: number;
  vehicleDamageRisk: "Low" | "Medium" | "High";
  accidentProbability: "Low" | "Medium" | "High";
  waterloggingRisk: "Low" | "Medium" | "High";
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: "potholes" | "water leakage" | "broken streetlights" | "garbage" | "public infrastructure";
  status: "Reported" | "Verified" | "Assigned to Department" | "Work In Progress" | "Under Review" | "Resolved";
  imageUrl?: string;
  location: {
    lat: number;
    lng: number;
    city: string;
    address: string;
  };
  upvotes: number;
  upvotedBy: string[]; // List of user IDs
  createdBy: string;
  creatorEmail: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  aiAnalysis: AIAnalysis;
  isAIVerified?: boolean;
  aiAuthenticityNote?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  points: number;
  badges: string[];
  createdAt: any;
  photoURL?: string;
  role: "citizen" | "admin";
  mobile?: string;
  idType?: "aadhaar" | "passport" | "none";
  idNumberEncrypted?: string;
  passwordHashed?: string;
  city?: string;
  userType?: "Citizen" | "Government Official";
  salt?: string;
  passwordHash?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  createdAt: string;
}
