// import express, { Express } from "express";
// import cors from "cors";
// import * as path from "path";
// // Use require for firebase-admin to match other files
// const admin = require("firebase-admin");
// // import the registrar from your API file
// import { registerUsers } from "./src/api/registerUsers";

// type CreateUserRouterOptions = {
//   admin?: any;
//   firestore?: any;
//   FieldValue?: any;
// };

// /**
//  * Class representing the backend server application.
//  */
// export class ServerApp {
//   public app: Express;
//   private port: number;
//   private admin: any;
//   private firestore: any;
//   private FieldValue: any;

//   /**
//    * Creates a new ServerApp instance.
//    *
//    * @param port - The port number the server listens on (default: 3000).
//    */
//   constructor(port: number = Number(process.env.PORT) || 3000) {
//     this.app = express();
//     this.port = port;
//     this.configureMiddleware();
//     this.initFirebaseAdmin();
//     this.registerHandlers();
//   }

//   /**
//    * Configures global middleware for the Express app.
//    */
//   private configureMiddleware() {
//     // simple global cors + json body parsing as in the sample format
//     this.app.use(cors());
//     this.app.use(express.json({ limit: "5mb" }));

//     // Serve frontend static files if present
//     this.app.use(express.static(path.join(__dirname, "..", "..", "frontend")));
//   }

//   private initFirebaseAdmin() {
//     // ...existing Firebase init logic (keeps behavior unchanged)...
//     this.admin = admin;
//     if (this.admin.apps && this.admin.apps.length > 0) {
//       // already initialized
//     } else {
//       if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//         try {
//           this.admin.initializeApp();
//           console.log("Firebase Admin initialized with GOOGLE_APPLICATION_CREDENTIALS");
//         } catch (e) {
//           console.warn("Firebase Admin initializeApp() failed:", e);
//         }
//       } else {
//         const projectId = process.env.FIREBASE_PROJECT_ID;
//         const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
//         let privateKey = process.env.FIREBASE_PRIVATE_KEY;
//         if (projectId && clientEmail && privateKey) {
//           privateKey = privateKey.replace(/\\n/g, "\n");
//           try {
//             this.admin.initializeApp({
//               credential: this.admin.credential.cert({
//                 projectId,
//                 clientEmail,
//                 privateKey,
//               }),
//             });
//             console.log("Firebase Admin initialized from env service account");
//           } catch (e) {
//             console.error("Failed to initialize Firebase Admin from env vars:", e);
//           }
//         } else {
//           console.warn(
//             "Firebase Admin not initialized — set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_* env vars for admin SDK use."
//           );
//         }
//       }
//     }

//     this.firestore = this.admin && this.admin.firestore ? this.admin.firestore() : null;
//     this.FieldValue = this.admin && this.admin.firestore ? this.admin.firestore.FieldValue : null;
//   }

//   /**
//    * Registers all route handlers for the server.
//    */
//   private registerHandlers() {
//     // health endpoint
//     this.app.get("/health", (req, res) => res.send("ok"));

//     // Attach the registerUsers handler (your user/household endpoints)
//     try {
//       if (typeof registerUsers === "function") {
//         registerUsers(this.app, {
//           admin: this.admin,
//           firestore: this.firestore,
//           FieldValue: this.FieldValue,
//         } as CreateUserRouterOptions);
//         console.log("registerUsers registrar invoked and routes attached to app");
//       }
//     } catch (e) {
//       console.warn("Failed to attach registerUsers:", e);
//     }

//     // fallback catch-all
//     this.app.use((req, res) => {
//       res.status(404).json({ error: "Not found (debug)" });
//     });
//   }

//   /**
//    * Starts the Express server on the configured port.
//    */
//   public start() {
//     this.app.listen(this.port, () => {
//       console.log(`Backend running at http://localhost:${this.port}`);
//     });
//   }

//   /**
//    * Returns the underlying Express app instance.
//    *
//    * @returns The Express application.
//    */
//   public getApp(): Express {
//     return this.app;
//   }
// }

// // Keep CommonJS compatibility
// module.exports = { ServerApp };

// // Start server if run directly
// if (require.main === module) {
//   const server = new ServerApp();
//   server.start();
// }
