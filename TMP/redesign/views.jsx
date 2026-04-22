/* Main views: Sidebar, Topbar, Gallery, Detail drawer, Table, Boards, Tweaks */

const V_IMAGES = window.__PINDECK_DATA.IMAGES;
const V_GROUPS = window.__PINDECK_DATA.GROUPS;
const V_GENRES = window.__PINDECK_DATA.GENRES;
const V_STYLES = window.__PINDECK_DATA.STYLES;
const V_SHOTS = window.__PINDECK_DATA.SHOTS;

/* ───────────────── SIDEBAR ───────────────── */
const Sidebar = ({ activeView, onView, tweaks, filters, setFilters }) => {
  const navItems = [
    { id:"gallery", label:"Gallery", icon:"masonry", hk:"G" },
    { id:"table", label:"Table", icon:"table", hk:"T" },
    { id:"boards", label:"Boards", icon:"board", hk:"B" },
    { id:"deck", label:"Decks", icon:"deck", hk:"D" },
    { id:"upload", label:"Upload", icon:"upload", hk:"U" },
  ];

  const counts = React.useMemo(() => {
    const byGroup = {};
    IMAGES.forEach(i => byGroup[i.group] = (byGroup[i.group]||0)+1);
    return byGroup;
  }, []);

  return (
    <aside style={{
      width:208, flexShrink:0, background:"var(--bg-1)",
      borderRight:"1px solid var(--line)", display:"flex", flexDirection:"column",
      height:"100%", position:"relative", overflow:"hidden"
    }}>
      {/* Brand */}
      <div style={{padding:"14px 14px 10px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", gap:8}}>
        <div style={{
          width:22, height:22, borderRadius:4, background:"#000",
          border:"1px solid var(--line-hi)", display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:800, fontStyle:"italic", letterSpacing:"-0.06em"
        }}>P/</div>
        <div style={{fontSize:14, fontWeight:700, letterSpacing:"-0.03em", fontStyle:"italic"}}>
          <span style={{color:"var(--ink)"}}>PIN</span>
          <span style={{color:"var(--accent)"}}>DECK</span>
        </div>
      </div>

      {/* Nav */}
      <div style={{padding:"10px 8px 6px", display:"flex", flexDirection:"column", gap:1}}>
        {navItems.map(n => (
          <button key={n.id} onClick={()=>onView(n.id)}
            style={{
              display:"flex", alignItems:"center", gap:9, padding:"6px 8px",
              borderRadius:4, color: activeView===n.id ? "var(--ink)" : "var(--ink-dim)",
              background: activeView===n.id ? "rgba(255,255,255,0.05)" : "transparent",
              fontSize:12, fontWeight:500, textAlign:"left", transition:"background 120ms"
            }}>
            <Icon name={n.icon} size={13} stroke={activeView===n.id?1.8:1.5} />
            <span style={{flex:1}}>{n.label}</span>
            <Hotkey k={n.hk} />
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="scroll" style={{flex:1, overflow:"auto", padding:"8px 12px 14px"}}>
        <div style={{padding:"8px 4px 4px"}}>
          <Label>Type</Label>
          <div style={{display:"flex", flexDirection:"column", gap:2}}>
            {V_GROUPS.map(g => (
              <button key={g} onClick={() => setFilters({...filters, group: filters.group===g?null:g})}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"4px 6px", borderRadius:3, fontSize:11.5, textAlign:"left",
                  color: filters.group===g ? "var(--ink)" : "var(--ink-dim)",
                  background: filters.group===g ? "rgba(255,255,255,0.05)" : "transparent"
                }}>
                <span style={{display:"flex", alignItems:"center", gap:6}}>
                  {filters.group===g && <span style={{width:3, height:10, background:"var(--accent)", borderRadius:1}}/>}
                  {g}
                </span>
                <span className="mono" style={{fontSize:10, color:"var(--ink-faint)"}}>{counts[g]||0}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{padding:"12px 4px 4px"}}>
          <Label>Genre</Label>
          <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
            {V_GENRES.map(g => (
              <Chip key={g}
                variant={filters.genre===g?"solid":"outline"}
                onClick={()=>setFilters({...filters, genre: filters.genre===g?null:g})}
                className={filters.genre===g?"":"chip"}>
                {g}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{padding:"12px 4px 4px"}}>
          <Label>Style / Medium</Label>
          <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
            {V_STYLES.map(s => (
              <Chip key={s}
                variant={filters.style===s?"solid":"outline"}
                onClick={()=>setFilters({...filters, style: filters.style===s?null:s})}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{padding:"12px 4px 4px"}}>
          <Label>Filters</Label>
          <label style={{display:"flex", alignItems:"center", gap:7, padding:"3px 0", fontSize:11.5, color:"var(--ink-dim)", cursor:"pointer"}}>
            <input type="checkbox" checked={filters.originalsOnly} onChange={e=>setFilters({...filters, originalsOnly:e.target.checked})} />
            Originals only
          </label>
          <label style={{display:"flex", alignItems:"center", gap:7, padding:"3px 0", fontSize:11.5, color:"var(--ink-dim)", cursor:"pointer"}}>
            <input type="checkbox" checked={filters.hasSref} onChange={e=>setFilters({...filters, hasSref:e.target.checked})} />
            Has sref
          </label>
        </div>
      </div>

      {/* Footer */}
      <div style={{borderTop:"1px solid var(--line)", padding:"8px 12px", display:"flex", alignItems:"center", gap:8, fontSize:10.5}}>
        <span style={{width:6, height:6, borderRadius:"50%", background:"var(--green)", boxShadow:"0 0 8px var(--green)"}}/>
        <span className="mono" style={{color:"var(--ink-mute)"}}>convex · live</span>
        <div style={{flex:1}}/>
        <Icon name="discord" size={12} className="" />
      </div>
    </aside>
  );
};

/* ───────────────── TOPBAR ───────────────── */
const Topbar = ({ search, setSearch, view, setView, tweaksOn, onToggleTweaks }) => {
  return (
    <header style={{
      height:44, flexShrink:0,
      borderBottom:"1px solid var(--line)",
      background:"var(--bg-1)",
      display:"flex", alignItems:"center", gap:8,
      padding:"0 12px", position:"relative", zIndex:10
    }}>
      {/* Search */}
      <div style={{
        display:"flex", alignItems:"center", gap:6,
        background:"var(--bg-2)", border:"1px solid var(--line)",
        borderRadius:5, padding:"5px 8px", width:320, maxWidth:"38vw"
      }}>
        <Icon name="search" size={12} className="" />
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search titles, tags, srefs…"
          style={{flex:1, border:0, outline:0, background:"transparent", fontSize:12, color:"var(--ink)"}}
        />
        <Hotkey k="⌘K" />
      </div>

      {/* Breadcrumb */}
      <div style={{display:"flex", alignItems:"center", gap:6, fontSize:11.5, color:"var(--ink-mute)", marginLeft:8}}>
        <span className="mono">{view}</span>
        <span style={{color:"var(--ink-faint)"}}>/</span>
        <span>{IMAGES.length} images</span>
        <span style={{color:"var(--ink-faint)"}}>·</span>
        <span>4 active projects</span>
      </div>

      <div style={{flex:1}}/>

      {/* View toggles & actions */}
      <div style={{display:"flex", alignItems:"center", gap:2, border:"1px solid var(--line)", borderRadius:5, padding:1}}>
        {[
          { id:"gallery", icon:"masonry", label:"Gallery" },
          { id:"table", icon:"table", label:"Table" },
          { id:"boards", icon:"board", label:"Boards" },
        ].map(v => (
          <button key={v.id} onClick={()=>setView(v.id)} title={v.label}
            style={{
              display:"flex", alignItems:"center", gap:5, padding:"4px 8px",
              borderRadius:4, fontSize:11, fontWeight:500,
              color: view===v.id ? "var(--ink)" : "var(--ink-dim)",
              background: view===v.id ? "rgba(255,255,255,0.06)" : "transparent"
            }}>
            <Icon name={v.icon} size={12} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      <Btn variant="ghost" icon="filter">Filters</Btn>
      <Btn variant="ghost" icon="sort">Sort</Btn>

      <div style={{width:1, height:20, background:"var(--line)"}}/>

      <Btn variant="accent" icon="sparkle">Generate</Btn>
      <Btn variant="outline" icon="upload">Upload</Btn>

      <button onClick={onToggleTweaks} title="Tweaks" style={{
        width:28, height:28, display:"flex", alignItems:"center", justifyContent:"center",
        borderRadius:4, border:"1px solid var(--line)",
        background: tweaksOn ? "var(--accent-soft)" : "transparent",
        color: tweaksOn ? "var(--accent-ink)" : "var(--ink-dim)"
      }}>
        <Icon name="bolt" size={13} />
      </button>
    </header>
  );
};

/* ───────────────── GALLERY (masonry) ───────────────── */
const GalleryCard = ({ img, onOpen, tweaks, index }) => {
  const hoverClass = {
    lift: "card-lift",
    tilt: "card-tilt",
    zoom: "card-zoom",
    flip: "card-flip",
  }[tweaks.hover] || "card-lift";

  const cardStyle = {
    bordered: { background:"var(--panel)", border:"1px solid var(--line)", borderRadius:4 },
    bare:     { background:"transparent", border:"0", borderRadius:2 },
    glass:    { background:"rgba(255,255,255,0.02)", border:"1px solid var(--line-strong)", borderRadius:6, backdropFilter:"blur(8px)" },
    filmstrip:{ background:"#000", border:"1px solid var(--line-strong)", borderRadius:2, padding:"8px 0", position:"relative" },
  }[tweaks.cardStyle] || { background:"var(--panel)", border:"1px solid var(--line)", borderRadius:4 };

  const ratio = img.ratio;
  const isAi = !!img.parent;

  return (
    <div
      onClick={()=>onOpen(img)}
      className={`${hoverClass} letterbox fade-in`}
      style={{...cardStyle, cursor:"pointer", overflow:"hidden", breakInside:"avoid",
              marginBottom: tweaks.density==="dense"?6:10,
              "--lb": tweaks.letterbox ? "12px" : "0px",
              animationDelay: `${index*18}ms`}}>
      {tweaks.cardStyle === "filmstrip" && (
        <div style={{display:"flex", justifyContent:"space-between", padding:"0 10px 6px", fontSize:9}} className="mono">
          <span style={{color:"var(--ink-mute)"}}>◯ {String(index+1).padStart(3,"0")}</span>
          <span style={{color:"var(--ink-faint)"}}>{img.sref}</span>
        </div>
      )}
      <div className="flip-inner" style={{position:"relative", aspectRatio: ratio, background:"#000", overflow:"hidden"}}>
        <img src={img.src} loading="lazy" alt={img.title}
             style={{width:"100%", height:"100%", objectFit:"cover", display:"block"}}/>

        {/* Top corner badges */}
        <div style={{position:"absolute", top:6, left:6, display:"flex", gap:4}}>
          {isAi && (
            <span style={{
              display:"inline-flex", alignItems:"center", gap:3,
              padding:"2px 5px", borderRadius:2, fontSize:9, fontWeight:600,
              background:"rgba(0,0,0,0.7)", color:"var(--accent-ink)",
              border:"1px solid rgba(58,123,255,0.35)", letterSpacing:"0.04em"
            }} className="mono">
              <Icon name="sparkle" size={8} stroke={2.2}/> VAR
            </span>
          )}
        </div>

        {/* Top-right: aspect + shot */}
        <div style={{position:"absolute", top:6, right:6, display:"flex", gap:4}}>
          <span className="mono" style={{
            padding:"2px 5px", fontSize:9, fontWeight:600,
            background:"rgba(0,0,0,0.7)", color:"var(--ink-dim)",
            border:"1px solid rgba(255,255,255,0.12)", borderRadius:2, letterSpacing:"0.04em"
          }}>{ratio > 1 ? "16:9" : "9:16"}</span>
        </div>

        {/* Bottom meta strip — always visible, thin */}
        <div style={{
          position:"absolute", left:0, right:0, bottom:0,
          background:"linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.78) 70%)",
          padding:"18px 8px 6px", display:"flex", alignItems:"flex-end",
          justifyContent:"space-between", gap:8
        }}>
          <div style={{minWidth:0, flex:1}}>
            <div style={{fontSize:11, fontWeight:500, color:"var(--ink)", letterSpacing:"-0.01em",
                         overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {img.title}
            </div>
            <div className="mono" style={{fontSize:9, color:"var(--ink-faint)", marginTop:1, textTransform:"uppercase", letterSpacing:"0.06em"}}>
              {img.shot} · {img.style}
            </div>
          </div>
          <Swatches colors={img.palette.slice(0,5)} size={7} />
        </div>
      </div>
    </div>
  );
};

const Gallery = ({ images, onOpen, tweaks }) => {
  const cols = tweaks.density === "dense" ? 5 : tweaks.density === "cozy" ? 4 : 4;
  const gap = tweaks.density === "dense" ? 6 : 10;

  return (
    <div className="scroll fade-in" style={{
      flex:1, overflow:"auto", padding:"12px",
      position:"relative"
    }}>
      <div style={{
        columnCount: cols, columnGap: gap,
        maxWidth: "100%"
      }}>
        {images.map((img,i)=>(
          <GalleryCard key={img.id} img={img} index={i} onOpen={onOpen} tweaks={tweaks}/>
        ))}
      </div>
    </div>
  );
};

/* ───────────────── DETAIL DRAWER ───────────────── */
const DetailDrawer = ({ img, onClose, onOpen, allImages, tweaks }) => {
  const [tab, setTab] = React.useState("edit");
  const [title, setTitle] = React.useState(img.title);
  const [tags, setTags] = React.useState(img.tags);
  const [tagInput, setTagInput] = React.useState("");
  const [genre, setGenre] = React.useState(img.genre);
  const [group, setGroup] = React.useState(img.group);
  const [shotType, setShotType] = React.useState("Wide");
  const [mode, setMode] = React.useState("Shot Variation");
  const [ratio, setRatio] = React.useState("2.39");
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState([]);

  React.useEffect(()=>{
    setTitle(img.title); setTags(img.tags); setGenre(img.genre); setGroup(img.group); setGenerated([]);
  }, [img.id]);

  const parent = img.parent ? allImages.find(i=>i.id===img.parent) : null;
  const children = allImages.filter(i=>i.parent===img.id);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };
  const removeTag = (t) => setTags(tags.filter(x=>x!==t));

  const genVars = () => {
    setGenerating(true);
    setTimeout(()=>{
      setGenerated([
        { id:"gen_1", src: IMG2(img.src, 0.9, 1.05), progress:100 },
        { id:"gen_2", src: IMG2(img.src, 1.1, 0.95), progress:100 },
        { id:"gen_3", src: IMG2(img.src, 0.95, 1.1), progress:100 },
        { id:"gen_4", src: IMG2(img.src, 1.05, 0.9), progress:100 },
      ]);
      setGenerating(false);
    }, 1400);
  };

  const tabs = [
    { id:"edit", label:"Edit", icon:"edit" },
    { id:"variations", label:"Variations", icon:"sparkle" },
    { id:"lineage", label:"Lineage", icon:"tree" },
  ];

  return (
    <aside className="slide-in scroll" style={{
      width:440, flexShrink:0, height:"100%", overflow:"auto",
      background:"var(--panel)", borderLeft:"1px solid var(--line)",
      display:"flex", flexDirection:"column", position:"relative"
    }}>
      {/* Close + title */}
      <div style={{padding:"12px 14px 10px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", gap:8, position:"sticky", top:0, background:"var(--panel)", zIndex:2}}>
        <button onClick={onClose} style={{
          width:24, height:24, display:"flex", alignItems:"center", justifyContent:"center",
          borderRadius:3, color:"var(--ink-dim)", border:"1px solid var(--line)"
        }}>
          <Icon name="close" size={12}/>
        </button>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontSize:13, fontWeight:600, color:"var(--ink)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {title}
          </div>
          <div className="mono" style={{fontSize:10, color:"var(--ink-faint)", letterSpacing:"0.04em"}}>
            {img.id} · {img.sref}
          </div>
        </div>
        <Btn variant="ghost" icon="heart" size="xs">{img.likes}</Btn>
        <Btn variant="ghost" icon="more" size="xs"/>
      </div>

      {/* Hero image */}
      <div style={{padding:"12px 14px 0"}}>
        <div className="letterbox" style={{"--lb": tweaks.letterbox?"16px":"0px", borderRadius:3, overflow:"hidden", background:"#000", aspectRatio: img.ratio, position:"relative"}}>
          <img src={img.src} alt={img.title} style={{width:"100%", height:"100%", objectFit:"cover"}}/>
          <div style={{position:"absolute", bottom:8, right:8, display:"flex", gap:4}}>
            <Chip mono variant="outline">{img.ratio > 1 ? "16:9" : "9:16"}</Chip>
            <Chip mono variant="outline">{img.style}</Chip>
          </div>
        </div>

        {/* Palette row */}
        <div style={{marginTop:10, display:"flex", gap:0, borderRadius:3, overflow:"hidden", height:18}}>
          {img.palette.map((c,i)=>(
            <div key={i} style={{flex:1, background:c, position:"relative"}} title={c}>
              <span className="mono" style={{
                position:"absolute", top:"100%", left:"50%", transform:"translateX(-50%)",
                fontSize:9, color:"var(--ink-faint)", marginTop:3, whiteSpace:"nowrap"
              }}>{c.toUpperCase().slice(1,4)}</span>
            </div>
          ))}
        </div>

        {/* Inline stats */}
        <div style={{display:"flex", gap:14, padding:"16px 0 10px", fontSize:11, color:"var(--ink-mute)"}}>
          <span style={{display:"flex", alignItems:"center", gap:4}}><Icon name="eye" size={11}/> {img.views}</span>
          <span style={{display:"flex", alignItems:"center", gap:4}}><Icon name="heart" size={11}/> {img.likes}</span>
          <span style={{display:"flex", alignItems:"center", gap:4}}><Icon name="film" size={11}/> {img.shot}</span>
          <div style={{flex:1}}/>
          <span className="mono" style={{color:"var(--ink-faint)"}}>{img.project}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{padding:"0 14px", borderBottom:"1px solid var(--line)", display:"flex", gap:0}}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            display:"flex", alignItems:"center", gap:5, padding:"8px 10px",
            borderBottom: tab===t.id?"1.5px solid var(--accent)":"1.5px solid transparent",
            color: tab===t.id ? "var(--ink)":"var(--ink-mute)",
            fontSize:12, fontWeight:500, marginBottom:-1
          }}>
            <Icon name={t.icon} size={11}/> {t.label}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div style={{padding:"14px"}}>
        {tab === "edit" && (
          <EditPanel
            title={title} setTitle={setTitle} tags={tags}
            tagInput={tagInput} setTagInput={setTagInput}
            addTag={addTag} removeTag={removeTag}
            genre={genre} setGenre={setGenre}
            group={group} setGroup={setGroup}
            img={img}
          />
        )}
        {tab === "variations" && (
          <VariationsPanel
            shotType={shotType} setShotType={setShotType}
            mode={mode} setMode={setMode}
            ratio={ratio} setRatio={setRatio}
            generating={generating} generated={generated}
            genVars={genVars} img={img}
          />
        )}
        {tab === "lineage" && (
          <LineagePanel img={img} parent={parent} children={children} onOpen={onOpen} />
        )}
      </div>
    </aside>
  );
};

// Fake variation src helper (just return a close variant — we don't really have variations)
const IMG2 = (src, _a, _b) => src;

/* Edit panel */
const EditPanel = ({ title, setTitle, tags, tagInput, setTagInput, addTag, removeTag, genre, setGenre, group, setGroup, img }) => {
  const fieldSty = {
    width:"100%", height:30, padding:"0 10px",
    background:"rgba(255,255,255,0.025)", color:"var(--ink)",
    border:"1px solid var(--line-strong)", borderRadius:4,
    fontSize:12, outline:"none"
  };
  const labelSty = { fontSize:10, letterSpacing:"0.06em", color:"var(--ink-faint)", textTransform:"uppercase", display:"block", marginBottom:5, fontWeight:500 };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:12}}>
      <div>
        <label style={labelSty} className="mono">Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} style={fieldSty}/>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <div>
          <label style={labelSty} className="mono">Type</label>
          <select value={group} onChange={e=>setGroup(e.target.value)} style={fieldSty}>
            {V_GROUPS.map(g=><option key={g} value={g} style={{background:"#111"}}>{g}</option>)}
          </select>
        </div>
        <div>
          <label style={labelSty} className="mono">Genre</label>
          <select value={genre} onChange={e=>setGenre(e.target.value)} style={fieldSty}>
            {V_GENRES.map(g=><option key={g} value={g} style={{background:"#111"}}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Tags — using the palette-derived chip pattern */}
      <div>
        <label style={labelSty} className="mono">Tags ({tags.length})</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:4, minHeight:28, marginBottom:6}}>
          {tags.map((t,i)=>(
            <Chip key={t} color={img.palette[i % img.palette.length]} removable onRemove={()=>removeTag(t)}>
              {t}
            </Chip>
          ))}
        </div>
        <div style={{display:"flex", gap:6}}>
          <input
            value={tagInput} onChange={e=>setTagInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault(); addTag();}}}
            placeholder="Add tag · Enter"
            style={{...fieldSty, flex:1}}
          />
          <Btn variant="outline" onClick={addTag} disabled={!tagInput.trim()}>Add</Btn>
        </div>
      </div>

      {/* Metadata */}
      <div style={{background:"var(--bg-2)", border:"1px solid var(--line)", borderRadius:4, padding:"2px 10px"}}>
        <KV k="SREF" v={img.sref}/>
        <KV k="Shot" v={img.shot}/>
        <KV k="Style" v={img.style}/>
        <KV k="Aspect" v={img.ratio > 1 ? "16:9" : "9:16"}/>
        <KV k="Project" v={img.project}/>
        <KV k="Source" v="discord://import" mono/>
      </div>

      <div style={{display:"flex", gap:6, paddingTop:4}}>
        <Btn variant="ghost">Cancel</Btn>
        <div style={{flex:1}}/>
        <Btn variant="outline">Revert</Btn>
        <Btn variant="primary" icon="check">Save changes</Btn>
      </div>
    </div>
  );
};

/* Variations panel */
const MODES = [
  { id:"shot", label:"Shot Variation", desc:"Same subject, new coverage" },
  { id:"broll", label:"B-Roll", desc:"Surrounding coverage" },
  { id:"action", label:"Action Shot", desc:"Dynamic motion beat" },
  { id:"style", label:"Style Variation", desc:"Keep comp, swap medium" },
  { id:"subtle", label:"Subtle Variation", desc:"Micro-adjustments" },
  { id:"coverage", label:"Coverage", desc:"Full scene pass" },
];
const RATIOS = ["2.39","16:9","1:1","9:16","21:9"];

const VariationsPanel = ({ shotType, setShotType, mode, setMode, ratio, setRatio, generating, generated, genVars, img }) => {
  const labelSty = { fontSize:10, letterSpacing:"0.06em", color:"var(--ink-faint)", textTransform:"uppercase", display:"block", marginBottom:6, fontWeight:500 };

  return (
    <div style={{display:"flex", flexDirection:"column", gap:14}}>
      {/* Group context banner */}
      <div style={{
        display:"flex", alignItems:"center", gap:8,
        padding:"7px 10px", borderRadius:4,
        background:"linear-gradient(90deg, rgba(58,123,255,0.08), transparent)",
        border:"1px solid rgba(58,123,255,0.18)"
      }}>
        <Icon name="bolt-fill" size={12} className="" />
        <div style={{flex:1, fontSize:11}}>
          Group-aware: <span className="mono" style={{color:"var(--accent-ink)"}}>{img.group}</span>
          <span style={{color:"var(--ink-faint)", marginLeft:6}}>· prompts adapt to {img.group.toLowerCase()} conventions</span>
        </div>
      </div>

      {/* Mode grid */}
      <div>
        <label style={labelSty} className="mono">Mode</label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:4}}>
          {MODES.map(m => (
            <button key={m.id} onClick={()=>setMode(m.label)}
              style={{
                textAlign:"left", padding:"7px 9px", borderRadius:3,
                border:"1px solid", borderColor: mode===m.label ? "var(--accent)":"var(--line-strong)",
                background: mode===m.label ? "var(--accent-soft)" : "rgba(255,255,255,0.015)",
                color: mode===m.label ? "var(--accent-ink)" : "var(--ink-dim)"
              }}>
              <div style={{fontSize:11.5, fontWeight:600, color: mode===m.label?"var(--accent-ink)":"var(--ink)"}}>{m.label}</div>
              <div style={{fontSize:10, color:"var(--ink-faint)", marginTop:1}}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Shot type */}
      <div>
        <label style={labelSty} className="mono">Shot type</label>
        <div style={{display:"flex", flexWrap:"wrap", gap:3}}>
          {V_SHOTS.map(s => (
            <Chip key={s} variant={shotType===s?"solid":"outline"} color={shotType===s?"#3a7bff":undefined} onClick={()=>setShotType(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      {/* Aspect */}
      <div style={{display:"flex", gap:12}}>
        <div style={{flex:1}}>
          <label style={labelSty} className="mono">Aspect</label>
          <div style={{display:"flex", gap:4}}>
            {RATIOS.map(r => (
              <button key={r} onClick={()=>setRatio(r)} style={{
                flex:1, padding:"6px 0", borderRadius:3, fontSize:11,
                border:"1px solid", fontFamily:"var(--font-mono)",
                borderColor: ratio===r ? "var(--accent)":"var(--line-strong)",
                background: ratio===r?"var(--accent-soft)":"transparent",
                color: ratio===r?"var(--accent-ink)":"var(--ink-dim)"
              }}>{r}</button>
            ))}
          </div>
        </div>
        <div style={{width:86}}>
          <label style={labelSty} className="mono">Count</label>
          <div style={{display:"flex", gap:4}}>
            {["1","4","8"].map(n=>(
              <button key={n} style={{
                flex:1, padding:"6px 0", borderRadius:3, fontSize:11, fontFamily:"var(--font-mono)",
                border:"1px solid", borderColor: n==="4"?"var(--accent)":"var(--line-strong)",
                background: n==="4"?"var(--accent-soft)":"transparent",
                color: n==="4"?"var(--accent-ink)":"var(--ink-dim)"
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <Btn variant="primary" icon="sparkle" onClick={genVars} size="md"
           style={{justifyContent:"center", width:"100%", height:38, fontSize:12.5}}>
        {generating ? "Generating…" : `Generate ${mode}`}
      </Btn>

      {/* Results */}
      {(generating || generated.length>0) && (
        <div>
          <Label>Results <span className="mono" style={{color:"var(--ink-faint)"}}>{generating?"running":"complete"} · nano-banana-pro</span></Label>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:4}}>
            {[0,1,2,3].map(i => {
              const g = generated[i];
              return (
                <div key={i} style={{
                  position:"relative", aspectRatio:img.ratio, background:"#000",
                  border:"1px solid var(--line)", borderRadius:3, overflow:"hidden"
                }}>
                  {generating && (
                    <>
                      <div className="skeleton" style={{position:"absolute", inset:0, opacity:0.8}}/>
                      <div className="scan-line" />
                      <div className="mono" style={{position:"absolute", bottom:6, left:6, fontSize:9, color:"var(--accent-ink)"}}>
                        <span style={{animation:"pulse 1.2s infinite"}}>● </span> rendering…
                      </div>
                    </>
                  )}
                  {g && (
                    <>
                      <img src={g.src} style={{width:"100%", height:"100%", objectFit:"cover", filter:`hue-rotate(${i*30}deg) saturate(${0.9+i*0.1})`}}/>
                      <div style={{position:"absolute", top:4, left:4, display:"flex", gap:3}}>
                        <Chip mono variant="outline">v{i+1}</Chip>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* Lineage panel — Suno-style remix tree */
const LineagePanel = ({ img, parent, children, onOpen }) => {
  const node = (im, kind, accent) => (
    <button onClick={()=>onOpen(im)} key={im.id} style={{
      display:"flex", gap:8, width:"100%", padding:8, borderRadius:4,
      background:"rgba(255,255,255,0.015)", border:"1px solid var(--line)",
      textAlign:"left"
    }}>
      <div style={{width:54, height:40, background:"#000", borderRadius:2, overflow:"hidden", flexShrink:0}}>
        <img src={im.src} style={{width:"100%", height:"100%", objectFit:"cover"}}/>
      </div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:"flex", alignItems:"center", gap:6}}>
          <Chip mono color={accent} variant="outline">{kind}</Chip>
          <span className="mono" style={{fontSize:9, color:"var(--ink-faint)"}}>{im.id}</span>
        </div>
        <div style={{fontSize:11.5, color:"var(--ink)", marginTop:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{im.title}</div>
        <div className="mono" style={{fontSize:9.5, color:"var(--ink-faint)", marginTop:1}}>
          {im.shot} · {im.style}
        </div>
      </div>
      <Icon name="chevron-right" size={12} className=""/>
    </button>
  );

  return (
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
      {parent && (
        <>
          <Label>Parent</Label>
          {node(parent, "ORIGIN", "#f5a524")}
          <div style={{height:16, marginLeft:20, borderLeft:"1px dashed var(--line-hi)"}}/>
        </>
      )}

      <Label>Current</Label>
      <div style={{
        padding:8, border:"1px solid var(--accent)", borderRadius:4,
        background:"var(--accent-soft)",
        display:"flex", gap:8
      }}>
        <div style={{width:54, height:40, background:"#000", borderRadius:2, overflow:"hidden", flexShrink:0}}>
          <img src={img.src} style={{width:"100%", height:"100%", objectFit:"cover"}}/>
        </div>
        <div style={{flex:1, minWidth:0}}>
          <Chip mono color="#3a7bff">◉ YOU</Chip>
          <div style={{fontSize:11.5, color:"var(--ink)", marginTop:3}}>{img.title}</div>
          <div className="mono" style={{fontSize:9.5, color:"var(--ink-mute)", marginTop:1}}>
            depth {parent?1:0} · {children.length} children
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <>
          <div style={{height:16, marginLeft:20, borderLeft:"1px dashed var(--line-hi)"}}/>
          <Label right={<span className="mono" style={{color:"var(--ink-faint)"}}>{children.length}</span>}>Variations</Label>
          {children.map(c => node(c, "VAR", "#3a7bff"))}
        </>
      )}

      {!parent && children.length === 0 && (
        <div style={{textAlign:"center", padding:24, color:"var(--ink-faint)", fontSize:11}}>
          No lineage yet. Generate a variation to start a tree.
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Sidebar, Topbar, Gallery, DetailDrawer });
