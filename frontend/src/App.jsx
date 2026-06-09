import { BrowserRouter, Routes, Route, NavLink, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Feed from "./pages/Feed";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import SearchPeople from "./pages/SearchPeople";
import RoomsList from "./pages/RoomsList";
import CreateRoom from "./pages/CreateRoom";
import RoomWorkspace from "./pages/RoomWorkspace";
import ArtifactView from "./pages/ArtifactView";
import ProtectedRoute from "./components/ProtectedRoute";
import "./App.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorage = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    navigate("/login");
  };

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <span className="logo-icon" aria-label="WorkHive">wh</span>
        </div>

          <div className="nav-links">
          <Link to="/">Home</Link>
          {token && (
            <>
              {" | "}<Link to="/rooms">Rooms</Link>
              {" | "}<Link to="/create">Create</Link>
              {" | "}<Link to="/profile">Profile</Link>
              {" | "}<Link to="/messages">Messages</Link>
              {" | "}<Link to="/people">People</Link>
            </>
          )}
          {!token ? (
            <>
              {" | "}<Link to="/login">Login</Link>
              {" | "}<Link to="/register">Register</Link>
            </>
          ) : (
            <>
              {" | "}
              <button onClick={handleLogout} className="logout-btn">Logout</button>
            </>
          )}
        </div>
      </div>

      <div className="container">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/rooms" element={<RoomsList />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/rooms/:id" element={<RoomWorkspace />} />
          <Route path="/artifacts/view/:id" element={<ArtifactView />} />
          <Route path="/create" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/people" element={<ProtectedRoute><SearchPeople /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
    </>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}