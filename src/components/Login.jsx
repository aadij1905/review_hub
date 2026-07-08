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
      <form className="login-card" onSubmit={submit}>
        <h1 className="login-title">Experience Intelligence</h1>
        <p className="login-subtitle">Sign in to continue</p>

        {error && <div className="login-error">{error}</div>}

        <div className="field">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary">Sign In</button>
      </form>
    </div>
  );
}
