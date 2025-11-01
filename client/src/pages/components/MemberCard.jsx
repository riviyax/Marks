import React, { useState } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import "../print.css"

function MemberCard({ member, isMobile = false }) {
  const [openModal, setOpenModal] = useState(false);
  const [memberData, setMemberData] = useState(member);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 🧠 Tiptap editor setup — prevent duplicate underline
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Underline,
    ],
    content: memberData.info || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setMemberData((prev) => ({ ...prev, info: html }));
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMemberData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`https://marks.vercel.app/api/members/${memberData._id}`, {
        name: memberData.name,
        rank: memberData.rank,
        marks: Number(memberData.marks),
        info: memberData.info,
      });
      alert("✅ Member updated!");
      setOpenModal(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`https://marks.vercel.app/api/members/${memberData._id}`);
      alert("🗑️ Member deleted.");
      setConfirmDelete(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error deleting member.");
    }
  };

  // 🧰 Toolbar toggle helper
  const toggle = (cmd) => editor && editor.chain().focus()[cmd]().run();

  // ✅ Desktop Row View
  const desktopRow = (
    <tr
      onClick={() => setOpenModal(true)}
      className="cursor-pointer odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
    >
      <th className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
        {member.name}
      </th>
      <td className="px-6 py-4">{member.rank}</td>
      <td className="px-6 py-4">{member.marks}</td>
      <td className="printclass px-6 py-4 text-blue-500"><a href={`/memberview?id=${memberData._id}`}>View</a></td>
    </tr>
  );

  // ✅ Mobile Card View (opens same modal)
  const mobileCard = (
    <div
      onClick={() => setOpenModal(true)}
      className="bg-white dark:bg-gray-800 shadow px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {member.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Position: {member.rank}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            Marks: {member.marks}
          </p>
        </div>
        <span className="text-blue-500 text-sm">View</span>
      </div>
    </div>
  );

  const modalRoot = document.body;

  // ✅ Same modal used for desktop & mobile
  const editModal = openModal
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpenModal(false)}
          />
          <div className="relative z-10 bg-gray-800 rounded-lg p-6 w-full max-w-md text-white max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Member Details</h2>

            <div className="space-y-3">
              <label className="block text-sm">Name</label>
              <input
                type="text"
                name="name"
                value={memberData.name}
                onChange={handleChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />

              <label className="block text-sm">Position</label>
              <input
                type="text"
                name="rank"
                value={memberData.rank}
                onChange={handleChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />

              <label className="block text-sm">Marks</label>
              <input
                type="number"
                name="marks"
                value={memberData.marks}
                onChange={handleChange}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600"
              />

              <label className="block text-sm">
                Info (How marks were earned)
              </label>

              {editor && (
                <div className="bg-gray-700 rounded-lg border border-gray-600 text-white">
                  {/* Toolbar */}
                  <div className="flex gap-2 border-b border-gray-600 p-2 flex-wrap">
                    <button
                      onClick={() => toggle("toggleBold")}
                      className={`px-2 py-1 rounded ${
                        editor.isActive("bold")
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-600"
                      }`}
                    >
                      <b>B</b>
                    </button>
                    <button
                      onClick={() => toggle("toggleItalic")}
                      className={`px-2 py-1 rounded ${
                        editor.isActive("italic")
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-600"
                      }`}
                    >
                      <i>I</i>
                    </button>
                    <button
                      onClick={() => toggle("toggleUnderline")}
                      className={`px-2 py-1 rounded ${
                        editor.isActive("underline")
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-600"
                      }`}
                    >
                      <u>U</u>
                    </button>
                    <button
                      onClick={() => toggle("toggleBulletList")}
                      className={`px-2 py-1 rounded ${
                        editor.isActive("bulletList")
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-600"
                      }`}
                    >
                      • List
                    </button>
                    <button
                      onClick={() => toggle("toggleOrderedList")}
                      className={`px-2 py-1 rounded ${
                        editor.isActive("orderedList")
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-600"
                      }`}
                    >
                      1.
                    </button>
                    <button
                      onClick={() => toggle("unsetAllMarks")}
                      className="px-2 py-1 rounded hover:bg-gray-600"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Editor content */}
                  <EditorContent
                    editor={editor}
                    className="min-h-[120px] p-3 focus:outline-none text-sm"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setConfirmDelete(true)}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-500 text-sm"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenModal(false)}
                  className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 text-sm disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        modalRoot
      )
    : null;

  const deleteModal = confirmDelete
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(false)}
          />
          <div className="relative z-10 bg-gray-800 rounded-lg p-6 w-full max-w-sm text-white">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-sm mb-4">
              Are you sure you want to delete{" "}
              <strong>{memberData.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 rounded text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        modalRoot
      )
    : null;

  return (
    <>
      {isMobile ? mobileCard : desktopRow}
      {editModal}
      {deleteModal}
    </>
  );
}

export default MemberCard;
