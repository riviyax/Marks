import { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "./block.css";

function Block() {
  const [ip, setIP] = useState("");



    // ✅ Allowed IPs
  const allowedIPs = [
    "175.157.9.59",
    "123.231.45.88",
    "112.134.90.20",
  ];
  //End Of Allowed IPs




  const getData = async () => {
    try {
      const res = await axios.get("https://api.ipify.org/?format=json");
      setIP(res.data.ip);
    } catch (err) {
      console.error("Failed to fetch IP", err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  function Retry() {
    return () => {
      if (ip == allowedIPs) {
        alert("Access Granted!");
        window.location.reload();
      }else{
        window.location.reload();
        alert("Access Denied!");
      }
    };
  }
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-800/70 backdrop-blur-md border border-gray-700 shadow-2xl rounded-2xl p-10 max-w-md w-full"
      >
        <img
          src="/error.png"
          alt="Error"
          className="w-100 mx-auto mb-6"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-red-500 drop-shadow-md">
          Unauthorized IP Address
        </h1>

        <p className="text-gray-300 mt-4 leading-relaxed">
          Access is restricted for this IP address.
          <br />
          Please contact the administrator to gain access.
        </p>

        {ip && (
          <p className="mt-6 text-sm text-gray-400">
            Your IP:{" "}
            <span className="text-blue-400 font-mono font-semibold">{ip}</span>
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          className="mt-8 bg-red-600 hover:bg-red-700 transition-all text-white font-semibold py-2 px-6 rounded-lg shadow-md"
          onClick={Retry()}
        >
          Retry
        </motion.button>
      </motion.div>

      <footer className="mt-10 text-gray-500 text-sm">
        Developed by <span className="text-white font-semibold">Riviya_X</span>
      </footer>
    </div>
  );
}

export default Block;
