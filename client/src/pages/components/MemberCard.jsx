import React, { useState } from "react";
import axios from "axios";
import EditMembers from "./UpdateMembers"; // same as before

function MemberCard({ member }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onDeleteConfirmed = async () => {
    try {
      setDeleting(true);
      await axios.delete(`https://marks.vercel.app/api/members/${member._id}`);
      // simple approach: reload to refresh list (you can replace with a callback later)
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error deleting member — check console.");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200">
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {member.name}
        </th>
        <td className="px-6 py-4">{member.rank}</td>
        <td className="px-6 py-4">{member.marks}</td>
        <td className="px-6 py-4">
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setConfirmOpen(true)}
              className="font-medium text-red-600 dark:text-red-500 hover:underline"
            >
              Delete
            </button>

            {/* Edit modal component (keeps its own dialog/ref) */}
            <EditMembers member={member} />
          </div>
        </td>
      </tr>

      {/* Confirm modal (simple controlled overlay) */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmOpen(false)}
          />

          {/* dialog */}
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Confirm delete
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Are you sure you want to delete <strong>{member.name}</strong>?
              This action cannot be undone.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onDeleteConfirmed}
                disabled={deleting}
                className="px-3 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MemberCard;
