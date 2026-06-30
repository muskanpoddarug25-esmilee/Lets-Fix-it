import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import bcrypt from "bcrypt";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Set up JSON body parsing with higher limits for base64 image uploads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_MAPS_PLATFORM_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Moderation & curse word list helper (Indian community focus)
const containsCurseWords = (text: string): boolean => {
  const badWords = [
    "bastard", "bitch", "asshole", "fuck", "shit", "cunt", "dick",
    "chutiya", "bhenchod", "madarchod", "gandu", "saala", "harami", "kameena"
  ];
  const lowercaseText = text.toLowerCase();
  return badWords.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowercaseText);
  });
};

// --- SECURITY HELPERS ---
const SECRET_PEPPER = "LetsFixItSaffronPepper2026!";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "LetsFixItSecretKey2026LetFixIt32"; // 32 characters
const IV_LENGTH = 16;

// AES-256-CBC Encryption
function encryptId(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (err) {
    console.error("Encryption error:", err);
    return "";
  }
}

// AES-256-CBC Decryption (for debugging or secure viewing if requested)
function decryptId(text: string): string {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift() || "", "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error("Decryption error:", err);
    return "Error decrypting identity field";
  }
}

// Pre-approved admin list (no self-signup for admin)
const PRE_APPROVED_ADMINS = {
  emails: ["meera.sen@delhi.gov.in", "sharma.r@ndmc.gov.in", "admin@letsfixit.in"],
  mobiles: ["9876543210", "9999999999", "9000000000"]
};

// --- API ENDPOINTS ---

// Check if a user (by mobile or email) is pre-approved for admin role
app.post("/api/auth/check-preapproval", (req: Request, res: Response) => {
  const { email, mobile } = req.body;
  const cleanEmail = email?.toLowerCase().trim() || "";
  const cleanMobile = mobile?.replace(/[^0-9]/g, "") || "";
  // Check last 10 digits for Indian mobiles
  const cleanMobile10 = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;

  const isEmailApproved = PRE_APPROVED_ADMINS.emails.includes(cleanEmail);
  const isMobileApproved = PRE_APPROVED_ADMINS.mobiles.includes(cleanMobile10);

  if (isEmailApproved || isMobileApproved) {
    res.json({ preApproved: true, message: "Administrative access pre-approved." });
  } else {
    res.status(400).json({
      preApproved: false,
      error: "This mobile number/email is not pre-approved for Government Admin access. Only pre-approved municipal authorities can sign in. Please contact the Ministry of Urban Development or use a Citizen account."
    });
  }
});

// Securely hash a password with bcrypt (12 rounds) + pepper
app.post("/api/auth/hash-password", async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Password is required." });
      return;
    }
    const combined = password + SECRET_PEPPER;
    const saltRounds = 12;
    const hash = await bcrypt.hash(combined, saltRounds);
    res.json({ hash });
  } catch (err) {
    console.error("Hashing error:", err);
    res.status(500).json({ error: "Password processing failed." });
  }
});

// Securely verify a password with bcrypt + pepper
app.post("/api/auth/verify-password", async (req: Request, res: Response) => {
  try {
    const { password, hash } = req.body;
    if (!password || !hash) {
      res.status(400).json({ error: "Password and hash are required." });
      return;
    }
    const combined = password + SECRET_PEPPER;
    const isMatch = await bcrypt.compare(combined, hash);
    res.json({ isMatch });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Password verification failed." });
  }
});

// Securely encrypt Aadhaar or Passport number
app.post("/api/auth/encrypt-id", (req: Request, res: Response) => {
  try {
    const { idNumber } = req.body;
    if (!idNumber) {
      res.status(400).json({ error: "ID Number is required." });
      return;
    }
    const encrypted = encryptId(idNumber);
    res.json({ encrypted });
  } catch (err) {
    res.status(500).json({ error: "ID encryption failed." });
  }
});

// Securely decrypt Aadhaar or Passport (masked output for UI safety)
app.post("/api/auth/decrypt-id", (req: Request, res: Response) => {
  try {
    const { encryptedId } = req.body;
    if (!encryptedId) {
      res.status(400).json({ error: "Encrypted ID is required." });
      return;
    }
    const decrypted = decryptId(encryptedId);
    // Mask the identity for client safety
    let masked = decrypted;
    if (decrypted.length === 12) {
      // Aadhaar masking
      masked = "XXXX-XXXX-" + decrypted.slice(-4);
    } else if (decrypted.length >= 8) {
      // Passport masking
      masked = decrypted.slice(0, 2) + "XXXX" + decrypted.slice(-2);
    }
    res.json({ decrypted, masked });
  } catch (err) {
    res.status(500).json({ error: "ID decryption failed." });
  }
});

