import { useEffect, useState } from "react";
import API from "../api/api";
import { Link, useNavigate } from "react-router-dom";

function RoomsList() {
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState("live");
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
  }, [tab]);

  const fetchRooms = async () => {
    const status = tab === "live" ? "active" : tab === "open" ? "open" : "completed";
    const res = await API.get(`/rooms?status=${status}`);
    setRooms(res.data || []);
  };

  const filtered = rooms.filter((r) => !filter || (r.tags || []).join(",").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div>
      <h2>Rooms</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("live")}>Live Now</button>
        <button onClick={() => setTab("open")}>Open to Join</button>
        <button onClick={() => setTab("completed")}>Completed</button>
        <Link to="/create-room" style={{ marginLeft: "auto" }}>Create Room</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input placeholder="Filter tags" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      <div>
        {filtered.map((room) => (
          <div key={room._id} style={{ border: "1px solid #ccc", padding: 12, marginBottom: 8 }}>
            <h3>{room.title}</h3>
            <div>Tags: {(room.tags || []).join(", ")}</div>
            <div>Collaborators: {(room.collaborators || []).length}</div>
            <div>Status: {room.status}</div>
            <div style={{ marginTop: 8 }}>
              {room.status !== "completed" ? (
                <button onClick={async () => {
                  try {
                    await API.post(`/rooms/${room._id}/join`);
                  } catch (err) {
                    // ignore errors (may already be a member)
                  }
                  navigate(`/rooms/${room._id}`);
                }}>Join Room</button>
              ) : (
                <Link to={`/artifacts/${room._id}`}>View Artifact</Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomsList;
