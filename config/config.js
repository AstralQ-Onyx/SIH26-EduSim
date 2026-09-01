/* ═══════════════════════════════════════════════════════════
   EduSim — Central Configuration
   Mirrors .env — DO NOT commit to public repositories
   ═══════════════════════════════════════════════════════════ */

const ENV = {
  FIREBASE_API_KEY:            "AIzaSyBAD3LTO0wwOT1EdVxJhxGc4682RfSkDAI",
  FIREBASE_AUTH_DOMAIN:        "edu-sim.firebaseapp.com",
  FIREBASE_PROJECT_ID:         "edu-sim",
  FIREBASE_STORAGE_BUCKET:     "edu-sim.appspot.com",
  FIREBASE_MESSAGING_SENDER_ID:"836936321609",
  FIREBASE_APP_ID:             "1:836936321609:web:edusim_phase1",
  GOOGLE_CLIENT_ID:            "836936321609-pf0pv1b8sfv5r7sog28882j066h0a820.apps.googleusercontent.com", // TODO: Put your Google Client ID here
  
  // Set to your deployed Render service URL for cloud deployments
  // Using the cloud compiler by default so local development doesn't require running the node server
  BACKEND_URL: 'https://edusim-compiler.onrender.com'
  
};
