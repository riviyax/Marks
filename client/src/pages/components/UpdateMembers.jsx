import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function EditMembers({ member }) {
  const dialogRef = useRef(null);
  const [memberData, setMemberData] = useState({
    id: "",
    name: "",
    position: "",
    marks: "",
  });

  useEffect(() => {
    if (member) {
      setMemberData({
        id: member._id || "",
        name: member.name || "",
        position: member.rank || "",
        marks: member.marks || "",
      });
    }
  }, [member]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMemberData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      name: memberData.name,
      rank: memberData.position,
      marks: Number(memberData.marks),
    };

    axios
      .put(`${import.meta.env.VITE_API_URL}/${memberData.id}`, payload)
      .then((response) => {
        dialogRef.current?.close();
        window.location.reload();
      })
      .catch((error) => {
        console.error("Error updating member:", error.response?.data || error.message);
        alert("Failed to update member. Check console for details.");
      });
  };

  return (
    <div>
      <button
      id="hidethis"
        onClick={() => dialogRef.current?.showModal()}
        className="font-medium text-blue-600 dark:text-blue-500 hover:underline cursor-pointer text-sm"
      >
        Edit
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-title"
        className="fixed inset-0 z-40 bg-transparent"
      >
        {/* CENTERED WRAPPER */}
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* backdrop */}
          <div className="absolute inset-0 bg-gray-900/50" />

          {/* modal box */}
          <div className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl outline-1 outline-white/10 transition-all w-full max-w-lg mx-auto">
            <form onSubmit={handleSubmit} className="p-6">
              <h3 id="dialog-title" className="text-base font-semibold text-white">
                Edit Member
              </h3>
              <p className="mt-2 text-sm text-gray-400">Update member details below.</p>

              <div className="mt-4 space-y-4">
                <input
                  onChange={handleChange}
                  required
                  type="text"
                  name="name"
                  value={memberData.name}
                  placeholder="Full name"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  onChange={handleChange}
                  required
                  type="text"
                  name="position"
                  value={memberData.position}
                  placeholder="Position"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <input
                  onChange={handleChange}
                  required
                  type="number"
                  name="marks"
                  value={memberData.marks}
                  placeholder="Marks"
                  className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="px-3 py-2 rounded bg-white/10 text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="px-3 py-2 rounded bg-blue-500 text-white">
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default EditMembers;