// 1. Analyze Issue (AI Categorization, Severity, and Damage Cost Estimator)
app.post("/api/analyze-issue", async (req: Request, res: Response) => {
  try {
    const { title, description, imageBase64 } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required." });
      return;
    }

    // Check for curse words (offensive language moderation)
    if (containsCurseWords(title) || containsCurseWords(description)) {
      res.status(400).json({
        error: "Profanity or offensive language detected! Please write a clean, respectful description to report your issue.",
      });
      return;
    }

    // Prepare prompt for Gemini
    const systemPrompt = `You are LetsFixItAI, an expert civic engineer and infrastructure analyst in India.
Analyze the citizen's reported issue to categorize, prioritize, and estimate the potential financial and public risk.
Enforce standard categorization rules.
Categories MUST be one of: "potholes", "water leakage", "broken streetlights", "garbage", "public infrastructure".

Calculate details for the AI Damage Cost Estimator:
- Estimate the repair cost today in Rupees (₹).
- Estimate the repair cost after 6 months if left ignored (usually 4x to 10x higher due to worsening erosion/water logging/infrastructure decay).
- Estimate the "damage saved after resolving" (the difference between future cost and today's cost + societal safety benefits, typically ₹15,000 to ₹1,50,000).
- Classify risk/severity as "High" (High risk zones, red alerts), "Medium" (Orange risk zones), or "Low" (Green safe zones).
- Evaluate probabilities (Low, Medium, High) for vehicle damage risk, accident probability, and waterlogging risk.`;

    const userPrompt = `Issue Title: ${title}
Description: ${description}
Provide the analysis in strict JSON format matching the schema requested.`;

    // Construct parts
    const parts: any[] = [{ text: userPrompt }];
    if (imageBase64) {
      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Must be exactly one of: potholes, water leakage, broken streetlights, garbage, public infrastructure"
            },
            severity: {
              type: Type.STRING,
              description: "Must be: High, Medium, or Low"
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief civic impact explanation under 3 sentences."
            },
            repairCostToday: {
              type: Type.INTEGER,
              description: "Estimated direct cost to fix the issue today in INR Rupees."
            },
            repairCostSixMonths: {
              type: Type.INTEGER,
              description: "Estimated cost to fix the issue after 6 months of neglect in INR Rupees."
            },
            damageSaved: {
              type: Type.INTEGER,
              description: "Total societal & repair damages saved by fixing it now vs 6 months later."
            },
            vehicleDamageRisk: {
              type: Type.STRING,
              description: "Risk of vehicle damage: Low, Medium, High"
            },
            accidentProbability: {
              type: Type.STRING,
              description: "Accident probability: Low, Medium, High"
            },
            waterloggingRisk: {
              type: Type.STRING,
              description: "Waterlogging/flooding risk: Low, Medium, High"
            }
          },
          required: [
            "category", "severity", "reasoning", "repairCostToday",
            "repairCostSixMonths", "damageSaved", "vehicleDamageRisk",
            "accidentProbability", "waterloggingRisk"
          ]
        }
      }
    });

    const result = JSON.parse(response.text?.trim() || "{}");
    res.json(result);
  } catch (err: any) {
    console.error("Error in analyze-issue:", err);
    res.status(500).json({ error: "Failed to analyze issue. Please try again." });
  }
});

