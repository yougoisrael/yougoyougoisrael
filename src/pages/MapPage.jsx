import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "../components/BottomNav";

const C = { red: "#C8102E", dark: "#111827", gray: "#6B7280" };

const AREAS = [
  { id: "east",   short: "ראמה - מגאר - עראבה",   name: "ראמה, סאגור, שזור, עין אל-אסד, עראבה, סחנין, מגאר", lat: 32.9078, lng: 35.3524, radius: 6500 },
  { id: "center", short: "כרמיאל - נחף - בעינה",   name: "כרמיאל, נחף, דיר אל-אסד, בעינה, מגד אל-כרום",      lat: 32.9178, lng: 35.2999, radius: 5000 },
  { id: "north",  short: "פקיעין - חורפיש - כסרה", name: "פקיעין, חורפיש, בית ג'ן, כסרה-סמיע",               lat: 32.9873, lng: 35.3220, radius: 5500 },
];

function circleGeoJSON(lat, lng, r, pts = 64) {
  const E = 6371000, coords = [];
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * 2 * Math.PI;
    const dLat = (r * Math.sin(a) / E) * (180 / Math.PI);
    const dLng = (r * Math.cos(a) / (E * Math.cos(lat * Math.PI / 180))) * (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] } };
}

export default function MapPage({ cartCount = 0, onAreaSelect }) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (window.maplibregl) { setReady(true); return; }
    const css = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.css" });
    document.head.appendChild(css);
    const js = Object.assign(document.createElement("script"), { src: "https://unpkg.com/maplibre-gl@4.1.2/dist/maplibre-gl.js", onload: () => setReady(true) });
    document.head.appendChild(js);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || mapInst.current) return;
    const map = new window.maplibregl.Map({
      container: mapRef.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center: [35.325, 32.945], zoom: 10.5, minZoom: 9, maxZoom: 15,
    });
    mapInst.current = map;

    map.on("load", () => {
      AREAS.forEach(area => {
        map.addSource(`c-${area.id}`, { type: "geojson", data: circleGeoJSON(area.lat, area.lng, area.radius) });
        map.addLayer({ id: `cf-${area.id}`, type: "fill",   source: `c-${area.id}`, paint: { "fill-color": C.red, "fill-opacity": 0 } });
        map.addLayer({ id: `cl-${area.id}`, type: "line",   source: `c-${area.id}`, paint: { "line-color": C.red, "line-width": 0 } });

        const el = document.createElement("div");
        el.id = `pin-${area.id}`;
        el.className = "yg-pin";
        el.innerHTML = `<div class="yg-pin-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="${C.red}"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div><div class="yg-pin-tail"></div><div class="yg-pin-label">${area.short}</div>`;
        el.addEventListener("click", e => { e.stopPropagation(); handleSelect(area, map); });
        new window.maplibregl.Marker({ element: el }).setLngLat([area.lng, area.lat]).addTo(map);
      });
    });

    map.on("click", () => handleDeselect(map));
    return () => { map.remove(); mapInst.current = null; };
  }, [ready]);

  function handleSelect(area, map) {
    AREAS.forEach(a => { setPinActive(a.id, false); map.setPaintProperty(`cf-${a.id}`, "fill-opacity", 0); map.setPaintProperty(`cl-${a.id}`, "line-width", 0); });
    setPinActive(area.id, true);
    map.setPaintProperty(`cf-${area.id}`, "fill-opacity", 0.1);
    map.setPaintProperty(`cl-${area.id}`, "line-width", 2);
    map.easeTo({ center: [area.lng, area.lat - 0.03], zoom: 11.5, duration: 400 });
    setSelected(area);
  }

  function handleDeselect(map) {
    AREAS.forEach(a => { setPinActive(a.id, false); map.setPaintProperty(`cf-${a.id}`, "fill-opacity", 0); map.setPaintProperty(`cl-${a.id}`, "line-width", 0); });
    setSelected(null);
  }

  function setPinActive(id, active) {
    const el = document.getElementById(`pin-${id}`); if (!el) return;
    const circle = el.querySelector(".yg-pin-circle"), label = el.querySelector(".yg-pin-label");
    if (circle) { circle.style.background = active ? C.red : "white"; circle.style.transform = active ? "scale(1.25)" : "scale(1)"; circle.querySelector("svg path").setAttribute("fill", active ? "white" : C.red); }
    if (label)  { label.style.background = active ? C.red : "white"; label.style.color = active ? "white" : C.dark; }
  }

  return (
    <div style={{ position: "fixed", inset: 0, fontFamily: "Arial,sans-serif", direction: "rtl" }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes slideUp { from { transform:translateY(110%);opacity:0 } to { transform:translateY(0);opacity:1 } }
        @keyframes pinPop  { 0%{transform:scale(0.4);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        .mBtn:active{transform:scale(0.91)}
        .yg-pin{display:flex;flex-direction:column;align-items:center;animation:pinPop 0.3s ease;cursor:pointer}
        .yg-pin-circle{width:38px;height:38px;border-radius:50%;background:white;border:2.5px solid ${C.red};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(200,16,46,0.25);transition:all 0.18s cubic-bezier(0.34,1.3,0.64,1)}
        .yg-pin-tail{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${C.red};margin-top:-1px}
        .yg-pin-label{margin-top:3px;background:white;color:${C.dark};font-size:9px;font-weight:700;padding:2px 7px;border-radius:7px;white-space:nowrap;border:1.5px solid ${C.red};box-shadow:0 1px 5px rgba(0,0,0,0.12);transition:all 0.2s ease}
      `}</style>

      <div style={{ position:"absolute",top:0,left:0,right:0,zIndex:1000,background:"white",boxShadow:"0 1px 8px rgba(0,0,0,0.08)",padding:"12px 16px",display:"flex",alignItems:"center",gap:12 }}>
        <button className="mBtn" onClick={() => navigate(-1)} style={{ background:"#F3F4F6",border:"none",borderRadius:12,width:38,height:38,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex:1,textAlign:"center" }}>
          <div style={{ fontSize:16,fontWeight:900,color:C.dark }}>בחר אזור משלוח</div>
          <div style={{ fontSize:11,marginTop:1,color:selected?C.red:C.gray,fontWeight:selected?800:400,transition:"color 0.25s" }}>{selected ? `✓ ${selected.short}` : "לחץ על סמן האזור שלך"}</div>
        </div>
        <div style={{ width:38 }}/>
      </div>

      <div ref={mapRef} style={{ position:"absolute",top:62,left:0,right:0,bottom:80 }}/>

      {!ready && (
        <div style={{ position:"absolute",inset:0,zIndex:600,background:"white",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14 }}>
          <div style={{ width:44,height:44,borderRadius:"50%",border:"3px solid rgba(200,16,46,0.15)",borderTopColor:C.red,animation:"spin 0.8s linear infinite" }}/>
          <div style={{ color:C.gray,fontSize:13,fontWeight:700 }}>טוען מפה...</div>
        </div>
      )}

      <div style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",zIndex:900,display:"flex",flexDirection:"column",gap:6 }}>
        {[["+",1],["-",-1]].map(([l,d]) => (
          <button key={l} className="mBtn" onClick={() => mapInst.current?.zoomTo((mapInst.current.getZoom()||11)+d)}
            style={{ background:"white",border:"1px solid #E5E7EB",borderRadius:10,width:36,height:36,color:C.dark,fontSize:18,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
            {l}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ position:"absolute",bottom:80,left:0,right:0,zIndex:1000,background:"white",borderRadius:"22px 22px 0 0",padding:"14px 20px 18px",boxShadow:"0 -6px 28px rgba(0,0,0,0.13)",animation:"slideUp 0.32s cubic-bezier(0.34,1.1,0.64,1)" }}>
          <div style={{ width:36,height:4,background:"#E5E7EB",borderRadius:2,margin:"0 auto 12px" }}/>
          <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:14 }}>
            <div style={{ width:46,height:46,borderRadius:13,flexShrink:0,background:"rgba(200,16,46,0.07)",border:"1.5px solid rgba(200,16,46,0.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill={C.red}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:900,color:C.dark,lineHeight:1.5 }}>{selected.name}</div>
              <div style={{ fontSize:11,color:"#16a34a",fontWeight:700,marginTop:3 }}>✓ אזור פעיל • משלוח זמין</div>
            </div>
            <button onClick={() => handleDeselect(mapInst.current)} style={{ background:"#F3F4F6",border:"none",borderRadius:"50%",width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:C.gray,flexShrink:0 }}>✕</button>
          </div>
          <button className="mBtn" onClick={() => { onAreaSelect?.(selected); navigate(-1); }}
            style={{ width:"100%",background:`linear-gradient(135deg,${C.red},#a00020)`,border:"none",borderRadius:16,padding:"15px",color:"white",fontSize:15,fontWeight:900,cursor:"pointer",boxShadow:"0 4px 18px rgba(200,16,46,0.35)" }}>
            בחר {selected.short} ←
          </button>
        </div>
      )}

      <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:999 }}>
        <BottomNav cartCount={cartCount}/>
      </div>
    </div>
  );
}
