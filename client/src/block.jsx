import { motion } from "framer-motion";
import "./block.css";

function Block({ ip }) {
  const handleRetry = () => {
    window.location.reload(); // simple refresh to retry IP check
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gray-800/70 backdrop-blur-md border border-gray-700 shadow-2xl rounded-2xl p-10 max-w-md w-full"
      >
        <img
          src="/error.png"
          alt="Error"
          className="w-32 mx-auto mb-6"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-red-500 drop-shadow-md">
          Unauthorized IP Address
        </h1>

        <p className="text-gray-300 mt-4 leading-relaxed">
          Access is restricted for this IP address.
          <br />
          Please contact the administrator to gain access.
        </p>

        {ip && (
          <p className="mt-6 text-sm text-gray-400">
            Your IP:{" "}
            <span className="text-blue-400 font-mono font-semibold">{ip}</span>
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.05 }}
          className="mt-8 bg-red-600 hover:bg-red-700 transition-all text-white font-semibold py-2 px-6 rounded-lg shadow-md"
          onClick={handleRetry}
        >
          Retry
        </motion.button>
      </motion.div>

      <footer className="mt-10 text-gray-500 text-sm">
        Developed by <span className="text-white font-semibold">Riviya_X</span>
      </footer>
    </div>
  );
}

export default Block;
