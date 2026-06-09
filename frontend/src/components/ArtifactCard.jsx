import React from "react";
import { Link } from "react-router-dom";

export default function ArtifactCard({ artifact }) {
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", padding: 12, borderRadius: 10, background: "#0b1220", color: "#fff", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{artifact.title}</strong>
        <span style={{ background: "#16a34a", color: "#001", padding: "4px 8px", borderRadius: 8 }}>Verified</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div>Type: {artifact.outputType}</div>
        <div>Tags: {(artifact.tags || []).join(", ")}</div>
        <div>Word count: {artifact.wordCount || 0}</div>
      </div>
      <div style={{ marginTop: 8 }}>
        <Link to={`/artifacts/view/${artifact._id}`}>View Artifact</Link>
      </div>
    </div>
  );
}
