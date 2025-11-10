import React from "react";
import "./App.css";

function App() {
  return (
    <div className="container">
      <div className="content">
        <h1 className="logo">
          Order<span className="highlight">Easy</span>
        </h1>
        <p className="tagline">Fast, simple, and smart restaurant ordering.</p>
        <div className="buttons">
          <button className="btn register">Register</button>
          <button className="btn login">Login</button>
        </div>
      </div>
    </div>
  );
}

export default App;
