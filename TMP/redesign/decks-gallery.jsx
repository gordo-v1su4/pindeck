/* Decks Gallery — each card is a full contact-strip preview of the deck's slides */

const DG_Slide        = (props) => React.createElement(window.DeckSlide, props);
const DG_ScaledStage  = (props) => React.createElement(window.DeckScaledStage, props);

const DECK_LIBRARY = [
  {
    id:"d1", title:"Sentinal",       subtitle:"Neon Sentinel · commercial pitch",
    tag:"ACTIVE", updated:"today", template: 0, imageSeed: 0,
    logline:"A courier lost in a city that forgets at midnight learns that the only thing still moving — still remembering — is her.",
    characterName:"MARA / 28",
  },
  {
    id:"d2", title:"Desert Run",     subtitle:"Sunset stand-off · film pitch",
    tag:"DRAFT", updated:"6d ago", template: 1, imageSeed: 4,
    logline:"Two smugglers, one stolen car, and a sunset that refuses to end until somebody finally chooses a side.",
    characterName:"RIO / 34",
  },
  {
    id:"d3", title:"Meridian",       subtitle:"Cold-water thriller",
    tag:"ACTIVE", updated:"2d ago", template: 2, imageSeed: 8,
    logline:"A freediver who hears voices beneath the ice learns the last one calling her name is her own.",
    characterName:"ELIN / 22",
  },
  {
    id:"d4", title:"Chapter Zero",   subtitle:"Origin pitch · treatment",
    tag:"SENT", updated:"2w ago", template: 3, imageSeed: 12,
    logline:"Before the war, before the name, before the myth — a kid with borrowed hands finds out what hands can do.",
    characterName:"ARIE / 17",
  },
  {
    id:"d5", title:"Night Market",   subtitle:"Music-video proposal",
    tag:"ACTIVE", updated:"4d ago", template: 0, imageSeed: 6,
    logline:"Four artists, one neon block, and the kind of night that only exists between 2 and 4 AM.",
    characterName:"KAI / 19",
  },
  {
    id:"d6", title:"Halo Bright",    subtitle:"Short-form treatment",
    tag:"DRAFT", updated:"1w ago", template: 1, imageSeed: 2,
    logline:"A small-town choir tries to out-sing a wildfire and learns that some songs aren't supposed to make it out.",
    characterName:"JUNE / 41",
  },
];

/* One deck card — renders a stack of tiny slide previews (contact strip) */
const DeckStripCard = ({ deck, onOpen }) => {
  const [hover, setHover] = React.useState(false);

  // Build a cheap live template from the deck's chosen palette
  const template = React.useMemo(() => {
    const T = window.DeckTEMPLATES[deck.template % window.DeckTEMPLATES.length];
    const f = window.DeckFONT_FAMILIES[0];
    return { ...T, font:{ display:f.display, body:f.body, serif:f.serif } };
  }, [deck.template]);

  // Pick a slice of library images offset by the deck's seed
  const images = React.useMemo(()=>{
    const lib = window.DeckLIB_LIST;
    const out = [];
    for (let i=0; i<10; i++) out.push(lib[(deck.imageSeed + i) % lib.length]);
    return out;
  }, [deck.imageSeed]);

  // Use the default block order; show all of them in the strip
  const blocks = React.useMemo(
    () => window.DeckDEFAULT_BLOCKS.filter(b => b.on),
    []
  );

  const slides = React.useMemo(
    () => blocks.map(b => ({
      id:b.id, label:b.label, variant:b.variant,
      slide: window.DeckSlideContent(b.kind, images, template, {
        title: deck.title,
        subtitle: deck.subtitle,
        logline: deck.logline,
        characterName: deck.characterName,
        outroEmail: `hello@pindeck.studio · pindeck.studio/${deck.id}`,
      })
    })),
    [blocks, images, template, deck]
  );

  return (
    <button
      onClick={()=>onOpen(deck)}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{
        textAlign:"left", padding:0, background:"transparent", border:"none", cursor:"pointer",
        display:"flex", flexDirection:"column", gap:10, fontFamily:"inherit", color:"inherit",
        width:"100%",
      }}
    >
      {/* Meta row — above the strip */}
      <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8}}>
        <div style={{display:"flex", alignItems:"center", gap:7, minWidth:0}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:template.accent,boxShadow:`0 0 8px ${template.accent}`,flexShrink:0}}/>
          <span className="mono" style={{fontSize:9, letterSpacing:".22em", color:"var(--ink-faint)"}}>{deck.tag}</span>
          <span className="mono" style={{fontSize:9, color:"var(--ink-faint)", letterSpacing:".14em"}}>· {slides.length} BLOCKS</span>
        </div>
        <span className="mono" style={{fontSize:9, color:"var(--ink-faint)", letterSpacing:".14em"}}>{deck.updated}</span>
      </div>

      {/* The contact strip — stack of slide thumbnails */}
      <div style={{
        position:"relative",
        border:"1px solid var(--line-strong)",
        transition:"border-color .2s, transform .25s, box-shadow .25s",
        transform: hover ? "translateY(-2px)" : "none",
        borderColor: hover ? "var(--line-hi)" : "var(--line-strong)",
        boxShadow: hover ? "0 20px 40px -20px rgba(0,0,0,0.8)" : "none",
        background:"#050507",
        display:"flex", flexDirection:"column", gap:0,
      }}>
        {slides.map((s, i) => (
          <div key={s.id} style={{position:"relative", background:"#000"}}>
            <DG_ScaledStage>
              <DG_Slide slide={s.slide} index={i} total={slides.length} template={template} scrollFx="none" canvasRef={{current:null}} label={s.label} variant={s.variant}/>
            </DG_ScaledStage>
          </div>
        ))}

        {/* Overlay on hover */}
        {hover && (
          <div className="fade-in" style={{position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.35)", pointerEvents:"none"}}>
            <div style={{padding:"10px 18px", border:"1px solid rgba(255,255,255,0.35)", background:"rgba(0,0,0,0.65)", color:"#fff", fontSize:11, fontFamily:"var(--font-mono)", letterSpacing:".24em", textTransform:"uppercase"}}>
              Open Deck · →
            </div>
          </div>
        )}
      </div>

      {/* Title, below the strip */}
      <div>
        <div className="mono" style={{fontSize:9, letterSpacing:".22em", color:"var(--ink-faint)", marginBottom:4}}>PITCH DECK</div>
        <div className="display" style={{fontSize:20, fontWeight:800, color:"var(--ink)", letterSpacing:"-0.02em", lineHeight:1.05}}>
          {deck.title}
        </div>
        <div style={{fontSize:11.5, color:"var(--ink-mute)", marginTop:3, letterSpacing:"-0.005em"}}>
          {deck.subtitle}
        </div>
      </div>
    </button>
  );
};

