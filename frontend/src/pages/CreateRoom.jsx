import { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

function CreateRoom() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outputType, setOutputType] = useState("document");
  const [tags, setTags] = useState("");
  const [visibility, setVisibility] = useState("open");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { title, description, outputType, tags: tags.split(",").map(s=>s.trim()).filter(Boolean), visibility };
    const res = await API.post("/rooms", payload);
    navigate(`/rooms/${res.data._id}`);
  };

  return (
    <div>
      <h2>Create Room</h2>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Goal / description" />
        <select value={outputType} onChange={(e) => setOutputType(e.target.value)}>
          <option value="document">Document</option>
          <option value="brief">Design Brief</option>
          <option value="pitch">Pitch Deck</option>
          <option value="code">Code Snippet</option>
        </select>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" />
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
          <option value="open">Open to all</option>
          <option value="invite">Invite only</option>
        </select>
        <button type="submit">Create</button>
      </form>
    </div>
  );
}

export default CreateRoom;
