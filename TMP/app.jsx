/* App shell — Table view, Boards view, Tweaks panel, main App */

const ALL_IMAGES_LIST = window.__PINDECK_DATA.IMAGES;

/* ───────────────── TABLE VIEW ───────────────── */
const TableView = ({ images, onOpen, tweaks }) => {
  const [sort, setSort] = React.useState({ by:"title", dir:"asc" });
  const sorted = [...images].sort((a,b)=>{
    const dir = sort.dir==="asc"?1:-1;
    if (a[sort.by] < b[sort.by]) return -1*dir;
    if (a[sort.by] > b[sort.by]) return 1*dir;
    return 0;
  });

  const headerCell = (label, key, w) => (
    <th style={{
      padding:"7px 8px", textAlign:"left", fontSize:10,
      letterSpacing:"0.06em", textTransform:"uppercase",
      color: sort.by===key?"var(--ink)":"var(--ink-faint)",
      fontWeight:600, fontFamily:"var(--font-mono)", borderBottom:"1px solid var(--line-strong)",
      background:"var(--bg-1)", position:"sticky", top:0, cursor:"pointer", width:w
    }} onClick={()=>setSort({by:key, dir: sort.by===key && sort.dir==="asc"?"desc":"asc"})}>
      <span style={{display:"inline-flex", alignItems:"center", gap:4}}>
        {label}
        {sort.by===key && <Icon name={sort.dir==="asc"?"chevron-down":"chevron-down"} size={9} className=""/>}
      </span>
    </th>
  );

  return (
    <div className="scroll fade-in" style={{flex:1, overflow:"auto", padding:0, background:"var(--bg)"}}>
      <table style={{width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:11.5}}>
        <thead>
          <tr>
            {headerCell("", "id", 52)}
            {headerCell("Title", "title")}
            {headerCell("Type", "group", 110)}
            {headerCell("Genre", "genre", 90)}
            {headerCell("Shot", "shot", 100)}
            {headerCell("Style", "style", 110)}
            {headerCell("Tags", "tags")}
            {headerCell("Palette", "palette", 90)}
            {headerCell("Sref", "sref", 110)}
            {headerCell("♥", "likes", 54)}
            {headerCell("👁", "views", 68)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((im,i) => (
            <tr key={im.id} onClick={()=>onOpen(im)} style={{cursor:"pointer", background: i%2?"transparent":"rgba(255,255,255,0.012)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(58,123,255,0.06)"}
              onMouseLeave={e=>e.currentTarget.style.background = i%2?"transparent":"rgba(255,255,255,0.012)"}>
              <td style={{padding:"4px 8px", borderBottom:"1px solid var(--line)"}}>
                <div style={{width:36, height:24, background:"#000", borderRadius:2, overflow:"hidden"}}>
                  <img src={im.src} style={{width:"100%", height:"100%", objectFit:"cover"}}/>
                </div>
              </td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink)", fontWeight:500}}>
                <span style={{display:"inline-flex", alignItems:"center", gap:6}}>
                  {im.parent && <Icon name="sparkle" size={10} className="" stroke={2}/>}
                  {im.title}
                </span>
              </td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-dim)"}}>{im.group}</td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-dim)"}}>{im.genre}</td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-dim)"}} className="mono">{im.shot}</td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-dim)"}} className="mono">{im.style}</td>
              <td style={{padding:"4px 8px", borderBottom:"1px solid var(--line)"}}>
                <span style={{display:"inline-flex", gap:3, flexWrap:"wrap"}}>
                  {im.tags.slice(0,3).map((t,ti)=>(
                    <Chip key={t} color={im.palette[ti % im.palette.length]}>{t}</Chip>
                  ))}
                  {im.tags.length > 3 && <span className="mono" style={{fontSize:10, color:"var(--ink-faint)"}}>+{im.tags.length-3}</span>}
                </span>
              </td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)"}}>
                <Swatches colors={im.palette} size={10}/>
              </td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-mute)"}} className="mono">{im.sref}</td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-dim)"}} className="mono">{im.likes}</td>
              <td style={{padding:"6px 8px", borderBottom:"1px solid var(--line)", color:"var(--ink-dim)"}} className="mono">{im.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ───────────────── BOARDS VIEW ───────────────── */
const BOARDS = [
  { id:"b1", name:"Astral — Spec", visibility:"private", count:4, updated:"2h", cover: ["im_01","im_07","im_18","im_06"] },
  { id:"b2", name:"Hollow Valley", visibility:"private", count:3, updated:"1d", cover: ["im_02","im_12","im_04","im_08"] },
  { id:"b3", name:"Sled — MV treat", visibility:"public",  count:2, updated:"3d", cover: ["im_05","im_11","im_01","im_18"] },
  { id:"b4", name:"Crimson noir ref", visibility:"private", count:2, updated:"1w", cover: ["im_03","im_09","im_13","im_14"] },
  { id:"b5", name:"Editorial — No.12", visibility:"public",  count:2, updated:"2w", cover: ["im_10","im_16","im_11","im_15"] },
  { id:"b6", name:"Atmosphere scouts", visibility:"private", count:5, updated:"1mo", cover: ["im_06","im_15","im_18","im_05"] },
];

const BoardsView = ({ onOpen, tweaks }) => {
  return (
    <div className="scroll fade-in" style={{flex:1, overflow:"auto", padding:16}}>
      <div style={{display:"flex", alignItems:"baseline", gap:10, marginBottom:14}}>
        <div style={{fontSize:18, fontWeight:600, letterSpacing:"-0.02em"}}>Boards</div>
        <div className="mono" style={{fontSize:11, color:"var(--ink-faint)"}}>{BOARDS.length} collections · {BOARDS.reduce((a,b)=>a+b.count,0)} pins</div>
        <div style={{flex:1}}/>
        <Btn variant="outline" icon="plus">New board</Btn>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:10}}>
        {BOARDS.map(b => {
          const imgs = b.cover.map(id => ALL_IMAGES_LIST.find(i=>i.id===id)).filter(Boolean);
          return (
            <div key={b.id} className="card-lift" style={{
              background:"var(--panel)", border:"1px solid var(--line)",
              borderRadius:4, overflow:"hidden", cursor:"pointer"
            }}>
              {/* Cover mosaic */}
              <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gridTemplateRows:"1fr 1fr", gap:1, aspectRatio:"16/10", background:"#000"}}>
                <div style={{gridRow:"span 2", overflow:"hidden"}}>
                  {imgs[0] && <img src={imgs[0].src} style={{width:"100%", height:"100%", objectFit:"cover"}}/>}
                </div>
                {imgs.slice(1,3).map((im,i)=>(
                  <div key={i} style={{overflow:"hidden"}}>
                    {im && <img src={im.src} style={{width:"100%", height:"100%", objectFit:"cover"}}/>}
                  </div>
                ))}
              </div>
              <div style={{padding:"9px 10px 10px"}}>
                <div style={{display:"flex", alignItems:"center", gap:6}}>
                  <div style={{fontSize:12.5, fontWeight:600, color:"var(--ink)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {b.name}
                  </div>
                  <Chip mono variant="outline">{b.visibility}</Chip>
                </div>
                <div style={{display:"flex", gap:10, marginTop:6, fontSize:10.5, color:"var(--ink-faint)"}} className="mono">
                  <span>{b.count} pins</span>
                  <span>·</span>
                  <span>updated {b.updated}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───────────────── TWEAKS PANEL ───────────────── */
const TweaksPanel = ({ tweaks, setTweaks, onClose }) => {
  const set = (k,v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    // persist
    window.parent && window.parent.postMessage({type:"__edit_mode_set_keys", edits: {[k]: v}}, "*");
  };

  const ACCENTS = [
    { id:"#3a7bff", name:"Indigo" },
    { id:"#5b8def", name:"Cobalt" },
    { id:"#22b8cf", name:"Cyan" },
    { id:"#f5a524", name:"Amber" },
    { id:"#ef4343", name:"Red" },
    { id:"#d946ef", name:"Magenta" },
    { id:"#2ee6a6", name:"Mint" },
    { id:"#a855f7", name:"Violet" },
  ];
  const FONTS = [
    { id:"geist", label:"Geist × Geist Mono", css:"'Geist', sans-serif", mono:"'Geist Mono', monospace" },
    { id:"inter", label:"Inter × JetBrains", css:"'Inter', sans-serif", mono:"'JetBrains Mono', monospace" },
    { id:"archivo", label:"Archivo × DM Mono", css:"'Archivo', sans-serif", mono:"'DM Mono', monospace" },
    { id:"space", label:"Space Grotesk × Mono", css:"'Space Grotesk', sans-serif", mono:"'JetBrains Mono', monospace" },
  ];

  React.useEffect(()=>{
    // apply accent
    document.documentElement.style.setProperty("--accent", tweaks.accent);
    const soft = tweaks.accent + "24";
    document.documentElement.style.setProperty("--accent-soft", soft);
    // font
    const f = FONTS.find(x=>x.id===tweaks.typography);
    if (f) {
      document.documentElement.style.setProperty("--font-sans", f.css);
      document.documentElement.style.setProperty("--font-mono", f.mono);
    }
  }, [tweaks.accent, tweaks.typography]);

  const row = (label, children) => (
    <div style={{padding:"10px 12px", borderBottom:"1px solid var(--line)"}}>
      <Label>{label}</Label>
      {children}
    </div>
  );

  return (
    <div style={{
      position:"absolute", top:52, right:12,
      width:280, background:"var(--panel-2)",
      border:"1px solid var(--line-strong)", borderRadius:6,
      boxShadow:"var(--shadow-deep)", zIndex:50, overflow:"hidden"
    }}>
      <div style={{padding:"10px 12px", borderBottom:"1px solid var(--line-strong)", display:"flex", alignItems:"center", gap:6}}>
        <Icon name="bolt-fill" size={12}/>
        <div style={{fontSize:12, fontWeight:600}}>Tweaks</div>
        <div style={{flex:1}}/>
        <button onClick={onClose} style={{width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ink-mute)"}}>
          <Icon name="close" size={11}/>
        </button>
      </div>

      {row("Accent",
        <div style={{display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:4}}>
          {ACCENTS.map(a=>(
            <button key={a.id} onClick={()=>set("accent", a.id)} title={a.name}
              style={{
                aspectRatio:1, background:a.id, borderRadius:3, border:"1.5px solid",
                borderColor: tweaks.accent===a.id ? "var(--ink)" : "transparent",
                boxShadow: tweaks.accent===a.id?`0 0 0 2px rgba(0,0,0,0.8) inset`:"none"
              }}/>
          ))}
        </div>
      )}

      {row("Density",
        <div style={{display:"flex", gap:4}}>
          {["dense","cozy","comfortable"].map(d=>(
            <button key={d} onClick={()=>set("density",d)}
              style={{
                flex:1, padding:"5px 0", borderRadius:3, fontSize:11,
                border:"1px solid", borderColor:tweaks.density===d?"var(--accent)":"var(--line-strong)",
                background:tweaks.density===d?"var(--accent-soft)":"transparent",
                color:tweaks.density===d?"var(--accent-ink)":"var(--ink-dim)"
              }}>{d}</button>
          ))}
        </div>
      )}

      {row("Card style",
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:4}}>
          {[
            { id:"bordered", label:"Bordered" },
            { id:"bare", label:"Bare" },
            { id:"glass", label:"Glass" },
            { id:"filmstrip", label:"Filmstrip" },
          ].map(c=>(
            <button key={c.id} onClick={()=>set("cardStyle",c.id)}
              style={{
                padding:"6px 0", borderRadius:3, fontSize:11,
                border:"1px solid", borderColor:tweaks.cardStyle===c.id?"var(--accent)":"var(--line-strong)",
                background:tweaks.cardStyle===c.id?"var(--accent-soft)":"transparent",
                color:tweaks.cardStyle===c.id?"var(--accent-ink)":"var(--ink-dim)"
              }}>{c.label}</button>
          ))}
        </div>
      )}

      {row("Typography",
        <div style={{display:"flex", flexDirection:"column", gap:3}}>
          {FONTS.map(f=>(
            <button key={f.id} onClick={()=>set("typography",f.id)}
              style={{
                padding:"6px 8px", borderRadius:3, fontSize:11, textAlign:"left",
                border:"1px solid", borderColor:tweaks.typography===f.id?"var(--accent)":"var(--line-strong)",
                background:tweaks.typography===f.id?"var(--accent-soft)":"transparent",
                color:tweaks.typography===f.id?"var(--accent-ink)":"var(--ink-dim)",
                fontFamily: f.css
              }}>{f.label}</button>
          ))}
        </div>
      )}

      {row("Hover",
        <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:4}}>
          {["lift","tilt","zoom","flip"].map(h=>(
            <button key={h} onClick={()=>set("hover",h)}
              style={{
                padding:"5px 0", borderRadius:3, fontSize:11,
                border:"1px solid", borderColor:tweaks.hover===h?"var(--accent)":"var(--line-strong)",
                background:tweaks.hover===h?"var(--accent-soft)":"transparent",
                color:tweaks.hover===h?"var(--accent-ink)":"var(--ink-dim)"
              }}>{h}</button>
          ))}
        </div>
      )}

      {row("Cinema",
        <div style={{display:"flex", flexDirection:"column", gap:6}}>
          <label style={{display:"flex", alignItems:"center", gap:7, fontSize:11.5, color:"var(--ink-dim)"}}>
            <input type="checkbox" checked={tweaks.letterbox} onChange={e=>set("letterbox",e.target.checked)}/>
            Letterbox cards
          </label>
          <label style={{display:"flex", alignItems:"center", gap:7, fontSize:11.5, color:"var(--ink-dim)"}}>
            <input type="checkbox" checked={tweaks.grain} onChange={e=>set("grain",e.target.checked)}/>
            Film grain
          </label>
        </div>
      )}
    </div>
  );
};

/* ───────────────── MAIN APP ───────────────── */
const App = () => {
  const [tweaks, setTweaks] = React.useState(() => {
    try {
      const saved = localStorage.getItem("pindeck_tweaks");
      return saved ? {...window.__TWEAKS_DEFAULT, ...JSON.parse(saved)} : window.__TWEAKS_DEFAULT;
    } catch { return window.__TWEAKS_DEFAULT; }
  });
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [view, setView] = React.useState(() => localStorage.getItem("pindeck_view") || "gallery");
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({ group:null, genre:null, style:null, originalsOnly:false, hasSref:false });
  const [selected, setSelected] = React.useState(null);
  const [activeDeck, setActiveDeck] = React.useState(null); // when non-null, shows composer

  React.useEffect(()=>{ localStorage.setItem("pindeck_tweaks", JSON.stringify(tweaks)); }, [tweaks]);
  React.useEffect(()=>{ localStorage.setItem("pindeck_view", view); }, [view]);
  // When leaving the Decks section, clear the active deck so next re-entry starts at the library.
  React.useEffect(()=>{ if (view !== "deck") setActiveDeck(null); }, [view]);

  // Edit-mode wire-up for toolbar toggle
  React.useEffect(()=>{
    const handler = (e) => {
      const d = e.data;
      if (!d) return;
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent && window.parent.postMessage({type:"__edit_mode_available"}, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const filtered = React.useMemo(()=>{
    return ALL_IMAGES_LIST.filter(im => {
      if (filters.group && im.group !== filters.group) return false;
      if (filters.genre && im.genre !== filters.genre) return false;
      if (filters.style && im.style !== filters.style) return false;
      if (filters.originalsOnly && im.parent) return false;
      if (filters.hasSref && !im.sref) return false;
      if (search) {
        const q = search.toLowerCase();
        return im.title.toLowerCase().includes(q) ||
               im.tags.some(t=>t.toLowerCase().includes(q)) ||
               im.sref.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filters, search]);

  // Keyboard shortcuts
  React.useEffect(()=>{
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "Escape") { setSelected(null); setTweaksOpen(false); }
      if (e.key === "g") setView("gallery");
      if (e.key === "t") setView("table");
      if (e.key === "b") setView("boards");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={tweaks.grain?"grain":""} style={{height:"100vh", display:"flex", background:"var(--bg)", position:"relative"}}>
      <Sidebar activeView={view} onView={setView} tweaks={tweaks} filters={filters} setFilters={setFilters}/>

      <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0, position:"relative"}}>
        <Topbar
          search={search} setSearch={setSearch}
          view={view} setView={setView}
          tweaksOn={tweaksOpen} onToggleTweaks={()=>setTweaksOpen(!tweaksOpen)}
        />

        <div style={{flex:1, display:"flex", minHeight:0, position:"relative"}}>
          <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>
            {view === "gallery" && <Gallery images={filtered} onOpen={setSelected} tweaks={tweaks}/>}
            {view === "table" && <TableView images={filtered} onOpen={setSelected} tweaks={tweaks}/>}
            {view === "boards" && <BoardsView onOpen={setSelected} tweaks={tweaks}/>}
            {view === "deck" && !activeDeck && <DecksGallery onOpen={setActiveDeck} tweaks={tweaks}/>}
            {view === "deck" && activeDeck && <DeckComposerView tweaks={tweaks} deckMeta={activeDeck} onBack={()=>setActiveDeck(null)}/>}
            {view === "upload" && <Placeholder label="Upload — drag-and-drop pane + AI analysis queue."/>}
          </div>

          {selected && (
            <DetailDrawer
              img={selected}
              allImages={ALL_IMAGES_LIST}
              onClose={()=>setSelected(null)}
              onOpen={setSelected}
              tweaks={tweaks}
            />
          )}
        </div>

        {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} onClose={()=>setTweaksOpen(false)}/>}
      </div>

      {/* Status bar */}
      <div style={{
        position:"fixed", bottom:0, left:208, right:0, height:22,
        background:"var(--bg-1)", borderTop:"1px solid var(--line)",
        display:"flex", alignItems:"center", padding:"0 10px", gap:10,
        fontSize:10, color:"var(--ink-faint)", zIndex:5
      }} className="mono">
        <span><span style={{color:"var(--green)"}}>●</span> qwen3-vl-8b</span>
        <span>·</span>
        <span>fal.ai nano-banana-pro</span>
        <span>·</span>
        <span>{filtered.length}/{ALL_IMAGES_LIST.length} images</span>
        <div style={{flex:1}}/>
        <span>accent {tweaks.accent}</span>
        <span>·</span>
        <span>{tweaks.density}</span>
        <span>·</span>
        <span>{tweaks.cardStyle}</span>
      </div>
    </div>
  );
};

const Placeholder = ({ label }) => (
  <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--ink-faint)", fontSize:12}}>
    <div style={{textAlign:"center"}}>
      <Icon name="film" size={28} stroke={1.2}/>
      <div style={{marginTop:10}}>{label}</div>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
