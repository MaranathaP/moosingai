"""Build a deployment artifact, including installed SDK, excluding research and credentials.
Optional config argument is for a private staging artifact only; never commit the archive.
"""
import pathlib, sys, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
out = pathlib.Path(sys.argv[1]).resolve()
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in ['index.php', 'shell.html', 'workspace.css', 'workspace.js', '.htaccess']:
        z.write(root / name, name)
    for folder in ['server', 'vendor']:
        for p in (root / folder).rglob('*'):
            if p.is_file() and p.name != 'config.local.php':
                z.write(p, p.relative_to(root).as_posix())
    if len(sys.argv) > 2:
        z.write(pathlib.Path(sys.argv[2]), 'server/config.local.php')
print(f'Packaged {out.name}; research database and local config excluded')
