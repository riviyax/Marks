import React, { useState, useEffect } from "react";
import MemberCard from "./MemberCard";
import UpdateMembers from "./UpdateMembers"; // we'll use this in mobile cards
import axios from "axios";

function Table() {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/members")
      .then((res) => {
        setMembers(res.data);
      })
      .catch((err) => {
        console.log("Error fetching members:", err);
      });
  }, []);

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name?.toLowerCase().includes(query) ||
      member.rank?.toLowerCase().includes(query) ||
      member.marks?.toString().includes(query)
    );
  });

  return (
    <div className="w-full max-w-6xl px-4">
      {/* Search */}
      <div className="flex justify-end mb-4">
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
      </div>

      {/* Desktop table */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg hidden md:block">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Member Name</th>
              <th scope="col" className="px-6 py-3">Position</th>
              <th scope="col" className="px-6 py-3">Marks</th>
              <th scope="col" className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-4 text-gray-500">
                  No members found
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => (
                <MemberCard key={member._id} member={member} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No members found</div>
        ) : (
          filteredMembers.map((m) => (
            <div
              key={m._id}
              className="bg-white dark:bg-gray-800 shadow px-4 py-3 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{m.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Position: {m.rank}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300">Marks: {m.marks}</p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {/* Delete: small inline confirm not repeated here (MemberCard handles desktop).
                      We'll reuse the same UpdateMembers (Edit modal) */}
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (confirm(`Delete ${m.name}?`)) {
                          try {
                            await axios.delete(`http://localhost:3000/api/members/${m._id}`);
                            window.location.reload();
                          } catch (err) {
                            console.error(err);
                            alert("Error deleting member");
                          }
                        }
                      }}
                      className="text-sm font-medium text-red-600 dark:text-red-500 hover:underline"
                    >
                      Delete
                    </button>

                    <UpdateMembers member={m} />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Table;
