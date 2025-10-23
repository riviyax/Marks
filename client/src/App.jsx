import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Login from "./pages/Login";
import Main from "./pages/Main";
import Block from "./block";
import "./App.css";

function App() {
  const [ip, setIP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isOtpVerified = localStorage.getItem("otpVerified") === "true";

  // ✅ Allowed IPs
  const allowedIPs = ["175.157.31.110", "223.224.11.250", "112.134.90.20"];

  // ✅ Fetch IP (only if OTP not verified)
  const getData = async () => {
    try {
      const res = await axios.get("https://api.ipify.org/?format=json", {
        timeout: 5000,
      });
      setIP(res.data.ip || "unknown");
    } catch (err) {
      console.error("Failed to fetch IP:", err.message);
      setError(true);
    } finally {
      // Delay loader slightly for animation
      setTimeout(() => setLoading(false), 1500);
    }
  };

  useEffect(() => {
    // ⛔ Skip IP check if already verified
    if (isOtpVerified) {
      setLoading(false);
      return;
    }
    getData();
  }, [isOtpVerified]);

  const isAuthorized = allowedIPs.includes(ip);

  // ✅ Animation Variants
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
    exit: { opacity: 0, transition: { duration: 0.4 } },
  };

  // ✅ Main conditional rendering
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        // 🌟 Loader Page
        <motion.div
          key="loader"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white text-center"
        >
          <div className="loader mb-4"></div>
          <p className="text-gray-300 text-lg animate-pulse">
            Checking your IP address...
          </p>
        </motion.div>
      ) : error ? (
        // ⚠️ Network/Fetch Error
        <motion.div
          key="error"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white"
        >
          <p className="text-red-400 text-lg mb-4">
            Failed to fetch your IP. Please check your connection.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setError(false);
              getData();
            }}
            className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </motion.div>
      ) : isOtpVerified ? (
        // ✅ Verified → Main (bypasses IP check)
        <motion.div
          key="main"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Main />
        </motion.div>
      ) : !isAuthorized ? (
        // ❌ Unauthorized → Block
        <motion.div
          key="block"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Block ip={ip} />
        </motion.div>
      ) : (
        // 🔐 Not verified → Login
        <motion.div
          key="login"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <Login />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
