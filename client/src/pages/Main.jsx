import React, { useState, useEffect } from "react";
import Table from "./components/Table";
import AddMembers from "./components/AddMembers";
import Logout from "./components/Logout";

function Main() {
  // ✅ Load name from localStorage or default to "User"
  const [name, setName] = useState(() => localStorage.getItem("name") || "User");

  // ✅ Keep localStorage updated whenever name changes
  useEffect(() => {
    localStorage.setItem("name", name);
  }, [name]);

  function nameChange() {
    const newName = prompt("Enter your name: ", name);
    if (newName && newName.trim() !== "") {
      setName(newName.trim());
    }
  }

  return (
    <div className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-white text-5xl font-black capitalize m-10 font-arial">
        <span className="font-medium">Hey,</span>{" "}
        <span className="cursor-pointer" onClick={nameChange}>
          {name}
        </span>
      </h1>
      <Logout />
      <AddMembers />
      <br />
      <br />
      <Table />
    </div>
  );
}

export default Main;
