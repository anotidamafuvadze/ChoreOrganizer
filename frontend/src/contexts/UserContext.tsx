import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Define the user type
interface User {
  householdId: string;
  email?: string;

  // Add other user fields as needed
}

// Create the context with a default value
export const UserContext = createContext<User>({ householdId: "" });

// Create a provider component
// export function UserProvider({ children }: { children: ReactNode }) {
//   const [user, setUser] = useState<User>({ householdId: "" });
//   const [email, setEmail] = useState<string | null>(null);


//   useEffect(() => {
//     // Listen for changes to localStorage (e.g., after session restore)
//     const checkEmail = () => {
//       const storedEmail = localStorage.getItem("email");
//       setEmail(storedEmail);
//     };
//     checkEmail();
//     window.addEventListener("storage", checkEmail);
//     return () => window.removeEventListener("storage", checkEmail);
//   }, []);

//   useEffect(() => {
//   async function fetchUser() {
//     try {
//       // Get email from localStorage, session, or context
//       const email = localStorage.getItem("email"); // or however you store it
//       if (!email) return;
//       const res = await fetch(`/api/user/me?email=${encodeURIComponent(email)}`);
//       const data = await res.json();
//       setUser({ householdId: data.householdId || "" });
//     } catch (e) {
//       setUser({ householdId: "" });
//     }
//   }
//   fetchUser();
// }, [email]);

//   return (
//     <UserContext.Provider value={user}>
//       {children}
//     </UserContext.Provider>
//   );
// }

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>({ householdId: "" });

  useEffect(() => {
    async function fetchSessionUser() {
      try {
        const res = await fetch("/api/session", { credentials: "include" });
        const data = await res.json();
        if (data.user && data.user.householdId) {
          setUser({
            householdId: data.user.householdId,
            email: data.user.email,
            // ...other fields
          });
        } else {
          setUser({ householdId: "" });
        }
      } catch (e) {
        setUser({ householdId: "" });
      }
    }
    fetchSessionUser();
  }, []);

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}