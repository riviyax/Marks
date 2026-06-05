import React, { useState } from "react";
import axios from "axios";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import "../print.css";

const BOT_API = import.meta.env.VITE_BOT_URL; // e.g. http://localhost:3000

function MemberCard({ member, isMobile = false }) {
  const [openModal, setOpenModal] = useState(false);
  const [memberData, setMemberData] = useState(member);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sending, setSending] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false }), Underline],
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
      const cleanedNumber = (memberData.whatsappNumber || "").replace(/\D/g, "");
      await axios.put(`${import.meta.env.VITE_API_URL}/${memberData._id}`, {
        name: memberData.name,
        rank: memberData.rank,
        marks: Number(memberData.marks),
        info: memberData.info,
        whatsappNumber: cleanedNumber,
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
      await axios.delete(`${import.meta.env.VITE_API_URL}/${memberData._id}`);
      alert("🗑️ Member deleted.");
      setConfirmDelete(false);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Error deleting member.");
    }
  };

  // ✅ Send WhatsApp message to this one member
  const handleSendMessage = async (e) => {
    e.stopPropagation();
    if (!memberData.whatsappNumber) {
      alert("⚠️ No WhatsApp number saved for this member.");
      return;
    }
    try {
      setSending(true);
      await axios.post(`${BOT_API}/api/bot/send`, { memberId: memberData._id });
      alert(`✅ Message sent to ${memberData.name}!`);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to send message. Is the bot running?");
    } finally {
      setSending(false);
    }
  };

  const toggle = (cmd) => editor && editor.chain().focus()[cmd]().run();

  // ✅ Desktop Row
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
      <td className="px-6 py-4 text-sm text-gray-400">
        {member.whatsappNumber ? (
          <span className="text-green-400 font-mono">{member.whatsappNumber}</span>
        ) : (
          <span className="text-gray-500 italic">Not set</span>
        )}
      </td>
      <td onClick={(e) => e.stopPropagation()} className="printclass px-6 py-4">
        <div className="flex items-center gap-3">
          <a
            href={`/memberview?id=${memberData._id}`}
            className="text-blue-500 hover:underline"
          >
            View
          </a>
          {/* ✅ Send button */}
          <button
            onClick={handleSendMessage}
            disabled={sending}
            title={memberData.whatsappNumber ? "Send WhatsApp message" : "No number saved"}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition
              ${memberData.whatsappNumber
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
              } disabled:opacity-60`}
          >
            {sending ? (
              "Sending..."
            ) : (
              <>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send
              </>
            )}
          </button>
        </div>
      </td>
    </tr>
  );

  // ✅ Mobile Card
  const mobileCard = (
    <div
      onClick={() => setOpenModal(true)}
      className="bg-white dark:bg-gray-800 shadow px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{member.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-300">Position: {member.rank}</p>
          <p className="text-sm text-gray-500 dark:text-gray-300">Marks: {member.marks}</p>
          {member.whatsappNumber && (
            <p className="text-xs text-green-400 mt-1">📱 {member.whatsappNumber}</p>
          )}
        </div>
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-end gap-2"
        >
          <a href={`/memberview?id=${memberData._id}`} className="text-blue-500 text-sm">
            View
          </a>
          <button
            onClick={handleSendMessage}
            disabled={sending || !memberData.whatsappNumber}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              ${memberData.whatsappNumber
                ? "bg-green-600 text-white"
                : "bg-gray-600 text-gray-400 opacity-50 cursor-not-allowed"
              }`}
          >
            {sending ? "..." : "📤 Send"}
          </button>
        </div>
      </div>
    </div>
  );

  const modalRoot = document.body;

  const editModal = openModal
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpenModal(false)} />
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

              {/* ✅ WhatsApp Number in edit modal */}
              <label className="block text-sm">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp Number
                </span>
              </label>
              <input
                type="tel"
                name="whatsappNumber"
                value={memberData.whatsappNumber || ""}
                onChange={handleChange}
                placeholder="e.g. 94771234567"
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 font-mono"
              />
              <p className="text-xs text-gray-400">Country code + number, no + sign</p>

              <label className="block text-sm">Info (How marks were earned)</label>

              {editor && (
                <div className="bg-gray-700 rounded-lg border border-gray-600 text-white">
                  <div className="flex gap-2 border-b border-gray-600 p-2 flex-wrap">
                    <button onClick={() => toggle("toggleBold")} className={`px-2 py-1 rounded ${editor.isActive("bold") ? "bg-blue-500 text-white" : "hover:bg-gray-600"}`}><b>B</b></button>
                    <button onClick={() => toggle("toggleItalic")} className={`px-2 py-1 rounded ${editor.isActive("italic") ? "bg-blue-500 text-white" : "hover:bg-gray-600"}`}><i>I</i></button>
                    <button onClick={() => toggle("toggleUnderline")} className={`px-2 py-1 rounded ${editor.isActive("underline") ? "bg-blue-500 text-white" : "hover:bg-gray-600"}`}><u>U</u></button>
                    <button onClick={() => toggle("toggleBulletList")} className={`px-2 py-1 rounded ${editor.isActive("bulletList") ? "bg-blue-500 text-white" : "hover:bg-gray-600"}`}>• List</button>
                    <button onClick={() => toggle("toggleOrderedList")} className={`px-2 py-1 rounded ${editor.isActive("orderedList") ? "bg-blue-500 text-white" : "hover:bg-gray-600"}`}>1.</button>
                    <button onClick={() => toggle("unsetAllMarks")} className="px-2 py-1 rounded hover:bg-gray-600">Clear</button>
                  </div>
                  <EditorContent editor={editor} className="min-h-[120px] p-3 focus:outline-none text-sm" />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <button onClick={() => setConfirmDelete(true)} className="bg-red-600 px-4 py-2 rounded hover:bg-red-500 text-sm">Delete</button>
              <div className="flex gap-2">
                <button onClick={() => setOpenModal(false)} className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-500 text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500 text-sm disabled:opacity-60">
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(false)} />
          <div className="relative z-10 bg-gray-800 rounded-lg p-6 w-full max-w-sm text-white">
            <h3 className="text-lg font-semibold mb-3">Confirm Delete</h3>
            <p className="text-sm mb-4">Are you sure you want to delete <strong>{memberData.name}</strong>?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 bg-gray-600 rounded text-sm">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 rounded text-sm">Delete</button>
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