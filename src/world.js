import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxGeometryWorldUV } from './materials.js';

// Publicly documented process order, simplified for a traversable fictional site:
// harbour/raw stock -> coke & sinter -> blast furnace -> BOS -> casting -> rolling/dispatch.
// Measurements and positions are artistic approximations, not site surveys.

const PI=Math.PI;
const rnd=n=>(Math.sin(n*78.233+93.1)*43758.5453)%1;
const lerp=(a,b,t)=>a+(b-a)*t;
const p=(x,y,z)=>new THREE.Vector3(x,y,z);
const clamp=(x,a,b)=>Math.max(a,Math.min(x,b));

class District {
  constructor(name,center,range=430){this.name=name;this.center=new THREE.Vector3(center[0],0,center[1]);this.range=range;this.items=new Map();this.group=new THREE.Group();this.group.name=name;}
  add(geo,mat,transform){
    if(transform)geo.applyMatrix4(transform);
    let a=this.items.get(mat);if(!a){a=[];this.items.set(mat,a);}a.push(geo);
  }
  box(x,y,z,w,h,d,mat,tile=4){
    if(w<=0||h<=0||d<=0)return;
    this.add(boxGeometryWorldUV(x,y,z,w,h,d,tile),mat);
  }
  cyl(x,y,z,rBottom,rTop,h,mat,seg=12){
    const geo=new THREE.CylinderGeometry(rTop,rBottom,h,seg,1);
    geo.translate(x,y,z);this.add(geo,mat);
  }
  beam(a,b,r,mat,seg=6){
    const A=p(...a),B=p(...b),delta=B.clone().sub(A),len=delta.length();
    if(len<.001)return;
    const geo=new THREE.CylinderGeometry(r,r,len,seg,1);
    const matrix=new THREE.Matrix4().compose(A.add(B).multiplyScalar(.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()),new THREE.Vector3(1,1,1));
    this.add(geo,mat,matrix);
  }
  pipePath(points,r,mat){
    for(let i=0;i<points.length-1;i++)this.beam(points[i],points[i+1],r,mat,9);
  }
  finalize(scene){
    for(const [mat,parts] of this.items){
      if(!parts.length)continue;
      const geometry=parts.length===1?parts[0]:mergeGeometries(parts,false);
      if(parts.length>1)parts.forEach(g=>g.dispose());
      if(!geometry)continue;
      geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,mat);
      mesh.castShadow=mat.userData?.castsShadow!==false;
      mesh.receiveShadow=true;
      this.group.add(mesh);
    }
    scene.add(this.group);this.items.clear();
  }
}

