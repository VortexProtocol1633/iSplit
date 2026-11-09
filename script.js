/* iSplit — script.js (redesigned)
   Sidebar drawer UI, modal About/Demo, segments mode, fit-to-view preview (no scrollbars),
   mouse-wheel zoom, hover tooltips. Preview/export tiling logic stays consistent. */
(function () {
  'use strict';

  const PAPER_MM = {
    A0:[841,1189], A1:[594,841], A2:[420,594], A3:[297,420], A4:[210,297], A5:[148,210], A6:[105,148],
    Letter:[215.9,279.4], Legal:[215.9,355.6], Tabloid:[279.4,431.8]
  };
  const UNIT_TO_MM = { mm:1, cm:10, in:25.4 };
  const LS_KEY = 'isplit.settings.v1';

  const $ = (id) => document.getElementById(id);
  const els = {
    themeToggle:$('themeToggle'), navToggle:$('navToggle'), navLinks:$('navLinks'),
    openSidebarNav:$('openSidebarNav'), openSidebarHero:$('openSidebarHero'), openSidebarMain:$('openSidebarMain'),
    closeSidebar:$('closeSidebar'), sidebar:$('sidebar'), sidebarBackdrop:$('sidebarBackdrop'),
    openAboutNav:$('openAboutNav'), openAboutHero:$('openAboutHero'), openAboutFooter:$('openAboutFooter'),
    aboutModal:$('aboutModal'), aboutBackdrop:$('aboutBackdrop'), closeAbout:$('closeAbout'),
    dropzone:$('dropzone'), fileInput:$('fileInput'), pdfPageRow:$('pdfPageRow'), pdfPage:$('pdfPage'),
    paperSize:$('paperSize'), orientation:$('orientation'), orientPortrait:$('orientPortrait'), orientLandscape:$('orientLandscape'),
    orientHelp:$('orientHelp'), orientDims:$('orientDims'), customPaper:$('customPaper'),
    customW:$('customW'), customH:$('customH'), unit:$('unit'),
    gridMode:$('gridMode'), segmentsGrid:$('segmentsGrid'), segments:$('segments'), segmentsInfo:$('segmentsInfo'),
    autoGrid:$('autoGrid'), manualGrid:$('manualGrid'), posterW:$('posterW'), posterH:$('posterH'),
    rows:$('rows'), cols:$('cols'), gridInfo:$('gridInfo'),
    zoom:$('zoom'), zoomVal:$('zoomVal'), panX:$('panX'), panXVal:$('panXVal'),
    panY:$('panY'), panYVal:$('panYVal'), rotate:$('rotate'),
    cropX:$('cropX'), cropY:$('cropY'), cropW:$('cropW'), cropH:$('cropH'),
    margin:$('margin'), marginVal:$('marginVal'), gap:$('gap'), gapVal:$('gapVal'), overlap:$('overlap'), overlapVal:$('overlapVal'),
    borders:$('borders'), cropMarks:$('cropMarks'), tileNumbers:$('tileNumbers'), cutGuides:$('cutGuides'), hideExportMarks:$('hideExportMarks'),
    dpi:$('dpi'), quality:$('quality'), qualityVal:$('qualityVal'),
    downloadBtn:$('downloadBtn'), downloadSelectedBtn:$('downloadSelectedBtn'), printBtn:$('printBtn'), resetBtn:$('resetBtn'),
    selectAllBtn:$('selectAllBtn'), clearSelBtn:$('clearSelBtn'),
    fileMeta:$('fileMeta'), progressWrap:$('progressWrap'), progressFill:$('progressFill'), progressText:$('progressText'),
    previewStage:$('previewStage'), previewEmpty:$('previewEmpty'), previewWrap:$('previewWrap'),
    previewCanvas:$('previewCanvas'), gridOverlay:$('gridOverlay'),
    printArea:$('printArea'), tooltip:$('tooltip')
  };

  const state = { source:null, tiles:[], meta:null, excluded:new Set(), renderTimer:null, pdfDoc:null };

  // ---------- Utils ----------
  function clamp(n,min,max){ return Math.min(max, Math.max(min,n)); }
  function toMM(v){ return (parseFloat(v)||0) * (UNIT_TO_MM[els.unit.value]||1); }
  function mmToPx(mm,dpi){ return (mm/25.4)*dpi; }
  function setProgress(pct,text){
    const show = pct !== null;
    els.progressWrap.classList.toggle('hidden', !show);
    if(show){ els.progressFill.style.width = clamp(pct,0,100)+'%'; els.progressText.textContent = text||'Working…'; }
  }
  function updateValueLabels(){
    els.zoomVal.textContent = els.zoom.value+'%';
    els.panXVal.textContent = els.panX.value; els.panYVal.textContent = els.panY.value;
    const u = els.unit.value;
    els.marginVal.textContent = els.margin.value+' '+u;
    els.gapVal.textContent = els.gap.value+' '+u;
    els.overlapVal.textContent = els.overlap.value+' '+u;
    els.qualityVal.textContent = parseFloat(els.quality.value).toFixed(2);
  }
  function getPaperMM(){
    let w,h;
    if(els.paperSize.value==='Custom'){ w=toMM(els.customW.value); h=toMM(els.customH.value); }
    else { const p=PAPER_MM[els.paperSize.value]||PAPER_MM.A4; w=p[0]; h=p[1]; }
    if(els.orientation.value==='landscape'){ const t=w; w=h; h=t; }
    return { w:Math.max(10,w), h:Math.max(10,h) };
  }
  function updateOrientationUI(){
    const isLand = els.orientation.value === 'landscape';
    els.orientPortrait.classList.toggle('active', !isLand);
    els.orientLandscape.classList.toggle('active', isLand);
    const p = getPaperMM();
    if(els.orientDims) els.orientDims.textContent = p.w.toFixed(1)+' × '+p.h.toFixed(1)+' mm';
  }

  // ---------- Settings persistence ----------
  const SETTING_IDS = ['paperSize','orientation','customW','customH','unit','gridMode','segments','posterW','posterH','rows','cols',
    'zoom','panX','panY','rotate','cropX','cropY','cropW','cropH','margin','gap','overlap',
    'borders','cropMarks','tileNumbers','cutGuides','hideExportMarks','dpi','quality'];
  function saveSettings(){
    try{
      const data={};
      SETTING_IDS.forEach(id=>{ const el=els[id]; if(!el) return; data[id]= (el.type==='checkbox'?el.checked:el.value); });
      data.theme = document.documentElement.getAttribute('data-theme')||'light';
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    }catch(_){}
  }
  function loadSettings(){
    try{
      const raw=localStorage.getItem(LS_KEY); if(!raw) return;
      const data=JSON.parse(raw);
      SETTING_IDS.forEach(id=>{ if(!(id in data)) return; const el=els[id]; if(!el) return; if(el.type==='checkbox') el.checked=!!data[id]; else el.value=data[id]; });
      if(data.theme) document.documentElement.setAttribute('data-theme', data.theme);
    }catch(_){}
  }
  function resetSettings(){
    try{ localStorage.removeItem(LS_KEY); }catch(_){}
    els.paperSize.value='A4'; els.orientation.value='portrait'; els.unit.value='mm';
    els.customW.value=210; els.customH.value=297;
    els.gridMode.value='segments'; els.segments.value=4; els.posterW.value=594; els.posterH.value=841;
    els.rows.value=2; els.cols.value=2;
    els.zoom.value=100; els.panX.value=0; els.panY.value=0; els.rotate.value='0';
    els.cropX.value=0; els.cropY.value=0; els.cropW.value=100; els.cropH.value=100;
    els.margin.value=10; els.gap.value=0; els.overlap.value=0;
    els.borders.checked=true; els.cropMarks.checked=false; els.tileNumbers.checked=true; els.cutGuides.checked=false; els.hideExportMarks.checked=true;
    els.dpi.value='300'; els.quality.value='0.92';
    state.excluded.clear();
    syncUI(); scheduleRender(); saveSettings();
  }

  // ---------- Theme ----------
  function initTheme(){
    const saved = (()=>{ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'{}').theme; }catch(_){ return null; } })();
    if(saved) document.documentElement.setAttribute('data-theme', saved);
    else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme','dark');
  }
  function toggleTheme(){
    const cur=document.documentElement.getAttribute('data-theme')||'light';
    document.documentElement.setAttribute('data-theme', cur==='dark'?'light':'dark');
    saveSettings();
  }

  // ---------- UI sync ----------
  function syncUI(){
    els.customPaper.classList.toggle('hidden', els.paperSize.value!=='Custom');
    const mode=els.gridMode.value;
    els.segmentsGrid.classList.toggle('hidden', mode!=='segments');
    els.manualGrid.classList.toggle('hidden', mode!=='manual');
    els.autoGrid.classList.toggle('hidden', mode!=='auto');
    updateValueLabels();
    updateOrientationUI();
  }

  // ---------- Source preparation ----------
  function getPreparedSource(){
    if(!state.source || !state.source.element) return null;
    const src=state.source.element;
    const rot=parseInt(els.rotate.value,10)||0;
    const cX=clamp(parseFloat(els.cropX.value)||0,0,90)/100;
    const cY=clamp(parseFloat(els.cropY.value)||0,0,90)/100;
    const cW=clamp(parseFloat(els.cropW.value)||100,10,100)/100;
    const cH=clamp(parseFloat(els.cropH.value)||100,10,100)/100;
    let sw=src.width*cW, sh=src.height*cH, sx=src.width*cX, sy=src.height*cY;
    if(sx+sw>src.width) sw=src.width-sx; if(sy+sh>src.height) sh=src.height-sy;
    sw=Math.max(1,sw); sh=Math.max(1,sh);
    const c=document.createElement('canvas'); const ctx=c.getContext('2d');
    if(rot===90||rot===270){ c.width=Math.round(sh); c.height=Math.round(sw); } else { c.width=Math.round(sw); c.height=Math.round(sh); }
    ctx.save();
    if(rot===90){ ctx.translate(c.width,0); ctx.rotate(Math.PI/2); }
    else if(rot===180){ ctx.translate(c.width,c.height); ctx.rotate(Math.PI); }
    else if(rot===270){ ctx.translate(0,c.height); ctx.rotate(-Math.PI/2); }
    ctx.drawImage(src,sx,sy,sw,sh,0,0,sw,sh);
    ctx.restore();
    return c;
  }

  // ---------- Segments -> best rows/cols ----------
  function bestGridForSegments(n, aspect){
    n = clamp(parseInt(n,10)||1,1,400);
    const ar = Math.max(0.01, aspect || 1);
    let best={r:1,c:n,score:Infinity};
    for(let r=1;r<=n;r++){
      const c=Math.ceil(n/r);
      const gridAr=c/r;
      // prefer aspect match, then minimal extra tiles, then closeness
      const extra=r*c-n;
      const score = Math.abs(Math.log(gridAr/ar)) + extra*0.05 + Math.abs(r*c-n)*0.001;
      if(score<best.score) best={r,c,score,extra};
    }
    return best;
  }

  // ---------- Tiling ----------
  function computeTiles(prepared){
    if(!prepared) return {tiles:[], meta:null};
    const paper=getPaperMM();
    const dpi=parseInt(els.dpi.value,10)||300;
    const marginMM=Math.max(0,toMM(els.margin.value));
    const gapMM=Math.max(0,toMM(els.gap.value));
    const overlapMM=Math.max(0,toMM(els.overlap.value));
    const zoom=(parseFloat(els.zoom.value)||100)/100;
    const panX=(parseFloat(els.panX.value)||0)/100;
    const panY=(parseFloat(els.panY.value)||0)/100;

    const pageWpx=mmToPx(paper.w,dpi), pageHpx=mmToPx(paper.h,dpi);
    const marginPx=mmToPx(marginMM,dpi);
    const printW=Math.max(10,pageWpx-marginPx*2), printH=Math.max(10,pageHpx-marginPx*2);
    const overlapPx=mmToPx(overlapMM,dpi);
    const gapPx=mmToPx(gapMM,dpi);
    const stepW=Math.max(10,printW-overlapPx+gapPx), stepH=Math.max(10,printH-overlapPx+gapPx);

    let rows, cols;
    const mode=els.gridMode.value;
    if(mode==='manual'){
      rows=clamp(parseInt(els.rows.value,10)||1,1,100); cols=clamp(parseInt(els.cols.value,10)||1,1,100);
      if(els.segmentsInfo) els.segmentsInfo.textContent='Manual grid in use.';
    } else if(mode==='segments'){
      const n=clamp(parseInt(els.segments.value,10)||1,1,400);
      const best=bestGridForSegments(n, prepared.width/prepared.height);
      rows=best.r; cols=best.c;
      if(els.segmentsInfo) els.segmentsInfo.textContent=`${n} segments → best fit: ${rows} row${rows>1?'s':''} × ${cols} column${cols>1?'s':''} (${rows*cols} tiles).`;
    } else { // auto
      const posterWpx=mmToPx(Math.max(10,toMM(els.posterW.value)), dpi);
      const posterHpx=mmToPx(Math.max(10,toMM(els.posterH.value)), dpi);
      cols=Math.max(1,Math.ceil((posterWpx+overlapPx-gapPx)/stepW));
      rows=Math.max(1,Math.ceil((posterHpx+overlapPx-gapPx)/stepH));
      if(els.segmentsInfo) els.segmentsInfo.textContent='Auto mode calculates from poster size.';
    }

    const totalW=Math.max(printW, cols*stepW+overlapPx-gapPx), totalH=Math.max(printH, rows*stepH+overlapPx-gapPx);
    const baseScale=Math.max(totalW/prepared.width, totalH/prepared.height);
    const scale=baseScale*zoom;
    const drawW=prepared.width*scale, drawH=prepared.height*scale;
    const offX=(totalW-drawW)/2 + panX*(Math.abs(totalW-drawW)/2 + totalW*0.25);
    const offY=(totalH-drawH)/2 + panY*(Math.abs(totalH-drawH)/2 + totalH*0.25);

    const tiles=[];
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      tiles.push({ index:tiles.length,row:r,col:c,rows,cols, sx:c*stepW,sy:r*stepH,sw:printW,sh:printH, pageWpx,pageHpx,marginPx,printW,printH,dpi,paper });
    }
    const meta={ prepared,drawW,drawH,offX,offY,totalW,totalH,rows,cols,paper,dpi,marginMM,gapMM,overlapMM };
    els.gridInfo.textContent=`Grid: ${cols} × ${rows} (${tiles.length} tiles) — paper ${paper.w.toFixed(1)}×${paper.h.toFixed(1)} mm at ${dpi} DPI.`;
    return {tiles, meta};
  }

  function renderTile(tile, meta, opts){
    const o = opts || {};
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(tile.pageWpx)); c.height=Math.max(1,Math.round(tile.pageHpx));
    const ctx=c.getContext('2d');
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,c.width,c.height);
    const m=tile.marginPx;
    ctx.save(); ctx.beginPath(); ctx.rect(m,m,tile.printW,tile.printH); ctx.clip();
    const dx=m + meta.offX - tile.sx; const dy=m + meta.offY - tile.sy;
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(meta.prepared, dx, dy, meta.drawW, meta.drawH);
    ctx.restore();
    drawGuides(ctx,tile,o);
    return c;
  }
  function drawGuides(ctx,tile,opts){
    const o = opts || {};
    const m=tile.marginPx,w=tile.printW,h=tile.printH,x=m,y=m;
    ctx.save(); ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.fillStyle='rgba(0,0,0,0.75)';
    ctx.lineWidth=Math.max(1,tile.dpi/150);
    if(els.borders.checked) ctx.strokeRect(x,y,w,h);
    if(els.cutGuides.checked){ ctx.setLineDash([Math.max(4,tile.dpi/60),Math.max(3,tile.dpi/80)]); ctx.strokeRect(x,y,w,h); ctx.setLineDash([]); }
    if(els.cropMarks.checked){
      const len=Math.min(m*0.6, mmToPx(4,tile.dpi)); const op=Math.max(1,tile.dpi/200);
      ctx.beginPath();
      [[x,y,-1,-1],[x+w,y,1,-1],[x,y+h,-1,1],[x+w,y+h,1,1]].forEach(([cx,cy,dx,dy])=>{ ctx.moveTo(cx+dx*op,cy); ctx.lineTo(cx+dx*(op+len),cy); ctx.moveTo(cx,cy+dy*op); ctx.lineTo(cx,cy+dy*(op+len)); });
      ctx.stroke();
    }
    const showNumbers = els.tileNumbers.checked && !(o.forExport && els.hideExportMarks && els.hideExportMarks.checked);
    if(showNumbers){
      const label=`${tile.row+1}-${tile.col+1}  (${tile.index+1}/${tile.rows*tile.cols})`;
      const fontSize=Math.max(10,Math.min(18,tile.dpi/18)); ctx.font=`600 ${fontSize}px system-ui, sans-serif`;
      const pad=fontSize*0.4, tw=ctx.measureText(label).width;
      ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillRect(x+2,y+2,tw+pad*2,fontSize+pad);
      ctx.fillStyle='#111827'; ctx.fillText(label,x+2+pad,y+2+fontSize-pad*0.2);
    }
    ctx.restore();
  }

  // ---------- Preview (fit, no scrollbars) ----------
  function syncOverlayToDisplay(){
    if(!state.meta || !els.previewCanvas.width) return;
    const cw=els.previewCanvas.clientWidth, ch=els.previewCanvas.clientHeight;
    if(!cw||!ch) return;
    // Align overlay to the canvas' actual position inside the (flex-centered) wrap so all segments stay visible/aligned.
    const wrapRect=els.previewWrap.getBoundingClientRect();
    const canvasRect=els.previewCanvas.getBoundingClientRect();
    const offLeft=canvasRect.left - wrapRect.left;
    const offTop=canvasRect.top - wrapRect.top;
    const sx=cw/els.previewCanvas.width, sy=ch/els.previewCanvas.height;
    els.gridOverlay.style.left=offLeft+'px'; els.gridOverlay.style.top=offTop+'px';
    els.gridOverlay.style.width=cw+'px'; els.gridOverlay.style.height=ch+'px';
    const children=els.gridOverlay.children;
    state.tiles.forEach((tile,i)=>{
      const div=children[i]; if(!div) return;
      div.style.left=(tile._dx*sx)+'px'; div.style.top=(tile._dy*sy)+'px';
      div.style.width=(tile._dw*sx)+'px'; div.style.height=(tile._dh*sy)+'px';
    });
  }
  function renderPreview(){
    if(!state.source) return;
    setProgress(5,'Rendering preview…');
    setTimeout(()=>{
      try{
        const prepared=getPreparedSource();
        if(!prepared){ setProgress(null); return; }
        const {tiles,meta}=computeTiles(prepared);
        state.tiles=tiles; state.meta=meta;
        state.excluded.forEach(i=>{ if(i>=tiles.length) state.excluded.delete(i); });

        const maxDim=1400;
        const scale=Math.min(1, maxDim/Math.max(meta.totalW,meta.totalH,1));
        const pw=Math.max(1,Math.round(meta.totalW*scale)), ph=Math.max(1,Math.round(meta.totalH*scale));
        const pCanvas=els.previewCanvas; pCanvas.width=pw; pCanvas.height=ph;
        const pctx=pCanvas.getContext('2d');
        pctx.fillStyle='#ffffff'; pctx.fillRect(0,0,pw,ph);
        pctx.imageSmoothingEnabled=true; pctx.imageSmoothingQuality='high';
        pctx.drawImage(prepared, meta.offX*scale, meta.offY*scale, meta.drawW*scale, meta.drawH*scale);

        els.gridOverlay.innerHTML='';
        tiles.forEach(tile=>{
          tile._dx=tile.sx*scale; tile._dy=tile.sy*scale; tile._dw=tile.sw*scale; tile._dh=tile.sh*scale;
          const div=document.createElement('div');
          div.className='tile'+(state.excluded.has(tile.index)?' excluded':'');
          div.textContent=(tile.index+1);
          const label=`Tile ${tile.row+1}-${tile.col+1} (click to ${state.excluded.has(tile.index)?'include':'exclude'})`;
          div.title=label; div.setAttribute('role','button'); div.setAttribute('tabindex','0'); div.setAttribute('aria-label',label);
          div.setAttribute('data-tip', label);
          const toggle=()=>{ if(state.excluded.has(tile.index)) state.excluded.delete(tile.index); else state.excluded.add(tile.index); renderPreview(); };
          div.addEventListener('click', toggle);
          div.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
          els.gridOverlay.appendChild(div);
        });
        els.previewEmpty.classList.add('hidden'); els.previewWrap.classList.remove('hidden');
        // sync overlay after layout
        requestAnimationFrame(syncOverlayToDisplay);
        const enabled=tiles.length>0;
        els.downloadBtn.disabled=!enabled;
        els.downloadSelectedBtn.disabled=!enabled || state.excluded.size===tiles.length;
        els.printBtn.disabled=!enabled; els.selectAllBtn.disabled=!enabled; els.clearSelBtn.disabled=!enabled;
        const selCount=tiles.length-state.excluded.size;
        els.fileMeta.textContent=`${state.source.name} — ${tiles.length} tiles (${selCount} selected)`;
        setProgress(100,'Preview ready'); setTimeout(()=>setProgress(null),350);
      }catch(err){ setProgress(null); els.fileMeta.textContent='Preview error: '+(err&&err.message?err.message:'unknown'); }
    },30);
  }
  function scheduleRender(){ if(!state.source) return; clearTimeout(state.renderTimer); state.renderTimer=setTimeout(renderPreview,120); }

  // ---------- File loading ----------
  async function loadFile(file){
    if(!file) return;
    state.excluded.clear(); els.pdfPage.innerHTML=''; els.pdfPageRow.classList.add('hidden'); state.pdfDoc=null;
    setProgress(10,'Loading file…');
    try{
      if(file.type==='application/pdf' || /\.pdf$/i.test(file.name)) await loadPDF(file);
      else if(/^image\/(jpeg|jpg|png)$/i.test(file.type)) await loadImage(file);
      else { setProgress(null); els.fileMeta.textContent='Unsupported file type. Please use JPG, PNG, or PDF.'; }
    }catch(err){ setProgress(null); els.fileMeta.textContent='Could not load file: '+(err&&err.message?err.message:'unknown'); }
  }
  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file); const img=new Image();
      img.onload=()=>{ state.source={type:'image',name:file.name,width:img.width,height:img.height,element:img}; URL.revokeObjectURL(url); renderPreview(); resolve(); };
      img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('Image failed to load')); };
      img.src=url;
    });
  }
  async function loadPDF(file){
    if(!window.pdfjsLib) throw new Error('PDF library is still loading. Please try again.');
    if(!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    setProgress(20,'Reading PDF…');
    const buf=await file.arrayBuffer();
    const doc=await pdfjsLib.getDocument({data:buf}).promise;
    state.pdfDoc=doc; state.source={type:'pdf',name:file.name,pdfDoc:doc,pageNum:1,element:null,width:0,height:0};
    els.pdfPage.innerHTML='';
    for(let i=1;i<=doc.numPages;i++){ const opt=document.createElement('option'); opt.value=i; opt.textContent='Page '+i+' of '+doc.numPages; els.pdfPage.appendChild(opt); }
    els.pdfPageRow.classList.toggle('hidden', doc.numPages<=1);
    await renderPDFPage(1);
  }
  async function renderPDFPage(num){
    if(!state.pdfDoc) return;
    setProgress(35,'Rendering PDF page…');
    const page=await state.pdfDoc.getPage(num);
    const baseViewport=page.getViewport({scale:1});
    const scale=Math.min(3, 2600/Math.max(baseViewport.width,baseViewport.height,1));
    const viewport=page.getViewport({scale});
    const canvas=document.createElement('canvas'); canvas.width=Math.round(viewport.width); canvas.height=Math.round(viewport.height);
    await page.render({canvasContext:canvas.getContext('2d'), viewport}).promise;
    state.source.element=canvas; state.source.width=canvas.width; state.source.height=canvas.height; state.source.pageNum=num;
    renderPreview();
  }

  // ---------- Output ----------
  function getActiveTiles(){ return state.tiles.filter(t=>!state.excluded.has(t.index)); }
  async function generatePDF(onlySelected){
    if(!state.source||!state.tiles.length) return;
    const {jsPDF}=window.jspdf||{};
    if(!jsPDF){ els.fileMeta.textContent='PDF export library is still loading. Please try again.'; return; }
    setProgress(0,'Preparing PDF…'); await new Promise(r=>setTimeout(r,30));
    const prepared=getPreparedSource();
    if(!prepared){ setProgress(null); els.fileMeta.textContent='Could not prepare the image for export.'; return; }
    const {tiles: allTiles, meta}=computeTiles(prepared);
    const tiles=onlySelected?allTiles.filter(t=>!state.excluded.has(t.index)):allTiles;
    if(!tiles.length){ setProgress(null); els.fileMeta.textContent='No tiles selected to export.'; return; }
    const paper=meta.paper; const orient=paper.w>paper.h?'landscape':'portrait';
    const w=orient==='landscape'?paper.h:paper.w; const h=orient==='landscape'?paper.w:paper.h;
    const doc=new jsPDF({orientation:orient, unit:'mm', format:[w,h], compress:true});
    const q=clamp(parseFloat(els.quality.value)||0.92,0.5,1);
    for(let i=0;i<tiles.length;i++){
      setProgress((i/tiles.length)*100, `Rendering tile ${i+1} of ${tiles.length}…`);
      await new Promise(r=>setTimeout(r,0));
      const canvas=renderTile(tiles[i], meta, { forExport:true });
      if(i>0) doc.addPage([w,h], orient);
      doc.addImage(canvas.toDataURL('image/jpeg',q), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    }
    setProgress(100,'Saving PDF…'); doc.save(`isplit${onlySelected?'-selected':''}.pdf`);
    setTimeout(()=>setProgress(null),500);
  }
  async function printTiles(){
    if(!state.source||!state.tiles.length) return;
    setProgress(0,'Preparing print…'); await new Promise(r=>setTimeout(r,30));
    const prepared=getPreparedSource();
    if(!prepared){ setProgress(null); els.fileMeta.textContent='Could not prepare the image for printing.'; return; }
    const {tiles: allTiles, meta}=computeTiles(prepared);
    const selected=allTiles.filter(t=>!state.excluded.has(t.index));
    const tiles=selected.length?selected:allTiles;
    const paper=meta.paper; const q=clamp(parseFloat(els.quality.value)||0.92,0.5,1);
    let style=document.getElementById('printPageStyle');
    if(!style){ style=document.createElement('style'); style.id='printPageStyle'; document.head.appendChild(style); }
    style.textContent=`@page{size:${paper.w}mm ${paper.h}mm;margin:0} @media print{#printArea .print-page{width:${paper.w}mm;height:${paper.h}mm;}}`;
    els.printArea.innerHTML='';
    for(let i=0;i<tiles.length;i++){
      setProgress((i/tiles.length)*100, `Preparing tile ${i+1} of ${tiles.length}…`);
      await new Promise(r=>setTimeout(r,0));
      const canvas=renderTile(tiles[i], meta, { forExport:true });
      const page=document.createElement('div'); page.className='print-page';
      const img=document.createElement('img'); img.alt=`Tile ${tiles[i].row+1}-${tiles[i].col+1}`; img.src=canvas.toDataURL('image/jpeg',q);
      page.appendChild(img); els.printArea.appendChild(page);
    }
    setProgress(100,'Opening print dialog…'); setTimeout(()=>{ setProgress(null); window.print(); },250);
  }

  // ---------- Sidebar & Modal ----------
  function openSidebar(){ els.sidebar.classList.add('open'); els.sidebar.setAttribute('aria-hidden','false'); els.sidebarBackdrop.classList.add('open'); document.body.classList.add('tools-open'); requestAnimationFrame(syncOverlayToDisplay); }
  function closeSidebar(){ els.sidebar.classList.remove('open'); els.sidebar.setAttribute('aria-hidden','true'); els.sidebarBackdrop.classList.remove('open'); document.body.classList.remove('tools-open'); requestAnimationFrame(syncOverlayToDisplay); }
  function toggleSidebar(){ if(els.sidebar.classList.contains('open')) closeSidebar(); else openSidebar(); }
  let lastFocus=null;
  function openAbout(){
    lastFocus=document.activeElement; els.aboutModal.classList.remove('hidden'); els.aboutModal.setAttribute('aria-hidden','false');
    els.closeAbout.focus();
  }
  function closeAbout(){
    els.aboutModal.classList.add('hidden'); els.aboutModal.setAttribute('aria-hidden','true');
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // ---------- Tooltips ----------
  let tipTimer=null;
  function showTip(text,x,y){
    if(!text||!els.tooltip) return;
    els.tooltip.textContent=text;
    const pad=12; let tx=x+pad, ty=y+pad;
    els.tooltip.classList.add('show');
    const r=els.tooltip.getBoundingClientRect();
    if(tx+r.width>window.innerWidth-8) tx=x-r.width-pad;
    if(ty+r.height>window.innerHeight-8) ty=y-r.height-pad;
    els.tooltip.style.left=Math.max(8,tx)+'px'; els.tooltip.style.top=Math.max(8,ty)+'px';
  }
  function hideTip(){ if(els.tooltip) els.tooltip.classList.remove('show'); clearTimeout(tipTimer); }
  function bindTooltips(){
    document.addEventListener('mouseover',(e)=>{
      const t=e.target.closest('[data-tip]'); if(!t) return;
      clearTimeout(tipTimer); tipTimer=setTimeout(()=>showTip(t.getAttribute('data-tip'), e.clientX, e.clientY), 350);
    });
    document.addEventListener('mousemove',(e)=>{
      if(!els.tooltip.classList.contains('show')) return;
      const t=e.target.closest('[data-tip]'); if(t) showTip(t.getAttribute('data-tip'), e.clientX, e.clientY);
    });
    document.addEventListener('mouseout',(e)=>{
      if(e.target.closest && e.target.closest('[data-tip]')) hideTip();
    });
    document.addEventListener('focusin',(e)=>{
      const t=e.target.closest('[data-tip]'); if(!t) return;
      const r=t.getBoundingClientRect(); showTip(t.getAttribute('data-tip'), r.left+r.width/2, r.bottom);
    });
    document.addEventListener('focusout', hideTip);
    document.addEventListener('scroll', hideTip, true);
  }

  // ---------- Bindings ----------
  function bindUpload(){
    const dz=els.dropzone, openPicker=()=>els.fileInput.click();
    dz.addEventListener('click',openPicker);
    dz.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openPicker(); } });
    els.fileInput.addEventListener('change',(e)=>{ if(e.target.files&&e.target.files[0]) loadFile(e.target.files[0]); e.target.value=''; });
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,(e)=>{ e.preventDefault(); dz.classList.add('dragover'); }));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,(e)=>{ e.preventDefault(); dz.classList.remove('dragover'); }));
    dz.addEventListener('drop',(e)=>{ const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]; if(f) loadFile(f); });
  }
  function bindSettings(){
    const rerenderIds=['paperSize','customW','customH','unit','gridMode','segments','posterW','posterH','rows','cols',
      'zoom','panX','panY','rotate','cropX','cropY','cropW','cropH','margin','gap','overlap','borders','cropMarks','tileNumbers','cutGuides','hideExportMarks','dpi','quality'];
    rerenderIds.forEach(id=>{ const el=els[id]; if(!el) return; const h=()=>{ syncUI(); saveSettings(); scheduleRender(); }; el.addEventListener('input',h); el.addEventListener('change',h); });
    els.pdfPage.addEventListener('change', async ()=>{ state.excluded.clear(); await renderPDFPage(parseInt(els.pdfPage.value,10)||1); });
    [els.orientPortrait, els.orientLandscape].forEach(btn=>btn.addEventListener('click',()=>{
      els.orientation.value=btn.getAttribute('data-orient'); syncUI(); saveSettings(); scheduleRender();
    }));
  }
  function bindActions(){
    els.downloadBtn.addEventListener('click',()=>generatePDF(false));
    els.downloadSelectedBtn.addEventListener('click',()=>generatePDF(true));
    els.printBtn.addEventListener('click',printTiles);
    els.resetBtn.addEventListener('click',resetSettings);
    els.selectAllBtn.addEventListener('click',()=>{ state.excluded.clear(); renderPreview(); });
    els.clearSelBtn.addEventListener('click',()=>{ state.tiles.forEach(t=>state.excluded.add(t.index)); renderPreview(); });
    els.themeToggle.addEventListener('click',toggleTheme);
    [els.openSidebarNav,els.openSidebarHero,els.openSidebarMain].forEach(b=>b&&b.addEventListener('click',()=>{ closeNav(); openSidebar(); }));
    els.closeSidebar.addEventListener('click',closeSidebar);
    els.sidebarBackdrop.addEventListener('click',closeSidebar);
    [els.openAboutNav,els.openAboutHero,els.openAboutFooter].forEach(b=>b&&b.addEventListener('click',()=>{ closeNav(); openAbout(); }));
    els.closeAbout.addEventListener('click',closeAbout);
    els.aboutBackdrop.addEventListener('click',closeAbout);
    document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ closeAbout(); if(window.innerWidth<=900) closeSidebar(); hideTip(); } });

    function closeNav(){ els.navLinks.classList.remove('open'); els.navToggle.setAttribute('aria-expanded','false'); }
    els.navToggle.addEventListener('click',()=>{ const open=els.navLinks.classList.toggle('open'); els.navToggle.setAttribute('aria-expanded',open?'true':'false'); });
  }
  function bindWheelZoom(){
    const target=els.previewStage;
    target.addEventListener('wheel',(e)=>{
      // Zoom only with Ctrl (or Cmd) + mouse wheel; otherwise allow normal scroll behavior.
      if(!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      hideTip();
      const dir = e.deltaY < 0 ? 1 : -1;
      const step = e.shiftKey ? 2 : 5;
      const next = clamp((parseFloat(els.zoom.value)||100) + dir*step, 10, 300);
      els.zoom.value = String(next);
      updateValueLabels(); saveSettings(); scheduleRender();
    }, {passive:false});
  }

  function bindPan(){
    const stage=els.previewStage;
    let panning=false, moved=false, startX=0, startY=0, startPanX=0, startPanY=0;
    const setPannable=(on)=>stage.classList.toggle('pannable', !!on && !panning);
    stage.addEventListener('mousemove',(e)=>{ setPannable(e.ctrlKey); });
    stage.addEventListener('mouseleave',()=>{ if(!panning) setPannable(false); });
    stage.addEventListener('mousedown',(e)=>{
      if(!(e.ctrlKey && e.button===0)) return;
      if(els.previewWrap.classList.contains('hidden')) return;
      panning=true; moved=false; startX=e.clientX; startY=e.clientY;
      startPanX=parseFloat(els.panX.value)||0; startPanY=parseFloat(els.panY.value)||0;
      stage.classList.add('panning'); stage.classList.remove('pannable');
      hideTip();
      e.preventDefault();
    });
    window.addEventListener('mousemove',(e)=>{
      if(!panning) return;
      const dx=e.clientX-startX, dy=e.clientY-startY;
      if(Math.abs(dx)>2 || Math.abs(dy)>2) moved=true;
      // Map pixel drag to pan range (-100..100) relative to preview area size.
      const rect=stage.getBoundingClientRect();
      const scaleX = 160 / Math.max(120, rect.width);  // sensitivity tuned for editor-like feel
      const scaleY = 160 / Math.max(120, rect.height);
      const nextX = clamp(startPanX + dx*scaleX, -100, 100);
      const nextY = clamp(startPanY + dy*scaleY, -100, 100);
      els.panX.value = String(Math.round(nextX));
      els.panY.value = String(Math.round(nextY));
      updateValueLabels(); scheduleRender();
      e.preventDefault();
    });
    window.addEventListener('mouseup',(e)=>{
      if(!panning) return;
      panning=false; stage.classList.remove('panning'); setPannable(e.ctrlKey);
      if(moved){
        // Swallow the subsequent click so Ctrl+drag doesn't toggle a tile.
        const swallow=(ev)=>{ ev.stopPropagation(); ev.preventDefault(); stage.removeEventListener('click', swallow, true); };
        stage.addEventListener('click', swallow, true);
      }
      saveSettings();
    });
  }
  function bindResize(){
    if('ResizeObserver' in window){
      const ro=new ResizeObserver(()=>{ requestAnimationFrame(syncOverlayToDisplay); });
      ro.observe(els.previewStage);
    }
    window.addEventListener('resize',()=>requestAnimationFrame(syncOverlayToDisplay));
  }
  function initReveal(){
    if(!('IntersectionObserver' in window)){ document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible')); return; }
    const obs=new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); } }); },{threshold:0.12});
    document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
  }

  function init(){
    initTheme(); loadSettings();
    // ensure new defaults for redesigned fields
    if(!['segments','manual','auto'].includes(els.gridMode.value)) els.gridMode.value='segments';
    if(!els.segments.value) els.segments.value='4';
    syncUI();
    bindUpload(); bindSettings(); bindActions(); bindWheelZoom(); bindPan(); bindTooltips(); bindResize(); initReveal();
    // open sidebar by default on wider screens for discoverability
    if(window.innerWidth > 900) openSidebar();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
