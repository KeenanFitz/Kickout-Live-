/* =========================
   VARIABLES & INITIAL STATE
============================ */
let data = JSON.parse(localStorage.getItem("kickoutData")) || [];
let firstHalf = true;
let selectedPlayer = null;
let kickoutWon = true;
let lastPrediction = null;
let lastConfidence = 0;
let alertCooldown = false;
let simpleView = false;

const AUTO_SIMPLE_THRESHOLD = 60;
const MAX_RECENT = 10;
const zoneFlip = { "1":"6","2":"5","3":"4","4":"3","5":"2","6":"1" };

/* =========================
   ELEMENT REFERENCES
============================ */
const predictionText = document.getElementById("prediction");
const zones = document.querySelectorAll(".zone");
const lostToggle = document.getElementById("lostToggle");
const simpleToggle = document.getElementById("simpleViewToggle");
const clearDataBtn = document.getElementById("clearDataBtn");
const playerGrid = document.getElementById("playerGrid");

/* =========================
   PLAYER BUTTONS 1-30
============================ */
for (let i=1;i<=30;i++){
  const btn=document.createElement("button");
  btn.textContent=i;
  btn.className="playerBtn";
  btn.onclick=()=>{ 
    selectedPlayer=i;
    document.querySelectorAll(".playerBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  };
  playerGrid.appendChild(btn);
}

/* =========================
   LOST TOGGLE
============================ */
lostToggle.onclick=()=>{
  kickoutWon=!kickoutWon;
  lostToggle.className=kickoutWon?"won":"lost";
  lostToggle.textContent=kickoutWon?"Kickout WON":"Kickout LOST";
};

/* =========================
   SIMPLE VIEW TOGGLE
============================ */
simpleToggle.onclick=()=>{
  simpleView=!simpleView;
  document.body.classList.toggle("simple",simpleView);
  simpleToggle.textContent=simpleView?"Exit Simple View":"Simple View";
};

/* =========================
   CLEAR DATA
============================ */
clearDataBtn.onclick=()=>{
  if(confirm("Clear all match data?")){
    data=[];
    localStorage.removeItem("kickoutData");
    predictionText.textContent="Data cleared. Ready.";
    document.querySelectorAll(".zone").forEach(z=>z.style.backgroundColor="rgba(27,94,32,0.2)");
  }
};

/* =========================
   HALFTIME
============================ */
function toggleHalftime(){
  firstHalf=!firstHalf;
  document.getElementById("halfStatus").textContent=firstHalf?"First Half":"Second Half";
}

/* =========================
   ZONE CLICK HANDLER
============================ */
zones.forEach(zone=>{
  zone.onclick=()=>{
    const call=document.getElementById("callInput").value.trim().toUpperCase();
    const setup=document.getElementById("setupInput").value;
    const rawZone=zone.dataset.zone;
    const zoneNum=firstHalf?rawZone:zoneFlip[rawZone];

    if(!call || !setup) return alert("Enter call & setup");
    if(kickoutWon && !selectedPlayer) return alert("Select winner");

    // Pattern broken alert
    if(lastPrediction && lastConfidence>=60 && zoneNum!==lastPrediction && !alertCooldown){
      triggerPatternBroken();
    }

    // Save kickout
    data.push({
      call, setup, zone:zoneNum,
      player:kickoutWon?selectedPlayer:null,
      won:kickoutWon, time:Date.now()
    });
    localStorage.setItem("kickoutData",JSON.stringify(data));

    // Update prediction + heatmap
    updatePrediction();
    
    // Reset selection
    selectedPlayer=null;
    document.querySelectorAll(".playerBtn").forEach(b=>b.classList.remove("active"));
    kickoutWon=true;
    lostToggle.className="won";
    lostToggle.textContent="Kickout WON";
  };
});

/* =========================
   PATTERN RECOGNITION & HEATMAP
============================ */
function updatePrediction(){
  const call=document.getElementById("callInput").value.trim().toUpperCase();
  const setup=document.getElementById("setupInput").value;

  // Filter by multiple categories (call + setup) and won kickouts
  const recent=data.filter(d=>d.call===call && d.setup===setup && d.won).slice(-MAX_RECENT);

  if(recent.length<3){
    predictionText.textContent="Building pattern…";
    resetHeatMap();
    return;
  }

  // Count zones
  const counts={};
  recent.forEach(d=>counts[d.zone]=(counts[d.zone]||0)+1);
  const bestZone=Object.keys(counts).reduce((a,b)=>counts[a]>counts[b]?a:b);
  const confidence=Math.round((counts[bestZone]/recent.length)*100);

  // Update prediction text
  predictionText.textContent=`${call} → Zone ${bestZone} (${confidence}%)`;

  // Store last for pattern broken
  lastPrediction=bestZone;
  lastConfidence=confidence;

  // Update heatmap
  updateHeatMap(counts);

  // Auto Simple View
  if(confidence>=AUTO_SIMPLE_THRESHOLD && !simpleView){
    simpleView=true;
    document.body.classList.add("simple");
    simpleToggle.textContent="Exit Simple View";
  } else if(confidence<AUTO_SIMPLE_THRESHOLD && simpleView){
    simpleView=false;
    document.body.classList.remove("simple");
    simpleToggle.textContent="Simple View";
  }
}

/* =========================
   HEATMAP UPDATE
============================ */
function updateHeatMap(counts){
  const maxCount=Math.max(...Object.values(counts));
  zones.forEach(z=>{
    const c=counts[z.dataset.zone]||0;
    const intensity=0.2 + (c/maxCount)*0.8;
    z.style.backgroundColor=`rgba(27,94,32,${intensity})`;
  });
}

function resetHeatMap(){
  zones.forEach(z=>z.style.backgroundColor="rgba(27,94,32,0.2)");
}

/* =========================
   PATTERN BROKEN ALERT
============================ */
function triggerPatternBroken(){
  const alertBox=document.getElementById("alertBox");
  alertBox.classList.remove("hidden");
  alertCooldown=true;
  setTimeout(()=>{
    alertBox.classList.add("hidden");
    alertCooldown=false;
  },4000);
}
