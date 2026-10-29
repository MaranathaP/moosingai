"""Back up this release's known static production files before any cutover."""
import hashlib, json, pathlib, sys, urllib.request, datetime
target=pathlib.Path(sys.argv[1]).resolve();target.mkdir(parents=True,exist_ok=False)
manifest={'domain':'https://moosingai.com','captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':{}}
for name in ['index.html','app.js','style.css','README.md']:
    with urllib.request.urlopen('https://moosingai.com/'+name,timeout=30) as response:
        assert response.status==200
        content=response.read()
    (target/name).write_bytes(content);manifest['files'][name]={'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()}
(target/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print('Backed up four current production files with SHA-256 manifest; no production changes made')
