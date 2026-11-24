import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxGeometryWorldUV } from './materials.js';
import { buildInterior } from './interiors.js';

// Fictional industrial extension. Every facility has a recognisable function:
// linked road/rail access, material flow, maintenance access and service machinery.
// Static objects batch per material+sector; animated equipment stays separate.

const PI=Math.PI;
const between=(a,b,t)=>a+(b-a)*t;
const seeded=(a,b=0)=>{let x=Math.sin(a*127.1+b*311.7)*43758.5453;return x-Math.floor(x);};
const length2=(ax,az,bx,bz)=>Math.hypot(ax-bx,az-bz);

class Sector {
  constructor(name,x,z,range=610){
    this.name=name;this.center=new THREE.Vector3(x,0,z);
    this.range=range;this.parts=new Map();
    this.group=new THREE.Group();this.group.name=name;
  }
  add(geometry,mat){
    let list=this.parts.get(mat);
    if(!list){list=[];this.parts.set(mat,list);}
    list.push(geometry);
  }
  box(x,y,z,w,h,d,m,tile=4){
    if(w<=0||h<=0||d<=0)return;
    this.add(boxGeometryWorldUV(x,y,z,w,h,d,tile),m);
  }
  cyl(x,y,z,r,h,mat,segments=12,top=r){
    const g=new THREE.CylinderGeometry(top,r,h,segments);
    g.translate(x,y,z);this.add(g,mat);
  }
  pipe(A,B,rad,mat,segments=7){
    const a=new THREE.Vector3(...A),b=new THREE.Vector3(...B),v=b.clone().sub(a);
    const length=v.length();if(length<.01)return;
    const g=new THREE.CylinderGeometry(rad,rad,length,segments);
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(a.add(b).multiplyScalar(.5),q,new THREE.Vector3(1,1,1)));
    this.add(g,mat);
  }
  finalize(scene){
    for(const [m,list] of this.parts){
      if(!list.length)continue;
      const g=list.length===1?list[0]:mergeGeometries(list,false);
      if(list.length>1)list.forEach(x=>x.dispose());
      if(!g)continue;
      const mesh=new THREE.Mesh(g,m);
      mesh.receiveShadow=true;mesh.castShadow=!this.name.includes('ROADS')&&!this.name.includes('WATER / QUAY');
      mesh.frustumCulled=true;
      this.group.add(mesh);
    }
    this.parts.clear();
    scene.add(this.group);
  }
}

