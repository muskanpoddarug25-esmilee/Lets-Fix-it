import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAc_qpFcwk7Wt4ZjQUzQUvN78GaCiJL3Sc",
  authDomain: "letsfixit-91195.firebaseapp.com",
  projectId: "letsfixit-91195",
  storageBucket: "letsfixit-91195.firebasestorage.app",
  messagingSenderId: "26992210997",
  appId: "1:26992210997:web:129a120e185cc4263e2d7c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  const email = "sharma.r@ndmc.gov.in"; // One of the pre-approved emails
  const password = "AdminPassword2026!";
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save to users collection
    await setDoc(doc(db, "users", user.uid), {
      name: "Rajesh Sharma",
      email: email,
      role: "admin",
      city: "Delhi",
      mobile: "9999999999",
      createdAt: new Date().toISOString()
    });

    // Also save to admins collection for AuthScreen.tsx check
    await setDoc(doc(db, "admins", "GOV-2024-0001"), {
      employeeId: "GOV-2024-0001",
      email: email,
      uid: user.uid,
      department: "NDMC"
    });

    console.log("Admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Employee ID: GOV-2024-0001");
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
       console.log("Admin already exists. Just use these credentials:");
       console.log("Email:", email);
       console.log("Password:", password);
       console.log("Employee ID: GOV-2024-0001");
       process.exit(0);
    } else {
       console.error("Error creating admin:", error);
       process.exit(1);
    }
  }
}

createAdmin();
