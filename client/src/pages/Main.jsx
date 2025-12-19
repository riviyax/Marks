import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "./components/Table";
import AddMembers from "./components/AddMembers";
import Logout from "./components/Logout";
import "./print.css"; // Import custom styles for print
import { Printer } from "lucide-react"; // ✅ Icon import

function Main() {
  const [lastUpdate, setLastUpdate] = useState("");
  const [customDate, setCustomDate] = useState("");

  // Fetch last update from backend
  useEffect(() => {
    axios
      .get(import.meta.env.VITE_API_DATE)
      .then((res) => setLastUpdate(res.data.lastUpdated))
      .catch((err) => console.error("Error fetching last update:", err));
  }, []);

  // Handle manual update
  const handleUpdateDate = async () => {
    try {
      const res = await axios.post(import.meta.env.VITE_API_DATE, {
        date: customDate || null,
      });
      setLastUpdate(res.data.lastUpdated);
      setCustomDate("");
      alert("✅ Last update date changed!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update last update date." + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString();
  };

  // ✅ Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-800 min-h-screen flex flex-col items-center justify-start p-4">
      {/* Header Section: Name + Logout */}
      <div className="relative w-full max-w-3xl mt-10 mb-6">
        {/* Logout button (top right) */}
        <div className="absolute top-0 right-0">
          <Logout />
        </div>

        {/* Centered Name */}
        <h1 className="text-white text-4xl sm:text-5xl font-black capitalize font-arial text-center">
          <span className="font-medium">Hey, </span>
          <span
            className="cursor-pointer transition hover:scale-105"
            onClick={() => {
              const name = localStorage.getItem("name") || "User";
              const newName = prompt("Enter your name: ", name);
              if (newName) {
                localStorage.setItem("name", newName);
                window.location.reload();
              }
            }}
          >
            {localStorage.getItem("name") || "User"}
          </span>
        </h1>

        {/* Centered Last Update */}
        <p className="text-gray-300 mt-2 italic text-center">
          Last update:{" "}
          <span className="font-semibold">{formatDate(lastUpdate)}</span>
        </p>
      </div>

      {/* Input to change last update */}
      <div className="mt-6 w-full max-w-md flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-3 sm:space-y-0">
        <input
          type="datetime-local"
          value={customDate}
          onChange={(e) => setCustomDate(e.target.value)}
          className="flex-1 p-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleUpdateDate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-md transition w-full sm:w-auto"
        >
          Change Date
        </button>
      </div>

      {/* Add Members + Table + Print */}
      <div className="mt-10 flex flex-col items-center space-y-6">
        <AddMembers />
        {/* ✅ Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Printer className="w-5 h-5" />
          Print Table
        </button>
        {/* <p className="updateprint text-black text-xl"><span className="font-bold">Last Updated:</span> {formatDate(lastUpdate)}</p> */}
        <Table id="printable" />

        
      </div>
    </div>
  );
}

export default Main;
