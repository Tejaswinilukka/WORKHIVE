import { useEffect, useState } from "react";
import API from "../api/api";
import { useParams } from "react-router-dom";

export default function ArtifactView() {
  const { id } = useParams();
  const [artifact, setArtifact] = useState(null);

  useEffect(() => {
    if (!id) return;
    API.get(`/artifacts/id/${id}`).then((r) => {
      setArtifact(r.data);
    }).catch(() => {
      API.get(`/rooms/${id}`).then((r) => setArtifact(r.data));
    });
  }, [id]);

  if (!artifact) return <p>Loading artifact...</p>;

  return (
    <div>
      <h2>{artifact.title}</h2>
      <div>Type: {artifact.outputType || artifact.outputType}</div>
      <pre style={{ whiteSpace: "pre-wrap", background: "#0b1220", color: "#fff", padding: 12 }}>{artifact.content || artifact.description}</pre>
    </div>
  );
}
