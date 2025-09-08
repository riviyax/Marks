import { useState, useRef, useEffect } from "react";
import Login from "./pages/Login";
import Main from "./pages/Main";

function App() {
  const isOtpVerified = localStorage.getItem("otpVerified") === "true";
  

  return (
    <div>
      {isOtpVerified ? <Main /> : <Login />}
    </div>
  );
}

export default App;
