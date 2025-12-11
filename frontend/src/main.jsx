import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// import './index.css'
import "./styles/globals.css";
// Import the TSX app module. Vite resolves extensions, so import './App' works for App.tsx
import App from "./App";
import { UserProvider } from './contexts/UserContext';


// createRoot(document.getElementById("root")).render(
//   // <StrictMode>
//   //   <App />
//   // </StrictMode>

// );
createRoot(document.getElementById('root')).render(
 <StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </StrictMode>
);