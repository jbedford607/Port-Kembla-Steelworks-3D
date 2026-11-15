// Run Vite and open Firefox only after localhost is responding.
// This file is deliberately dependency-free; run via START_FIREFOX.cmd on Windows.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const project=process.cwd();
const serverFile=join(project,'node_modules','vite','bin','vite.js');
const address='http://127.0.0.1:5173/';
if(!existsSync(serverFile)){
  console.error('\nVite is not installed. Run: npm install\n');
  process.exit(1);
}

let stopped=false,ready=false;
const child=spawn(process.execPath,[serverFile,'--host','127.0.0.1','--port','5173','--strictPort'],{
  cwd:project,stdio:'inherit',windowsHide:false
});
child.on('error',error=>{
  stopped=true;
  console.error('\nUnable to start the game server:',error.message);
  process.exitCode=1;
});
child.on('exit',code=>{
  stopped=true;
  if(code!==0){console.error('\nThe game server stopped with exit code',code,'. Scroll up for the error.');process.exitCode=1;}
});

function findFirefox(){
  const env=process.env;
  const candidates=[
    env.ProgramFiles && join(env.ProgramFiles,'Mozilla Firefox','firefox.exe'),
    env['ProgramFiles(x86)'] && join(env['ProgramFiles(x86)'],'Mozilla Firefox','firefox.exe'),
    env.LOCALAPPDATA && join(env.LOCALAPPDATA,'Mozilla Firefox','firefox.exe'),
    env.ProgramFiles && join(env.ProgramFiles,'Firefox Developer Edition','firefox.exe'),
  ].filter(Boolean);
  return candidates.find(existsSync);
}

async function serverResponding(){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),1000);
  try {
    const response=await fetch(address,{signal:controller.signal});
    return response.ok;
  } catch {return false;} finally {clearTimeout(timeout);}
}

console.log('\nStarting Steelworks. The address is '+address);
for(let attempt=0;attempt<75&&!stopped;attempt++){
  if(await serverResponding()){
    ready=true;
    console.log('\nGame server is ready.');
    const ff=findFirefox();
    if(ff){
      console.log('Opening Firefox...');
      try {const browser=spawn(ff,[address],{detached:true,stdio:'ignore'});browser.unref();}
      catch(error){console.log('Could not open Firefox automatically:',error.message);}
    } else {
      console.log('Firefox not found in standard install locations.');
      console.log('Open this address in Firefox: '+address);
    }
    console.log('Leave this window open while playing. Close it to stop the game.');
    break;
  }
  await delay(400);
}
if(!ready&&!stopped){
  console.error('\nThe server did not respond. Check the errors above.');
  console.error('If port 5173 is in use, close the other game-server window.');
  child.kill();
  process.exitCode=1;
}
