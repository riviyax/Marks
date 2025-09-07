import React from "react";
import { useState, useRef, useEffect } from "react";
import Table from "./components/Table";
import AddMembers from "./components/AddMembers";
import Logout from "./components/Logout";

function Main() {
  return (
    <div className="bg-gray-800 min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-white text-5xl font-black capitalize m-10 font-arial">
        Hey, Brother
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