const NewDeckCard = ({ onNew }) => (
  <button onClick={onNew} style={{
    textAlign:"left", padding:0, background:"transparent", border:"none", cursor:"pointer",
    display:"flex", flexDirection:"column", gap:10, fontFamily:"inherit", color:"inherit",
    width:"100%",
  }}>
    <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:8}}>
      <span className="mono" style={{fontSize:9, letterSpacing:".22em", color:"var(--ink-faint)"}}>+ BLANK</span>
      <span className="mono" style={{fontSize:9, color:"var(--ink-faint)", letterSpacing:".14em"}}>—</span>
    </div>
    <div style={{
      aspectRatio:"9 / 22", border:"1px dashed var(--line-strong)", background:"var(--bg-1)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12,
      color:"var(--ink-mute)", transition:"all .2s",
    }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--accent)"; e.currentTarget.style.color="var(--accent)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--line-strong)"; e.currentTarget.style.color="var(--ink-mute)"; }}
    >
      <div style={{fontSize:40, fontWeight:200, lineHeight:1}}>+</div>
      <div className="mono" style={{fontSize:10, letterSpacing:".24em"}}>NEW DECK</div>
      <div className="mono" style={{fontSize:9, letterSpacing:".16em", color:"var(--ink-faint)", marginTop:-4}}>from gallery</div>
    </div>
    <div>
      <div className="mono" style={{fontSize:9, letterSpacing:".22em", color:"var(--ink-faint)", marginBottom:4}}>BLANK</div>
      <div className="display" style={{fontSize:20, fontWeight:800, color:"var(--ink-mute)", letterSpacing:"-0.02em"}}>Start New</div>
      <div style={{fontSize:11.5, color:"var(--ink-faint)", marginTop:3}}>Compose from Pindeck library</div>
    </div>
  </button>
);

const DecksGallery = ({ onOpen, tweaks }) => {
  return (
    <div className="deck-scope" style={{padding:"22px 26px 40px", height:"100%", overflow:"auto"}}>
      {/* Header */}
      <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:22}}>
        <div>
          <div style={{fontSize:20, fontWeight:600, letterSpacing:"-0.02em"}}>Decks</div>
          <div className="mono" style={{fontSize:10.5, color:"var(--ink-faint)", letterSpacing:".16em", marginTop:3}}>
            {DECK_LIBRARY.length} DECKS · CONTACT STRIPS · CLICK TO COMPOSE
          </div>
        </div>
        <div style={{display:"flex", gap:6}}>
          <button className="btn">⟲ Import</button>
          <button className="btn btn-accent">+ New Deck</button>
        </div>
      </div>

      {/* Grid — fixed 5 cols on wide, aligned rows (NOT offset masonry) */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:"28px 22px", alignItems:"start"}}>
        {DECK_LIBRARY.map(d => <DeckStripCard key={d.id} deck={d} onOpen={onOpen}/>)}
        <NewDeckCard onNew={()=>onOpen(DECK_LIBRARY[0])}/>
      </div>
    </div>
  );
};

window.DecksGallery = DecksGallery;
window.DECK_LIBRARY = DECK_LIBRARY;
