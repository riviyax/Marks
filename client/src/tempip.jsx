import React, { useState, useEffect } from "react";
import axios from "axios";

function TempIP() {
  const [ip, setIP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [password, setPassword] = useState("");

  // ✅ Fetch current public IP
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
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleSetIP = () => {
    if (password === "MMU@0055") {
      localStorage.setItem("temp_ip", ip);
      alert("✅ Temporary IP set successfully!");
      window.location.assign("/");
    } else {
      alert("❌ Incorrect password. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-lg animate-pulse">Fetching your IP address...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-red-400 text-lg mb-4">
          Failed to fetch your IP. Please check your internet.
        </p>
        <button
          onClick={() => {
            setError(false);
            setLoading(true);
            getData();
          }}
          className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 px-4 text-center">
      <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
        Temporary IP Address Setter
      </h1>

      <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
        <span className="text-2xl text-teal-200 font-bold">Your IP:</span>
        <br />
        <span className="font-mono text-blue-400 text-xl">
          {ip || "Unknown IP"}
        </span>
      </p>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full max-w-sm px-4 py-2 rounded-full bg-black text-white placeholder-gray-400 outline-none border border-cyan-400 shadow-[0_0_10px_#22d3ee] focus:shadow-[0_0_20px_#22d3ee] m-4 focus:border-cyan-300 transition duration-300"
        placeholder="Enter Developer Password"
      />

      <button
        onClick={handleSetIP}
        className="cursor-pointer px-6 py-2 rounded-full bg-black text-cyan-400 border border-cyan-400 shadow-[0_0_10px_#22d3ee] hover:shadow-[0_0_20px_#22d3ee] hover:text-cyan-300 hover:border-cyan-300 active:shadow-[0_0_25px_#22d3ee] transition duration-300 ease-in-out"
      >
        Set The IP
      </button>

      <p className="mt-16 text-amber-50">
        Developed by <span className="font-bold">Riviya_X</span>
      </p>
    </div>
  );
}

export default TempIP;
