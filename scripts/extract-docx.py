import zipfile
import xml.etree.ElementTree as ET
import sys

path = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else None
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read('word/document.xml'))
lines = []
for p in root.iter(f'{W}p'):
    texts = [t.text for t in p.iter(f'{W}t') if t.text]
    if texts:
        lines.append(''.join(texts))
text = '\n'.join(lines)
if out:
    with open(out, 'w', encoding='utf-8') as f:
        f.write(text)
else:
    sys.stdout.buffer.write(text.encode('utf-8'))
