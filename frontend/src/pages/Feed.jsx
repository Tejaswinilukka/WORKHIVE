import { useEffect, useState } from "react";
import API from "../api/api";

const API_ORIGIN = "http://localhost:5000";

function Feed() {
  const [posts, setPosts] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await API.get("/posts");
      setPosts(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleLike = async (id) => {
    try {
      await API.put(`/posts/${id}/like`);
      fetchPosts();
    } catch {
      alert("Login required ❌");
    }
  };

  const handleComment = async (id) => {
    if (!commentText[id]) return;

    try {
      await API.post(`/posts/${id}/comment`, {
        text: commentText[id],
      });

      setCommentText({ ...commentText, [id]: "" });
      fetchPosts();

    } catch {
      alert("Login required ❌");
    }
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post._id);
    setEditedContent(post.content || "");
  };

  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditedContent("");
  };

  const handleSaveEdit = async (postId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Login required to save edits. Please sign in again.");
      return;
    }

    try {
      await API.put(`/posts/${postId}`, { content: editedContent });
      setEditingPostId(null);
      setEditedContent("");
      fetchPosts();
    } catch (err) {
      console.error("EDIT POST ERROR", err.response?.status, err.response?.data || err.message);
      const message = err.response?.data || err.message || "Unable to save post.";
      alert(`Unable to save post: ${message}`);
    }
  };

  const token = localStorage.getItem("token");
  const currentUser = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;
  const currentUserId =
    currentUser?.id?.toString() || currentUser?._id?.toString();
  const isLoggedIn = !!token;

  return (
    <div>
      <h2 style={{ textAlign: "center" }}>Feed</h2>

      {posts.map((post) => {
        const isOwner = isLoggedIn && currentUserId && (post.user?._id?.toString() === currentUserId || post.user?.id?.toString() === currentUserId);
        const editing = editingPostId === post._id;

        return (
          <div key={post._id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p><b>{post.user?.name}</b></p>
              {isOwner && !editing && (
                <button
                  className="btn"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                  onClick={() => handleStartEdit(post)}
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  style={{ width: "100%", minHeight: 100, marginTop: 8, borderRadius: 10, padding: 10 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button className="btn" onClick={() => handleSaveEdit(post._id)}>Save</button>
                  <button className="btn" style={{ background: "#ccc", color: "#000" }} onClick={handleCancelEdit}>Cancel</button>
                </div>
              </div>
            ) : (
              post.content && <p>{post.content}</p>
            )}

            {post.media?.length > 0 && (
              <div className="media-preview-grid">
                {post.media.map((item) => {
                  const mediaUrl = item.url.startsWith("http")
                    ? item.url
                    : `${API_ORIGIN}${item.url}`;

                  return item.type === "image" ? (
                    <img
                      key={item.filename || item.url}
                      src={mediaUrl}
                      alt="Post media"
                      className="post-media"
                    />
                  ) : (
                    <video
                      key={item.filename || item.url}
                      src={mediaUrl}
                      className="post-media"
                      controls
                    />
                  );
                })}
              </div>
            )}

            <button className="btn" onClick={() => handleLike(post._id)}>
              ❤️ {post.likes?.length || 0}
            </button>

            <div style={{ marginTop: "10px" }}>
              <input
                className="input"
                type="text"
                placeholder="Write comment..."
                value={commentText[post._id] || ""}
                onChange={(e) =>
                  setCommentText({
                    ...commentText,
                    [post._id]: e.target.value,
                  })
                }
              />
              <button
                className="btn"
                onClick={() => handleComment(post._id)}
              >
                Post
              </button>
            </div>

            <div style={{ marginTop: "10px" }}>
              {post.comments?.map((c, i) => (
                <p key={i}>
                  <b>{c.user?.name}:</b> {c.text}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Feed;
