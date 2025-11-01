import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Main from "./pages/Main";
import Block from "./block";
import TempIP from "./tempip";
import MemberView from "./memberview"; // ✅ Added
import "./App.css";

function App() {
  const [ip, setIP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isOtpVerified = localStorage.getItem("otpVerified") === "true";
  const tempIP = localStorage.getItem("temp_ip") || null;

  const allowedIPs = useMemo(
    () => ["175.157.31.110", "223.224.11.250", "112.134.90.20", tempIP],
    [tempIP]
  );

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
      setTimeout(() => setLoading(false), 1200);
    }
  };

  useEffect(() => {
    if (isOtpVerified) {
      setLoading(false);
    } else {
      getData();
    }
  }, [isOtpVerified]);

  const isAuthorized = ip && allowedIPs.includes(ip);

  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.6 } },
    exit: { opacity: 0, transition: { duration: 0.4 } },
  };

  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>

          {/* ✅ MEMBER VIEW PAGE (PUBLIC) */}
          <Route path="/memberview" element={<MemberView />} />

          {/* Temporary IP setup page */}
          <Route path="/tempip" element={<TempIP />} />

          {/* Main logic route */}
          <Route
            path="*"
            element={
              loading ? (
                <motion.div
                  key="loader"
                  variants={fadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white text-center"
                >
                  <div className="loader mb-6 border-4 border-t-cyan-400 rounded-full w-12 h-12 animate-spin"></div>
                  <p className="text-gray-300 text-lg animate-pulse">
                    Checking your IP address...
                  </p>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  variants={fadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white"
                >
                  <p className="text-red-400 text-lg mb-4">
                    Failed to fetch your IP. Please check your internet.
                  </p>
                  <button
                    onClick={() => {
                      setError(false);
                      setLoading(true);
                      getData();
                    }}
                    className="px-6 py-2 rounded-full bg-black text-cyan-400 border border-cyan-400 shadow-[0_0_10px_#22d3ee] hover:shadow-[0_0_20px_#22d3ee] hover:text-cyan-300 hover:border-cyan-300 active:shadow-[0_0_25px_#22d3ee] transition duration-300 ease-in-out"
                  >
                    Retry
                  </button>
                </motion.div>
              ) : !tempIP && !isOtpVerified ? (
                <motion.div
                  key="notempip"
                  variants={fadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white text-center"
                >
                  <p className="text-yellow-300 text-lg mb-6">
                    Temporary IP not set. Please go to <strong>/tempip</strong> and add it.
                  </p>
                  <a
                    href="/tempip"
                    className="px-6 py-2 rounded-full bg-black text-cyan-400 border border-cyan-400 shadow-[0_0_10px_#22d3ee] hover:shadow-[0_0_20px_#22d3ee] hover:text-cyan-300 hover:border-cyan-300 active:shadow-[0_0_25px_#22d3ee] transition duration-300 ease-in-out"
                  >
                    Go to Temp IP Page
                  </a>
                </motion.div>
              ) : isOtpVerified ? (
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
                <motion.div
                  key="login"
                  variants={fadeVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Login />
                </motion.div>
              )
            }
          />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;
