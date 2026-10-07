/* Illustrative district spread in the atlas coordinate plane.
 * These hand-authored envelopes and arrival times are animation design, not
 * measured historical perimeters, a physical model, or building ignition data.
 * Time is narrative chapter position (0–8), never elapsed clock hours.
 */
function createFirePainter(canvas, geo, landmarks, reports, onReports) {
 'use strict';
 const bounds={x:240,y:-200,width:900,height:1792},cell=4;
 const width=Math.ceil(bounds.width/cell),height=Math.ceil(bounds.height/cell);
 const buffer=document.createElement('canvas');buffer.width=width;buffer.height=height;
 const bufferContext=buffer.getContext('2d'),context=canvas.getContext('2d');
 const pixels=bufferContext.createImageData(width,height);
 const arrival=new Float32Array(width*height).fill(Infinity),grain=new Float32Array(width*height),riverCells=new Uint8Array(width*height);
 const river=geo.water.find(w=>w.name==='Chicago River');
 const openWater=geo.water.filter(w=>w!==river);
 // River patches depict burning vessels, waterfront fuel and floating debris.
 // Their locations and timing are illustrative, not mapped historical observations.
 const riverSeeds=[[453,1068,3,25,46],[457,1020,3,22,32]];
 const riverReport=reports.find(d=>d.kind==='river');
 const activeAt=(d,p)=>p>=d.display[0]&&p<d.display[1];
 const regions=[
  {polygon:[[302,1532],[293,1472],[320,1370],[333,1240],[351,1100],[384,977],[432,830],[466,817],[478,966],[488,1120],[463,1280],[436,1422],[379,1517]],
   seeds:[[385,1280,1.94,24,28],[342,1472,.91,45,65],[378,1365,1.45,62,100],[409,1240,2.05,65,115],[425,1110,2.55,68,120],[444,963,3.15,66,128],[449,842,3.7,50,95]]},
  {polygon:[[473,810],[540,742],[808,741],[927,716],[1052,744],[1030,988],[1012,1148],[958,1235],[875,1220],[803,1160],[711,1136],[605,1144],[521,1184],[468,1060]],
   seeds:[[533,1086,2.92,85,110],[581,1007,3.25,120,100],[671,870,3.93,135,120],[780,808,4.2,155,120],[900,914,4.5,180,175],[921,1119,4.95,150,130],[665,1111,4.3,150,90]]},
  {polygon:[[471,685],[406,577],[337,445],[271,291],[224,100],[255,-200],[891,-200],[916,167],[959,375],[1080,590],[1107,675],[900,696],[750,712],[546,701]],
   seeds:[[678,657,4.88,115,105],[732,532,5.2,145,130],[843,415,5.58,145,125],[953,304,5.93,100,110],[616,471,5.75,180,175],[720,243,6.15,230,185],[602,113,6.48,270,195],[769,-74,6.85,270,210],[389,27,6.9,200,230]]}
 ];
 const protectedPlaces=landmarks.filter(d=>['tower','lind','ogden','nixon'].includes(d.id));
 function inside(x,y,polygon){
  let hit=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const a=polygon[i],b=polygon[j];
   if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const wx=bounds.x+(x+.5)*cell,wy=bounds.y+(y+.5)*cell,i=y*width+x;
  if(openWater.some(w=>inside(wx,wy,w.points)))continue;
  // Small clearings communicate known survivors, not surveyed parcel boundaries.
  if(protectedPlaces.some(d=>Math.hypot(wx-d.point[0],wy-d.point[1])<13))continue;
  const noise=(Math.sin(wx*.031+wy*.017)+Math.sin(wx*.079-wy*.033)*.45+Math.sin(wy*.113+wx*.052)*.2)/1.65;
  const speckle=((Math.imul(x+17,374761393)^Math.imul(y+31,668265263))>>>0)%997/997;
  grain[i]=.86+speckle*.14;
  if(river&&inside(wx,wy,river.points)){
   riverCells[i]=1;
   for(const [sx,sy,start,rx,ry] of riverSeeds){
    const distance=Math.hypot((wx-sx)/rx,(wy-sy)/ry);
    if(distance<1.7)arrival[i]=Math.min(arrival[i],start+distance*.5+noise*.08);
   }
   continue;
  }
  for(const region of regions){
   if(!inside(wx,wy,region.polygon))continue;
   for(const [sx,sy,start,rx,ry] of region.seeds){
    const distance=Math.hypot((wx-sx)/rx,(wy-sy)/ry);
    arrival[i]=Math.min(arrival[i],start+distance*.56+noise*.065);
   }
  }
 }
 let lastProgress=-1,lastView=null,enabled=true,whirlEnabled=true,explosionsEnabled=true;
 function paint(progress){
  const rgba=pixels.data;
  for(let i=0;i<arrival.length;i++){
   const age=progress-arrival[i],p=i*4;
   if((age<0&&!riverCells[i])||!Number.isFinite(age)){rgba[p+3]=0;continue;}
   if(riverCells[i]){
    const x=i%width,y=Math.floor(i/width),flicker=.55+.45*Math.sin(x*.7+y*.25-progress*35);
    const fade=activeAt(riverReport,progress)?1:0;
    rgba[p]=245;rgba[p+1]=85+flicker*85;rgba[p+2]=22;
    rgba[p+3]=Math.round(fade*(95+80*flicker)*grain[i]);
    continue;
   }
   const coverage=Math.min(1,age/.055),front=Math.exp(-Math.pow((age-.07)/.17,2))*Math.min(1,(8-progress)/.6);
   const cooled=Math.min(1,age/1.5);
   rgba[p]=Math.round(176-cooled*46+front*111);
   rgba[p+1]=Math.round(64-cooled*15+front*99);
   rgba[p+2]=Math.round(35-cooled*3+front*9);
   rgba[p+3]=Math.round(coverage*(82+front*125)*grain[i]);
  }
  bufferContext.putImageData(pixels,0,0);lastProgress=progress;
 }
 function drawWhirl(progress,view,report){
  // Independent witness scenes: never interpolate a path between them.
  const [wx,wy]=report.point,x=(wx-view.x)*view.scale,y=(wy-view.y)*view.scale;
  const h=Math.max(48,Math.min(110,115*view.scale)),r=h*.31,phase=progress*39;
  const opacity=.8;
  context.save();context.translate(x,y);context.globalAlpha=opacity;
  const glow=context.createRadialGradient(0,0,1,0,0,r*1.4);glow.addColorStop(0,'#ffd077b0');glow.addColorStop(.4,'#f05b3455');glow.addColorStop(1,'#ef542000');
  context.fillStyle=glow;context.beginPath();context.ellipse(0,0,r*1.4,r*.6,0,0,Math.PI*2);context.fill();
  const smoke=context.createLinearGradient(0,0,0,-h);smoke.addColorStop(0,'#632f27b8');smoke.addColorStop(.55,'#59534ea8');smoke.addColorStop(1,'#69696435');
  context.fillStyle=smoke;context.beginPath();context.moveTo(-5,0);context.bezierCurveTo(-r*.3,-h*.3,-r*.8,-h*.65,-r*.6,-h);context.quadraticCurveTo(r*.6,-h*1.15,r*1.55,-h*.94);context.bezierCurveTo(r*.7,-h*.55,r*.12,-h*.25,5,0);context.closePath();context.fill();
  // Interwoven spirals make the funnel turn as the timeline advances.
  for(let strand=0;strand<5;strand++){
   context.beginPath();
   for(let i=0;i<=90;i++){
    const u=i/90,angle=u*Math.PI*5-phase+strand*Math.PI*.4;
    const px=Math.sin(angle)*r*(.12+.88*u)+u*u*r*.45,py=-u*h+Math.cos(angle)*r*.18*u;
    context[i?'lineTo':'moveTo'](px,py);
   }
   context.strokeStyle=['#ffc06ca6','#f46d2caa','#ffe3a087','#4e423d7a','#e990508c'][strand];
   context.lineWidth=strand===3?3:1.8;context.stroke();
  }
  for(let i=0;i<23;i++){
   const u=((i*.618+progress*.7)%1),angle=phase+i*2.4,spread=r*(.3+u*1.15);
   context.fillStyle=i%3?'#ffb143':'#ffe7a4';context.globalAlpha=opacity*(1-u)*.9;
   context.beginPath();context.arc(Math.sin(angle)*spread+u*r*.45,-u*h+Math.cos(angle)*spread*.22,1+(i%3)*.45,0,Math.PI*2);context.fill();
  }
  context.restore();
 }
 function drawExplosion(progress,view,report){
  const x=(report.point[0]-view.x)*view.scale,y=(report.point[1]-view.y)*view.scale;
  // One slow illustrative burst per displayed chapter window, not a detonation clock.
  const t=(progress-report.display[0])/(report.display[1]-report.display[0]);
  const radius=Math.max(22,Math.min(60,90*view.scale))*(.55+t*.7);
  context.save();context.translate(x,y);
  const glow=context.createRadialGradient(0,0,2,0,0,radius);
  glow.addColorStop(0,'#fff2baca');glow.addColorStop(.3,'#ffb149a0');glow.addColorStop(1,'#bc422900');
  context.fillStyle=glow;context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.fill();
  context.strokeStyle=report.demolition?'#78644ba0':'#bf4f27b0';context.lineWidth=2;
  context.beginPath();context.arc(0,0,radius*.8,0,Math.PI*2);context.stroke();
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6+.2,len=radius*(.65+(i%3)*.1);
   context.beginPath();context.moveTo(Math.cos(angle)*len*.55,Math.sin(angle)*len*.55);
   context.lineTo(Math.cos(angle)*len,Math.sin(angle)*len);context.stroke();
  }
  context.restore();
 }
 function drawIndustry(progress,view,report){
  // The Saturday factory is an aftermath marker; never reignite it on Sunday.
  if(report.priorFire)return;
  const x=(report.point[0]-view.x)*view.scale,y=(report.point[1]-view.y)*view.scale;
  context.save();context.translate(x,y);
  for(let i=0;i<5;i++){
   const drift=Math.sin(progress*5+i*2),h=18+(i%3)*6+drift*3,dx=(i-2)*7;
   context.fillStyle=i%2?'#fba63aaa':'#c45c3888';context.beginPath();
   context.moveTo(dx-6,6);context.quadraticCurveTo(dx-11,-h*.4,dx+drift*5,-h);
   context.quadraticCurveTo(dx+12,-h*.25,dx+6,6);context.closePath();context.fill();
  }
  context.restore();
 }
 function drawSpotting(progress,view,report){
  const from=[342,1472],to=report.point;
  const ax=(from[0]-view.x)*view.scale,ay=(from[1]-view.y)*view.scale;
  const bx=(to[0]-view.x)*view.scale,by=(to[1]-view.y)*view.scale;
  context.save();context.strokeStyle='#c45b2c90';context.lineWidth=1.5;context.setLineDash([3,5]);
  context.beginPath();context.moveTo(ax,ay);context.quadraticCurveTo(ax-24,by,bx,by);context.stroke();context.setLineDash([]);
  for(let i=0;i<7;i++){
   const t=(i/7+progress*.9)%1;
   const x=(1-t)*(1-t)*ax+2*(1-t)*t*(ax-24)+t*t*bx,y=(1-t)*(1-t)*ay+(2*(1-t)*t+t*t)*by;
   context.fillStyle=i%2?'#e77323':'#ffc65b';context.beginPath();context.arc(x,y,2,0,Math.PI*2);context.fill();
  }
  context.restore();
 }
 function drawBell(progress,view,report){
  const x=(report.point[0]-view.x)*view.scale,y=(report.point[1]-view.y)*view.scale;
  const t=progress-report.display[0];
  context.save();context.translate(x,y);context.strokeStyle='#a77a4080';context.lineWidth=1.5;
  // A localized, slow dust ring symbolizes collapse; it is not an explosion.
  context.beginPath();context.ellipse(0,5,12+t*18,5+t*7,0,0,Math.PI*2);context.stroke();
  for(let i=0;i<7;i++){const a=i*Math.PI*2/7;context.fillStyle='#9c806580';context.fillRect(Math.cos(a)*(10+t*17),Math.sin(a)*(4+t*5),2,2);}
  context.restore();
 }
 function render(progress,view){
  lastView=view;canvas.dataset.progress=progress.toFixed(3);
  if(!view)return;
  const active=enabled?reports.filter(d=>activeAt(d,progress)&&(d.kind!=='whirl'||whirlEnabled)&&(d.kind!=='explosion'||explosionsEnabled)):[];
  canvas.dataset.activeReports=active.map(d=>d.id).join(',');
  canvas.dataset.whirl=String(active.some(d=>d.kind==='whirl'));
  onReports(active,view);
  if(!enabled)return;
  if(progress!==lastProgress)paint(progress);
  const ratio=Math.min(window.devicePixelRatio||1,2),w=Math.round(view.W*ratio),h=Math.round(view.H*ratio);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,view.W,view.H);
  context.imageSmoothingEnabled=true;
  context.drawImage(buffer,(bounds.x-view.x)*view.scale,(bounds.y-view.y)*view.scale,width*cell*view.scale,height*cell*view.scale);
  // Remove interpolation fringes at lake, harbor and survivor edges at every zoom.
  context.save();context.globalCompositeOperation='destination-out';
  for(const water of openWater){context.beginPath();water.points.forEach((p,i)=>context[i?'lineTo':'moveTo']((p[0]-view.x)*view.scale,(p[1]-view.y)*view.scale));context.closePath();context.fill();}
  for(const place of protectedPlaces){context.beginPath();context.arc((place.point[0]-view.x)*view.scale,(place.point[1]-view.y)*view.scale,13*view.scale,0,Math.PI*2);context.fill();}
  context.restore();
  for(const report of active){
   if(report.kind==='whirl')drawWhirl(progress,view,report);
   if(report.kind==='explosion')drawExplosion(progress,view,report);
   if(report.kind==='spot')drawSpotting(progress,view,report);
   if(report.kind==='bell')drawBell(progress,view,report);
   if(report.kind==='industry')drawIndustry(progress,view,report);
  }
 }
 return {render,
  setEnabled(value,progress){enabled=value;canvas.hidden=!value;render(progress,lastView);},
  setWhirlEnabled(value,progress){whirlEnabled=value;render(progress,lastView);},
  setExplosionsEnabled(value,progress){explosionsEnabled=value;render(progress,lastView);}
 };
}
