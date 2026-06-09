import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import API from "../api/api";

const PALETTES = [
  ["#667eea","#764ba2"],["#f093fb","#f5576c"],["#4facfe","#00f2fe"],
  ["#43e97b","#38f9d7"],["#fa709a","#fee140"],["#a18cd1","#fbc2eb"],
];
const avatarGrad = (i) =>
  `linear-gradient(135deg, ${PALETTES[i%PALETTES.length][0]}, ${PALETTES[i%PALETTES.length][1]})`;
const getInitials = (name="") =>
  name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);
const formatTime = (d) => {
  if(!d) return "";
  const diff = Date.now()-new Date(d);
  if(diff<60000) return "now";
  if(diff<3600000) return `${Math.floor(diff/60000)}m`;
  if(diff<86400000) return `${Math.floor(diff/3600000)}h`;
  return new Date(d).toLocaleDateString();
};

export default function Messages() {
  const [conversations, setConversations] = useState([]);
  const [requests,      setRequests]      = useState([]);
  const [selectedConv,  setSelectedConv]  = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [search,        setSearch]        = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab,     setActiveTab]     = useState("chats");
  const [sending,       setSending]       = useState(false);
  const [reqLoading,    setReqLoading]    = useState({});
  const [statuses,      setStatuses]      = useState({});

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const searchTimer    = useRef(null);
  const socketRef      = useRef(null);
  const selectedRef    = useRef(null);
  const user           = JSON.parse(localStorage.getItem("user"));

  const fetchConversations = async () => {
    try { const r = await API.get("/messages"); setConversations(r.data||[]); }
    catch { setConversations([]); }
  };

  const fetchRequests = async () => {
    try { const r = await API.get("/messages/requests"); setRequests(r.data||[]); }
    catch { setRequests([]); }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if(!token) return;

    const socket = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("message:new", (msg) => {
      const activeId = selectedRef.current?._id;
      if(msg.conversationId !== activeId) return;

      setMessages((prev) => {
        if(msg.clientId){
          const matchedClientId = prev.some((m) => m.clientId === msg.clientId);
          const replaced = prev.map((m) => m.clientId === msg.clientId ? msg : m);
          if(replaced.some((m) => m._id === msg._id)) return replaced;
          if(matchedClientId) return replaced;
        }
        if(prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("conversation:updated", ({ conversationId, lastMessage }) => {
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c._id === conversationId ? { ...c, lastMessage } : c
        );
        return updated.sort((a,b) =>
          new Date(b.lastMessage?.createdAt || b.updatedAt || 0) -
          new Date(a.lastMessage?.createdAt || a.updatedAt || 0)
        );
      });
    });

    socket.on("conversation:accepted", (conv) => {
      setRequests((prev) => prev.filter((r) => r._id !== conv._id));
      setConversations((prev) => {
        if(prev.some((c) => c._id === conv._id)) return prev;
        return [conv, ...prev];
      });
    });

    socket.on("request:new", (conv) => {
      setRequests((prev) => {
        if(prev.some((r) => r._id === conv._id)) return prev;
        return [conv, ...prev];
      });
    });

    socket.on("request:rejected", ({ conversationId }) => {
      setRequests((prev) => prev.filter((r) => r._id !== conversationId));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchConversations(); fetchRequests(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  useEffect(() => { selectedRef.current = selectedConv; }, [selectedConv]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    if(!val.trim()){ setSearchResults([]); return; }
    searchTimer.current = setTimeout(()=>doSearch(val), 300);
  };

  const doSearch = async (q) => {
    try {
      const r = await API.get(`/users/search?q=${encodeURIComponent(q)}`);
      const users = r.data || [];
      setSearchResults(users);
      const map = {};
      users.forEach(u => {
        const isFriend  = conversations.some(c=>c.members?.some(m=>m._id===u._id));
        const isPending = requests.some(c=>c.members?.some(m=>m._id===u._id));
        map[u._id] = isFriend?"friends":isPending?"pending":statuses[u._id]||"none";
      });
      setStatuses(p=>({...p,...map}));
    } catch { setSearchResults([]); }
  };

  const sendRequest = async (id) => {
    setStatuses(p=>({...p,[id]:"pending"}));
    try { await API.post(`/messages/request/${id}`); }
    catch (err) { console.error("Message request failed:", err); }
  };

  const openChat = async (conv) => {
    setSelectedConv(conv);
    socketRef.current?.emit("conversation:join", conv._id);
    try { const r = await API.get(`/messages/${conv._id}`); setMessages(r.data||[]); }
    catch { setMessages([]); }
    setTimeout(()=>inputRef.current?.focus(),100);
  };

  const sendMessage = async () => {
    if(!text.trim()||!selectedConv||sending) return;
    setSending(true);
    const sent = text.trim();
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const opt = {
      _id: clientId,
      clientId,
      text: sent,
      sender: user._id,
      conversationId: selectedConv._id,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages(p=>[...p,opt]);
    setText("");

    const socket = socketRef.current;
    if(socket?.connected){
      socket.timeout(5000).emit(
        "message:send",
        {conversationId:selectedConv._id,text:sent,clientId},
        (err, response) => {
          if(err || !response?.ok){
            setMessages(p=>p.filter(m=>m.clientId!==clientId));
          } else if(response.message){
            setMessages(p=>{
              if(p.some(m=>m._id===response.message._id)) {
                return p.map(m=>m.clientId===clientId ? response.message : m);
              }
              return p.map(m=>m.clientId===clientId ? response.message : m);
            });
          }
          setSending(false);
        }
      );
      return;
    }

    try {
      const r = await API.post("/messages/send",{conversationId:selectedConv._id,text:sent});
      setMessages(p=>p.map(m=>m.clientId===clientId ? r.data : m));
    } catch {
      setMessages(p=>p.filter(m=>m.clientId!==clientId));
    } finally { setSending(false); }
  };

  const acceptRequest = async (convId) => {
    setReqLoading(p=>({...p,[convId]:"accepting"}));
    try {
      await API.put(`/messages/accept/${convId}`);
      setRequests(p=>p.filter(r=>r._id!==convId));
      fetchConversations();
    } catch (err) { console.error("Accept request failed:", err); }
    setReqLoading(p=>({...p,[convId]:null}));
  };

  const rejectRequest = async (convId) => {
    setReqLoading(p=>({...p,[convId]:"rejecting"}));
    try {
      await API.delete(`/messages/reject/${convId}`);
      setRequests(p=>p.filter(r=>r._id!==convId));
    } catch (err) { console.error("Reject request failed:", err); }
    setReqLoading(p=>({...p,[convId]:null}));
  };

  const getOther = (conv) => conv.members?.find(m=>m._id!==user?._id);
  const isOwn    = (m)    => m.sender===user?._id || m.sender?._id===user?._id;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

        .mr{display:flex;height:calc(100vh - 60px);font-family:'DM Sans',sans-serif;background:#fff;color:#111;overflow:hidden;}

        .ms{width:360px;min-width:360px;border-right:1px solid #efefef;display:flex;flex-direction:column;}
        .msh{padding:18px 16px 0;border-bottom:1px solid #efefef;}
        .msh-top{font-size:17px;font-weight:600;letter-spacing:-0.3px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;}
        .tab-row{display:flex;}
        .tab-btn{flex:1;background:none;border:none;border-bottom:2px solid transparent;padding:10px 0;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:#aaa;cursor:pointer;transition:all 0.18s;}
        .tab-btn.active{color:#111;border-bottom-color:#111;}
        .t-badge{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 3px;background:#e53935;color:#fff;font-size:10px;font-weight:700;border-radius:20px;margin-left:5px;vertical-align:middle;}

        .sw{padding:10px 14px;border-bottom:1px solid #efefef;}
        .sw-inner{display:flex;align-items:center;background:#f5f5f5;border-radius:11px;padding:8px 12px;gap:8px;}
        .sw-inner input{border:none;background:none;outline:none;font-family:'DM Sans',sans-serif;font-size:14px;flex:1;color:#111;}
        .sw-inner input::placeholder{color:#aaa;}

        .cl{flex:1;overflow-y:auto;padding:4px 0;}
        .cl::-webkit-scrollbar{width:0;}
        .ci{display:flex;align-items:center;gap:12px;padding:11px 16px;cursor:pointer;transition:background 0.15s;}
        .ci:hover{background:#fafafa;}
        .ci.active{background:#f0f0f0;}

        .av{width:50px;height:50px;min-width:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px;font-weight:700;flex-shrink:0;}
        .av.sm{width:40px;height:40px;min-width:40px;font-size:13px;}

        .cn{flex:1;min-width:0;}
        .cn-name{font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px;}
        .cn-pre{font-size:12px;color:#8e8e8e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ct{font-size:11px;color:#aaa;white-space:nowrap;}

        .ri{display:flex;align-items:center;gap:12px;padding:11px 16px;}
        .ri-info{flex:1;min-width:0;}
        .ri-name{font-size:14px;font-weight:500;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .ri-sub{font-size:12px;color:#aaa;}
        .ri-btns{display:flex;gap:6px;flex-shrink:0;}
        .acc-btn{background:#111;color:#fff;border:none;border-radius:8px;padding:7px 13px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s;}
        .acc-btn:hover{background:#333;}
        .acc-btn:disabled{opacity:0.5;cursor:default;}
        .rej-btn{background:#f5f5f5;color:#555;border:none;border-radius:8px;padding:7px 13px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;}
        .rej-btn:hover{background:#ffe5e5;color:#e53935;}
        .rej-btn:disabled{opacity:0.5;cursor:default;}

        .sri{display:flex;align-items:center;gap:12px;padding:10px 16px;}
        .sri-info{flex:1;min-width:0;}
        .sri-name{font-size:14px;font-weight:500;}
        .sri-sub{font-size:12px;color:#aaa;}
        .sr-btn{border:1.5px solid #dbdbdb;border-radius:8px;padding:6px 14px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;background:none;color:#111;transition:all 0.15s;white-space:nowrap;}
        .sr-btn:hover{background:#f5f5f5;}
        .sr-btn.pending{color:#0095f6;border-color:#0095f6;cursor:default;}
        .sr-btn.friends{color:#27ae60;border-color:#27ae60;cursor:default;}

        .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 16px;gap:8px;color:#aaa;}
        .empty p{font-size:13px;text-align:center;}
        .sec-label{font-size:11px;font-weight:600;color:#aaa;letter-spacing:0.5px;text-transform:uppercase;padding:10px 16px 4px;}
        hr.divider{border:none;border-top:1px solid #efefef;margin:4px 0;}

        .ca{flex:1;display:flex;flex-direction:column;}
        .chat-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#aaa;}
        .chat-empty-icon{width:80px;height:80px;border:2px solid #dbdbdb;border-radius:50%;display:flex;align-items:center;justify-content:center;}
        .chat-empty h3{font-size:20px;font-weight:300;color:#111;}
        .chat-empty p{font-size:14px;}

        .ch{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid #efefef;}
        .ch-name{font-size:15px;font-weight:600;}
        .ch-status{font-size:12px;color:#aaa;}
        .ch-actions{margin-left:auto;display:flex;gap:4px;}
        .icon-btn{background:none;border:none;cursor:pointer;padding:8px;border-radius:50%;color:#111;display:flex;align-items:center;transition:background 0.15s;}
        .icon-btn:hover{background:#f5f5f5;}

        .ma{flex:1;overflow-y:auto;padding:20px 18px 8px;display:flex;flex-direction:column;gap:4px;}
        .ma::-webkit-scrollbar{width:0;}

        .mrow{display:flex;align-items:flex-end;gap:8px;animation:fadeUp 0.2s ease;}
        .mrow.own{flex-direction:row-reverse;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

        .bubble{max-width:65%;padding:10px 14px;border-radius:22px;font-size:14px;line-height:1.45;word-break:break-word;}
        .bubble.other{background:#f0f0f0;color:#111;border-bottom-left-radius:4px;}
        .bubble.own{background:#111;color:#fff;border-bottom-right-radius:4px;}
        .bubble.opt{opacity:0.65;}

        .msg-time{font-size:10px;color:#aaa;padding:0 4px;margin-bottom:2px;}

        .iw{padding:12px 18px;border-top:1px solid #efefef;display:flex;align-items:center;gap:12px;}
        .ii{flex:1;display:flex;align-items:center;border:1.5px solid #dbdbdb;border-radius:24px;padding:10px 16px;gap:8px;transition:border-color 0.2s;}
        .ii:focus-within{border-color:#aaa;}
        .ii input{flex:1;border:none;outline:none;font-family:'DM Sans',sans-serif;font-size:14px;background:transparent;color:#111;}
        .ii input::placeholder{color:#aaa;}
        .send-btn{background:none;border:none;cursor:pointer;color:#0095f6;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;padding:4px 8px;border-radius:8px;transition:opacity 0.15s;}
        .send-btn:disabled{opacity:0.35;cursor:default;}
        .send-btn:not(:disabled):hover{opacity:0.7;}
      `}</style>

      <div className="mr">
        {/* SIDEBAR */}
        <div className="ms">
          <div className="msh">
            <div className="msh-top"><span>{user?.name || "Messages"}</span></div>
            <div className="tab-row">
              <button className={`tab-btn ${activeTab==="chats"?"active":""}`} onClick={()=>setActiveTab("chats")}>Chats</button>
              <button className={`tab-btn ${activeTab==="requests"?"active":""}`} onClick={()=>{setActiveTab("requests");fetchRequests();}}>
                Requests{requests.length>0&&<span className="t-badge">{requests.length}</span>}
              </button>
            </div>
          </div>

          {activeTab==="chats" && (
            <div className="sw">
              <div className="sw-inner">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" style={{color:"#aaa",minWidth:15}}>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                  <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input value={search} onChange={handleSearchChange} placeholder="Search people…"/>
              </div>
            </div>
          )}

          <div className="cl">
            {/* Search results */}
            {activeTab==="chats" && searchResults.length>0 && (
              <>
                <div className="sec-label">People</div>
                {searchResults.map((u,i)=>{
                  const st = statuses[u._id]||"none";
                  return (
                    <div key={u._id} className="sri">
                      <div className="av sm" style={{background:avatarGrad(i)}}>{getInitials(u.name)}</div>
                      <div className="sri-info">
                        <div className="sri-name">{u.name}</div>
                        <div className="sri-sub">{u.email}</div>
                      </div>
                      <button className={`sr-btn ${st}`} onClick={()=>st==="none"&&sendRequest(u._id)} disabled={st!=="none"}>
                        {st==="none"?"Message":st==="pending"?"Requested ✓":"Connected ✓"}
                      </button>
                    </div>
                  );
                })}
                <hr className="divider"/>
                <div className="sec-label">Chats</div>
              </>
            )}

            {/* Chats list */}
            {activeTab==="chats" && conversations.length===0 && !searchResults.length && (
              <div className="empty">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#ccc" strokeWidth="1.5"/>
                </svg>
                <p>No chats yet. Search for people to connect.</p>
              </div>
            )}

            {activeTab==="chats" && conversations.map((c,i)=>{
              const other = getOther(c);
              return (
                <div key={c._id} className={`ci ${selectedConv?._id===c._id?"active":""}`} onClick={()=>openChat(c)}>
                  <div className="av" style={{background:avatarGrad(i)}}>{getInitials(other?.name)}</div>
                  <div className="cn">
                    <div className="cn-name">{other?.name||"Unknown"}</div>
                    <div className="cn-pre">{c.lastMessage?.text||"Tap to chat"}</div>
                  </div>
                  <div className="ct">{formatTime(c.lastMessage?.createdAt||c.updatedAt)}</div>
                </div>
              );
            })}

            {/* Requests list */}
            {activeTab==="requests" && requests.length===0 && (
              <div className="empty">
                <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <p>No pending requests</p>
              </div>
            )}

            {activeTab==="requests" && requests.map((r,i)=>{
              const other = getOther(r);
              const loading = reqLoading[r._id];
              return (
                <div key={r._id} className="ri">
                  <div className="av" style={{background:avatarGrad(i)}}>{getInitials(other?.name)}</div>
                  <div className="ri-info">
                    <div className="ri-name">{other?.name}</div>
                    <div className="ri-sub">Wants to connect</div>
                  </div>
                  <div className="ri-btns">
                    <button className="acc-btn" disabled={!!loading} onClick={()=>acceptRequest(r._id)}>
                      {loading==="accepting"?"…":"Accept"}
                    </button>
                    <button className="rej-btn" disabled={!!loading} onClick={()=>rejectRequest(r._id)}>
                      {loading==="rejecting"?"…":"Decline"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="ca">
          {!selectedConv ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#111" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3>Your Messages</h3>
              <p>Search for people and start a conversation</p>
            </div>
          ) : (
            <>
              <div className="ch">
                <div className="av sm" style={{background:avatarGrad(conversations.findIndex(c=>c._id===selectedConv._id))}}>
                  {getInitials(getOther(selectedConv)?.name)}
                </div>
                <div>
                  <div className="ch-name">{getOther(selectedConv)?.name}</div>
                  <div className="ch-status">Active now</div>
                </div>
                <div className="ch-actions">
                  <button className="icon-btn">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 4.18 2 2 0 015.08 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <button className="icon-btn">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="ma">
                {messages.length===0 && <div style={{textAlign:"center",color:"#aaa",fontSize:13,marginTop:20}}>Say hi 👋</div>}
                {messages.map((m,i)=>{
                  const own = isOwn(m);
                  const showTime = i===messages.length-1||new Date(messages[i+1]?.createdAt)-new Date(m.createdAt)>300000;
                  return (
                    <div key={m._id||i}>
                      <div className={`mrow ${own?"own":""}`}>
                        {!own&&(
                          <div className="av sm" style={{background:avatarGrad(conversations.findIndex(c=>c._id===selectedConv._id))}}>
                            {getInitials(getOther(selectedConv)?.name)}
                          </div>
                        )}
                        <div className={`bubble ${own?"own":"other"} ${m.optimistic?"opt":""}`}>{m.text}</div>
                      </div>
                      {showTime&&<div className="msg-time" style={{textAlign:own?"right":"left"}}>{formatTime(m.createdAt)}</div>}
                    </div>
                  );
                })}
                <div ref={messagesEndRef}/>
              </div>

              <div className="iw">
                <div className="ii">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={e=>setText(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&sendMessage()}
                    placeholder="Message…"
                  />
                  <button className="send-btn" onClick={sendMessage} disabled={!text.trim()||sending}>Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
