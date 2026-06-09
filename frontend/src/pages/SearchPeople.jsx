import { useState, useEffect, useRef } from "react";
import API from "../api/api";

const PALETTES = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
];
const avatarGradient = (i) =>
  `linear-gradient(135deg, ${PALETTES[i % PALETTES.length][0]}, ${PALETTES[i % PALETTES.length][1]})`;
const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function SearchPeople() {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState([]);
  const [loading, setLoading]       = useState(false);
  const [statuses, setStatuses]     = useState({});
  const [requests, setRequests]     = useState([]);
  const [reqLoading, setReqLoading] = useState({});
  const [tab, setTab]               = useState("search");
  const [suggestions, setSuggestions] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));
  const timerRef = useRef(null);

  useEffect(() => {
    fetchRequests();
    fetchSuggestions();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await API.get("/messages/requests");
      setRequests(res.data || []);
    } catch (_) {
      setRequests([]);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await API.get("/users/search?q=");
      const users = (res.data || []).slice(0, 8);
      setSuggestions(users);
      checkStatuses(users);
    } catch (_) {}
  };

  const checkStatuses = async (users) => {
    try {
      const [accRes, pendRes] = await Promise.all([
        API.get("/messages"),
        API.get("/messages/requests"),
      ]);
      const accepted = accRes.data || [];
      const pending  = pendRes.data || [];
      const map = {};
      users.forEach((u) => {
        const isFriend  = accepted.some((c) => c.members.some((m) => m._id === u._id));
        const isPending = pending.some((c)  => c.members.some((m) => m._id === u._id));
        map[u._id] = isFriend ? "friends" : isPending ? "pending" : "none";
      });
      setStatuses((prev) => ({ ...prev, ...map }));
    } catch (_) {}
  };

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    if (!val.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(() => doSearch(val), 300);
  };

  const doSearch = async (q) => {
    setLoading(true);
    try {
      const res = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
      const users = res.data || [];
      setResults(users);
      checkStatuses(users);
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId) => {
    setStatuses((p) => ({ ...p, [userId]: "pending" }));
    try {
      await API.post(`/messages/request/${userId}`);
    } catch (_) {}
  };

  const acceptRequest = async (convId, userId) => {
    setReqLoading((p) => ({ ...p, [convId]: "accepting" }));
    try {
      await API.put(`/messages/accept/${convId}`);
      setRequests((prev) => prev.filter((r) => r._id !== convId));
      setStatuses((p) => ({ ...p, [userId]: "friends" }));
    } catch (_) {}
    setReqLoading((p) => ({ ...p, [convId]: null }));
  };

  const rejectRequest = async (convId) => {
    setReqLoading((p) => ({ ...p, [convId]: "rejecting" }));
    try {
      await API.delete(`/messages/reject/${convId}`);
      setRequests((prev) => prev.filter((r) => r._id !== convId));
    } catch (_) {}
    setReqLoading((p) => ({ ...p, [convId]: null }));
  };

  const getOther = (conv) => conv.members?.find((m) => m._id !== user?._id);
  const displayList = query.trim() ? results : suggestions;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sp-root { min-height: calc(100vh - 60px); background: #f9f9f9; font-family: 'Sora', sans-serif; color: #111; }

        .sp-topbar { position: sticky; top: 0; z-index: 10; background: rgba(255,255,255,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid #ebebeb; padding: 14px 20px; }
        .sp-topbar-inner { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; }
        .sp-title-row { display: flex; align-items: center; justify-content: space-between; }
        .sp-title { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }

        .sp-req-badge-btn { display: flex; align-items: center; gap: 7px; background: none; border: 1px solid #e0e0e0; border-radius: 20px; padding: 6px 14px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; color: #111; transition: all 0.18s; }
        .sp-req-badge-btn:hover { background: #f0f0f0; }
        .sp-req-badge-btn.active { background: #111; color: #fff; border-color: #111; }
        .sp-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px; background: #e53935; color: #fff; font-size: 10px; font-weight: 700; border-radius: 20px; }

        .sp-search-wrap { position: relative; }
        .sp-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #aaa; pointer-events: none; display: flex; }
        .sp-search-input { width: 100%; border: 1.5px solid #e0e0e0; border-radius: 14px; padding: 11px 14px 11px 40px; font-family: 'Sora', sans-serif; font-size: 14px; color: #111; background: #fff; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .sp-search-input:focus { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        .sp-search-input::placeholder { color: #bbb; }
        .sp-spinner { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); }
        .spin { width: 16px; height: 16px; border: 2px solid #e0e0e0; border-top-color: #111; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sp-content { max-width: 680px; margin: 0 auto; padding: 20px 20px 60px; }
        .sp-section-label { font-size: 11px; font-weight: 600; color: #aaa; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px; }

        .sp-card { display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #ebebeb; transition: box-shadow 0.18s, transform 0.18s; animation: slideIn 0.22s ease both; }
        .sp-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); transform: translateY(-1px); }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .sp-avatar { width: 52px; height: 52px; min-width: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 17px; font-weight: 700; letter-spacing: -0.5px; flex-shrink: 0; }
        .sp-info { flex: 1; min-width: 0; }
        .sp-name { font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
        .sp-sub { font-size: 12px; color: #aaa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .sp-follow-btn { border: none; border-radius: 10px; padding: 8px 18px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; white-space: nowrap; flex-shrink: 0; }
        .sp-follow-btn.none { background: #111; color: #fff; }
        .sp-follow-btn.none:hover { background: #333; }
        .sp-follow-btn.pending { background: #f0f0f0; color: #888; cursor: default; }
        .sp-follow-btn.friends { background: #eafaf1; color: #27ae60; cursor: default; }

        .req-card { display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #ebebeb; animation: slideIn 0.22s ease both; transition: box-shadow 0.18s; }
        .req-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
        .req-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .btn-accept { background: #111; color: #fff; border: none; border-radius: 10px; padding: 8px 16px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.18s; }
        .btn-accept:hover { background: #333; }
        .btn-accept:disabled { opacity: 0.5; cursor: default; }
        .btn-reject { background: #f5f5f5; color: #555; border: none; border-radius: 10px; padding: 8px 16px; font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.18s; }
        .btn-reject:hover { background: #ffe5e5; color: #e53935; }
        .btn-reject:disabled { opacity: 0.5; cursor: default; }

        .sp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; gap: 10px; color: #bbb; }
        .sp-empty-icon { width: 64px; height: 64px; border: 2px solid #e0e0e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
        .sp-empty h3 { font-size: 16px; color: #555; font-weight: 600; }
        .sp-empty p  { font-size: 13px; }
        .sp-no-results { text-align: center; padding: 40px 20px; color: #aaa; font-size: 14px; }

        .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.2s infinite; border-radius: 8px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .skeleton-card { display: flex; align-items: center; gap: 14px; background: #fff; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #ebebeb; }
      `}</style>

      <div className="sp-root">
        <div className="sp-topbar">
          <div className="sp-topbar-inner">
            <div className="sp-title-row">
              <span className="sp-title">People</span>
              <button
                className={`sp-req-badge-btn ${tab === "requests" ? "active" : ""}`}
                onClick={() => { setTab(tab === "requests" ? "search" : "requests"); fetchRequests(); }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Requests
                {requests.length > 0 && <span className="sp-badge">{requests.length}</span>}
              </button>
            </div>

            {tab === "search" && (
              <div className="sp-search-wrap">
                <span className="sp-search-icon">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                    <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  className="sp-search-input"
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Search by name…"
                  autoFocus
                />
                {loading && <span className="sp-spinner"><div className="spin" /></span>}
              </div>
            )}
          </div>
        </div>

        <div className="sp-content">

          {/* REQUESTS TAB */}
          {tab === "requests" && (
            <>
              <div className="sp-section-label">
                {requests.length} pending request{requests.length !== 1 ? "s" : ""}
              </div>
              {requests.length === 0 ? (
                <div className="sp-empty">
                  <div className="sp-empty-icon">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"
                        stroke="#ccc" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3>No requests</h3>
                  <p>When someone sends you a request, it'll appear here</p>
                </div>
              ) : (
                requests.map((r, i) => {
                  const other = getOther(r);
                  const isLoading = reqLoading[r._id];
                  return (
                    <div key={r._id} className="req-card" style={{ animationDelay: `${i * 40}ms` }}>
                      <div className="sp-avatar" style={{ background: avatarGradient(i) }}>
                        {getInitials(other?.name)}
                      </div>
                      <div className="sp-info">
                        <div className="sp-name">{other?.name || "Unknown"}</div>
                        <div className="sp-sub">Wants to connect with you</div>
                      </div>
                      <div className="req-actions">
                        <button className="btn-accept" disabled={!!isLoading} onClick={() => acceptRequest(r._id, other?._id)}>
                          {isLoading === "accepting" ? "…" : "Accept"}
                        </button>
                        <button className="btn-reject" disabled={!!isLoading} onClick={() => rejectRequest(r._id)}>
                          {isLoading === "rejecting" ? "…" : "Decline"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* SEARCH TAB */}
          {tab === "search" && (
            <>
              {loading && [0,1,2,3].map(i => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton" style={{width:52,height:52,borderRadius:"50%"}}/>
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>
                    <div className="skeleton" style={{height:14,width:"40%"}}/>
                    <div className="skeleton" style={{height:12,width:"60%"}}/>
                  </div>
                  <div className="skeleton" style={{height:34,width:80,borderRadius:10}}/>
                </div>
              ))}

              {!loading && (
                <>
                  <div className="sp-section-label">
                    {query.trim() ? `Results for "${query}"` : "Suggested people"}
                  </div>

                  {displayList.length === 0 && query.trim() && (
                    <div className="sp-no-results">No users found for "<strong>{query}</strong>"</div>
                  )}

                  {displayList.length === 0 && !query.trim() && (
                    <div className="sp-empty">
                      <div className="sp-empty-icon">
                        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="7" stroke="#ccc" strokeWidth="1.8"/>
                          <path d="M20 20l-3-3" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <h3>Search for people</h3>
                      <p>Type a name to find registered users</p>
                    </div>
                  )}

                  {displayList.map((u, i) => {
                    const status = statuses[u._id] || "none";
                    return (
                      <div key={u._id} className="sp-card" style={{ animationDelay: `${i * 40}ms` }}>
                        <div className="sp-avatar" style={{ background: avatarGradient(i) }}>
                          {getInitials(u.name)}
                        </div>
                        <div className="sp-info">
                          <div className="sp-name">{u.name}</div>
                          <div className="sp-sub">{u.email}</div>
                        </div>
                        <button
                          className={`sp-follow-btn ${status}`}
                          onClick={() => status === "none" && sendRequest(u._id)}
                          disabled={status !== "none"}
                        >
                          {status === "none"    && "Connect"}
                          {status === "pending" && "Requested ✓"}
                          {status === "friends" && "Connected ✓"}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}