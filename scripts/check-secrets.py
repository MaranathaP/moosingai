"""Scan staged source for common credential formats without printing matching text."""
import re, subprocess
def git(*args):
    return subprocess.check_output(['git', *args], text=True, encoding='utf8')
patterns = [r'(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}', r'whsec_[A-Za-z0-9]{10,}', r'gh[pousr]_[A-Za-z0-9]{20,}', r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY']
hits=[]
for file in git('diff','--cached','--name-only','--diff-filter=ACM').splitlines():
    content=git('show', ':'+file)
    if any(re.search(pattern, content) for pattern in patterns):
        hits.append(file)
print('Secret-pattern scan:', 'PASS' if not hits else ', '.join(hits))
raise SystemExit(bool(hits))
