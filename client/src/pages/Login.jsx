import { useState, useRef, useEffect } from "react";

function Login() {
  const OTP_LENGTH = 3;
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (value, index) => {
    if (!/^\d*$/.test(value)) return; // only digits allowed

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };
  const handleSubmit = () => {
    const otpCode = otp.join("");
    if (otpCode == 654) {
      localStorage.setItem("otpVerified", "true");
      alert("OTP Verified Successfully!");
      window.location.reload();
    } else {
      alert("Invalid OTP. Please try again.");
      localStorage.removeItem("otpVerified");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0].focus();
    }
    // Send OTP to backend or verify
  };

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-teal-400 min-h-screen flex items-center justify-center px-4">
      <div className="bg-white/30 p-6 md:p-10 lg:p-20 rounded-lg shadow-md flex flex-col items-center space-y-6 w-full max-w-md">
        <h1 className="text-white text-5xl font-bold mb-2">Login</h1>
        <p className="text-gray-200 text-center">Enter 3 digit code to login</p>

        <div className="flex space-x-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              ref={(el) => (inputsRef.current[index] = el)}
              className="w-12 h-12 text-center text-xl rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow"
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="mt-4 cursor-pointer bg-indigo-600 text-white px-6 py-2 rounded-md 
             hover:bg-indigo-700 focus:bg-indigo-700 active:scale-95 
             focus:outline-none focus:ring-2 focus:ring-indigo-300 
             shadow-md hover:shadow-lg transition-all duration-200 ease-in-out"
        >
          Submit
        </button>
      </div>
      <div className="absolute bottom-4 w-full text-center text-white text-xs opacity-70">
        Developed by <span className="font-semibold">Riviya_X</span>
      </div>
    </div>
  );
}

export default Login;
