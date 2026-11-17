#!/usr/bin/env python3
"""Best-effort local mirror of existing ogxweb web build for bundling in Android."""
import os,re,sys,urllib.request,urllib.parse,time
from pathlib import Path
BASE="https://actavis.dev/ogxweb/"
ROOT=Path("app/src/main/assets/ogxweb")
ROOT.mkdir(parents=True,exist_ok=True)
queue=["index.html"]
seen=set()
total=0
static_ext=(".html",".js",".mjs",".css",".wasm",".data",".png",".jpg",".jpeg",".gif",".svg",".woff",".woff2",".ttf",".ogg",".mp3",".wav",".xip",".xpr",".bin",".json")
rx=re.compile(r'''["']([^"'\s<>]+?\.(?:js|mjs|css|wasm|data|png|jpg|jpeg|gif|svg|woff2?|ttf|ogg|mp3|wav|xip|xpr|bin|json)(?:\?[^"']*)?)["']''',re.I)
for i in range(110):
    if not queue: break
    item=queue.pop(0).split("?")[0].lstrip("/")
    if item in seen or ".." in item or not item:continue
    seen.add(item)
    dest=ROOT/item
    try:
        url=urllib.parse.urljoin(BASE,item)
        with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"}),timeout=20) as res:
            blob=res.read(125*1024*1024+1)
            if len(blob)>125*1024*1024: continue
        dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(blob)
        total+=len(blob);print("MIRROR",item,len(blob),flush=True)
        if total>250*1024*1024:break
        if item.endswith((".html",".js",".mjs",".css")) and len(blob)<10_000_000:
            txt=blob.decode("utf-8","ignore")
            for part in rx.findall(txt):
                u=urllib.parse.urljoin(url,part)
                parsed=urllib.parse.urlparse(u)
                if parsed.netloc=="actavis.dev" and parsed.path.startswith("/ogxweb/"):
                    path=parsed.path.removeprefix("/ogxweb/")
                    if path not in seen and path not in queue: queue.append(path)
            if item=="index.html":
                for part in re.findall(r'''(?:src|href)\s*=\s*["']([^"']+)["']''',txt,re.I):
                    u=urllib.parse.urljoin(url,part)
                    p=urllib.parse.urlparse(u)
                    if p.netloc=="actavis.dev" and p.path.startswith("/ogxweb/"):
                        path=p.path.removeprefix("/ogxweb/")
                        if path and path not in seen and path not in queue:queue.append(path)
    except Exception as exc:
        print("MIRROR FAIL",item,str(exc),flush=True)
    time.sleep(.08)
wasm=list(ROOT.rglob("*.wasm"))
if (ROOT/"index.html").is_file() and wasm:
    (ROOT/"offline.ok").write_text("This source was mirrored from the public project. Test engine on device.",encoding="utf-8")
    print("OFFLINE PRELIMINARY",len(wasm),"wasm files",flush=True)
else:
    print("Using network-backed authentic ogxweb; local copy incomplete",flush=True)
print("TOTAL",total,"bytes",len(list(ROOT.rglob("*"))),"entries",flush=True)


# Complete the CDN mirror. The WebAssembly shell above is only ~3.5 MB;
# Theseus needs all of the XIP scenes, fonts and audio listed by the manifest.
import concurrent.futures, json
manifest_path=ROOT/"cdn/manifest.json"
if manifest_path.exists():
    manifest=json.loads(manifest_path.read_text())
    pairs=[("cdn/files/"+k,info["size"]) for k,info in manifest["files"].items()]
    pairs.append(("boot/xbox_boot.mp4",None))
    print("ASSET COUNT",len(pairs),"EXPECTED MiB",round(sum(n or 0 for _,n in pairs)/1048576),flush=True)
    def fetch_manifest_asset(pair):
        path,expected=pair
        dest=ROOT/path
        if dest.exists() and (expected is None or dest.stat().st_size==expected):
            return (path,dest.stat().st_size,None)
        url=BASE+"/".join(urllib.parse.quote(s,safe="") for s in path.split("/"))
        err=None
        for retry in range(3):
            try:
                req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0"})
                with urllib.request.urlopen(req,timeout=60) as response:
                    b=response.read()
                if expected is not None and len(b)!=expected:
                    raise ValueError("size %d != expected %d"%(len(b),expected))
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(b)
                return (path,len(b),None)
            except Exception as e:
                err=str(e)
                time.sleep(.3+retry)
        return (path,0,err)
    errors=[];bytes_done=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for idx,(path,num,err) in enumerate(pool.map(fetch_manifest_asset,pairs),1):
            bytes_done+=num
            if err:
                errors.append((path,err))
                print("ASSET FAIL",path,err,flush=True)
            if idx%25==0 or idx==len(pairs):
                print("PROGRESS",idx,"/",len(pairs),round(bytes_done/1048576,1),"MiB",flush=True)
    complete=not errors and (ROOT/"ogxweb.wasm").exists() and (ROOT/"ogxweb.data").exists() and (ROOT/"boot/xbox_boot.mp4").exists()
    flag=ROOT/"offline.ok"
    if complete:
        flag.write_text("Full public ogxweb manifest, boot video, and WebAssembly engine bundled.\n")
        print("OFFLINE VERIFIED",len(pairs),"assets",round(bytes_done/1048576,1),"MiB",flush=True)
    else:
        if flag.exists():flag.unlink()
        print("MIRROR INCOMPLETE. Use online original dashboard. Errors",len(errors),flush=True)
