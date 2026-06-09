import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={{
      padding: "12px 24px",
      background: "black",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
      <span style={{ fontWeight: "bold", fontSize: "18px" }}>WorkHive</span>

      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <Link to="/feed"     style={{ color: "white", textDecoration: "none" }}>Feed</Link>
        <Link to="/people"   style={{ color: "white", textDecoration: "none" }}>People</Link>
        <Link to="/messages" style={{ color: "white", textDecoration: "none" }}>Messages</Link>
        <Link to="/profile"  style={{ color: "white", textDecoration: "none" }}>Profile</Link>
        <button
          onClick={handleLogout}
          style={{
            background: "white",
            color: "black",
            border: "none",
            padding: "6px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;