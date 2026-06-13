import { useState, useEffect } from "react";
import { BOARDS, DAY_SLOTS, STATUSES, SEED_SETS, ETSY_IMGS, SKU_SECTIONS, getSection, ALL_SECTIONS } from "./seeds";


function boardById(id){return BOARDS.find(b=>b.id===id);}
function statusObj(key){return STATUSES.find(s=>s.key===key)||STATUSES[0];}

function generateSchedule(boardIds,startDate,intervalDays){
  return boardIds.map((boardId,i)=>{
    const base=new Date((startDate||new Date().toISOString().slice(0,10))+"T00:00:00");
    base.setDate(base.getDate()+i*intervalDays);
    const slots=DAY_SLOTS[base.getDay()];const slot=slots[i%slots.length];
    return {id:`new-${Date.now()}-${i}`,boardId,title:"",mediaUrl:"",link:"",description:"",keywords:"",publishDate:fmt(base,slot),status:"csv_ready"};
  });
}

function csvCell(val){const s=String(val);if(s.includes(",")||s.includes('"')||s.includes("\n"))return`"${s.replace(/"/g,'""')}"`;return s;}
function exportCSV(sets){
  const rows=[["Title","Media URL","Pinterest board","Thumbnail","Description","Link","Publish date","Keywords"]];
  sets.forEach(set=>(set.pins||[]).forEach(pin=>{
    if(["csv_ready","scheduled"].includes(pin.status)){
      const board=boardById(pin.boardId);
      rows.push([csvCell(pin.title||set.name),csvCell(pin.mediaUrl||""),csvCell(board?board.name:""),csvCell(""),csvCell(pin.description||""),csvCell(pin.link||""),csvCell(pin.publishDate||""),csvCell(pin.keywords||"")]);
    }
  }));
  return rows.map(r=>r.join(",")).join("\n");
}
function downloadCSV(content,filename){
  const blob=new Blob([content],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}

// ── Calendar helpers ─────────────────────────────────────────────────────────
function getDaysInMonth(year,month){return new Date(year,month+1,0).getDate();}
function getFirstDayOfMonth(year,month){return new Date(year,month,1).getDay();}

function getPinsForDate(sets, dateStr) {
  const pins = [];
  sets.forEach(set=>(set.pins||[]).forEach(pin=>{
    if(pin.publishDate && pin.publishDate.slice(0,10)===dateStr){
      pins.push({...pin, setName:set.name, setId:set.id});
    }
  }));
  return pins;
}

const MONTH_NAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ── Pin Tag (on calendar) ────────────────────────────────────────────────────
function PinTag({pin, onClick}){
  const board=boardById(pin.boardId);
  const st=statusObj(pin.status);
  return (
    <div onClick={e=>{e.stopPropagation();onClick(pin);}}
      style={{background:board?board.color:"#888",color:"#fff",borderRadius:4,padding:"2px 5px",fontSize:9,fontWeight:700,marginBottom:2,cursor:"pointer",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",opacity:pin.status==="live"?0.6:1,position:"relative"}}>
      {pin.status==="live"&&<span style={{marginRight:3}}>✓</span>}
      {pin.setName}
      <span style={{opacity:0.75,marginLeft:3}}>· {board?.short}</span>
    </div>
  );
}

// ── Day Cell ─────────────────────────────────────────────────────────────────
function DayCell({day, year, month, pins, isToday, onPinClick, onDayClick}){
  const [hov,setHov]=useState(false);
  const hasPins=pins.length>0;
  const MAX_SHOW=3;
  const extra=pins.length-MAX_SHOW;
  return (
    <div onClick={()=>onDayClick&&onDayClick(day)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{minHeight:90,background:hov?"#f5efe8":hasPins?"#fdfaf6":"#fff",border:`1px solid ${isToday?"#8b6b45":"#ede5d8"}`,borderRadius:8,padding:"6px 7px",cursor:"pointer",transition:"background 0.1s",position:"relative"}}>
      <div style={{fontSize:11,fontWeight:isToday?800:500,color:isToday?"#5e4c37":"#9e8c78",marginBottom:4,width:20,height:20,borderRadius:10,background:isToday?"#e8dcc8":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>{day}</div>
      {pins.slice(0,MAX_SHOW).map((pin,i)=><PinTag key={i} pin={pin} onClick={onPinClick}/>)}
      {extra>0&&<div style={{fontSize:9,color:"#a0896e",fontWeight:700,marginTop:1}}>+{extra} more</div>}
    </div>
  );
}

// ── Pin Detail Modal ─────────────────────────────────────────────────────────
function PinDetailModal({pin, sets, onStatusChange, onClose}){
  const board=boardById(pin.boardId);const st=statusObj(pin.status);
  const set=sets.find(s=>s.id===pin.setId);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,padding:28,width:460,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:18,color:"#3d2f1e",lineHeight:1.3}}>{pin.setName}</div>
            <div style={{fontSize:12,color:"#9e8c78",marginTop:3}}>{pin.publishDate}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:"#c4b5a0",cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,background:board?board.color+"22":"#eee",color:board?board.color:"#888",fontSize:11,fontWeight:700,border:`1px solid ${board?board.color+"44":"#ccc"}`}}>{board?.name}</span>
          <span style={{display:"inline-block",padding:"3px 10px",borderRadius:20,background:st.bg,color:st.color,fontSize:11,fontWeight:700,border:`1px solid ${st.color}33`}}>{st.label}</span>
        </div>
        {pin.title&&<div style={{fontSize:12,color:"#5e4c37",marginBottom:8,fontWeight:600}}>{pin.title}</div>}
        {pin.description&&<div style={{fontSize:12,color:"#7c6f5e",marginBottom:12,lineHeight:1.5}}>{pin.description}</div>}
        {pin.link&&<div style={{marginBottom:12}}><a href={pin.link} target="_blank" rel="noreferrer" style={{fontSize:12,color:"#3182ce"}}>→ Etsy listing</a></div>}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#7c6f5e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Update Status</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {STATUSES.map(s=>(
              <button key={s.key} onClick={()=>{onStatusChange(pin.setId,pin.id,s.key);onClose();}}
                style={{padding:"4px 12px",borderRadius:20,border:`2px solid ${pin.status===s.key?s.color:"#e8e0d5"}`,background:pin.status===s.key?s.bg:"#fff",color:s.color,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{fontSize:11,color:"#c4b5a0",textAlign:"right"}}>Part of "{pin.setName}" · {set?.pins?.length} pins total</div>
      </div>
    </div>
  );
}

// ── Listing Detail Panel (slide-in from right) ───────────────────────────────
function ListingPanel({set, onClose, onSaveSet, onExportSingle}){
  const [localSet, setLocalSet] = useState(JSON.parse(JSON.stringify(set)));
  const [dirty, setDirty] = useState(false);

  function updatePin(pinId, field, value){
    setLocalSet(s=>({...s, pins: s.pins.map(p=>p.id===pinId?{...p,[field]:value}:p)}));
    setDirty(true);
  }
  function updateMeta(field, value){
    setLocalSet(s=>({...s,[field]:value}));
    setDirty(true);
  }
  function handleSave(){
    onSaveSet(localSet);
    setDirty(false);
  }

  const readyPins = localSet.pins.filter(p=>["csv_ready","scheduled"].includes(p.status));
  const stickerImg = localSet.stickerImageUrl || "";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:900}}/>
      {/* Panel */}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width:520,background:"#fdf9f4",zIndex:901,boxShadow:"-4px 0 40px rgba(0,0,0,0.15)",overflowY:"auto",display:"flex",flexDirection:"column"}}>
        {/* Panel header */}
        <div style={{padding:"20px 24px 16px",borderBottom:"1px solid #e8e0d5",background:"#fff",position:"sticky",top:0,zIndex:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1,marginRight:12}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
              <EtsyThumb set={localSet} size={56}/>
              <div style={{fontFamily:"Georgia,serif",fontSize:19,color:"#3d2f1e",lineHeight:1.3}}>{localSet.name}</div>
            </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
              {localSet.sku&&<span style={{background:"#f0ebe3",color:"#7c6f5e",borderRadius:6,padding:"3px 8px",fontWeight:700,fontSize:11}}>{localSet.sku}</span>}
              {localSet.sku&&<span style={{fontSize:11,color:"#a0896e"}}>{getSection(localSet.sku)}</span>}
              {localSet.pins[0]?.link&&(
                <a href={localSet.pins[0].link} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:"#fff",fontWeight:700,background:"#e05d26",borderRadius:8,padding:"4px 12px",textDecoration:"none"}}>↗ View on Etsy</a>
              )}
            </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
              {dirty&&<button onClick={handleSave} style={{padding:"6px 14px",borderRadius:8,border:"none",background:"#5e4c37",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>Save</button>}
              {readyPins.length>0&&<button onClick={()=>onExportSingle(localSet)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:"#276749",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>↓ CSV</button>}
              <button onClick={onClose} style={{background:"none",border:"1px solid #d4c4b0",borderRadius:8,width:32,height:32,fontSize:18,color:"#9e8c78",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
          </div>
        </div>

        <div style={{padding:"20px 24px",flex:1}}>

          {/* Sticker image */}
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:"#7c6f5e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Sticker Image</div>
            {stickerImg ? (
              <div style={{position:"relative",display:"inline-block"}}>
                <img src={stickerImg} alt={localSet.name} style={{width:120,height:120,objectFit:"contain",borderRadius:10,border:"1px solid #e8e0d5",background:"#fff",padding:6}}/>
                <button onClick={()=>updateMeta("stickerImageUrl","")} style={{position:"absolute",top:-6,right:-6,width:20,height:20,borderRadius:10,border:"none",background:"#c53030",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            ) : (
              <div style={{background:"#f5efe8",border:"2px dashed #d4c4b0",borderRadius:10,padding:"16px 20px",fontSize:12,color:"#a0896e"}}>
                No sticker image yet — paste a URL below
              </div>
            )}
            <input value={stickerImg} onChange={e=>updateMeta("stickerImageUrl",e.target.value)}
              placeholder="Paste sticker image URL (Canva export or Etsy image)..."
              style={{marginTop:8,width:"100%",padding:"7px 10px",borderRadius:7,border:"1px solid #d4c4b0",background:"#faf7f2",color:"#3d2f1e",fontSize:12,boxSizing:"border-box",outline:"none"}}/>
          </div>

          {/* Pin slots */}
          <div style={{fontSize:11,fontWeight:700,color:"#7c6f5e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:12}}>
            Pin Schedule · {localSet.pins.length} pins
          </div>

          {localSet.pins.length===0||!localSet.pins[0].boardId ? (
            <div style={{background:"#fffff0",border:"1px solid #f6e05e",borderRadius:10,padding:"14px 16px",fontSize:12,color:"#744210",marginBottom:16}}>
              ⚠ No pins scheduled yet. Click Edit to assign boards and set a start date.
            </div>
          ) : (
            localSet.pins.map((pin,i)=>{
              const board=boardById(pin.boardId);
              const st=statusObj(pin.status);
              return (
                <div key={pin.id} style={{background:"#fff",border:"1px solid #e8e0d5",borderRadius:12,marginBottom:12,overflow:"hidden"}}>
                  {/* Pin header */}
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#faf7f2",borderBottom:"1px solid #f0ebe3"}}>
                    <span style={{width:10,height:10,borderRadius:3,background:board?.color||"#ccc",flexShrink:0,display:"inline-block"}}/>
                    <span style={{fontWeight:700,fontSize:12,color:"#3d2f1e",flex:1}}>{board?.short||"No board"}</span>
                    <span style={{fontSize:11,color:"#9e8c78"}}>{pin.publishDate||"No date"}</span>
                    <select value={pin.status} onChange={e=>updatePin(pin.id,"status",e.target.value)}
                      style={{fontSize:10,padding:"2px 6px",borderRadius:6,border:`1.5px solid ${st.color}`,background:st.bg,color:st.color,cursor:"pointer",fontWeight:700}}>
                      {STATUSES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  {/* Pin image */}
                  <div style={{padding:"12px 14px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#7c6f5e",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6}}>Pin Image</div>
                    {pin.mediaUrl&&!pin.mediaUrl.includes("⚠") ? (
                      <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                        <img src={pin.mediaUrl} alt="pin" style={{width:72,height:108,objectFit:"cover",borderRadius:6,border:"1px solid #e8e0d5",flexShrink:0}}
                          onError={e=>{e.target.style.display='none';}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:10,color:"#276749",fontWeight:700,marginBottom:4}}>✓ Image set</div>
                          <button onClick={()=>updatePin(pin.id,"mediaUrl","")}
                            style={{fontSize:10,color:"#c53030",background:"none",border:"1px solid #fed7d7",borderRadius:5,padding:"2px 8px",cursor:"pointer"}}>Remove</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{background:"#f5efe8",border:"1px dashed #d4c4b0",borderRadius:7,padding:"8px 10px",fontSize:11,color:"#c4b5a0",marginBottom:6}}>No image yet</div>
                    )}
                    <input value={pin.mediaUrl||""} onChange={e=>updatePin(pin.id,"mediaUrl",e.target.value)}
                      placeholder="Paste pin image URL..."
                      style={{width:"100%",padding:"6px 10px",borderRadius:6,border:"1px solid #d4c4b0",background:"#faf7f2",color:"#3d2f1e",fontSize:11,boxSizing:"border-box",outline:"none"}}/>
                    {/* Pin title */}
                    {pin.title&&<div style={{marginTop:8,fontSize:11,color:"#5e4c37",fontWeight:600,lineHeight:1.4}}>{pin.title}</div>}
                    {/* Pin description */}
                    {pin.description&&<div style={{marginTop:4,fontSize:10,color:"#9e8c78",lineHeight:1.5}}>{pin.description}</div>}
                  </div>
                </div>
              );
            })
          )}

          {/* Keywords */}
          {localSet.pins[0]?.keywords&&(
            <div style={{marginTop:4,marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7c6f5e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Keywords</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {localSet.pins[0].keywords.split(",").map((kw,i)=>(
                  <span key={i} style={{background:"#f0ebe3",color:"#5e4c37",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:600}}>{kw.trim()}</span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── Set Modal (add/edit) ─────────────────────────────────────────────────────
const L=({children})=><label style={{display:"block",fontSize:11,fontWeight:700,color:"#7c6f5e",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:5,marginTop:14}}>{children}</label>;
const IS={width:"100%",padding:"8px 12px",borderRadius:8,border:"1px solid #d4c4b0",background:"#faf7f2",color:"#3d2f1e",fontSize:13,boxSizing:"border-box",outline:"none"};

function SetModal({set,onSave,onClose}){
  const isNew=!set.id;
  const [name,setName]=useState(set.name||"");
  const [selectedBoards,setSelectedBoards]=useState((set.pins||[]).map(p=>p.boardId));
  const [startDate,setStartDate]=useState(set.pins?.[0]?.publishDate?.slice(0,10)||new Date().toISOString().slice(0,10));
  const [interval,setIntervalVal]=useState(8);
  const [mediaUrl,setMediaUrl]=useState(set.pins?.[0]?.mediaUrl||"");
  const [link,setLink]=useState(set.pins?.[0]?.link||"");
  const [description,setDescription]=useState(set.pins?.[0]?.description||"");
  const [keywords,setKeywords]=useState(set.pins?.[0]?.keywords||"");

  function toggleBoard(bid){setSelectedBoards(sb=>sb.includes(bid)?sb.filter(b=>b!==bid):[...sb,bid]);}
  function handleSave(){
    const pins=isNew
      ?generateSchedule(selectedBoards,startDate,interval).map(p=>({...p,mediaUrl,link,description,keywords,title:name}))
      :set.pins.map((p,i)=>{
          const base=new Date(startDate+"T00:00:00");base.setDate(base.getDate()+i*interval);
          const slots=DAY_SLOTS[base.getDay()];const slot=slots[i%slots.length];
          return {...p,boardId:selectedBoards[i]??p.boardId,mediaUrl:mediaUrl||p.mediaUrl,link:link||p.link,description:description||p.description,keywords:keywords||p.keywords,title:name,publishDate:fmt(base,slot)};
        });
    onSave({...(isNew?{}:set),id:set.id||Date.now(),name,pins});
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,padding:28,width:540,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#3d2f1e",marginBottom:20}}>{isNew?"New Pin Set":`Edit: ${set.name}`}</div>
        <L>Pin Set Name</L><input value={name} onChange={e=>setName(e.target.value)} style={IS} placeholder="e.g. Reading Frog"/>
        <L>Boards ({selectedBoards.length}/8)</L>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {BOARDS.map(b=>(
            <label key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,background:selectedBoards.includes(b.id)?b.color+"18":"#faf7f2",cursor:"pointer",border:`1.5px solid ${selectedBoards.includes(b.id)?b.color:"#e8e0d5"}`}}>
              <input type="checkbox" checked={selectedBoards.includes(b.id)} onChange={()=>toggleBoard(b.id)} style={{accentColor:b.color}}/>
              <span style={{fontSize:12,color:selectedBoards.includes(b.id)?b.color:"#5e4c37",fontWeight:selectedBoards.includes(b.id)?700:400}}>{b.short}</span>
            </label>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
          <div><L>First Publish Date</L><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={IS}/></div>
          <div><L>Days Between (7–9)</L><input type="number" value={interval} min={7} max={9} onChange={e=>setIntervalVal(parseInt(e.target.value)||8)} style={IS}/></div>
        </div>
        <L>Media URL</L><input value={mediaUrl} onChange={e=>setMediaUrl(e.target.value)} style={IS} placeholder="https://..."/>
        <L>Etsy Listing URL</L><input value={link} onChange={e=>setLink(e.target.value)} style={IS} placeholder="https://thymeandtonic.etsy.com/listing/..."/>
        <L>Pin Description</L><textarea value={description} onChange={e=>setDescription(e.target.value)} style={{...IS,height:64,resize:"vertical"}} placeholder="Up to 500 characters..."/>
        <L>Keywords</L><input value={keywords} onChange={e=>setKeywords(e.target.value)} style={IS} placeholder="cottagecore,sticker,watercolor"/>
        {selectedBoards.length>0&&(
          <div style={{marginTop:16,background:"#faf7f2",borderRadius:10,padding:"12px 14px",border:"1px solid #e8e0d5"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#7c6f5e",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Schedule Preview</div>
            {selectedBoards.map((bid,i)=>{
              const base=new Date(startDate+"T00:00:00");base.setDate(base.getDate()+i*interval);
              const slots=DAY_SLOTS[base.getDay()];const slot=slots[i%slots.length];const board=boardById(bid);
              return <div key={bid} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#5e4c37",padding:"3px 0",borderBottom:i<selectedBoards.length-1?"1px dashed #e8e0d5":"none"}}>
                <span style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{width:8,height:8,borderRadius:4,background:board?.color,display:"inline-block"}}></span>
                  {board?.short}
                </span>
                <span style={{color:"#9e8c78"}}>{fmt(base,slot)}</span>
              </div>;
            })}
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:18}}>
          <button onClick={onClose} style={{padding:"8px 18px",borderRadius:8,border:"1px solid #d4c4b0",background:"#faf7f2",color:"#5e4c37",cursor:"pointer",fontWeight:600}}>Cancel</button>
          <button onClick={handleSave} style={{padding:"8px 20px",borderRadius:8,border:"none",background:"#5e4c37",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:14}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── List View ────────────────────────────────────────────────────────────────

function EtsyThumb({set, size=44}){
  const etsy_id = set.etsy_id || String(set.id);
  const img = set.stickerImageUrl || ETSY_IMGS[etsy_id] || "";
  return (
    <div style={{width:size,height:size,borderRadius:8,border:"1px solid #e8e0d5",background:"#f5efe8",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      {img
        ? <img src={img} alt={set.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>{e.target.style.display="none";}}/>
        : <span style={{fontSize:size>40?18:12}}>🌿</span>
      }
    </div>
  );
}

function ListView({sets, onEdit, onDelete, onPinStatusChange, onExportSingle, onOpenDetail}){
  return (
    <div>
      {sets.map(set=>{
        const allStatuses=set.pins.map(p=>p.status);
        const dominant=STATUSES.slice().reverse().find(s=>allStatuses.includes(s.key))||STATUSES[0];
        const readyCount=set.pins.filter(p=>["csv_ready","scheduled"].includes(p.status)).length;
        const liveCount=set.pins.filter(p=>p.status==="live").length;
        const hasImage=set.stickerImageUrl;
        return (
          <div key={set.id} style={{border:"1px solid #e8e0d5",borderRadius:12,overflow:"hidden",marginBottom:8,background:"#fff",cursor:"pointer"}}
            onClick={()=>onOpenDetail(set)}>
            <div style={{display:"grid",gridTemplateColumns:"auto 2fr 1fr 1fr 1fr auto",gap:10,alignItems:"center",padding:"10px 14px",background:"#faf7f2"}}>
              {/* Sticker thumb */}
              <EtsyThumb set={set} size={44}/>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#3d2f1e"}}>{set.name}</div>
                  {set.pins?.[0]?.link&&<a href={set.pins[0].link} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:"#3182ce",fontWeight:600,whiteSpace:"nowrap",textDecoration:"none",background:"#ebf8ff",border:"1px solid #bee3f8",borderRadius:10,padding:"1px 7px"}}>↗ Etsy</a>}
                </div>
                <div style={{fontSize:10,color:"#a0896e",marginTop:2,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  {set.sku&&<span style={{background:"#f0ebe3",color:"#7c6f5e",borderRadius:4,padding:"1px 5px",fontWeight:700,fontSize:9,letterSpacing:"0.03em"}}>{set.sku}</span>}
                  {set.sku&&<span style={{color:"#c4b5a0",fontSize:9}}>{getSection(set.sku)}</span>}
                  {set.pins.filter(p=>p.boardId).map(p=>{const b=boardById(p.boardId);return b?<span key={p.id} style={{display:"inline-block",width:7,height:7,borderRadius:2,background:b.color,opacity:p.status==="live"?0.35:1}} title={b.short}></span>:null;})}
                </div>
              </div>
              <div><span style={{display:"inline-block",padding:"3px 9px",borderRadius:20,background:dominant.bg,color:dominant.color,fontSize:10,fontWeight:700,border:`1px solid ${dominant.color}33`}}>{dominant.label}</span></div>
              <div style={{fontSize:11,color:"#9e8c78"}}>{set.pins.filter(p=>p.boardId).length} pins · {liveCount} live</div>
              <div style={{fontSize:11,color:"#9e8c78"}}>{set.pins[0]?.publishDate?`${set.pins[0].publishDate.slice(0,10)}`:"No dates"}</div>
              <div style={{display:"flex",gap:5,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                {readyCount>0&&<button onClick={()=>onExportSingle(set)} style={{padding:"3px 8px",borderRadius:6,border:"none",background:"#276749",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>↓ CSV</button>}
                <button onClick={()=>onEdit(set)} style={{padding:"3px 8px",borderRadius:6,border:"1px solid #d4c4b0",background:"#fff",color:"#5e4c37",fontSize:10,cursor:"pointer"}}>Edit</button>
                <button onClick={()=>onDelete(set.id)} style={{padding:"3px 6px",borderRadius:6,border:"1px solid #fed7d7",background:"#fff5f5",color:"#c53030",fontSize:10,cursor:"pointer"}}>✕</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardLegend(){
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
      {BOARDS.map(b=>(
        <div key={b.id} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#5e4c37"}}>
          <span style={{width:10,height:10,borderRadius:3,background:b.color,display:"inline-block",flexShrink:0}}></span>
          {b.short}
        </div>
      ))}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

function App(){
  const [sets,setSets]=useState([]);
  const [view,setView]=useState("calendar");
  const [modalSet,setModalSet]=useState(null);
  const [selectedPin,setSelectedPin]=useState(null);
  const [detailSet,setDetailSet]=useState(null);
  const [nextId,setNextId]=useState(300);
  const [search,setSearch]=useState("");
  const [sectionFilter,setSectionFilter]=useState("all");
  const today=new Date();
  const [calYear,setCalYear]=useState(today.getFullYear());
  const [calMonth,setCalMonth]=useState(today.getMonth());

  useEffect(()=>{
    try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const p=JSON.parse(saved);setSets(p.sets||SEED_SETS);setNextId(p.nextId||300);}else setSets(SEED_SETS);}
    catch{setSets(SEED_SETS);}
  },[]);
  useEffect(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify({sets,nextId}));}catch{}
  },[sets,nextId]);

  function handleSave(set){
    if(sets.find(s=>s.id===set.id))setSets(ss=>ss.map(s=>s.id===set.id?set:s));
    else{setSets(ss=>[...ss,{...set,id:nextId}]);setNextId(n=>n+1);}
    setModalSet(null);
  }
  function handleSaveSet(set){
    setSets(ss=>ss.map(s=>s.id===set.id?set:s));
    // Keep panel open with updated data
    setDetailSet(set);
  }
  function handleDelete(id){
    if(window.confirm("Remove this pin set?")){
      setSets(ss=>ss.filter(s=>s.id!==id));
      if(detailSet?.id===id) setDetailSet(null);
    }
  }
  function handlePinStatusChange(setId,pinId,newStatus){setSets(ss=>ss.map(s=>s.id===setId?{...s,pins:s.pins.map(p=>p.id===pinId?{...p,status:newStatus}:p)}:s));}
  function handleExportSingle(set){downloadCSV(exportCSV([set]),`${set.name.replace(/\s+/g,"-").toLowerCase()}-pins.csv`);}
  function handleExportAll(){downloadCSV(exportCSV(sets),`thyme-and-tonic-all-pins-${new Date().toISOString().slice(0,10)}.csv`);}
  function openDetail(set){setDetailSet(set);setSelectedPin(null);}

  const allPins=sets.flatMap(s=>s.pins||[]);
  const readyCount=allPins.filter(p=>["csv_ready","scheduled"].includes(p.status)).length;

  const daysInMonth=getDaysInMonth(calYear,calMonth);
  const firstDay=getFirstDayOfMonth(calYear,calMonth);
  const todayStr=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  function prevMonth(){if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);}
  function nextMonth(){if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);}

  // Filter for list view - only show sets, filter by status of any pin
  const [filterStatus,setFilterStatus]=useState("all");
  const filtered=sets.filter(s=>{
    if(filterStatus!=="all"&&!s.pins.some(p=>p.status===filterStatus)) return false;
    if(sectionFilter!=="all"&&getSection(s.sku)!==sectionFilter) return false;
    if(search){
      const q=search.toLowerCase();
      const matchName=s.name?.toLowerCase().includes(q);
      const matchSku=s.sku?.toLowerCase().includes(q);
      const matchSection=getSection(s.sku).toLowerCase().includes(q);
      if(!matchName&&!matchSku&&!matchSection) return false;
    }
    return true;
  });
  const statusCounts={};STATUSES.forEach(s=>statusCounts[s.key]=allPins.filter(p=>p.status===s.key).length);

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#fdf9f4",minHeight:"100vh",padding:"20px 20px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontFamily:"Georgia,serif",fontSize:24,color:"#3d2f1e",fontWeight:400}}>🌿 Pinterest Publish Tracker</div>
            <div style={{fontSize:12,color:"#a0896e",marginTop:2}}>Thyme &amp; Tonic Press</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {readyCount>0&&<button onClick={handleExportAll} style={{padding:"8px 14px",borderRadius:9,border:"none",background:"#276749",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>↓ Export All Ready ({readyCount})</button>}
            <button onClick={()=>setModalSet({name:"",pins:[]})} style={{padding:"8px 16px",borderRadius:9,border:"none",background:"#5e4c37",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>+ New Pin Set</button>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1px solid #d4c4b0"}}>
              <button onClick={()=>setView("calendar")} style={{padding:"7px 14px",border:"none",background:view==="calendar"?"#5e4c37":"#fff",color:view==="calendar"?"#fff":"#5e4c37",fontWeight:700,fontSize:12,cursor:"pointer"}}>📅 Calendar</button>
              <button onClick={()=>setView("list")} style={{padding:"7px 14px",border:"none",background:view==="list"?"#5e4c37":"#fff",color:view==="list"?"#fff":"#5e4c37",fontWeight:700,fontSize:12,cursor:"pointer"}}>☰ List</button>
            </div>
          </div>
        </div>

        {view==="calendar"&&(
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <button onClick={prevMonth} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #d4c4b0",background:"#fff",color:"#5e4c37",fontWeight:700,fontSize:14,cursor:"pointer"}}>‹</button>
              <div style={{fontFamily:"Georgia,serif",fontSize:20,color:"#3d2f1e",fontWeight:400}}>{MONTH_NAMES[calMonth]} {calYear}</div>
              <button onClick={nextMonth} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #d4c4b0",background:"#fff",color:"#5e4c37",fontWeight:700,fontSize:14,cursor:"pointer"}}>›</button>
            </div>
            <BoardLegend/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
              {DAY_NAMES.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#a0896e",letterSpacing:"0.05em",padding:"4px 0"}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
              {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
              {Array.from({length:daysInMonth}).map((_,i)=>{
                const day=i+1;
                const dateStr=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                const pins=getPinsForDate(sets,dateStr);
                const isToday=dateStr===todayStr;
                return <DayCell key={day} day={day} year={calYear} month={calMonth} pins={pins} isToday={isToday} onPinClick={setSelectedPin}/>;
              })}
            </div>
            <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap"}}>
              <div style={{fontSize:11,color:"#9e8c78",fontStyle:"italic"}}>Click any pin tag to update status</div>
              <div style={{display:"flex",gap:10,marginLeft:"auto"}}>
                {STATUSES.map(s=><div key={s.key} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7c6f5e"}}>
                  <span style={{width:8,height:8,borderRadius:2,background:s.color,display:"inline-block"}}></span>{s.label}
                </div>)}
              </div>
            </div>
          </>
        )}

        {view==="list"&&(
          <>
            {/* Search + Section filter */}
            <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{position:"relative",flex:"1",minWidth:200}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#c4b5a0"}}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search by name, SKU, or section..."
                  style={{width:"100%",paddingLeft:32,paddingRight:12,paddingTop:8,paddingBottom:8,borderRadius:9,border:"1px solid #d4c4b0",background:"#fff",color:"#3d2f1e",fontSize:13,boxSizing:"border-box",outline:"none"}}/>
                {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#c4b5a0"}}>×</button>}
              </div>
              <select value={sectionFilter} onChange={e=>setSectionFilter(e.target.value)}
                style={{padding:"8px 12px",borderRadius:9,border:"1px solid #d4c4b0",background:"#fff",color:"#5e4c37",fontSize:13,cursor:"pointer",fontWeight:600}}>
                <option value="all">All Sections</option>
                {ALL_SECTIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {/* Status filter pills */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
              <Pill label={`All (${sets.length})`} active={filterStatus==="all"} color="#5e4c37" onClick={()=>setFilterStatus("all")}/>
              {STATUSES.map(s=><Pill key={s.key} label={`${s.label}${statusCounts[s.key]>0?` (${statusCounts[s.key]})`:""}`} active={filterStatus===s.key} color={s.color} onClick={()=>setFilterStatus(s.key)}/>)}
            </div>
            {/* Result count */}
            {(search||sectionFilter!=="all")&&<div style={{fontSize:11,color:"#a0896e",marginBottom:10}}>{filtered.length} of {sets.length} listings</div>}
            <ListView sets={filtered} onEdit={s=>setModalSet(s)} onDelete={handleDelete} onPinStatusChange={handlePinStatusChange} onExportSingle={handleExportSingle} onOpenDetail={openDetail}/>
          </>
        )}

        <div style={{marginTop:16,fontSize:11,color:"#c4b5a0",textAlign:"right"}}>{sets.length} pin sets · {allPins.length} total pins · data saved to browser</div>
      </div>

      {modalSet&&<SetModal set={modalSet} onSave={handleSave} onClose={()=>setModalSet(null)}/>}
      {selectedPin&&<PinDetailModal pin={selectedPin} sets={sets} onStatusChange={(sid,pid,s)=>{handlePinStatusChange(sid,pid,s);setSelectedPin(null);}} onClose={()=>setSelectedPin(null)}/>}
      {detailSet&&<ListingPanel set={detailSet} onClose={()=>setDetailSet(null)} onSaveSet={handleSaveSet} onExportSingle={handleExportSingle}/>}
    </div>
  );
}

function Pill({label,active,color,onClick}){
  return <button onClick={onClick} style={{padding:"5px 14px",borderRadius:20,border:`2px solid ${active?color:"#d4c4b0"}`,background:active?color:"#fff",color:active?"#fff":color,fontSize:12,fontWeight:700,cursor:"pointer"}}>{label}</button>;
}

export default App;