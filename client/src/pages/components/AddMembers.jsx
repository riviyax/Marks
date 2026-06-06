import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

function AddMembers() {
  const dialogRef = useRef(null);
  const nameInputRef = useRef(null);

  const [memberData, setMemberData] = useState({
    id: "",
    name: "",
    position: "Member",
    marks: "",
    whatsappNumber: "",
    grade: "",
    category: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMemberData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchNextId = async () => {
    try {
      const response = await axios.get(import.meta.env.VITE_API_URL);
      const members = response.data;
      if (Array.isArray(members) && members.length > 0) {
        const maxId = Math.max(...members.map((m) => Number(m.memberID || 0)));
        setMemberData((prev) => ({ ...prev, id: maxId + 1 }));
      } else {
        setMemberData((prev) => ({ ...prev, id: 1 }));
      }
    } catch (error) {
      console.error("Failed to fetch next ID:", error);
      setMemberData((prev) => ({ ...prev, id: 1 }));
    }
  };

  const handleOpen = async () => {
    await fetchNextId();
    dialogRef.current?.showModal();
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleClose = () => dialogRef.current?.close();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedNumber = memberData.whatsappNumber.replace(/\D/g, "");
    const payload = {
      memberID: Number(memberData.id),
      name: memberData.name,
      rank: memberData.position,
      marks: Number(memberData.marks),
      whatsappNumber: cleanedNumber,
      grade: memberData.grade,
      category: memberData.category,
    };
    try {
      await axios.post(import.meta.env.VITE_API_URL, payload);
      alert("Member added successfully!");
      setMemberData({ id: "", name: "", position: "Member", marks: "", whatsappNumber: "", grade: "", category: "" });
      handleClose();
      window.location.reload();
    } catch (error) {
      console.error("Error adding member:", error.response?.data || error.message);
      alert("Failed to add member.");
    }
  };

  const inputClass = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white";

  return (
    <div>
      <button
        onClick={handleOpen}
        className="focus:outline-none cursor-pointer text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-900"
      >
        Add Members <span className="text-xs opacity-70 ml-1">(Shift + N)</span>
      </button>

      <dialog ref={dialogRef} aria-labelledby="dialog-title" className="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent">
        <div className="fixed inset-0 bg-gray-900/50 transition-opacity"></div>
        <div tabIndex="0" className="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl outline-1 outline-white/10 transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <form onSubmit={handleSubmit}>
              <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-500/10 sm:mx-0 sm:size-10">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="size-6 text-blue-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25a8.25 8.25 0 0115 0" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 id="dialog-title" className="text-base font-semibold text-white">Add Members</h3>
                    <p className="mt-2 text-sm text-gray-400">Fill out the form to add a new member.</p>

                    <div className="mt-4 w-full space-y-4">
                      {/* ID - readonly */}
                      <input onChange={handleChange} required type="number" name="id" value={memberData.id} placeholder="ID" readOnly
                        className="w-full bg-gray-200 border border-gray-300 text-gray-800 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-not-allowed" />

                      {/* Name */}
                      <input ref={nameInputRef} onChange={handleChange} required type="text" name="name" value={memberData.name} placeholder="Full name" className={inputClass} />

                      {/* Position */}
                      <input onChange={handleChange} required type="text" name="position" value={memberData.position} placeholder="Position" className={inputClass} />

                      {/* Marks */}
                      <input onChange={handleChange} required type="number" name="marks" value={memberData.marks} placeholder="Marks" className={inputClass} />

                      {/* Grade */}
                      <input onChange={handleChange} type="text" name="grade" value={memberData.grade} placeholder="Grade (e.g. Grade 11, A/L)" className={inputClass} />

                      {/* Category */}
                      <input onChange={handleChange} type="text" name="category" value={memberData.category} placeholder="Category (e.g. Announcing, Sound Balancing)" className={inputClass} />

                      {/* WhatsApp Number */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </div>
                        <input onChange={handleChange} type="tel" name="whatsappNumber" value={memberData.whatsappNumber}
                          placeholder="WhatsApp number (e.g. 94771234567)"
                          className="w-full pl-10 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                      </div>
                      <p className="text-xs text-gray-400 -mt-2">Country code, no + sign. Sri Lanka: 947XXXXXXXX</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700/25 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button type="submit" className="cursor-pointer inline-flex w-full justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400 sm:ml-3 sm:w-auto">
                  Add Member
                </button>
                <button type="button" onClick={handleClose} className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 sm:mt-0 sm:w-auto">
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

export default AddMembers;