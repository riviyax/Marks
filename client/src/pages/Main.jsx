import React, { useState, useEffect } from "react";
import axios from "axios";
import Table from "./components/Table";
import AddMembers from "./components/AddMembers";
import Logout from "./components/Logout";

function Main() {
  const [lastUpdate, setLastUpdate] = useState("");
  const [customDate, setCustomDate] = useState("");

  // Fetch last update from backend
  useEffect(() => {
    axios
      .get("http://localhost:3000/api/last-update")
      .then((res) => setLastUpdate(res.data.lastUpdated))
      .catch((err) => console.error("Error fetching last update:", err));
  }, []);

  // Handle manual update
  const handleUpdateDate = async () => {
    try {
      const res = await axios.post("http://localhost:3000/api/last-update", {
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

  return (
    <div className="bg-gray-800 min-h-screen flex flex-col items-center justify-start p-4">
      {/* Greeting */}
      <h1 className="text-white text-5xl font-black capitalize mt-10 mb-6 font-arial text-center w-full">
        <span className="font-medium">Hey,</span>{" "}
        <span
          className="cursor-pointer"
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

      {/* Last update display */}
      <p className="text-gray-300 mb-4 italic text-center w-full">
        Last update: <span className="font-semibold">{formatDate(lastUpdate)}</span>
      </p>

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

      {/* Other components */}
      <div className="mt-10 flex flex-col items-center space-y-6">
        <Logout />
        <AddMembers />
        <Table />
      </div>
    </div>
  );
}

export default Main;
