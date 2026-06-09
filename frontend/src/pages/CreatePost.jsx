import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState([]);
  const navigate = useNavigate();

  const handlePost = async (e) => {
    e.preventDefault();

    if (!content.trim() && media.length === 0) {
      alert("Post cannot be empty ❌");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", content);
      media.forEach((file) => formData.append("media", file));

      await API.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Post Created 🚀");
      setContent("");
      setMedia([]);

      // ✅ REDIRECT TO FEED
      navigate("/");

    } catch (err) {
      console.log(err);
      alert("Error creating post ❌");
    }
  };

  return (
    <form onSubmit={handlePost} className="card">
      <h2>Create Post</h2>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        style={{
          width: "100%",
          height: "100px",
          padding: "10px",
          borderRadius: "8px"
        }}
      />

      <br /><br />

      <input
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => setMedia(Array.from(e.target.files).slice(0, 5))}
      />

      {media.length > 0 && (
        <div className="media-preview-grid">
          {media.map((file) => {
            const previewUrl = URL.createObjectURL(file);

            return file.type.startsWith("image/") ? (
              <img key={file.name} src={previewUrl} alt={file.name} className="post-media" />
            ) : (
              <video key={file.name} src={previewUrl} className="post-media" controls />
            );
          })}
        </div>
      )}

      <br /><br />

      <button type="submit" className="btn">
        Post
      </button>
    </form>
  );
}
