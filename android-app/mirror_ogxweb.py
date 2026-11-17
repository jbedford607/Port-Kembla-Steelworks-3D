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
