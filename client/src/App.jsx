import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Login from "./pages/Login";
import Main from "./pages/Main";
import Block from "./block";
import "./App.css";

function App() {
  const isOtpVerified = localStorage.getItem("otpVerified") === "true";
  const [ip, setIP] = useState(null);
  const [loading, setLoading] = useState(true);



  

  // ✅ Allowed IPs
  const allowedIPs = [
    "175.157.9.59",
    "223.224.11.250",
    "112.134.90.20",
  ];
  //End Of Allowed IPs




  // ✅ Fetch IP once
  const getData = async () => {
    try {
      const res = await axios.get("https://api.ipify.org/?format=json");
      setIP(res.data.ip);

      // 👇 Delay loader for fade effect
      setTimeout(() => setLoading(false), 2500);
    } catch (err) {
      console.error("Failed to fetch IP", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const isAuthorized = allowedIPs.includes(ip);

  // ✅ Animation Variants
  const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 0.5 } },
  };

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
          transition={{ duration: 0.6 }}
          className="flex flex-col justify-center items-center h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white text-center"
        >
          <div className="loader mb-4"></div>
          <p className="text-gray-300 text-lg animate-pulse">
            Checking your IP address...
          </p>
        </motion.div>
      ) : !isAuthorized ? (
        // ❌ Unauthorized → Block
        <motion.div
          key="block"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.6 }}
        >
          <Block />
        </motion.div>
      ) : isOtpVerified ? (
        // ✅ Verified → Main
        <motion.div
          key="main"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.6 }}
        >
          <Main />
        </motion.div>
      ) : (
        // 🔐 Not verified → Login
        <motion.div
          key="login"
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.6 }}
        >
          <Login />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default App;