export function createWorld(scene,m){
  const zones=[],colliders=[],interactive=[],dynamic=[],smokeEmitters=[],raisedFloors=[],ramps=[];
  const addZone=(name,x,z,range=470)=>{const zne=new District(name,[x,z],range);zones.push(zne);return zne;};
  const block=(x,z,w,d,h=25)=>colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:h});
  const addInteract=(x,z,r,label,fn)=>interactive.push({x,z,r,label,activate:fn});
  const ground=addZone('GROUND',0,0,7000);

  // Textured ground apron, perimeter roads and drainage grids.
  ground.box(0,-2.5,0,3400,5,3400,m.dirt,10);
  ground.box(0,-.15,0,1100,.3,950,m.concrete,5);
  ground.box(540,-.12,-120,450,.3,780,m.gravel,5);
  ground.box(-370,-.10,260,460,.28,540,m.concrete,5);
  function road(x,z,w,d,alongX=false){
    ground.box(x,.035,z,w,.08,d,m.asphalt,4);
    if(alongX){
      for(let xx=x-w/2+10;xx<x+w/2-6;xx+=21)ground.box(xx,.09,z,7,.015,.19,m.white,3);
    }else{
      for(let zz=z-d/2+10;zz<z+d/2-6;zz+=21)ground.box(x,.09,zz,.19,.015,7,m.white,3);
    }
    if(w>20&&d>20)return;
  }
  road(0,365,1100,21,true);
  road(-5,-25,23,690);
  road(330,-3,20,780);
  road(-320,95,16,585);
  road(137,105,640,17,true);
  road(-115,-205,580,16,true);
  road(206,245,480,16,true);

  // Marked concrete expansion joints; exact global 8-metre grid.
  for(let zz=-400;zz<=420;zz+=8){
    ground.box(-132,.013,zz,950,.018,.055,m.dark,2);
  }
  for(let xx=-540;xx<=390;xx+=8){
    ground.box(xx,.014,0,.055,.018,840,m.dark,2);
  }

  // Continuous distant escarpment rather than disconnected cone "mountains".
  function escarpment(offset,material,amplitude,phase){
    const positions=[],indices=[],normals=[];
    const n=105,zMin=-1750,zMax=1750;
    for(let i=0;i<=n;i++){
      const z=lerp(zMin,zMax,i/n);
      const ridgeX=offset+Math.sin(z*.006+phase)*75+Math.sin(z*.015)*30;
      const height=amplitude*(.58+.31*Math.sin(z*.008+phase)+.11*Math.cos(z*.023));
      positions.push(ridgeX-120,-12,z, ridgeX,height,z, ridgeX+120,-12,z);
    }
    for(let i=0;i<n;i++){
      const b=i*3, c=(i+1)*3;
      indices.push(b,c,b+1, b+1,c,c+1, b+1,c+1,b+2,b+2,c+1,c+2);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.castShadow=false;scene.add(mesh);
  }
  escarpment(-1020,m.grass,235,1.2);
  escarpment(-1270,m.dirt,320,2.8);
  escarpment(-1500,m.grass,355,3.7);

  function lightPost(D,x,z,h=22){
    D.cyl(x,h/2,z,.22,.17,h,m.metal,7);
    D.box(x,h-.9,z,2.6,.25,1.3,m.white);
    D.box(x,h-1.1,z,2.2,.12,1,m.light);
  }
  function window(D,x,y,z,w,h,front='z'){
    if(front==='z'){
      D.box(x,y,z,w,h,.18,m.glass);
      D.box(x,y+h/2,z,w+.25,.23,.32,m.metal);
      D.box(x,y-h/2,z,w+.25,.24,.32,m.metal);
      D.box(x-w/2,y,z,.18,h,.32,m.metal);D.box(x+w/2,y,z,.18,h,.32,m.metal);
      D.box(x,y,z,.12,h,.28,m.dark);
    }else{
      D.box(x,y,z,.18,h,w,m.glass);
      D.box(x,y+h/2,z,.32,.23,w+.25,m.metal);
      D.box(x,y-h/2,z,.32,.24,w+.25,m.metal);
      D.box(x,y,z-w/2,.32,h,.18,m.metal);D.box(x,y,z+w/2,.32,h,.18,m.metal);
    }
  }
  function closedHall(D,x,z,w,d,h,mat=m.cladding,doors=4){
    D.box(x,h/2,z,w,h,d,mat);
    D.box(x,h+.45,z,w+1.2,.9,d+1.2,m.roof);
    for(let xx=x-w/2+8;xx<x+w/2-2;xx+=8){
      D.box(xx,h/2,z+d/2+.09,.17,h,.25,m.metal);
      D.box(xx,h/2,z-d/2-.09,.17,h,.25,m.metal);
    }
    for(let i=0;i<doors;i++){
      const bx=x-w/2+(i+.5)*w/doors;
      D.box(bx,5.2,z+d/2+.15,Math.min(8,w/doors-2),9,.22,m.dark);
      D.box(bx,5.2,z+d/2+.28,Math.min(7.4,w/doors-2.5),8.3,.18,m.rust);
      window(D,bx,h-4,z+d/2+.22,Math.min(6,w/doors-4),2.2);
    }
    for(let zz=z-d/2+10;zz<z+d/2-4;zz+=11){
      window(D,x-w/2-.12,h-6,zz,3,2.5,'x');
      window(D,x+w/2+.12,h-6,zz,3,2.5,'x');
    }
    D.box(x,.5,z,w+1,1.0,d+1,m.concrete);
    block(x,z,w,d,h);
  }
  function openHall(D,x,z,w,d,h,bays=8){
    // No collision hull: the player can enter and walk between equipment.
    D.box(x,h+.5,z,w+1,.9,d+1,m.roof,8);
    D.box(x,h-.3,z,w+.3,.38,d+.3,m.metal);
    for(let i=0;i<=bays;i++){
      const xx=x-w/2+i*w/bays;
      for(let zz of [z-d/2+1,z+d/2-1]){
        D.box(xx,h/2,zz,1,h,1,m.rust);
        D.box(xx,1.2,zz,2.1,2.4,2.1,m.concrete);
        // bolted column footplates
        for(let a of [-.75,.75])for(let b of [-.75,.75])
          D.cyl(xx+a,2.48,zz+b,.09,.09,.23,m.metal,6);
      }
      if(i<bays){
        const mid=xx+w/bays/2;
        D.beam([mid,h-1,z-d/2+1],[mid,h-1,z+d/2-1],.20,m.metal);
      }
    }
    for(let zz=z-d/2+4;zz<z+d/2;zz+=10){
      D.beam([x-w/2,h+.1,zz],[x+w/2,h+.1,zz],.22,m.metal);
    }
    D.box(x,-.01,z,w-.3,.15,d-.3,m.concrete,5);
  }
  function rack(D,a,b,num=5,h=13){
    const A=p(...a),B=p(...b),span=A.distanceTo(B),dir=B.clone().sub(A).normalize();
    for(let i=0;i<=Math.ceil(span/14);i++){
      const at=A.clone().addScaledVector(dir,span*i/Math.ceil(span/14));
      for(let t of [-2.2,2.2])D.beam([at.x,0,at.z+t],[at.x,h,at.z+t],.22,m.metal);
      D.beam([at.x,h,at.z-2.2],[at.x,h,at.z+2.2],.18,m.metal);
    }
    for(let k=0;k<num;k++)D.beam([A.x,h+.7+k*.62,A.z-1.8],[B.x,h+.7+k*.62,B.z-1.8],.13,k%2===0?m.pipe:m.blue);
  }
  function stack(D,x,z,r=3,h=70){
    D.cyl(x,h/2,z,r,r*.78,h,m.rust,18);
    D.cyl(x,h-.7,z,r*.9,r*.9,2,m.dark,18);
    for(let yy=12;yy<h-3;yy+=15)D.cyl(x,yy,z,r+.09,r+.09,.46,m.metal,18);
    D.beam([x+r+.7,1,z],[x+r+.7,h-2,z],.095,m.metal);
    smokeEmitters.push([x,h,z]);
  }
  function tank(D,x,z,r=7,h=17){
    D.cyl(x,h/2,z,r,r,h,m.metal,18);
    D.cyl(x,h+.3,z,r+.1,r+.1,.6,m.roof,18);
    for(let yy=4;yy<h;yy+=5)D.cyl(x,yy,z,r+.1,r+.1,.35,m.rust,18);
    D.beam([x+r+.75,.4,z],[x+r+.75,h,z],.12,m.metal);
  }
  function conveyor(D,a,b,w=6){
    const A=p(...a),B=p(...b),delta=B.clone().sub(A),len=delta.length(),mid=A.clone().add(B).multiplyScalar(.5);
    // Rectangular belt on a world-axis sloping line, with roller stations.
    D.beam(a,b,w*.32,m.dark,7);
    D.beam([a[0],a[1]+.55,a[2]-w/2],[b[0],b[1]+.55,b[2]-w/2],.15,m.rust);
    D.beam([a[0],a[1]+.55,a[2]+w/2],[b[0],b[1]+.55,b[2]+w/2],.15,m.rust);
    for(let i=0;i<=Math.round(len/13);i++){
      const u=i/Math.max(1,Math.round(len/13)),pt=A.clone().lerp(B,u);
      D.beam([pt.x,0,pt.z],[pt.x,pt.y,pt.z],.30,m.metal);
      D.beam([pt.x,pt.y+.45,pt.z-w/2],[pt.x,pt.y+.45,pt.z+w/2],.12,m.rail);
    }
  }
  function truss(D,a,b,h=9,width=7){
    const A=p(...a),B=p(...b),length=A.distanceTo(B),steps=Math.max(3,Math.ceil(length/10));
    for(let side of [-width/2,width/2]){
      D.beam([A.x,A.y,A.z+side],[B.x,B.y,B.z+side],.23,m.rust);
      D.beam([A.x,A.y+h,A.z+side],[B.x,B.y+h,B.z+side],.23,m.metal);
      for(let i=0;i<steps;i++){
        const t=i/steps,u=(i+1)/steps,P=A.clone().lerp(B,t),Q=A.clone().lerp(B,u);
        D.beam([P.x,P.y,P.z+side],[Q.x,Q.y+h,Q.z+side],.17,m.metal);
        D.beam([P.x,P.y+h,P.z+side],[Q.x,Q.y,Q.z+side],.13,m.metal);
      }
    }
  }
  function orePile(D,x,z,r,h,mat=m.ore){
    D.cyl(x,h/2,z,r,r*.18,h,mat,17);
    for(let i=0;i<8;i++){
      let a=i*2.399,r0=r*(.4+.35*Math.abs(Math.sin(i*2.3)));
      D.cyl(x+Math.sin(a)*r0,h*.24,z+Math.cos(a)*r0,r*.3,0,h*.48,mat,6);
    }
  }
  function rail(D,x0,x1,z){
    D.box((x0+x1)/2,.16,z,x1-x0,.25,5,m.gravel,3);
    for(let t=x0;t<x1;t+=2.4)D.box(t,.33,z,.45,.18,4.2,m.rust);
    for(let dz of [-1.05,1.05])D.box((x0+x1)/2,.55,z+dz,x1-x0,.18,.16,m.rail);
  }
  function truck(D,x,z,colour=m.white){
    D.box(x,1.55,z,9.7,2.4,3.4,m.metal);
    D.box(x+3.25,3.2,z,3.3,3.2,3.4,colour);
    D.box(x-1.4,3.1,z,5.4,3.8,3.2,m.roof);
    window(D,x+4.97,3.8,z,2.8,1.2,'x');
    for(let dx of [-3.5,-.3,3.8])for(let dz of [-1.85,1.85])
      D.cyl(x+dx,.83,z+dz,1,1,.7,m.dark,10);
  }
  function walkway(D,x,z,w,d,h=9){
    raisedFloors.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y:h+.18});
    D.box(x,h,z,w,.35,d,m.metal);
    for(let s of [-1,1]){
      const zz=z+s*d/2;
      for(let xx=x-w/2;xx<x+w/2+.01;xx+=3.5){
        D.beam([xx,h,zz],[xx,h+1.3,zz],.075,m.yellow);
      }
      D.beam([x-w/2,h+1.3,zz],[x+w/2,h+1.3,zz],.085,m.yellow);
    }
  }
  function stair(D,x,z,h=9,run=12,steps=20){
    ramps.push({x,z,run,h,halfWidth:1.6});
    for(let i=0;i<steps;i++){
      const t=(i+.5)/steps;
      D.box(x+run*t,.12+h*t,z,run/steps+.09,.17,2.4,m.metal);
    }
    D.beam([x,0,z-1.2],[x+run,h,z-1.2],.09,m.yellow);
    D.beam([x,0,z+1.2],[x+run,h,z+1.2],.09,m.yellow);
  }

  // Harbour / raw materials reception.
  {
    const D=addZone('HARBOUR / RAW MATERIALS',340,-235,610);
    D.box(442,.1,-230,118,.5,390,m.concrete);
    D.box(530,.13,-230,220,.15,540,m.water,12);
    for(let i=0;i<4;i++){const z=-360+i*94;
      for(let s of [-1,1])D.beam([438+s*13,0,z],[438+s*13,54,z],.66,m.yellow);
      truss(D,[412,52,z],[520,52,z],6,8);
      D.box(469,51,z,11,5,9,m.yellow);
      D.beam([469,48,z],[469,9,z],.18,m.pipe);
      D.box(469,9,z,7,1.3,5,m.dark);
    }
    for(let x=185;x<350;x+=36)for(let z=-350;z<-115;z+=65)
      orePile(D,x,z,16+Math.abs(Math.sin(x+z))*6,9+Math.abs(Math.cos(x-z))*9,x%3?m.ore:m.coal);
    closedHall(D,385,-88,82,35,20,m.cladding,4);
    conveyor(D,[437,25,-300],[365,31,-230],7);
    conveyor(D,[365,31,-230],[170,27,-198],7);
    for(let z=-310;z<0;z+=55)lightPost(D,410,z,24);
    truck(D,362,21,m.blue);truck(D,395,25,m.yellow);
  }

  // Coke and ore preparation.
  {
    const D=addZone('COKE / SINTER',40,-260,510);
    closedHall(D,44,-315,116,62,29,m.rust,5);
    for(let i=0;i<14;i++){
      const x=-14+i*9.2;
      D.box(x,9,-236,7.8,18,31,m.rust);
      D.box(x,5,-219,5,8,.25,m.dark);
      D.box(x,13,-219,4,1,.28,m.hot);
      for(let yy of [3,8,13])D.box(x,yy,-220,6,.14,.2,m.metal);
    }
    stack(D,139,-238,4.1,95);stack(D,153,-247,3.6,82);
    tank(D,174,-283,10,22);tank(D,201,-283,10,22);tank(D,227,-283,10,22);
    rack(D,[141,0,-230],[235,0,-230],5,16);
    conveyor(D,[173,25,-198],[35,37,-212],6);
    closedHall(D,-82,-293,98,43,29,m.cladding,4);
    for(let z of [-258,-280,-304])lightPost(D,-145,z,27);
  }

  // Twin large furnace complexes, stoves, gas feeds and hot metal transport.
  function blastFurnace(D,x,z){
    D.box(x,1.3,z,66,2.6,65,m.concrete);
    D.cyl(x,14,z,12,14,24,m.rust,24);
    D.cyl(x,37,z,14,9.5,25,m.rust,24);
    D.cyl(x,57,z,9.5,8,18,m.dark,24);
    D.cyl(x,71,z,8,7,9,m.roof,24);
    for(let yy of [12,26,38,50,64,76]){
      D.cyl(x,yy,z,15-yy*.06,15-yy*.06,.9,m.metal,24);
      D.box(x,yy,z,35-yy*.09,.5,33-yy*.08,m.metal);
    }
    for(let sx of [-1,1])for(let sz of [-1,1]){
      const xx=x+sx*23,zz=z+sz*21;
      D.beam([xx,0,zz],[xx,76,zz],.72,m.rust);
      D.beam([xx,10,zz],[x+sx*9,60,z+sz*8],.33,m.metal);
    }
    for(let i=0;i<4;i++){
      const bx=x+42+i*12,bz=z-27+(i%2)*9;
      tank(D,bx,bz,5.2,36);
      D.pipePath([[bx,22,bz],[bx,22,z+13],[x+13,18,z+13]],1.3,m.blue);
    }
    for(let side of [-1,1]){
      D.pipePath([[x+side*5,76,z],[x+side*14,88,z],[x+side*31,88,z],[x+side*32,37,z]],1.55,m.rust);
    }
    D.pipePath([[x-25,16,z+17],[x-38,16,z+17],[x-38,12,z+47]],1.4,m.pipe);
    walkway(D,x-26,z+27,42,4,15);
    stair(D,x-48,z+27,15,19,28);
    for(let i=0;i<3;i++)stack(D,x-58+i*10,z-48,2.1,52+i*7);
  }
  {
    const D=addZone('BLAST FURNACES',-175,-95,570);
    blastFurnace(D,-216,-120);
    blastFurnace(D,-84,-128);
    openHall(D,-166,18,128,41,22,10);
    for(let x of [-216,-180,-144,-108])D.box(x,4,19,18,8,18,m.dark);
    D.box(-168,6,19,97,.6,7,m.rail);
    rail(D,-295,-45,64);
    rack(D,[-240,0,-60],[-54,0,-60],6,18);
    conveyor(D,[-82,32,-293],[-105,83,-130],6);
    for(let x=-265;x<-70;x+=38)lightPost(D,x,85,28);
    addInteract(-188,16,25,'E · HOT METAL SHUNT',()=>{state.heat=!state.heat;return state.heat?'TORPEDO TRANSFER ENABLED':'TRANSFER HALTED';});
  }

  // Steelmaking & casting: accessible structure with equipment.
  {
    const D=addZone('BOS / CONTINUOUS CASTING',-122,182,550);
    openHall(D,-207,170,160,88,46,12);
    for(let x of [-245,-181]){
      D.cyl(x,15,164,13,8,29,m.rust,22);
      D.cyl(x,33,164,9,9,7,m.dark,20);
      D.cyl(x,39,164,6,6,6,m.hot,20);
      for(let s of [-1,1])D.beam([x+s*15,2,162],[x+s*15,33,162],.50,m.metal);
      D.box(x,4,164,28,4,30,m.concrete);
    }
    walkway(D,-211,123,120,5,17);
    stair(D,-275,121,17,19,25);
    D.box(-205,40,170,8,6,12,m.yellow);
    D.beam([-205,39,170],[-205,8,170],.2,m.pipe);
    closedHall(D,-23,165,104,64,34,m.cladding,4);
    for(let i=0;i<8;i++){
      const x=-67+i*11;
      D.cyl(x,3,207,2.3,2.3,5,m.metal,10);
      D.box(x,5.5,207,7,1.1,15,i<3?m.hot:m.rail);
    }
    rack(D,[-140,0,121],[-33,0,121],5,14);
    lightPost(D,-305,183,25);lightPost(D,-35,239,25);
    addInteract(-242,134,23,'E · BOS CRANE',()=>{state.crane=!state.crane;return state.crane?'CRANE MOTOR RUNNING':'CRANE STOPPED';});
  }

  // Hot strip mill, plate mill, product coils and covered loading.
  {
    const D=addZone('ROLLING / DISPATCH',186,155,520);
    closedHall(D,120,159,162,70,37,m.cladding,7);
    openHall(D,270,161,112,62,26,8);
    for(let x=228;x<315;x+=9.5){
      D.cyl(x,3,161,3.1,3.1,5,m.metal,12);
      D.cyl(x,9,161,3.1,3.1,5,m.metal,12);
      D.box(x,6,161,6,.65,17,m.rail);
    }
    for(let x=223;x<326;x+=12)for(let z of [140,183]){
      D.cyl(x,3.1,z,3,3,5,m.rail,16);
      D.cyl(x,3.1,z,1.15,1.15,5.5,m.dark,12);
      D.box(x,1,z,5,.4,5,m.rust);
    }
    rail(D,15,375,296);rail(D,15,375,307);
    for(let x=210;x<360;x+=35)lightPost(D,x,277,24);
    truck(D,277,222,m.white);truck(D,305,222,m.yellow);
    rack(D,[190,0,102],[329,0,102],6,13);
  }

  // Open service workshop, tool stations and stairs/walkable gantry.
  {
    const D=addZone('WORKSHOP / UTILITIES',-298,303,510);
    openHall(D,-275,282,137,68,23,10);
    D.box(-268,4,288,82,.8,12,m.metal);
    for(let x=-329;x<=-217;x+=19){
      D.box(x,2,266,10,4,8,m.dark);
      D.box(x,4.8,266,8,.7,6,m.yellow);
      D.cyl(x,6.6,266,1.2,1.2,3,m.metal,10);
      D.box(x,3.5,296,7,7,3,m.cladding);
    }
    walkway(D,-273,257,124,4,10);
    stair(D,-341,256,10,16,24);
    for(let x=-340;x<-190;x+=19)D.box(x,3,312,10,6,8,m.rust);
    closedHall(D,-400,307,75,42,20,m.cladding,4);
    openHall(D,-416,215,66,44,14,5);
    tank(D,-412,218,6.5,12);tank(D,-393,218,6.5,12);
    rack(D,[-392,0,235],[-245,0,235],4,12);
    addInteract(-275,283,25,'E · WORKSHOP HOIST',()=>{state.crane=!state.crane;return state.crane?'WORKSHOP HOIST MOVING':'WORKSHOP HOIST STOPPED';});
  }

  // Cooling towers, power supply, service pipes, personnel facilities.
  {
    const D=addZone('UTILITIES / ENTRANCE',90,350,530);
    closedHall(D,108,330,80,38,17,m.cladding,4);
    for(let x=170;x<290;x+=31){
      D.cyl(x,2,336,13,13,4,m.concrete,22);
      D.cyl(x,4.3,336,12.4,12.4,.55,m.water,22);
      D.beam([x-10,4.9,336],[x+10,4.9,336],.22,m.metal);
    }
    closedHall(D,300,331,63,35,14,m.white,3);
    for(let x=273;x<330;x+=18){
      for(let z of [316,335]){
        D.box(x,2.9,z,11,6,7,m.blue);
        for(let i=0;i<7;i++)D.box(x-4+i*1.2,3,z+3.6,.2,4,.8,m.metal);
        for(let k=0;k<3;k++)D.cyl(x-3+k*3,7,z,.75,.75,2,m.white,8);
      }
    }
    closedHall(D,-26,418,75,33,15,m.white,3);
    closedHall(D,51,418,38,25,13,m.cladding,2);
    for(let x=-57;x<8;x+=13)window(D,x,7.7,435,7,3.4);
    rack(D,[118,0,298],[174,0,298],5,12);
    rack(D,[82,0,296],[25,0,296],4,11);
    for(let x=-55;x<170;x+=40)lightPost(D,x,377,20);
    truck(D,75,396,m.white);
  }

  const landmarks=[
    {name:'MAIN ACCESS',pos:[-10,2,380],yaw:Math.PI},
    {name:'RAW MATERIALS',pos:[350,2,-190],yaw:-.8},
    {name:'BLAST FURNACES',pos:[-290,2,-40],yaw:-1.9},
    {name:'STEELMAKING',pos:[-303,2,217],yaw:-2.6},
    {name:'ROLLING / DISPATCH',pos:[320,2,258],yaw:2.7},
    {name:'MAINTENANCE WORKSHOP',pos:[-272,2,307],yaw:Math.PI}
  ];

  // Small moving freight train built from meshes to avoid rebuilding geometry.
  function wagon(offset,color){
    const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(12,3.4,4.8),color);
    body.position.y=2.9;body.castShadow=true;g.add(body);
    for(let x of [-4,4])for(let z of [-2.35,2.35]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.55,12),m.dark);
      wheel.rotation.x=Math.PI/2;wheel.position.set(x,.9,z);g.add(wheel);
    }
    g.position.set(offset,0,305);return g;
  }
  const train=new THREE.Group();
  for(let i=0;i<5;i++){
    const w=wagon(i*16,i===0?m.yellow:m.rust);train.add(w);
  }
  scene.add(train);dynamic.push(t=>{
    if(state.heat)train.position.x=-550+(t*11)%1000;
  });
  const hoist=new THREE.Mesh(new THREE.BoxGeometry(11,5,8),m.yellow);
  hoist.castShadow=true;scene.add(hoist);
  dynamic.push(t=>{
    hoist.position.set(-240+(state.crane?Math.sin(t*.45)*48:0),20,283);
  });

  // Steelworkers move on safe service paths, never through closed factory walls.
  const people=[];
  const route=[
    [[-51,380],[51,380]], [[-345,330],[-200,330]],
    [[205,257],[338,257]],[[-290,85],[-95,85]],
    [[395,-61],[395,31]]
  ];
  for(let k=0;k<10;k++){
    const worker=new THREE.Group();
    const legs=new THREE.Mesh(new THREE.CylinderGeometry(.27,.34,1,7),m.dark);
    legs.position.y=.58;worker.add(legs);
    const vest=new THREE.Mesh(new THREE.CylinderGeometry(.48,.4,1.03,8),m.yellow);
    vest.position.y=1.52;worker.add(vest);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.27,8,6),m.white);
    head.position.y=2.35;worker.add(head);
    const helmet=new THREE.Mesh(new THREE.CylinderGeometry(.37,.32,.21,8),m.yellow);
    helmet.position.y=2.59;worker.add(helmet);
    const [a,b]=route[k%route.length];worker.position.set(a[0],0,a[1]);scene.add(worker);
    people.push({worker,a,b,phase:k*.217});
  }
  dynamic.push(t=>{
    people.forEach(({worker,a,b,phase})=>{
      const v=(t*.045+phase)%2,u=v>1?2-v:v;
      worker.position.x=lerp(a[0],b[0],u);
      worker.position.z=lerp(a[1],b[1],u);
      worker.rotation.y=v>1?PI/2:-PI/2;
      worker.position.y=Math.abs(Math.sin(t*6+phase*14))*.035;
    });
  });

  // Smoke billboards with embedded radial gradient texture.
  const smokeCanvas=document.createElement('canvas');
  smokeCanvas.width=smokeCanvas.height=64;
  const ctx=smokeCanvas.getContext('2d');
  const gr=ctx.createRadialGradient(32,32,2,32,32,32);
  gr.addColorStop(0,'rgba(220,222,222,.27)');
  gr.addColorStop(.5,'rgba(175,175,175,.12)');
  gr.addColorStop(1,'rgba(170,170,170,0)');
  ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);
  const smokeTexture=new THREE.CanvasTexture(smokeCanvas);
  const puffMaterial=new THREE.SpriteMaterial({map:smokeTexture,transparent:true,depthWrite:false,color:0xc1c4c4});
  const puffs=[];
  smokeEmitters.forEach(([x,y,z],id)=>{
    for(let i=0;i<5;i++){
      const s=new THREE.Sprite(puffMaterial);
      s.position.set(x,y,z);
      s.scale.setScalar(16+i*5);scene.add(s);
      puffs.push({sprite:s,x,y,z,phase:(i/5+id*.2)%1});
    }
  });
  dynamic.push(t=>{
    puffs.forEach(({sprite,x,y,z,phase})=>{
      const q=(phase+t*.022)%1;
      sprite.position.set(x+q*32,y+q*92,z+q*15);
      sprite.scale.setScalar(16+q*65);
      sprite.material.opacity=1;
    });
  });

  // Small number of dirt/steam effects, procedural lights positioned by use.
  const heatLight=new THREE.PointLight(0xff662e,30,120,2);
  heatLight.position.set(-205,34,164);scene.add(heatLight);
  dynamic.push(t=>{heatLight.intensity=20+8*Math.sin(t*4);});

  const state={heat:true,crane:true};
  for(const zone of zones)zone.finalize(scene);

  return {
    landmarks,colliders,interactive,zones,
    floorHeight(x,z,footY=0){
      let h=0;
      for(const r of ramps){
        const t=(x-r.x)/r.run;
        if(t>=0&&t<=1&&Math.abs(z-r.z)<=r.halfWidth){
          const y=t*r.h;
          if(y<=footY+.85)h=Math.max(h,y);
        }
      }
      for(const f of raisedFloors){
        if(x>=f.minX&&x<=f.maxX&&z>=f.minZ&&z<=f.maxZ&&f.y<=footY+.85)h=Math.max(h,f.y);
      }
      return h;
    },
    update(t,dt,camera,quality){
      for(const fn of dynamic)fn(t,dt);
      for(const zone of zones){
        const dist=camera.position.distanceTo(zone.center);
        zone.group.visible=(zone===ground||dist<Math.max(zone.range,quality===0?600:quality===1?900:1300));
      }
    },
    interact(camera){
      let best=null,dist=Infinity;
      for(const item of interactive){
        const d=Math.hypot(camera.position.x-item.x,camera.position.z-item.z);
        if(d<item.r&&d<dist){best=item;dist=d;}
      }
      return best;
    },
    activate(camera){
      const target=this.interact(camera);
      return target?target.activate():null;
    }
  };
}
