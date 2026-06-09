import { useEffect, useRef, useState } from "react";
import API from "../api/api";
import ProfileArtifacts from "../components/ProfileArtifacts";

const API_ORIGIN = "http://localhost:5000";

function Profile() {
  const [posts, setPosts] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("skills");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [resumeName, setResumeName] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const fileInputRef = useRef(null);
  const resumeInputRef = useRef(null);

  const fetchMyPosts = async (userId) => {
    try {
      const res = await API.get("/posts");
      const myPosts = res.data.filter((post) => post.user?._id === userId);
      setPosts(myPosts);
    } catch (err) {
      console.log(err);
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (!storedUser) {
      setError("No user data found. Please login again.");
      setLoading(false);
      return;
    }

    setUser(storedUser);
    setLocation(storedUser.location || "");
    setRole(storedUser.role || "");
    setSkills((storedUser.skills || []).join(", "));
    setEducation(storedUser.education || "");
    setResumeName(storedUser.resume || "");
    fetchMyPosts(storedUser._id || storedUser.id);
  }, []);

  const profileImageUrl = user?.profileImage
    ? `${API_ORIGIN}${user.profileImage}`
    : "";

  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("profileImage", file);
    setUploading(true);
    setError("");

    try {
      const res = await API.put("/user/me/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedUser = res.data;
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.error || "Failed to import profile photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setResumeName(file.name);
    setError("");
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    const updatedUser = {
      ...user,
      location,
      role,
      skills: skills.split(",").map((skill) => skill.trim()).filter(Boolean),
      education,
      resume: resumeName,
    };

    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));

    try {
      await API.put("/user/me", {
        location,
        role,
        skills: updatedUser.skills,
        education,
        resume: resumeName,
      });
    } catch (err) {
      console.log("Profile update failed", err);
    }
  };

  if (loading) {
    return <p style={{ textAlign: "center" }}>Loading profile...</p>;
  }

  if (!user) {
    return <p style={{ textAlign: "center" }}>{error || "Please login again"}</p>;
  }

  return (
    <div style={container}>
      <div style={card}>
        <div style={profileHeader}>
          <div style={avatar}>
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={user.name} style={avatarImage} />
            ) : (
              <span>{getInitials(user.name)}</span>
            )}
          </div>

          <div style={profileInfo}>
            <h2 style={title}>My Profile</h2>
            <p style={line}><b>Name:</b> {user.name}</p>
            <p style={line}><b>Email:</b> {user.email}</p>
            <p style={line}><b>Location:</b> {location || "Not set yet"}</p>
            <p style={line}><b>Role:</b> {role || "Student / Professional / Recruiter"}</p>
            <p style={line}><b>Resume:</b> {resumeName || "No resume uploaded"}</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleProfileImageChange}
          style={{ display: "none" }}
        />

        <input
          ref={resumeInputRef}
          type="file"
          accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleResumeChange}
          style={{ display: "none" }}
        />

        <div style={buttonRow}>
          <button
            type="button"
            style={button}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Importing..." : "Import Profile Photo"}
          </button>
          <button
            type="button"
            style={button}
            onClick={() => resumeInputRef.current?.click()}
          >
            Upload Resume
          </button>
        </div>

        <div style={inputGroup}>
          <label style={label}>Location</label>
          <input
            style={input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Enter your city or region"
          />
        </div>

        <div style={inputGroup}>
          <label style={label}>Role</label>
          <select style={select} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Select role</option>
            <option value="Student">Student</option>
            <option value="Professional">Professional</option>
            <option value="Recruiter">Recruiter</option>
          </select>
        </div>

        <div style={tabs}>
          <button
            type="button"
            style={activeSection === "skills" ? activeTabButton : tabButton}
            onClick={() => setActiveSection("skills")}
          >
            Skills
          </button>
          <button
            type="button"
            style={activeSection === "education" ? activeTabButton : tabButton}
            onClick={() => setActiveSection("education")}
          >
            Education
          </button>
        </div>

        <div style={sectionCard}>
          {activeSection === "skills" ? (
            <>
              <p style={sectionTitle}>Skills</p>
              <textarea
                style={textarea}
                rows={4}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="List your skills separated by commas"
              />
              <small style={helpText}>Example: JavaScript, React, UI/UX, Teamwork</small>
            </>
          ) : (
            <>
              <p style={sectionTitle}>Education</p>
              <textarea
                style={textarea}
                rows={4}
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Add school, degree, major, and years"
              />
              <small style={helpText}>Example: B.Sc. Computer Science, 2020 - 2024, XYZ University</small>
            </>
          )}
        </div>

        <button type="button" style={saveButton} onClick={handleSaveProfile}>
          Save Profile Details
        </button>

        {error && <p style={errorText}>{error}</p>}
      </div>

      <h3 style={{ marginTop: "20px" }}>My Posts</h3>

      {posts.length === 0 ? (
        <p>No posts yet</p>
      ) : (
        posts.map((post) => (
          <div key={post._id} style={card}>
            <p>{post.content}</p>
          </div>
        ))
      )}

      <div style={{ marginTop: 20 }}>
        <ProfileArtifacts userId={user._id || user.id} />
      </div>
    </div>
  );
}

const container = {
  maxWidth: "700px",
  margin: "auto",
  padding: "20px",
};

const card = {
  background: "#111",
  color: "#fff",
  padding: "16px",
  marginTop: "10px",
  borderRadius: "16px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const profileHeader = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const avatar = {
  width: "88px",
  height: "88px",
  minWidth: "88px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #8b5cf6, #4f46e5)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  fontWeight: "700",
  overflow: "hidden",
};

const avatarImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const profileInfo = {
  minWidth: 0,
};

const title = {
  margin: "0 0 10px",
};

const line = {
  margin: "6px 0",
  color: "#ddd",
};

const button = {
  marginTop: "16px",
  padding: "10px 16px",
  border: "none",
  borderRadius: "999px",
  background: "#7c3aed",
  color: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const saveButton = {
  marginTop: "18px",
  padding: "12px 18px",
  border: "none",
  borderRadius: "999px",
  background: "#22c55e",
  color: "#050505",
  cursor: "pointer",
  fontWeight: 700,
};

const buttonRow = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const inputGroup = {
  marginTop: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const label = {
  color: "#cbd5e1",
  fontWeight: 600,
};

const input = {
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  color: "#eef2ff",
  outline: "none",
};

const select = {
  ...input,
  color: "#000",
  background: "#fff",
  border: "1px solid rgba(0,0,0,0.16)",
};

const tabs = {
  display: "flex",
  gap: "10px",
  marginTop: "20px",
};

const tabButton = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#cbd5e1",
  cursor: "pointer",
};

const activeTabButton = {
  ...tabButton,
  background: "#7c3aed",
  color: "white",
  borderColor: "#8b5cf6",
};

const sectionCard = {
  marginTop: "16px",
  padding: "18px",
  borderRadius: "16px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const sectionTitle = {
  margin: "0 0 10px",
  color: "#fff",
};

const textarea = {
  width: "100%",
  minHeight: "120px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "#eef2ff",
  padding: "12px",
  resize: "vertical",
};

const helpText = {
  marginTop: "8px",
  color: "#94a3b8",
  fontSize: "13px",
};

const errorText = {
  color: "#f87171",
  marginTop: "10px",
};

export default Profile;
