import React, { useState, useEffect } from "react";
import MemberCard from "./MemberCard";
import axios from "axios";
import "../print.css";

const BOT_API  = import.meta.env.VITE_BOT_URL;
const GROUP_ID = "120363428923888353@g.us";

function Table() {
  const [members, setMembers]         = useState([]);
  const [lastUpdate, setLastUpdate]   = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption]   = useState("none");
  const [sendingAll, setSendingAll]   = useState(false);

  // ✅ Multi-select state
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [addingSelected, setAddingSelected] = useState(false);

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_URL)
      .then((res) => setMembers(res.data))
      .catch((err) => console.log("Error:", err));
  }, []);

  useEffect(() => {
    axios.get(import.meta.env.VITE_API_DATE)
      .then((res) => setLastUpdate(res.data.lastUpdated || res.data.updatedAt || ""))
      .catch((err) => console.log("Error:", err));
  }, []);

  // Toggle one checkbox
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select / deselect all visible members
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedMembers.map((m) => m._id)));
    }
  };

  // Add selected members to group
  const handleAddSelectedToGroup = async () => {
    if (selectedIds.size === 0) {
      alert("⚠️ No members selected.");
      return;
    }
    if (!GROUP_ID) {
      alert("⚠️ No Group ID configured. Add VITE_GROUP_ID to your .env");
      return;
    }
    const confirmed = window.confirm(
      `➕ Add ${selectedIds.size} selected member(s) to WhatsApp group?`
    );
    if (!confirmed) return;

    try {
      setAddingSelected(true);
      const res = await axios.post(`${BOT_API}/api/bot/add-selected-to-group`, {
        memberIds: Array.from(selectedIds),
        groupId: GROUP_ID,
      });
      alert(`✅ Done! Added: ${res.data.added} | Failed: ${res.data.failed}`);
      setSelectedIds(new Set());
    } catch (err) {
      alert("❌ Failed to add members. Is the bot running?");
    } finally {
      setAddingSelected(false);
    }
  };

  const handleSendAll = async () => {
    const withNumbers = members.filter((m) => m.whatsappNumber && m.whatsappNumber.trim() !== "");
    if (withNumbers.length === 0) { alert("⚠️ No members have WhatsApp numbers."); return; }
    const confirmed = window.confirm(
      `📤 Send marks to ${withNumbers.length} member(s)?\n(${members.length - withNumbers.length} skipped)`
    );
    if (!confirmed) return;
    try {
      setSendingAll(true);
      const res = await axios.post(`${BOT_API}/api/bot/send-all`);
      alert(`✅ Sent: ${res.data.sent} | Skipped: ${res.data.skipped}`);
    } catch { alert("❌ Failed. Is the bot running?"); }
    finally { setSendingAll(false); }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.rank?.toLowerCase().includes(q) ||
      m.marks?.toString().includes(q) ||
      m.grade?.toLowerCase().includes(q) ||
      m.category?.toLowerCase().includes(q)
    );
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortOption) {
      case "name-asc":    return a.name.localeCompare(b.name);
      case "name-desc":   return b.name.localeCompare(a.name);
      case "marks-high":  return b.marks - a.marks;
      case "marks-low":   return a.marks - b.marks;
      default: return 0;
    }
  });

  const formatDate   = (d) => d ? new Date(d).toLocaleString() : "Not set";
  const numbersCount = members.filter((m) => m.whatsappNumber?.trim()).length;
  const allSelected  = sortedMembers.length > 0 && selectedIds.size === sortedMembers.length;

  return (
    <div className="w-full max-w-6xl px-4" id="printable">
      <p className="updateprint text-black text-xl mb-3">
        <span className="font-bold">Last Updated:</span>{" "}
        <span className="dateF">{formatDate(lastUpdate)}</span>
      </p>

      {/* ── Toolbar ── */}
      <div className="flex flex-col md:flex-row justify-end md:items-center mb-4 gap-2 flex-wrap">
        <input
          id="hidethis" type="text" placeholder="Search members..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
        <select
          id="hidethis" value={sortOption} onChange={(e) => setSortOption(e.target.value)}
          className="w-full md:w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600"
        >
          <option value="none">None (Default)</option>
          <option value="name-asc">Name (A → Z)</option>
          <option value="name-desc">Name (Z → A)</option>
          <option value="marks-high">Marks (High → Low)</option>
          <option value="marks-low">Marks (Low → High)</option>
        </select>

        {/* ✅ Add Selected to Group */}
        {selectedIds.size > 0 && (
          <button
            id="hidethis"
            onClick={handleAddSelectedToGroup}
            disabled={addingSelected}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${addingSelected ? "bg-indigo-800 text-indigo-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}
          >
            {addingSelected ? (
              <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Adding...</>
            ) : (
              <>➕ Add {selectedIds.size} to Group</>
            )}
          </button>
        )}

        {/* Send All */}
        <button
          id="hidethis" onClick={handleSendAll} disabled={sendingAll}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
            ${sendingAll ? "bg-green-800 text-green-300 cursor-not-allowed" : "bg-green-600 hover:bg-green-500 text-white"} disabled:opacity-70`}
        >
          {sendingAll ? (
            <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Sending...</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Send All ({numbersCount})
            </>
          )}
        </button>
      </div>

      {/* ── Desktop Table ── */}
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg hidden w-full md:block">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              {/* ✅ Select all checkbox */}
              <th id="hidethis" className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded cursor-pointer accent-indigo-500"
                  title="Select all"
                />
              </th>
              <th className="px-6 py-3">Member Name</th>
              <th className="px-6 py-3">Position</th>
              <th className="px-6 py-3">Marks</th>
              <th id="hidethis" className="px-6 py-3">Grade</th>
              <th id="hidethis" className="px-6 py-3">Category</th>
              <th id="hidethis" className="px-6 py-3">WhatsApp</th>
              <th id="hidethis" className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedMembers.length === 0 ? (
              <tr><td colSpan="8" className="text-center py-4">No members found</td></tr>
            ) : (
              sortedMembers.map((m) => (
                <MemberCard
                  key={m._id}
                  member={m}
                  groupId={GROUP_ID}
                  selected={selectedIds.has(m._id)}
                  onToggleSelect={toggleSelect}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ── */}
      <div className="md:hidden space-y-3">
        {sortedMembers.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No members found</div>
        ) : (
          sortedMembers.map((m) => (
            <MemberCard
              key={m._id}
              member={m}
              isMobile
              groupId={GROUP_ID}
              selected={selectedIds.has(m._id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {/* ✅ Floating selection bar */}
      {selectedIds.size > 0 && (
        <div id="hidethis" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-indigo-500 rounded-xl px-6 py-3 shadow-xl flex items-center gap-4 text-white text-sm">
          <span>✅ <strong>{selectedIds.size}</strong> selected</span>
          <button
            onClick={handleAddSelectedToGroup}
            disabled={addingSelected}
            className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {addingSelected ? "Adding..." : "➕ Add to Group"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-gray-400 hover:text-white text-xs"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export default Table;