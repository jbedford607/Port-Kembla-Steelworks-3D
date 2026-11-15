import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { createWorld } from './world.js';
import './style.css';

const canvas=document.getElementById('world');
const error=document.getElementById('error');
const hint=document.getElementById('hint');
const info=document.getElementById('coordinates');
const perf=document.getElementById('performance');
const weatherLabel=document.getElementById('weatherLabel');
const toast=document.getElementById('toast');
const help=document.getElementById('help');
const siteMap=document.getElementById('map');

function fail(e){
  console.error(e);
  error.hidden=false;
  error.textContent='Rendering error: '+(e?.message||String(e))+'\nFirefox: ensure hardware acceleration / WebGL is enabled. Press F12 to inspect the console.';
}

function main(){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.18;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x869198);
  scene.fog=new THREE.FogExp2(0x84878a,.00115);
  const camera=new THREE.PerspectiveCamera(75,1,.08,2200);
  const mats=createMaterials();

  const ambient=new THREE.HemisphereLight(0xc3d7ef,0x353936,1.5);
  scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffd0a1,3.4);
  sun.position.set(-400,180,-220);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.camera.left=-380;sun.shadow.camera.right=380;
  sun.shadow.camera.top=380;sun.shadow.camera.bottom=-380;
  sun.shadow.camera.near=.5;sun.shadow.camera.far=1200;
  sun.shadow.bias=-.00025;sun.shadow.normalBias=.04;
  sun.target.position.set(-110,0,-50);
  scene.add(sun,sun.target);

  // Moving cloud bank and atmospheric sun. This is geometry, not a background photograph.
  const skyMaterial=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{
      uTime:{value:0},uMode:{value:0},
      uSun:{value:new THREE.Vector3(-.82,.20,-.53).normalize()}
    },
    vertexShader:[
      'varying vec3 vD;',
      'void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}'
    ].join('\n'),
    fragmentShader:[
      'precision highp float;',
      'varying vec3 vD;uniform float uTime;uniform float uMode;uniform vec3 uSun;',
      'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;for(int j=0;j<5;j++){v+=a*noise(p);p=p*2.13+vec2(4.2,1.7);a*=.5;}return v;}',
      'void main(){',
      'vec3 d=normalize(vD);float y=d.y;',
      'vec2 c=d.xz/max(.18,abs(y+.24));',
      'float n=fbm(c*1.35+vec2(uTime*.003,0.));',
      'float fine=fbm(c*4.4+vec2(uTime*.009,.7));',
      'float shelf=smoothstep(.40,.72,n*.82+fine*.35+max(0.,y)*.18);',
      'shelf*=smoothstep(-.12,.12,y);',
      'float sunDot=max(dot(d,uSun),0.);',
      'float hor=pow(1.-abs(clamp(y,-1.,1.)),3.);',
      'vec3 sky=mix(vec3(.60,.64,.68),vec3(.27,.34,.40),clamp(y*.8+.25,0.,1.));',
      'sky+=vec3(.62,.31,.09)*pow(sunDot,10.)*.68;',
      'vec3 cloud=mix(vec3(.33,.35,.38),vec3(.10,.14,.19),clamp(y*2.+.25,0.,1.));',
      'cloud+=vec3(.18,.11,.06)*pow(sunDot,8.)*.50;',
      'sky=mix(sky,cloud,shelf*(uMode<1.5?.95:uMode<2.5?.20:.76));',
      'sky+=vec3(1.0,.59,.23)*(pow(sunDot,300.)*1.7+pow(sunDot,1400.)*2.8)*(1.-shelf*.65);',
      'sky+=vec3(.27,.12,.04)*hor*.45*(1.-shelf);',
      'if(uMode>0.5&&uMode<1.5)sky=mix(sky,vec3(.10,.14,.19),.68);',
      'if(uMode>2.5)sky=mix(sky,vec3(.019,.03,.06),.91);',
      'gl_FragColor=vec4(pow(max(sky,0.),vec3(.93)),1.);',
      '}'
    ].join('\n')
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(1500,48,28),skyMaterial);
  sky.frustumCulled=false;scene.add(sky);

  // Light shafts generated in-world. Their visibility varies with the atmosphere.
  const rays=new THREE.Group(),rayMaterials=[];
  for(let i=0;i<9;i++){
    const mat=new THREE.MeshBasicMaterial({color:0xffbc63,transparent:true,opacity:.038,
      depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1.5,23+i*3,280,7,1,true),mat);
    mesh.position.set(-280+i*58,120,-310+i*35);
    mesh.rotation.z=-.35+i*.014;
    mesh.renderOrder=2;mesh.frustumCulled=false;rays.add(mesh);rayMaterials.push(mat);
  }
  scene.add(rays);

  const world=createWorld(scene,mats);
  const keys=new Set();
  const PLAYER={x:world.landmarks[0].pos[0],y:2,z:world.landmarks[0].pos[2],vy:0,grounded:true,fly:false,height:2};
  camera.position.set(PLAYER.x,PLAYER.y,PLAYER.z);
  camera.rotation.order='YXZ';
  let yaw=world.landmarks[0].yaw,pitch=-.06;
  let quality=1,weather=0;
  const qualities=[
    {name:'PERFORMANCE',scale:.70,maxPixels:1150000,shadows:false},
    {name:'BALANCED',scale:1.0,maxPixels:2000000,shadows:true},
    {name:'ULTRA',scale:1.35,maxPixels:3600000,shadows:true}
  ];
  let lastW=0,lastH=0,time=0,frames=0,fpsAt=performance.now(),fps=0;
  let toastUntil=0,lock=false;
  const stormNames=['SUNBREAK / STORM FRONT','HEAVY THUNDERSTORM','AFTER THE STORM','NIGHT SHIFT'];
  const qTimer=()=>Math.floor(performance.now()/1000);

  function show(text,duration=3){
    toast.textContent=text;toast.style.opacity='1';toastUntil=performance.now()+duration*1000;
  }
  function applyQuality(){
    const q=qualities[quality];
    renderer.shadowMap.enabled=q.shadows;
    sun.castShadow=q.shadows;
    sun.shadow.mapSize.set(quality===2?2048:1024,quality===2?2048:1024);
    sun.shadow.map?.dispose();sun.shadow.map=null;
    lastW=lastH=0;
    show('GRAPHICS / '+q.name,2.0);
  }
  function applyWeather(){
    weatherLabel.textContent=stormNames[weather];
    skyMaterial.uniforms.uMode.value=weather;
    if(weather===0){
      scene.fog.color.set('#82858a');scene.fog.density=.00115;
      sun.color.set('#ffcf91');sun.intensity=3.45;ambient.intensity=1.3;
      rays.visible=true;rayMaterials.forEach(x=>x.opacity=.036);
    } else if(weather===1){
      scene.fog.color.set('#414c59');scene.fog.density=.0017;
      sun.color.set('#a6b2c0');sun.intensity=.65;ambient.intensity=.8;
      rays.visible=false;
    } else if(weather===2){
      scene.fog.color.set('#9dabb0');scene.fog.density=.00072;
      sun.color.set('#ffdaaf');sun.intensity=3.0;ambient.intensity=1.6;
      rays.visible=true;rayMaterials.forEach(x=>x.opacity=.024);
    } else {
      scene.fog.color.set('#101921');scene.fog.density=.00135;
      sun.color.set('#526b8d');sun.intensity=.16;ambient.intensity=.46;
      rays.visible=false;
    }
    show(stormNames[weather],2.4);
  }

  function resize(){
    const w=window.innerWidth,h=window.innerHeight;
    if(w===lastW&&h===lastH)return;
    lastW=w;lastH=h;
    const q=qualities[quality],maxRatio=Math.sqrt(q.maxPixels/(w*h));
    const ratio=Math.max(.5,Math.min(window.devicePixelRatio||1,q.scale,maxRatio));
    renderer.setPixelRatio(ratio);renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  function allowed(x,z){
    if(PLAYER.fly)return true;
    const rad=.52;
    for(const c of world.colliders){
      if(x+rad>c.minX&&x-rad<c.maxX&&z+rad>c.minZ&&z-rad<c.maxZ)
        return false;
    }
    return true;
  }
  function teleport(index){
    const l=world.landmarks[index];if(!l)return;
    PLAYER.x=l.pos[0];PLAYER.y=l.pos[1];PLAYER.z=l.pos[2];PLAYER.vy=0;
    yaw=l.yaw;pitch=-.04;
    show('SECTOR / '+l.name,2.5);
  }
  function move(dt){
    const lateral=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const fore=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    const crouch=keys.has('KeyC')||keys.has('ControlLeft');
    const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
    const speed=PLAYER.fly?28:crouch?2.8:sprint?11.5:6.8;
    let dx=0,dz=0;
    const mag=Math.hypot(lateral,fore);
    if(mag>0){
      dx=(Math.cos(yaw)*lateral-Math.sin(yaw)*fore)/mag*speed*dt;
      dz=(-Math.sin(yaw)*lateral-Math.cos(yaw)*fore)/mag*speed*dt;
      if(allowed(PLAYER.x+dx,PLAYER.z))PLAYER.x+=dx;
      if(allowed(PLAYER.x,PLAYER.z+dz))PLAYER.z+=dz;
    }
    if(PLAYER.fly){
      const up=Number(keys.has('Space'))-Number(crouch);
      PLAYER.y=Math.max(1.3,PLAYER.y+up*speed*dt);
    }else{
      if(keys.has('Space')&&PLAYER.grounded){PLAYER.vy=8.4;PLAYER.grounded=false;}
      PLAYER.vy-=23*dt;PLAYER.y+=PLAYER.vy*dt;
      const ground=crouch?1.15:2;
      if(PLAYER.y<=ground){PLAYER.y=ground;PLAYER.vy=0;PLAYER.grounded=true;}
    }
    PLAYER.x=Math.max(-1500,Math.min(1300,PLAYER.x));
    PLAYER.z=Math.max(-1550,Math.min(1550,PLAYER.z));
    camera.position.set(PLAYER.x,PLAYER.y,PLAYER.z);
    camera.rotation.set(pitch,yaw,0,'YXZ');
  }

  const rainCount=380;
  const rainPositions=new Float32Array(rainCount*6);
  const rainGeo=new THREE.BufferGeometry();
  rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3).setUsage(THREE.DynamicDrawUsage));
  const rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:0xc4d4dd,transparent:true,opacity:.30,depthWrite:false}));
  rain.frustumCulled=false;rain.visible=false;scene.add(rain);
  const drops=Array.from({length:rainCount},(_,i)=>({
    x:Math.sin(i*12.989)*43,z:Math.sin(i*15.125)*44,
    y:(i*19.7)%28
  }));
  function updateRain(dt){
    rain.visible=weather===1;
    if(!rain.visible)return;
    for(let i=0;i<rainCount;i++){
      const d=drops[i];d.y=(d.y-dt*19+28)%28;
      const k=i*6,x=PLAYER.x+d.x,y=PLAYER.y-13+d.y,z=PLAYER.z+d.z;
      rainPositions[k]=x;rainPositions[k+1]=y;rainPositions[k+2]=z;
      rainPositions[k+3]=x-.24;rainPositions[k+4]=y-1.9;rainPositions[k+5]=z+.1;
    }
    rainGeo.attributes.position.needsUpdate=true;
  }
  function updateHud(now){
    frames++;
    if(now-fpsAt>=900){
      fps=Math.round(frames*1000/(now-fpsAt));frames=0;fpsAt=now;
      perf.textContent=qualities[quality].name+' · '+fps+' FPS';
      info.textContent='X '+Math.round(PLAYER.x)+' / Z '+Math.round(PLAYER.z);
    }
    if(now>toastUntil)toast.style.opacity='0';
    const target=world.interact(camera);
    hint.textContent=target?'E  ·  '+target.label.replace(/^E\s*·\s*/,''):
      (document.pointerLockElement===canvas?'WASD MOVE · SHIFT RUN · SPACE JUMP · H HELP':'CLICK TO LOOK · WASD MOVE · T WEATHER · Q QUALITY');
  }
  canvas.addEventListener('click',()=>{
    if(document.pointerLockElement!==canvas)canvas.requestPointerLock?.();
  });
  document.addEventListener('pointerlockchange',()=>{
    lock=document.pointerLockElement===canvas;
    hint.style.opacity=lock?'.44':'.86';
  });
  document.addEventListener('mousemove',e=>{
    if(!lock)return;
    yaw-=e.movementX*.0021;
    pitch=Math.max(-1.48,Math.min(1.48,pitch-e.movementY*.0021));
  });
  document.addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    keys.add(e.code);
    if(e.repeat)return;
    if(e.code==='KeyT'){weather=(weather+1)%4;applyWeather();}
    if(e.code==='KeyQ'){quality=(quality+1)%3;applyQuality();}
    if(e.code==='KeyV'){PLAYER.fly=!PLAYER.fly;PLAYER.vy=0;show(PLAYER.fly?'FLIGHT ENABLED':'WALK MODE');}
    if(e.code==='KeyH'){help.hidden=!help.hidden;}
    if(e.code==='KeyM'){siteMap.hidden=!siteMap.hidden;}
    if(e.code==='KeyE'){const message=world.activate(camera);if(message)show(message,3);}
    if(e.code.startsWith('Digit')){const i=Number(e.code.slice(5))-1;if(i>=0&&i<6)teleport(i);}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});
  window.addEventListener('blur',()=>keys.clear());
  window.addEventListener('resize',()=>{lastW=lastH=0;});
  applyWeather();applyQuality();show('PORT KEMBLA / EXPLORE THE WORKS',3);

  let last=performance.now();
  let lightning=0,nextFlash=8;
  function frame(now){
    try{
      const dt=Math.min(.045,Math.max(.001,(now-last)/1000));last=now;time+=dt;
      if(weather===1&&time>nextFlash){
        lightning=2.2;nextFlash=time+9+Math.random()*11;
      }
      lightning=Math.max(0,lightning-dt*15);
      ambient.intensity=(weather===1?.8:weather===3?.46:weather===2?1.6:1.3)+lightning;
      move(dt);resize();
      sky.position.copy(camera.position);
      skyMaterial.uniforms.uTime.value=time;
      world.update(time,dt,camera,quality);
      updateRain(dt);
      updateHud(now);
      renderer.render(scene,camera);
      requestAnimationFrame(frame);
    }catch(e){fail(e);}
  }
  requestAnimationFrame(frame);
}
try{main();}catch(e){fail(e);}
