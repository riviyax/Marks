import React, { useRef } from "react";

function Logout() {
  const dialogRef = useRef(null);

  function logout() {
    localStorage.removeItem("otpVerified");
    dialogRef.current?.close();
    window.location.reload();
  }

  return (
    <div>
      {/* Logout Icon Button */}
      <button
        onClick={() => dialogRef.current?.showModal()}
        title="Logout"
        className="focus:outline-none cursor-pointer text-white bg-red-700 hover:bg-red-800 focus:ring-2 focus:ring-red-300 rounded-full p-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
      >
        {/* Logout Icon SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10v1m0-1a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2"
          />
        </svg>
      </button>

      {/* Logout Confirmation Dialog */}
      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-title"
        className="fixed inset-0 z-40 bg-transparent"
      >
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50" />
          <div className="relative transform overflow-hidden rounded-lg bg-gray-800 text-left shadow-xl w-full max-w-md mx-auto p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-full bg-red-500/10 p-3">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="w-6 h-6 text-red-400"
                >
                  <path
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 id="dialog-title" className="text-base font-semibold text-white">
                  Logout
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Are you sure you want to logout from this session?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => dialogRef.current?.close()}
                className="px-3 py-2 rounded bg-white/10 text-white"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="px-3 py-2 rounded bg-red-500 text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default Logout;
