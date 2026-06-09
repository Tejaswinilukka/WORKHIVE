import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/api";

let socket;

function RoomWorkspace() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [content, setContent] = useState("");
  const [collaborators, setCollaborators] = useState([]);
  const [activeCursors, setActiveCursors] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const navigate = useNavigate();
  const textareaRef = useRef();
  const saveTimer = useRef();
  const cursorTimer = useRef();

  useEffect(() => {
    fetchRoom();
    // init socket
    const token = localStorage.getItem("token");
    socket = io("http://localhost:5000", { auth: { token } });

    socket.on("connect", () => {
      socket.emit("join-room", id, (res) => {
        // joined
      });
    });

    socket.on("content-update", ({ content: c }) => {
      setContent(c);
    });

    socket.on("cursor-update", ({ user, selectionStart, selectionEnd }) => {
      setActiveCursors((current) => {
        const next = current.filter((item) => item.user.id !== user.id);
        return [
          ...next,
          { user, selectionStart, selectionEnd, updatedAt: Date.now() },
        ];
      });
    });

    socket.on("user-typing", ({ user }) => {
      setTypingUsers((s) => {
        if (s.find((u) => u.id === user.id)) return s;
        return [...s, user];
      });
      setTimeout(() => setTypingUsers((s) => s.filter((u) => u.id !== user.id)), 2500);
    });

    socket.on("user-joined", ({ user }) => setCollaborators((s) => [...s, user]));
    socket.on("user-left", ({ user }) => {
      setCollaborators((s) => s.filter((u) => u.id !== user.id));
      setActiveCursors((s) => s.filter((cursor) => cursor.user.id !== user.id));
    });
    socket.on("room-published", (artifact) => {
      navigate(`/artifacts/view/${artifact._id}`);
    });

    return () => {
      socket?.emit("leave-room", id);
      socket?.disconnect();
    };
  }, [id]);

  const fetchRoom = async () => {
    const res = await API.get(`/rooms/${id}`);
    setRoom(res.data);
    setContent(res.data.content || "");
    setCollaborators(
      (res.data.collaborators || []).map((c) => {
        const user = typeof c.userId === "object" ? c.userId : { id: c.userId };
        return { ...user, joinedAt: c.joinedAt };
      })
    );
  };

  const emitCursorUpdate = (selectionStart, selectionEnd) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user?.id) return;
    socket?.emit("cursor-update", { roomId: id, selectionStart, selectionEnd });
  };

  const handleCursorChange = (e) => {
    const { selectionStart, selectionEnd } = e.target;
    if (cursorTimer.current) clearTimeout(cursorTimer.current);
    cursorTimer.current = setTimeout(() => {
      emitCursorUpdate(selectionStart, selectionEnd);
    }, 100);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setContent(v);
    socket?.emit("content-update", id, v);
    socket?.emit("user-typing", { roomId: id });
    emitCursorUpdate(e.target.selectionStart, e.target.selectionEnd);

    // debounced save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      API.put(`/rooms/${id}/content`, { content: v }).catch(() => {});
    }, 1200);
  };

  const handlePublish = async () => {
    if (!confirm("Publish artifact and finish room?")) return;
    const res = await API.post(`/rooms/${id}/publish`);
    const artifact = res.data.artifact;
    // server will emit room-published
    navigate(`/artifacts/view/${artifact._id}`);
  };

  if (!room) return <p>Loading room...</p>;

  return (
    <div>
      <h2>{room.title}</h2>
      <div>Tags: {(room.tags || []).join(", ")}</div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
        <div>Collaborators: {(collaborators || []).length}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {(collaborators || []).slice(0,5).map((c, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: 14, background: "#666", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
              {c.name ? c.name[0] : 'U'}
            </div>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontStyle: "italic", color: "#666" }}>{typingUsers.length ? `${typingUsers.map(u=>u.name||'Someone').join(', ')} typing...` : ''}</div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onSelect={handleCursorChange}
        onKeyUp={handleCursorChange}
        style={{ width: "100%", minHeight: 300, marginTop: 12 }}
      />

      <div style={{ marginTop: 16, display: "grid", gap: 6, color: "#222" }}>
        {(typingUsers.length > 0 || activeCursors.length > 0) && (
          <div style={{ background: "#f0f4ff", padding: 10, borderRadius: 10, color: "#0c2a6f" }}>
            {typingUsers.length > 0 && (
              <div>{typingUsers.map((u) => u.name || "Someone").join(", ")} typing...</div>
            )}
            {activeCursors.length > 0 && (
              <div style={{ marginTop: 6 }}>
                Active cursors:
                <ul style={{ margin: 6, paddingLeft: 18 }}>
                  {activeCursors.map((cursor) => (
                    <li key={cursor.user.id}>
                      {cursor.user.name || "Teammate"} at position {cursor.selectionStart}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={handlePublish}>Finish & Publish Artifact</button>
      </div>
    </div>
  );
}

export default RoomWorkspace;
