import React, { useState, useEffect } from "react";
import MemberCard from "./MemberCard";
import axios from "axios";
import "../print.css"; // Import custom styles for print

function Table() {
  const [members, setMembers] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("none");

  // Fetch members
  useEffect(() => {
    axios
      .get(import.meta.env.VITE_API_URL)
      .then((res) => setMembers(res.data))
      .catch((err) => console.log("Error fetching members:", err));
  }, []);

  // ✅ Fetch last update date
useEffect(() => {
  axios.get(import.meta.env.VITE_API_DATE)
    .then((res) => {
      console.log("Last Update API Response:", res.data);
      setLastUpdate(res.data.lastUpdated || res.data.updatedAt || res.data || "");
    })
    .catch((err) => console.log("Error fetching last update:", err));
}, []);


  const filteredMembers = members.filter((member) => {
    const q = searchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(q) ||
      member.rank?.toLowerCase().includes(q) ||
      member.marks?.toString().includes(q)
    );
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortOption) {
      case "name-asc": return a.name.localeCompare(b.name);
      case "name-desc": return b.name.localeCompare(a.name);
      case "marks-high": return b.marks - a.marks;
      case "marks-low": return a.marks - b.marks;
      default: return 0;
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="w-full max-w-6xl px-4" id="printable">

      {/* ✅ This will now print correctly */}
      <p className="updateprint text-black text-xl mb-3">
        <span className="font-bold">Last Updated:</span> <span className="dateF">{formatDate(lastUpdate)}</span>
      </p>

      <div className="flex flex-col md:flex-row justify-end md:items-center mb-4 gap-2">

        <input
          id="hidethis"
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />

        <select
          id="hidethis"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="w-full md:w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
        >
          <option value="none">None (Default)</option>
          <option value="name-asc">Name (A → Z)</option>
          <option value="name-desc">Name (Z → A)</option>
          <option value="marks-high">Marks (Highest → Lowest)</option>
          <option value="marks-low">Marks (Lowest → Highest)</option>
        </select>
      </div>

      <div className="relative overflow-x-auto shadow-md sm:rounded-lg hidden w-full md:block">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">Member Name</th>
              <th className="px-6 py-3">Position</th>
              <th className="px-6 py-3">Marks</th>
              <th id="hidethis" className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-4">No members found</td></tr>
            ) : (
              sortedMembers.map((m) => <MemberCard key={m._id} member={m} />)
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {sortedMembers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No members found</div>
        ) : (
          sortedMembers.map((m) => <MemberCard key={m._id} member={m} isMobile />)
        )}
      </div>
    </div>
  );
}

export default Table;
