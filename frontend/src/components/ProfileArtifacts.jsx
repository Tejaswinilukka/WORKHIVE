import { useEffect, useState } from "react";
import API from "../api/api";
import ArtifactCard from "./ArtifactCard";

export default function ProfileArtifacts({ userId }) {
  const [artifacts, setArtifacts] = useState([]);

  useEffect(() => {
    if (!userId) return;
    API.get(`/artifacts/${userId}`).then((r) => setArtifacts(r.data || [])).catch(console.error);
  }, [userId]);

  if (!artifacts.length) return <div>No verified artifacts yet.</div>;

  return (
    <div>
      <h3>Verified Artifacts</h3>
      {artifacts.map((a) => (
        <ArtifactCard key={a._id} artifact={a} />
      ))}
    </div>
  );
}
