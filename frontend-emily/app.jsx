import React from "react";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center font-sans">
      <header className="text-center">
        <h1 className="text-5xl font-bold text-orange-500 tracking-wide mb-4">
          Order<span className="text-green-400">Easy</span>
        </h1>
        <p className="text-lg text-gray-300">
          Fast, simple, and smart restaurant ordering.
        </p>
        <div className="mt-8 space-x-4">
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg shadow-md">
            Register
          </button>
          <button className="bg-green-400 hover:bg-green-500 text-white px-6 py-2 rounded-lg shadow-md">
            Login
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;