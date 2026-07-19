import { useState } from "react";
import { USERS } from "../lib/config";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const user = USERS.find(
      (u) => u.username === username.trim() && u.password === password
    );
    if (!user) {
      setError("Invalid username or password");
      return;
    }
    setError("");
    const { password: _pw, ...safe } = user;
    onLogin(safe);
  }

  return (
    <div className="login-wrap">
      <div className="login-orb login-orb-a" />
      <div className="login-orb login-orb-b" />

      <form className="login-card" onSubmit={submit}>
        <div className="login-mark">◆</div>
        <h1 className="login-title">Experience Intelligence</h1>
        <p className="login-subtitle">AI-Powered Storefront Optimization</p>

        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <label className="field-label" htmlFor="login-username">Username</label>
          <input
            id="login-username"
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary">Sign In</button>
      </form>

      <p className="login-foot">© {new Date().getFullYear()} Experience Intelligence</p>
    </div>
  );
}
