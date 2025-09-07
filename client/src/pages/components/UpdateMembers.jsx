import React, { useState, useEffect } from "react";
import axios from "axios";

function EditMembers({ member }) {
  const [memberData, setMemberData] = useState({
    id: "",
    name: "",
    position: "",
    marks: "",
  });

  const dialogId = `dialog-${member._id}`; // ✅ unique ID per member

  // Pre-fill fields when member changes
  useEffect(() => {
    if (member) {
      setMemberData({
        id: member._id,
        name: member.name || "",
        position: member.rank || "",
        marks: member.marks || "",
      });
    }
  }, [member]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMemberData({ ...memberData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      name: memberData.name,
      rank: memberData.position,
      marks: Number(memberData.marks),
    };

    axios
      .put(`http://localhost:3000/api/members/${memberData.id}`, payload)
      .then((response) => {
        console.log("✅ Member updated:", response.data);
        alert("Member updated successfully!");
        document.getElementById(dialogId).close(); // ✅ close correct dialog
        window.location.reload();
      })
      .catch((error) => {
        console.error("❌ Error updating member:", error.response?.data || error.message);
        alert("Failed to update member. Check console for details.");
      });
  };

  return (
    <div>
      <a
        onClick={() => document.getElementById(dialogId).showModal()} // ✅ open correct dialog
        className="font-medium text-blue-600 dark:text-blue-500 hover:underline cursor-pointer"
      >
        Edit
      </a>

      <dialog
        id={dialogId} // ✅ unique per member
        aria-labelledby="dialog-title"
        className="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent"
      >
        <div className="fixed inset-0 bg-gray-900/50 transition-opacity"></div>

        <div
          tabIndex="0"
          className="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0"
        >
          <div className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl outline-1 outline-white/10 transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form onSubmit={handleSubmit}>
              <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10 sm:mx-0 sm:size-10">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                      className="size-6 text-blue-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 20.25a8.25 8.25 0 0115 0"
                      />
                    </svg>
                  </div>

                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3
                      id="dialog-title"
                      className="text-base font-semibold text-white"
                    >
                      Edit Member
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">
                      Update member details below.
                    </p>

                    <div className="mt-4 w-full space-y-4">
                      <input
                        onChange={handleChange}
                        required
                        type="text"
                        name="name"
                        value={memberData.name}
                        placeholder="Full name"
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        onChange={handleChange}
                        required
                        type="text"
                        name="position"
                        value={memberData.position}
                        placeholder="Position"
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <input
                        onChange={handleChange}
                        required
                        type="number"
                        name="marks"
                        value={memberData.marks}
                        placeholder="Marks"
                        className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/25 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="submit"
                  className="cursor-pointer inline-flex w-full justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400 sm:ml-3 sm:w-auto"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById(dialogId).close()} // ✅ close correct one
                  className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 sm:mt-0 sm:w-auto"
                >
                  Cancel
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
