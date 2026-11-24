import * as THREE from 'three';
import { createMaterials } from './materials.js';
import { createWorld } from './world.js';
import { createFurnaceWatcher } from './horror.js';
import { createNightEvents } from './night_fx.js';
import { createPlantLighting,createIndustrialAudio } from './interiors.js';
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
  const updatePlantLighting=createPlantLighting(scene,world);
  const industrialAudio=createIndustrialAudio();
  const nightFx=createNightEvents(scene,world,camera);
  const keys=new Set();
  const visited=new Set([0]);
  const PLAYER={x:world.landmarks[0].pos[0],y:2,z:world.landmarks[0].pos[2],vy:0,grounded:true,fly:false,height:2,stamina:100,sprinting:false,feet:0,vx:0,vz:0,crouching:false,exhausted:false};
  camera.position.set(PLAYER.x,PLAYER.y,PLAYER.z);
  camera.rotation.order='YXZ';
  let yaw=world.landmarks[0].yaw,pitch=-.06;
  let quality=1,weather=0;
  const staminaBar=document.createElement('div');
  staminaBar.id='steel-stamina';staminaBar.innerHTML='<span>STAMINA</span><i></i>';
  document.body.append(staminaBar);
  const horror=createFurnaceWatcher(scene,world,camera,{
    onScare(){show('SIGNAL LOST / THE WATCHER FOUND YOU',1.25);},
    onChase(){show('HOSTILE ENTITY / RUN',2.1);},
    onRespawn(){teleport(0);show('RESTARTING SHIFT / STAY ALERT',3);}
  });
  const qualities=[
    {name:'PERFORMANCE',scale:.70,maxPixels:1150000,shadows:false},
    {name:'BALANCED',scale:1.0,maxPixels:2000000,shadows:true},
    {name:'ULTRA',scale:1.5,maxPixels:8294400,shadows:true}
  ];
  let lastW=0,lastH=0,time=0,frames=0,fpsAt=performance.now(),fps=0;
  let toastUntil=0,lock=false;
  const stormNames=['SUNBREAK / STORM FRONT','HEAVY THUNDERSTORM','AFTER THE STORM','NIGHT SHIFT'];
  const qTimer=()=>Math.floor(performance.now()/1000);
  const shortcuts=['1','2','3','4','5','6','7','8','9','0','-','=','`'];
  const mapCanvas=document.createElement('canvas');
  mapCanvas.id='steel-map-diagram';mapCanvas.width=620;mapCanvas.height=490;
  siteMap.querySelector('h2').insertAdjacentElement('afterend',mapCanvas);
  const mapContent=siteMap.querySelector('.map-content');
  mapContent.innerHTML='';
  const listButtons=[];
  const opsStatus=document.createElement('small');
  opsStatus.id='steel-ops';document.querySelector('#hud .status')?.append(opsStatus);
  world.landmarks.forEach((landmark,i)=>{
    const button=document.createElement('button');
    button.className='steel-sector-button';
    button.type='button';
    button.setAttribute('aria-label','Travel to sector '+(i+1)+': '+landmark.name);
    const k=document.createElement('b');k.textContent=shortcuts[i]||'M';
    const name=document.createElement('span');name.textContent=landmark.name;
    button.append(k,name);
    button.addEventListener('click',()=>{
      teleport(i);siteMap.hidden=true;
    });
    mapContent.append(button);listButtons.push(button);
  });
  function drawSiteMap(){
    const ctx=mapCanvas.getContext('2d');
    if(!ctx)return;
    const w=mapCanvas.width,h=mapCanvas.height;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#11191d';ctx.fillRect(0,0,w,h);
    const project=(x,z)=>[
      23+(x+1050)/2350*(w-46),
      23+(z+1200)/2520*(h-46)
    ];
    const roads=[
      [[-5,-1020],[-5,568]],[[330,-230],[330,570]],
      [[-320,300],[-320,620]],[[-550,-250],[-550,900]],
      [[-500,568],[730,568]],[[-550,620],[220,620]],
      [[-5,1034],[555,1034]],[[636,-920],[636,570]],
      [[-770,78],[-310,78]],[[630,420],[1170,420]]
    ];
    ctx.strokeStyle='#50606a';ctx.lineWidth=8;ctx.lineCap='round';
    for(const [a,b] of roads){
      const p=project(a[0],a[1]),q=project(b[0],b[1]);
      ctx.beginPath();ctx.moveTo(...p);ctx.lineTo(...q);ctx.stroke();
    }
    ctx.strokeStyle='#aeb2b3';ctx.lineWidth=1;
    for(let z=643;z<=862;z+=24){
      const a=project(-65,z),b=project(498,z);
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
    }
    ctx.fillStyle='#265263';ctx.fillRect(...project(920,-980),40,205);
    world.landmarks.forEach((loc,i)=>{
      const [x,y]=project(loc.pos[0],loc.pos[2]);
      ctx.beginPath();ctx.arc(x,y,i<6?5:4,0,Math.PI*2);
      ctx.fillStyle=visited.has(i)?'#ffbf78':'#d0d7d6';ctx.fill();
      ctx.fillStyle='#061014';ctx.font='bold 10px monospace';ctx.textAlign='center';
      if(i<9){ctx.fillText(String(i+1),x,y-8);}
    });
    const [px,py]=project(PLAYER.x,PLAYER.z);
    ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fillStyle='#ff7829';ctx.fill();
    ctx.strokeStyle='#fff0c5';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#e1c6a7';ctx.textAlign='left';
    ctx.font='14px monospace';ctx.fillText('STEELWORKS / 13 SECTORS',22,22);
    ctx.font='11px monospace';ctx.fillText('ORANGE = PLAYER',22,h-12);
    listButtons.forEach((b,i)=>b.classList.toggle('visited',visited.has(i)));
    opsStatus.textContent='SECTORS '+visited.size+'/'+world.landmarks.length+
      ' · SERVICE PANELS '+world.getVisitedOperations();
  }
  function toggleMap(){
    siteMap.hidden=!siteMap.hidden;
    if(!siteMap.hidden){
      document.exitPointerLock?.();drawSiteMap();
    }
  }

  function show(text,duration=3){
    toast.textContent=text;toast.style.opacity='1';toastUntil=performance.now()+duration*1000;
  }
  function applyQuality(){
    const q=qualities[quality];
    renderer.shadowMap.enabled=q.shadows;
    sun.castShadow=q.shadows;
    sun.shadow.mapSize.set(quality===2?4096:1536,quality===2?4096:1536);
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
    nightFx.setNight(weather===3);
    horror.setNight(weather===3,PLAYER);
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
    const rad=.43;
    for(const c of world.colliders){
      if((c.base||0)>PLAYER.feet+PLAYER.height+.12 || c.height<PLAYER.feet+.20)continue;
      if(x+rad>c.minX&&x-rad<c.maxX&&z+rad>c.minZ&&z-rad<c.maxZ)
        return false;
    }
    return true;
  }
  function teleport(index){
    const l=world.landmarks[index];if(!l)return;
    nightFx.exitHiding();
    PLAYER.x=l.pos[0];PLAYER.y=l.pos[1];PLAYER.z=l.pos[2];PLAYER.vy=0;PLAYER.vx=PLAYER.vz=0;PLAYER.feet=l.pos[1]-2;PLAYER.height=2;PLAYER.grounded=true;PLAYER.stamina=100;PLAYER.exhausted=false;
    yaw=l.yaw;pitch=-.04;visited.add(index);
    horror.onPlayerTeleport(PLAYER);
    show('SECTOR / '+l.name,2.5);
  }
  let strideTime=0,jumpHeld=false;
  function move(dt){
    const lateral=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const fore=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
    const crouch=keys.has('KeyC')||keys.has('ControlLeft');
    const mag=Math.hypot(lateral,fore);
    const wantsRun=(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&!crouch&&!PLAYER.fly;
    if(PLAYER.stamina<=4)PLAYER.exhausted=true;
    if(PLAYER.stamina>=35)PLAYER.exhausted=false;
    const running=wantsRun&&mag>0&&(weather!==3||!PLAYER.exhausted);
    PLAYER.sprinting=running;PLAYER.crouching=crouch;
    PLAYER.stamina=weather===3?Math.min(100,Math.max(0,PLAYER.stamina+dt*(running?-9:18))):100;
    const speed=PLAYER.fly?28:crouch?2.3:running?10.8:5.1;
    if(nightFx.isHidden()){
      PLAYER.vx=PLAYER.vz=0;PLAYER.sprinting=false;PLAYER.feet=0;PLAYER.height=1.4;
      PLAYER.stamina=Math.min(100,PLAYER.stamina+dt*17);
      camera.position.set(PLAYER.x,PLAYER.y,PLAYER.z);camera.rotation.set(pitch,yaw,0,'YXZ');return;
    }
    PLAYER.height+=( (crouch&&!PLAYER.fly?1.15:1.82)-PLAYER.height)*(1-Math.exp(-dt*15));
    const tx=mag?(Math.cos(yaw)*lateral-Math.sin(yaw)*fore)/mag*speed:0;
    const tz=mag?(-Math.sin(yaw)*lateral-Math.cos(yaw)*fore)/mag*speed:0;
    const response=1-Math.exp(-dt*(mag?15:21));
    PLAYER.vx+=(tx-PLAYER.vx)*response;PLAYER.vz+=(tz-PLAYER.vz)*response;
    const dx=PLAYER.vx*dt,dz=PLAYER.vz*dt;
    if(allowed(PLAYER.x+dx,PLAYER.z))PLAYER.x+=dx;else PLAYER.vx=0;
    if(allowed(PLAYER.x,PLAYER.z+dz))PLAYER.z+=dz;else PLAYER.vz=0;
    const jump=keys.has('Space');
    if(PLAYER.fly){
      PLAYER.feet=Math.max(0,PLAYER.feet+(Number(jump)-Number(crouch))*speed*dt);
      PLAYER.grounded=false;PLAYER.vy=0;
    }else{
      if(jump&&!jumpHeld&&PLAYER.grounded){PLAYER.vy=5.5;PLAYER.grounded=false;}
      PLAYER.vy-=19.6*dt;
      const previous=PLAYER.feet;
      PLAYER.feet+=PLAYER.vy*dt;
      const floor=world.floorHeight(PLAYER.x,PLAYER.z,previous);
      if(PLAYER.feet<=floor&&(PLAYER.vy<=0||PLAYER.grounded)){PLAYER.feet=floor;PLAYER.vy=0;PLAYER.grounded=true;}
      else PLAYER.grounded=false;
    }
    jumpHeld=jump;
    PLAYER.x=Math.max(-1500,Math.min(1300,PLAYER.x));PLAYER.z=Math.max(-1550,Math.min(1550,PLAYER.z));
    PLAYER.y=PLAYER.feet+PLAYER.height;
    const walking=PLAYER.grounded?Math.min(1,Math.hypot(PLAYER.vx,PLAYER.vz)/speed):0;
    strideTime+=dt*(running?14:9)*walking;
    const bob=walking*Math.sin(strideTime)*.022;
    camera.position.set(PLAYER.x,PLAYER.y+bob,PLAYER.z);
    camera.rotation.set(pitch,yaw,walking*Math.sin(strideTime*.5)*.0015,'YXZ');
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
      const sector=world.landmarks.reduce((a,b,i)=>{
        const da=Math.hypot(PLAYER.x-a.loc.pos[0],PLAYER.z-a.loc.pos[2]);
        const db=Math.hypot(PLAYER.x-b.pos[0],PLAYER.z-b.pos[2]);
        return db<da?{loc:b,index:i}:a;
      },{loc:world.landmarks[0],index:0});
      if(Math.hypot(PLAYER.x-sector.loc.pos[0],PLAYER.z-sector.loc.pos[2])<145)visited.add(sector.index);
      opsStatus.textContent='SECTORS '+visited.size+'/'+world.landmarks.length+' · SERVICE PANELS '+world.getVisitedOperations();
    }
    if(now>toastUntil)toast.style.opacity='0';
    const target=world.interact(camera),hidingHint=nightFx.getPrompt(PLAYER);
    staminaBar.classList.toggle('visible',weather===3&&PLAYER.stamina<99&&!nightFx.isHidden());
    staminaBar.querySelector('i').style.width=Math.round(PLAYER.stamina)+'%';
    hint.textContent=hidingHint|| (target?'E  ·  '+target.label.replace(/^E\s*·\s*/,''): 
      (document.pointerLockElement===canvas?'WASD MOVE · SHIFT RUN · SPACE JUMP · H HELP':'CLICK TO LOOK · WASD MOVE · T WEATHER · Q QUALITY'));
  }
  canvas.addEventListener('click',()=>{
    industrialAudio.init();horror.tryAudio();
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
    if(!e.repeat)industrialAudio.init();
    if(weather===3 && e.code!=='KeyK')horror.tryAudio();
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    keys.add(e.code);
    if(e.repeat)return;
    if(e.code==='KeyT'){weather=(weather+1)%4;if(weather===3)horror.tryAudio();applyWeather();}
    if(e.code==='KeyQ'){quality=(quality+1)%3;applyQuality();}
    if(e.code==='KeyK'){show(horror.toggleMute()?'HORROR SOUND ON':'HORROR SOUND MUTED',2.2);}
    if(e.code==='KeyJ'){show(industrialAudio.toggle()?'PLANT AUDIO ON':'PLANT AUDIO MUTED',2);}
    if(e.code==='KeyF' && weather===3){show(nightFx.toggleFlashlight()?'FLASHLIGHT ON':'FLASHLIGHT OFF',1.2);}
    if(e.code==='KeyV'&&!nightFx.isHidden()){PLAYER.fly=!PLAYER.fly;PLAYER.vy=0;show(PLAYER.fly?'FLIGHT ENABLED':'WALK MODE');}
    if(e.code==='KeyH'){help.hidden=!help.hidden;}
    if(e.code==='KeyM'){toggleMap();}
    if(e.code==='KeyE'){
      const message=nightFx.interact(PLAYER)||world.activate(camera);
      if(message){industrialAudio.click();show(message,2.7);}
    }
    if(e.code.startsWith('Digit')){
      const num=Number(e.code.slice(5));const i=num===0?9:num-1;
      if(i>=0&&i<world.landmarks.length)teleport(i);
    }
    if(e.code==='Minus'&&world.landmarks[10])teleport(10);
    if(e.code==='Equal'&&world.landmarks[11])teleport(11);
    if(e.code==='Backquote'&&world.landmarks[12])teleport(12);
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
      if(!horror.inScare()&&siteMap.hidden&&help.hidden)move(dt);
      resize();
      sky.position.copy(camera.position);
      skyMaterial.uniforms.uTime.value=time;
      world.update(time,dt,camera,quality);
      updatePlantLighting(time,camera,weather,quality,horror.getThreat());
      industrialAudio.update(PLAYER,weather,nightFx.isHidden(),dt);
      if(sun.castShadow){
        const sx=Math.round(camera.position.x/2)*2,sz=Math.round(camera.position.z/2)*2;
        sun.target.position.set(sx,0,sz);sun.position.set(sx-400,180,sz-220);
        const r=quality===2?155:105;sun.shadow.camera.left=-r;sun.shadow.camera.right=r;sun.shadow.camera.top=r;sun.shadow.camera.bottom=-r;sun.shadow.camera.updateProjectionMatrix();
      }
      nightFx.update(time,dt,PLAYER,horror.getThreat());
      const hunter=horror.getPosition();
      if(siteMap.hidden&&help.hidden)horror.update(time,dt,PLAYER,{
        hidden:nightFx.isHidden(),
        crouching:keys.has('KeyC')||keys.has('ControlLeft'),
        sprinting:PLAYER.sprinting,
        flashlightHit:nightFx.flashlightHit(hunter.x,5.2,hunter.z)
      });
      const fovTarget=75+(weather===3?Math.min(5,horror.getThreat()*5):0);
      if(Math.abs(camera.fov-fovTarget)>.04){camera.fov+=(fovTarget-camera.fov)*Math.min(1,dt*3);camera.updateProjectionMatrix();}
      updateRain(dt);
      updateHud(now);
      if(!siteMap.hidden && frames%3===0)drawSiteMap();
      renderer.render(scene,camera);
      requestAnimationFrame(frame);
    }catch(e){fail(e);}
  }
  requestAnimationFrame(frame);
}
try{main();}catch(e){fail(e);}
