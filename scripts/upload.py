"""TUS uploader. Credentials stay in a private local file; response bodies are not logged."""
import json, pathlib, sys, urllib.request
credentials = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
file = pathlib.Path(sys.argv[2])
destination = sys.argv[3] if len(sys.argv) > 3 else file.name
url = credentials['url'].rstrip('/') + '/' + destination + '?override=true'
headers = {'X-Auth': credentials['auth_key'], 'X-Auth-Rest': credentials['rest_auth_key'], 'Tus-Resumable': '1.0.0', 'Upload-Offset': '0'}
create = urllib.request.Request(url, method='POST', headers={**headers, 'Upload-Length': str(file.stat().st_size)}, data=b'')
with urllib.request.urlopen(create, timeout=60) as r:
    assert r.status == 201, 'Upload creation failed'
patch = urllib.request.Request(url, method='PATCH', headers={**headers, 'Content-Type': 'application/offset+octet-stream'}, data=file.read_bytes())
with urllib.request.urlopen(patch, timeout=120) as r:
    assert r.status == 204 and int(r.headers['Upload-Offset']) == file.stat().st_size, 'Incomplete upload'
print('Upload complete; authentication values omitted')