// 2. AI Duplicate Detection
app.post("/api/detect-duplicate", async (req: Request, res: Response) => {
  try {
    const { title, description, existingReports } = req.body;

    if (!title || !description || !existingReports || !Array.isArray(existingReports)) {
      res.status(400).json({ error: "Missing required properties." });
      return;
    }

    if (existingReports.length === 0) {
      res.json({ isDuplicate: false, duplicateOfId: null, message: "" });
      return;
    }

    const systemPrompt = `You are LetsFixItAI duplicate detection module. 
Your job is to check if a newly reported issue is a duplicate of any existing nearby issues.
Compare the new report's description and title with the list of existing nearby reports.
If they represent the exact same physical issue (e.g., the same pothole, same broken streetlight on the same street, same heap of garbage), mark it as a duplicate, provide the ID of the matching report, and a friendly message advising the user to upvote the existing one instead.`;

    const userPrompt = `New Report Title: ${title}
New Report Description: ${description}

Existing Nearby Reports:
${JSON.stringify(existingReports.map(r => ({ id: r.id, title: r.title, description: r.description })))}

Respond with strict JSON matching the required schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDuplicate: {
              type: Type.BOOLEAN,
              description: "True if the new report represents the same physical issue as one in the list."
            },
            duplicateOfId: {
              type: Type.STRING,
              description: "The ID of the duplicated report from the list, or null if not a duplicate."
            },
            message: {
              type: Type.STRING,
              description: "A friendly warning message, e.g., 'A similar pothole has already been reported at this intersection. Would you like to upvote it to increase its priority?'"
            }
          },
          required: ["isDuplicate", "duplicateOfId", "message"]
        }
      }
    });

    const result = JSON.parse(response.text?.trim() || "{}");
    res.json(result);
  } catch (err) {
    console.error("Error in detect-duplicate:", err);
    res.status(500).json({ error: "Failed to detect duplicates." });
  }
});

// 3. AI Safety Navigator ("I walk this route every day. Is it safe?")
app.post("/api/safety-check", async (req: Request, res: Response) => {
  try {
    const { routeQuery, nearbyReports } = req.body;

    if (!routeQuery) {
      res.status(400).json({ error: "Route or query description is required." });
      return;
    }

    const reportsText = (nearbyReports && Array.isArray(nearbyReports) && nearbyReports.length > 0)
      ? nearbyReports.map((r, idx) => `${idx + 1}. [${r.category.toUpperCase()}] at ${r.location?.address || 'nearby'}. Status: ${r.status}, Severity: ${r.severity}. Description: ${r.description}`).join("\n")
      : "No unresolved active civic issues or potholes reported along this route.";

    const systemPrompt = `You are LetsFixItAI Safety Assistant.
A citizen wants to check the safety of their walking/driving route.
Analyze the user's route or query against the list of nearby reports provided.
Explain if the route has hazards like:
- Unresolved potholes
- Broken streetlights (safety risks at night)
- Waterlogging or open garbage
Give a safety rating ("Excellent", "Caution Needed", "Hazardous") and draft a professional, empathetic report. Recommend safer alternatives (e.g., walking on parallel well-lit streets, avoiding low-lying waterlogged zones). Include local warmth and civic engineering advice.`;

    const userPrompt = `User Route Query: "${routeQuery}"
Nearby Reports in the database:
${reportsText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safetyRating: { type: Type.STRING, description: "Excellent, Caution Needed, Hazardous" },
            summary: { type: Type.STRING, description: "Detailed analysis of reports along the path and their hazard levels." },
            precautions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific steps the citizen should take (e.g., carry a torch, avoid waterlogging)." },
            alternativeRoute: { type: Type.STRING, description: "Suggestion for an alternate, safer route." }
          },
          required: ["safetyRating", "summary", "precautions", "alternativeRoute"]
        }
      }
    });

    const result = JSON.parse(response.text?.trim() || "{}");
    res.json(result);
  } catch (err) {
    console.error("Error in safety-check:", err);
    res.status(500).json({ error: "Failed to perform safety checks." });
  }
});

// 4. General Civic AI Chatbot (LetsFixItAI Explorer)
app.post("/api/ai-chat", async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    const systemPrompt = `You are LetsFixItAI, a hyperlocal community assistant for India.
Help users answer doubts and ask questions about the app, India's civic problems, which local departments handle which issues, expected turnaround times, or civic safety.
Keep answers concise, modern, structured, and warm. Provide real, informative answers.
Turnaround guidelines for India (Municipal Corporations):
- Potholes: 48-72 Hours
- Streetlights: 24-48 Hours
- Garbage/Waste: 24 Hours
- Water leakages: 12-24 Hours

Be informative, professional, and include local municipal terms if appropriate (e.g., MCD, BMC, BBMP, PWD, Swachh Bharat).`;

    // Reconstruct conversation chats using the GoogleGenAI chats helper
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemPrompt,
      }
    });

    // Feed history into chat or pass directly as a text query
    const response = await chat.sendMessage({ message });
    res.json({ text: response.text });
  } catch (err) {
    console.error("Error in ai-chat:", err);
    res.status(500).json({ error: "AI Chat failed. Please try again later." });
  }
});

app.get(["/LetssFixIt", "/LetsFixIt.jpeg", "/LetsFixIt.png", "/LetsFixIt-removebg-preview.png"], (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), "public", "LetsFixIt.png"));
});

// --- VITE AND STATIC SERVING ---

async function startServer() {
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[LetsFixIt Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