export function createExpansion(scene,m,colliders,interactive,raisedFloors,ramps,lightSources=[]) {
  const sectors=[],dynamic=[],state={shunt:true,scrapCrane:true,portCrane:true,
    power:true,pumps:true,slag:true,inspections:new Set()};
  const add=(name,x,z,range=700)=>{const D=new Sector(name,x,z,range);sectors.push(D);return D;};
  const block=(x,z,w,d,h=30)=>colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:h});
  const interact=(x,z,label,fn,r=23)=>interactive.push({x,z,r,label:'E · '+label,activate:()=>{
    state.inspections.add(label);
    return fn();
  }});
  const g=add('EXPANSION / ROADS + UTILITIES',200,130,2300);
  const road=(x,z,w,d,across=false)=>{
    g.box(x,.065,z,w,.13,d,m.asphalt);
    if(across){
      for(let xx=x-w/2+13;xx<x+w/2-5;xx+=25)g.box(xx,.137,z,8,.015,.20,m.white,4);
      g.box(x,.123,z-d/2+.8,w,.025,.13,m.white,4);
      g.box(x,.123,z+d/2-.8,w,.025,.13,m.white,4);
    }else{
      for(let zz=z-d/2+13;zz<z+d/2-6;zz+=25)g.box(x,.137,zz,.20,.015,8,m.white,4);
      g.box(x-w/2+.8,.123,z,.13,.025,d,m.white,4);
      g.box(x+w/2-.8,.123,z,.13,.025,d,m.white,4);
    }
  };
  // Continuous routes back to the original plant rather than isolated distant islands.
  road(-5,-690,23,620);           // Coke road north to sinter stockyards
  road(330,476,21,230);           // Old rolling-road south approach
  road(-320,485,18,245);          // Workshops to scrap yard
  road(-320,620,510,19,true);     // Transverse freight access
  road(210,568,1040,21,true);     // Main lower access and transfer road
  road(-555,726,18,360);         // Scrap transfer and gate
  road(523,748,18,384);          // Yard and service border
  road(33,1034,1040,19,true);    // Outer ring road
  road(800,420,720,20,true);     // Pipeworks/water treatment approach
  road(636,-496,19,820);         // Port quay road, from existing harbour
  road(632,90,640,19);           // Harbour-to-pumping access
  road(-555,78,495,19,true);     // Western power plant approach
  road(-520,-235,18,570);        // Western service road
  road(-260,-508,550,20,true);   // Raw yard to furnace and gas handling
  road(165,-1050,1020,19,true);  // North industrial ring
  road(1025,-300,19,1200);       // Outer coast service road
  road(845,275,420,18,true);
  road(-620,911,360,19,true);
  // Long narrow concrete drainage channels, grated sumps and curb detail.
  for(let z=-900;z<1100;z+=85){
    g.box(-17,.13,z,1,.04,9,m.metal,3);
    g.box(-17,.149,z,1.1,.016,.18,m.dark,3);
  }
  for(let z=-700;z<800;z+=70){
    g.box(650,.17,z,2.7,.09,4.3,m.metal,4);
    for(let i=-1;i<=1;i++)g.box(650+i*.64,.23,z,.075,.025,3.6,m.dark,4);
  }

  // Useful water and port basin, with a continuous quay edge and mooring bollards.
  const coast=add('COAST / QUAY WATER',860,-295,1250);
  coast.box(1020,-.18,-510,560,.30,1230,m.water,11);
  coast.box(960,-.17,545,500,.27,720,m.water,11);
  coast.box(925,-.02,5,2,.9,1110,m.concrete,4);
  coast.box(895,.65,-520,4,1.3,980,m.concrete,4);
  for(let z=-970;z<440;z+=28){
    coast.box(889,.4,z,6,.22,.6,m.dark,3);
    if(z%3===0){
      coast.cyl(876,1.2,z,1.12,2.4,m.dark,10);
      coast.cyl(876,2.4,z,1.52,.25,m.rust,10);
    }
  }
  for(let x=870;x<1100;x+=35){
    for(let z of [-910,-600,-290,15,345]){
      coast.box(x,.06,z,1,.2,4,m.white,5);
    }
  }

  function industrialLamp(D,x,z,h=19) {
    lightSources.push({x,y:h-1.1,z,power:650,range:75});
    D.cyl(x,h/2,z,.24,h,m.metal,8,.18);
    D.box(x,h-.7,z,2.9,.29,1.1,m.white,3);
    D.box(x,h-.94,z,2.65,.12,.95,m.light,3);
    D.box(x,1.0,z,1.0,2,1,m.concrete);
    for(let a of [-.36,.36])for(let b of [-.36,.36])D.cyl(x+a,2.04,z+b,.09,.20,m.metal,6);
  }
  function sign(D,x,z,lines,face=0){
    D.box(x,1.6,z,3.9,3.2,.18,m.dark);
    const cv=document.createElement('canvas');cv.width=512;cv.height=256;
    const c=cv.getContext('2d');
    c.fillStyle='#1d282d';c.fillRect(0,0,512,256);
    c.fillStyle='#df9a55';c.fillRect(0,0,512,8);c.fillRect(0,248,512,8);
    c.font='bold 37px monospace';c.textAlign='center';
    const arr=Array.isArray(lines)?lines:[lines];
    for(let i=0;i<arr.length;i++){
      c.fillStyle=i===0?'#f4c298':'#d4dad5';
      c.fillText(arr[i],256,90+i*47,480);
    }
    const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(3.75,1.85),mat);
    mesh.position.set(x,3.45,z+.15);mesh.rotation.y=face;
    D.group.add(mesh);
    for(let dx of [-1.4,1.4])D.box(x+dx,1.5,z, .14,3,.14,m.metal);
  }
  function yardPad(D,x,z,w,d,mat=m.concrete){
    D.box(x,.13,z,w,.26,d,mat,6);
    D.box(x,0.36,z-d/2+.4,w,.08,.24,m.metal,5);
    D.box(x,0.36,z+d/2-.4,w,.08,.24,m.metal,5);
    for(let xx=x-w/2+8;xx<x+w/2-5;xx+=10){
      D.box(xx,.278,z,.035,.015,d,m.dark,8);
    }
    for(let zz=z-d/2+8;zz<z+d/2-5;zz+=10){
      D.box(x,.28,zz,w,.015,.035,m.dark,8);
    }
  }
  function post(D,x,z,h=9){
    D.box(x,h/2,z,.65,h,.65,m.rust,3);
    D.box(x,.6,z,1.7,1.2,1.7,m.concrete);
    for(let a of [-.6,.6])for(let b of [-.6,.6])D.cyl(x+a,1.21,z+b,.09,.22,m.metal,8);
  }
  function openHall(D,x,z,w,d,h,bays=8){
    yardPad(D,x,z,w,d);
    D.box(x,h+.33,z,w+1.2,.65,d+1.2,m.roof,7);
    for(let i=0;i<=bays;i++){
      const xx=x-w/2+i*w/bays;
      for(let zz of [z-d/2+.8,z+d/2-.8]){post(D,xx,zz,h);block(xx,zz,1.7,1.7,h);}
      if(i<bays){
        D.pipe([xx,h,z-d/2+.8],[xx+w/bays,h,z-d/2+.8],.21,m.metal);
        D.pipe([xx,h,z+d/2-.8],[xx+w/bays,h,z+d/2-.8],.21,m.metal);
      }
      D.pipe([xx,h,z-d/2+.8],[xx,h,z+d/2-.8],.19,m.metal);
    }
    D.box(x,h+.71,z,w+.8,.10,d+.7,m.roof,7);
    // Enterable shed has no fake collision wall.
  }
  function closedHall(D,x,z,w,d,h,doors=3){
    if([464,-8,-548,-735,-605,246,713,714,-446,-158,130].includes(x)){
      buildInterior(D,x,z,w,d,h,m,colliders,interactive,dynamic,lightSources,[-735,-605,713].includes(x)?'control':'service');return;
    }
    yardPad(D,x,z,w+3,d+3);
    D.box(x,h/2+.24,z,w,h,d,m.cladding,7);
    D.box(x,h+.45,z,w+1.6,.9,d+1.6,m.roof,7);
    for(let xx=x-w/2+5;xx<x+w/2;xx+=5){
      D.box(xx,h/2,z+d/2+.14,.12,h,.29,m.metal);
      D.box(xx,h/2,z-d/2-.14,.12,h,.29,m.metal);
    }
    for(let i=0;i<doors;i++){
      const xx=x-w/2+(i+.5)*w/doors;
      D.box(xx,5,z+d/2+.16,Math.min(9,w/doors-1),9.7,.32,m.dark);
      D.box(xx,4.8,z+d/2+.35,Math.min(8.2,w/doors-1.4),9.15,.17,m.rust);
      D.box(xx,h-4,z+d/2+.30,Math.min(7,w/doors-2),2.1,.18,m.glass);
      D.box(xx,h-3,z+d/2+.42,.15,2.2,.15,m.metal);
    }
    block(x,z,w,d,h);
  }
  function rollerRail(D,x1,x2,z){
    D.box((x1+x2)/2,.20,z,x2-x1,.30,5.8,m.gravel,5);
    for(let xx=x1;xx<x2;xx+=2.7)D.box(xx,.35,z,.42,.20,5,m.rust);
    for(let dz of [-1.02,1.02])D.box((x1+x2)/2,.56,z+dz,x2-x1,.22,.20,m.rail);
    for(let xx=x1+30;xx<x2-25;xx+=80){
      for(let dz of [-2.7,2.7])D.box(xx,1,z+dz,.22,1.9,.28,m.yellow);
    }
  }
  function openRack(D,x1,z1,x2,z2,n=4,h=12){
    const segments=Math.ceil(length2(x1,z1,x2,z2)/18);
    for(let i=0;i<=segments;i++){
      const t=i/segments,x=between(x1,x2,t),z=between(z1,z2,t);
      for(let s of [-2.8,2.8])post(D,x,z+s,h);
      D.pipe([x,h,z-2.8],[x,h,z+2.8],.16,m.metal);
      D.pipe([x,h,z-2.8],[x,h-3,z+2.8],.12,m.metal);
    }
    for(let j=0;j<n;j++)
      D.pipe([x1,h+j*.6,z1-2],[x2,h+j*.6,z2-2],.16,j%2?m.blue:m.pipe);
  }
  function belt(D,x1,y1,z1,x2,y2,z2,w=5){
    D.pipe([x1,y1,z1],[x2,y2,z2],w*.30,m.dark,7);
    const steps=Math.max(1,Math.round(length2(x1,z1,x2,z2)/14));
    for(let i=0;i<=steps;i++){
      const t=i/steps,x=between(x1,x2,t),y=between(y1,y2,t),z=between(z1,z2,t);
      D.pipe([x,0,z],[x,Math.max(1,y),z],.24,m.metal);
      D.pipe([x,y+.2,z-w/2],[x,y+.2,z+w/2],.14,m.rail);
    }
    for(let s of [-1,1])D.pipe([x1,y1+.55,z1+s*w/2],[x2,y2+.55,z2+s*w/2],.11,m.rust);
  }
  function tower(D,x,z,h=37){
    for(let s of [-1,1])for(let t of [-1,1])post(D,x+s*5,z+t*5,h);
    for(let y=8;y<h;y+=9){
      D.box(x,y,z,12,.55,12,m.metal);
      for(let s of [-1,1])for(let t of [-1,1])
        D.pipe([x+s*5,y-8,z+t*5],[x-s*5,y,z+t*5],.14,m.rust);
    }
    D.box(x,h+.4,z,13,.8,13,m.roof);
  }
  function drum(D,x,z,r=5,h=18,color=m.metal) {
    block(x,z,r*1.7,r*1.7,h);
    D.cyl(x,h/2+.2,z,r,h,color,20);
    D.cyl(x,h+.3,z,r+.15,.7,m.roof,20);
    for(let y=3;y<h;y+=5)D.cyl(x,y,z,r+.13,.3,m.rust,20);
    D.pipe([x+r+.5,1,z],[x+r+.5,h,z],.13,m.metal);
    D.box(x,2.1,z+r+1.3,2.7,4.2,2.1,m.dark);
  }
  function floodlight(D,x,z,h=21){
    lightSources.push({x,y:h-.8,z,power:950,range:90});
    D.box(x,h/2,z,.35,h,.35,m.metal);
    D.box(x,h-.45,z,5.2,.22,1,m.metal);
    for(let s of [-1,0,1]){
      D.box(x+s*1.5,h-.56,z+.34,1.15,.15,.46,m.light);
      D.box(x+s*1.5,h-.48,z-.35,1.25,.26,.24,m.dark);
    }
  }
  function control(D,x,z,label,callback){
    D.box(x,1.05,z,1.6,2.1,1.3,m.dark);
    D.box(x,1.93,z+.68,1.4,.25,.08,m.yellow);
    for(let i=0;i<3;i++)D.cyl(x-.45+i*.43,1.48,z+.73,.12,.15,m.light,9);
    D.box(x,1.0,z+.68,.85,.35,.07,m.metal);
    interact(x,z+2.4,label,callback,14);
  }
  function roller(D,x,z,count=10,step=6){
    D.box(x+(count-1)*step/2,2.1,z,count*step+4,.9,12,m.rust);
    for(let i=0;i<count;i++){
      const xx=x+i*step;
      D.cyl(xx,2.7,z,2.2,11,m.rail,12);
      D.box(xx,4.2,z,4,.33,10,m.metal);
    }
  }
  function pile(D,x,z,rad,h,color){
    block(x,z,rad*1.40,rad*1.40,h);
    D.cyl(x,h/2,z,rad,h,color,17,0);
    for(let i=0;i<5;i++){
      const a=i*2.399,rr=rad*.35;
      D.cyl(x+Math.sin(a)*rr,1.4,z+Math.cos(a)*rr,rad*.24,2.6,color,8,0);
    }
  }
  function walkway(D,x,z,w,d,h=7){
    D.box(x,h,z,w,.32,d,m.metal);
    raisedFloors.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:h+.16});
    for(const side of [-1,1]){
      const zz=z+side*d/2;
      for(let xx=x-w/2;xx<=x+w/2;xx+=3.0)D.pipe([xx,h,zz],[xx,h+1.25,zz],.06,m.yellow);
      D.pipe([x-w/2,h+1.25,zz],[x+w/2,h+1.25,zz],.06,m.yellow);
    }
  }
  function stairs(D,x,z,h=7,run=12){
    const count=Math.ceil(h/.32);
    ramps.push({x,z,run,h,halfWidth:1.6});
    for(let i=0;i<count;i++){
      const t=(i+.5)/count;
      D.box(x+run*t,.12+h*t,z,run/count+.06,.20,2.3,m.metal);
    }
    for(let dz of [-1.25,1.25])
      D.pipe([x,.6,z+dz],[x+run,h+1.4,z+dz],.08,m.yellow);
  }
  function vehicle(name,mat,x,z,orient=0){
    const G=new THREE.Group();G.name=name;G.position.set(x,0,z);G.rotation.y=orient;
    function box(w,h,d,xx,yy,zz,m0){
      const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m0);b.position.set(xx,yy,zz);b.castShadow=true;b.receiveShadow=true;G.add(b);
    }
    box(10,1.1,3.7,0,1.8,0,m.dark);box(5.8,2.8,3.5,-1.55,3.15,0,mat);
    box(3.6,3,3.5,3.3,3.4,0,m.blue);
    box(.1,1.1,2.6,5.14,3.72,0,m.glass);
    for(let xx of [-3.9,-1.3,3.3])for(let zz of [-1.9,1.9]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.7,10),m.dark);
      wheel.rotation.x=PI/2;wheel.position.set(xx,1,zz);G.add(wheel);
    }
    scene.add(G);return G;
  }
  const landmarks=[];const landmark=(name,x,z,yaw=0)=>{
    landmarks.push({name,pos:[x,2,z],yaw});
  };

  // 7. FREIGHT SHUNTING — through-lines, turnouts, service platform, signalling hut.
  {
    const D=add('FREIGHT & SHUNTING YARD',220,763,820);
    yardPad(D,209,751,550,300,m.gravel);
    for(let z=643;z<=862;z+=24)rollerRail(D,-65,498,z);
    for(let i=0;i<7;i++){
      const z=668+i*31;
      D.box(18,.6,z,25,.27,2.8,m.metal);
      D.box(45,.6,z,3,.22,2.7,m.rail);
      D.pipe([38,.65,z],[67,.65,z+6],.09,m.rail);
      floodlight(D,40,z+8,17);
    }
    closedHall(D,464,961,70,38,19,3);
    closedHall(D,-8,935,79,40,18,3);
    openHall(D,260,916,154,42,19,10);
    walkway(D,262,895,120,3.4,8);
    stairs(D,192,895,8,14);
    for(let x=95;x<450;x+=63){
      D.box(x,1.3,916,38,2.3,2.4,m.rust);
      for(let i=0;i<5;i++)D.box(x-15+i*7.8,2.56,916,.45,.23,2.6,m.metal);
    }
    for(let x=-42;x<480;x+=64)floodlight(D,x,616,21);
    control(D,465,913,'YARD SHUNT SIGNAL',()=>{
      state.shunt=!state.shunt;
      return state.shunt?'SHUNT SIGNAL GREEN / FREIGHT MOVING':'SHUNT SIGNAL RED / FREIGHT HELD';
    });
    sign(D,225,584,['07   RAIL YARD','FREIGHT + SHUNTING']);
    // Simulated shunt train follows a clear rail line within the yard.
    const train=new THREE.Group();train.name='Freight shunting train';scene.add(train);
    for(let i=0;i<7;i++){
      const wagon=new THREE.Group();wagon.position.set(i*17,0,0);
      const body=new THREE.Mesh(new THREE.BoxGeometry(13,3.3,4.1),i===0?m.yellow:m.rust);
      body.position.y=2.95;wagon.add(body);
      for(const dx of [-5,5])for(const dz of [-1.9,1.9]){
        const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,.5,8),m.dark);
        wheel.rotation.x=PI/2;wheel.position.set(dx,.9,dz);wagon.add(wheel);
      }
      train.add(wagon);
    }
    let railT=0,railPrevious=0;
    dynamic.push(t=>{
      const dt=Math.min(.07,Math.max(0,t-railPrevious));railPrevious=t;
      if(state.shunt)railT=(railT+dt*8)%410;
      train.position.set(-80+railT,0,716);
      train.visible=true;
    });
    landmark('FREIGHT & SHUNTING',25,574,-PI/2);
  }

  // 8. SCRAP RECYCLING — segregated bays, magnetic crane and shredding workflow.
  {
    const D=add('SCRAP & MATERIAL RECOVERY',-390,753,700);
    yardPad(D,-396,762,335,278,m.concrete);
    closedHall(D,-548,755,78,78,22,2); // shearing/shredder enclosure
    openHall(D,-356,773,194,110,26,11);
    for(let row=0;row<4;row++){
      const z=666+row*44;
      for(let i=0;i<5;i++){
        const x=-435+i*36;
        pile(D,x,z,11+(i%3)*2,5+(row+i)%5,m.rust);
        D.box(x,1.55,z+14,27,3.1,.43,m.concrete);
      }
    }
    // Proper bridged gantry crane aligned across scrap sorting bays.
    for(let z of [638,876]){
      D.box(-360,.6,z,186,1.0,1.4,m.rail);
      for(let x=-445;x<-257;x+=26)post(D,x,z,20);
    }
    for(let x of [-446,-274]){
      D.pipe([x,25,638],[x,25,876],.31,m.metal,10);
    }
    belt(D,-494,15,754,-540,21,754,4.8);
    belt(D,-485,14,782,-434,18,784,4.8);
    roller(D,-510,819,5,8);
    control(D,-447,873,'SORTING MAGNET',()=>{
      state.scrapCrane=!state.scrapCrane;
      return state.scrapCrane?'MAGNET CRANE MOVING':'MAGNET CRANE HALTED';
    });
    for(let x=-540;x<-255;x+=60)floodlight(D,x,607,23);
    sign(D,-465,616,['08   RECYCLING','SCRAP PROCESSING']);
    // Magnetic travelling crane and visible attached scrap load.
    const magnet=new THREE.Group();scene.add(magnet);
    const spread=new THREE.Mesh(new THREE.BoxGeometry(17,2.5,5.5),m.yellow);
    spread.position.y=21;magnet.add(spread);
    const hook=new THREE.Mesh(new THREE.CylinderGeometry(2,2,1.5,12),m.dark);
    hook.position.y=8;magnet.add(hook);
    const rope=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,12,7),m.rail);
    rope.position.y=14.5;magnet.add(rope);
    const scrap=new THREE.Mesh(new THREE.DodecahedronGeometry(3,0),m.rust);
    scrap.position.y=5.2;magnet.add(scrap);
    let craneT=0,craneLast=0;
    dynamic.push(t=>{
      const dt=Math.min(.07,Math.max(0,t-craneLast));craneLast=t;
      if(state.scrapCrane)craneT+=dt*.26;
      magnet.position.set(-355+Math.sin(craneT)*62,0,750);
    });
    landmark('SCRAP RECYCLING',-470,585,PI);
  }

  // 9. ENERGY — substations, power hall, gas holders and realistic pipe supports.
  {
    const D=add('ENERGY / GAS / SUBSTATION',-654,-139,660);
    yardPad(D,-664,-166,306,263,m.gravel);
    closedHall(D,-735,-126,111,62,29,4);
    closedHall(D,-605,-80,97,47,20,3);
    for(let i=0;i<6;i++){
      const x=-782+i*28,z=-225;
      D.box(x,3.5,z,18,7,11,m.dark);
      D.box(x,7.4,z,20,.9,12,m.metal);
      for(let j=0;j<3;j++){
        D.cyl(x-5+j*5,10.3,z,1.4,4.8,m.blue,10);
        D.cyl(x-5+j*5,13.0,z,.9,.5,m.rail,10);
      }
      D.box(x,1.1,z-10,22,2,1,m.concrete);
    }
    for(let x of [-742,-697,-652,-607]){
      for(let z of [-271,-250]){
        D.pipe([x,0,z],[x,28,z],.22,m.metal);
        D.pipe([x,28,z],[x+10,25,z],.15,m.metal);
        D.cyl(x,29,z,.47,.65,m.white,9);
      }
      D.pipe([x,28,-271],[x,28,-250],.08,m.rail);
    }
    for(let [x,z] of [[-548,-211],[-545,-268]])drum(D,x,z,10,23,m.blue);
    for(let x of [-790,-740,-690,-640])industrialLamp(D,x,-30,23);
    openRack(D,-581,-17,-335,-17,5,13); // power / hot-gas corridor
    const liveLight=new THREE.PointLight(0xffa15c,28,64,2);
    liveLight.position.set(-746,15,-224);scene.add(liveLight);
    dynamic.push(t=>{liveLight.intensity=state.power?22+Math.sin(t*3)*6:0;});
    control(D,-760,-279,'SUBSTATION BREAKER',()=>{
      state.power=!state.power;
      return state.power?'SUBSTATION LIVE / TRANSFORMERS ENERGISED':'SUBSTATION ISOLATED / TRANSFORMERS OFF';
    });
    sign(D,-756,27,['09   ENERGY','POWER + GAS']);
    landmark('POWER & GAS',-747,-2,PI/2);
  }

  // 10. INLAND BULK YARDS — ore and sinter stockpiles connected to original coke area.
  {
    const D=add('INLAND STOCKYARDS / SINTER',-120,-809,825);
    yardPad(D,-118,-810,632,404,m.gravel);
    for(let row=0;row<5;row++){
      const z=-969+row*65;
      for(let i=0;i<8;i++){
        const x=-390+i*70;
        pile(D,x,z,17+(i%3)*3,9+(row+i)%5,m.ore);
        if(row%2===0)D.box(x,1.8,z+21,28,3.6,.46,m.concrete);
      }
    }
    closedHall(D,246,-890,116,48,29,5);
    openHall(D,213,-657,176,63,34,10);
    for(let x=134;x<289;x+=30){
      D.box(x,5,-662,18,10,12,m.rust);
      D.box(x,10.3,-662,16,.65,10,m.yellow);
      D.cyl(x,14,-662,2.5,6,m.dark,10);
    }
    for(let x=-310;x<225;x+=94)floodlight(D,x,-592,25);
    belt(D,-392,5,-916,-280,16,-810,6);
    belt(D,-280,16,-810,-60,20,-621,6);
    belt(D,-60,20,-621,11,26,-345,6); // process connection into existing coke works
    rollerRail(D,-435,310,-561);
    rollerRail(D,-435,310,-581);
    // The suspended ore carriers actually move along the final feed belt.
    const carriers=[];
    for(let i=0;i<9;i++){
      const o=new THREE.Mesh(new THREE.DodecahedronGeometry(1.8,0),m.ore);
      o.castShadow=true;scene.add(o);carriers.push(o);
    }
    let beltT=0,beltPrevious=0;
    dynamic.push(t=>{
      const dt=Math.min(.07,Math.max(0,t-beltPrevious));beltPrevious=t;
      if(state.slag)beltT+=dt*.07;
      carriers.forEach((o,i)=>{
        const q=(beltT+i/9)%1;
        o.position.set(between(-60,11,q),between(20,26,q)+.5,between(-621,-345,q));
        o.rotation.set(q*1.7,q*2.2,q*.3);
      });
    });
    control(D,286,-647,'SINTER FEED GATE',()=>{
      state.slag=!state.slag;
      return state.slag?'SINTER FEED OPEN / BELT MOVING':'SINTER FEED CLOSED / BELT STOPPED';
    });
    sign(D,-92,-1040,['10   BULK YARDS','ORE / SINTER FEED']);
    landmark('ORE & SINTER YARDS',-26,-540,PI);
  }

  // 11. WATER — pumping station, clarifiers, intake, overhead feeder pipes.
  {
    const D=add('WATER TREATMENT / PUMPING',760,495,700);
    yardPad(D,759,523,284,280,m.concrete);
    closedHall(D,713,465,84,42,21,4);
    const pumpRotors=[];
    for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      const x=688+col*61,z=552+row*63;
      D.cyl(x,1.1,z,21,2.2,m.concrete,30);
      D.cyl(x,2.24,z,20,.18,m.water,30);
      D.cyl(x,3.1,z,1.1,2,m.dark,12);
      D.pipe([x,4.0,z],[x+18,4.0,z],.25,m.rail);
      D.pipe([x,3.4,z-18],[x,3.4,z+18],.18,m.metal);
      for(let a=0;a<8;a++){
        const q=a*PI/4;
        D.box(x+Math.sin(q)*20,3.1,z+Math.cos(q)*20,.6,.18,.6,m.yellow);
      }
      const rotor=new THREE.Group();
      for(let j=0;j<4;j++){
        const fin=new THREE.Mesh(new THREE.BoxGeometry(16,.22,1.0),m.metal);
        fin.rotation.y=j*PI/4;rotor.add(fin);
      }
      rotor.position.set(x,4.1,z);scene.add(rotor);pumpRotors.push(rotor);
    }
    let pumpAngle=0,pumpPrevious=0;
    dynamic.push(t=>{
      const dt=Math.min(.07,Math.max(0,t-pumpPrevious));pumpPrevious=t;
      if(state.pumps)pumpAngle+=dt*.42;
      pumpRotors.forEach((rotor,i)=>{rotor.rotation.y=pumpAngle+(i%2)*.22;});
    });
    for(let x of [661,691,722,753])drum(D,x,359,5,11,m.blue);
    openRack(D,636,422,833,422,5,11);
    openRack(D,840,422,840,555,4,13);
    for(let z=371;z<682;z+=50)industrialLamp(D,606,z,19);
    control(D,694,494,'COOLING PUMP BANK',()=>{
      state.pumps=!state.pumps;
      return state.pumps?'COOLING WATER FLOW RESTORED':'COOLING PUMPS STOPPED';
    });
    sign(D,741,385,['11   WATER PLANT','COOLING / PUMPING']);
    landmark('WATER & PUMPING',596,401,-PI/2);
  }

  // 12. OUTER WHARF — continuous dock connection, loading cranes and pump access.
  {
    const D=add('OUTER WHARF / UNLOADING',762,-732,885);
    yardPad(D,756,-750,226,495,m.concrete);
    closedHall(D,714,-919,80,39,24,4);
    openHall(D,758,-607,105,57,21,7);
    for(let z=-951;z<=-511;z+=117){
      const xx=828;
      for(let s of [-1,1])post(D,xx+s*12,z,48);
      D.pipe([xx-12,48,z],[xx+12,48,z],.64,m.yellow,9);
      D.pipe([xx,48,z],[xx+110,43,z],.48,m.yellow,8);
      D.pipe([xx+110,43,z],[xx+90,21,z],.22,m.dark);
      D.pipe([xx+90,21,z],[xx+90,7,z],.11,m.metal);
      D.box(xx+90,7,z,7,2,6,m.dark);
      for(let t of [-1,1])D.pipe([xx+t*7,44,z-8],[xx+105,42,z],.12,m.metal);
    }
    for(let z=-970;z<-486;z+=37){
      floodlight(D,626,z,23);
      D.box(864,.60,z,6,.9,1.5,m.dark);
    }
    for(let x of [666,707,748])rollerRail(D,616,865,-488+(x-666)/41*11); // short sidings
    belt(D,781,17,-812,643,20,-575,6);
    control(D,656,-654,'OUTER QUAY CRANE',()=>{
      state.portCrane=!state.portCrane;
      return state.portCrane?'QUAY CRANE HOISTS ACTIVE':'QUAY CRANE HOISTS IDLE';
    });
    sign(D,670,-997,['12   OUTER WHARF','UNLOADING BERTHS']);
    const hook=new THREE.Group();scene.add(hook);
    const lift=new THREE.Mesh(new THREE.BoxGeometry(7,1.9,5),m.yellow);
    lift.position.y=22;hook.add(lift);
    const cable=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,24,8),m.rail);
    cable.position.y=35;hook.add(cable);
    let hoistT=0,hoistPrevious=0;
    dynamic.push(t=>{
      const dt=Math.min(.07,Math.max(0,t-hoistPrevious));hoistPrevious=t;
      if(state.portCrane)hoistT+=dt*.5;
      hook.position.set(910,Math.sin(hoistT)*5,-735);
    });
    landmark('OUTER WHARF',623,-938,0);
  }

  // 13. PERIMETER SERVICES — service warehouses, weighbridge, gate and transport park.
  {
    const D=add('PERIMETER / SERVICE DEPOT',-163,1050,800);
    yardPad(D,-154,1072,710,205,m.concrete);
    for(let i=0;i<7;i++)closedHall(D,-446+i*96,1073,75,46,18,3);
    openHall(D,365,1114,100,66,21,7);
    for(let x=-423;x<393;x+=60)floodlight(D,x,1002,19);
    for(let x=-410;x<265;x+=81){
      D.box(x,2.0,1192,38,4.0,2.5,m.rust);
      D.box(x,4.2,1192,38,.4,2.8,m.yellow);
      D.box(x,1.4,1215,25,2.7,8,m.dark);
    }
    for(let i=0;i<5;i++){
      const x=-485+i*36;
      D.box(x,2.1,978,22,4.2,12,m.dark);
      D.box(x,4.4,978,20,.32,11,m.metal);
      for(let k=0;k<4;k++)D.box(x-8+k*5,4.6,978,.15,.13,10,m.yellow);
    }
    D.box(188,1.0,953,34,2,12,m.concrete);
    for(let x of [174,196]){
      D.box(x,2.2,953,.8,.3,13,m.metal);
      D.box(x,3.1,953,1.1,1.1,2,m.yellow);
    }
    sign(D,-214,955,['13   DEPOT','PERIMETER SERVICES']);
    control(D,218,992,'DEPOT WEIGHBRIDGE',()=>{
      return 'VEHICLE WEIGHBRIDGE INSPECTION RECORDED';
    });
    for(let i=0;i<6;i++){
      const truck=vehicle('Parked service vehicle '+i,i%2?m.yellow:m.white,-430+i*131,1161,PI/2);
      dynamic.push(t=>{truck.rotation.y=PI/2;});
    }
    landmark('PERIMETER DEPOT',-218,937,PI);
  }

  // Coast-to-inland container truck line; never intersects closed halls.
  const truck1=vehicle('Road freight vehicle',m.rust,420,575,-PI/2);
  const truck2=vehicle('Water service truck',m.white,633,220,0);
  dynamic.push(t=>{
    truck1.position.x=420-(t*5.5)%430;truck1.position.z=575;truck1.rotation.y=-PI/2;
    truck2.position.z=290-(t*4.1)%315;truck2.position.x=633;truck2.rotation.y=0;
  });

  // Functional pipe corridor to the original workshops and caster.
  {
    const D=add('PIPEWAYS / BRIDGES',-105,245,790);
    openRack(D,-450,203,-317,203,4,15);
    openRack(D,341,276,606,276,4,12);
    openRack(D,-320,421,-320,595,4,12);
    for(let x=400;x<610;x+=30)industrialLamp(D,x,573,17);
    for(let x=-450;x<-320;x+=18)D.box(x,.18,193,8,.22,2,m.gravel,5);
  }

  // Important: returned first-person waypoints are all on accessible road, not inside buildings.
  for(const s of sectors)s.finalize(scene);
  const extraWorldArea=landmarks.map(x=>x.name);
  return {
    landmarks,sectors,state,dynamic,
    update(t,dt,camera,quality){
      for(const fn of dynamic)fn(t,dt);
      for(const s of sectors){
        const distance=camera.position.distanceTo(s.center);
        s.group.visible=distance<Math.max(s.range,quality===0?590:quality===1?800:1180);
      }
    },
    inspectionCount(){return state.inspections.size;},
    details:extraWorldArea
  };
}
