
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  Navigate,
} from "react-router-dom";
import api from "./services/api";
import "./App.css";
import Dashboard from "./Dashboard";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("token/", {
        username,
        password,
      });

      sessionStorage.setItem("accessToken", response.data.access);

      setPassword("");
      navigate("/dashboard");
    } catch (error) {
      if (error.response?.status === 401) {
        setMessage("Invalid username or password.");
      } else {
        setMessage(
          "Unable to connect to the server. Check that Django is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-container">
      <section className="login-card">
        <h1>TaskFlow</h1>
        <p className="subtitle">Sign in to manage your tasks</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter your username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message && (
          <p role="status" className="message">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

function ProtectedDashboard() {
  const token = sessionStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={<ProtectedDashboard />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
