import pathlib

text = pathlib.Path('public/assets/aistudio/mappa_matematica_abfc31bf.md').read_text(encoding='utf-8')
out = []

for name in ['Papiro di Rhind', 'Plimpton 322', 'al-Kitāb al-mukhtaṣar', 'al-Jabr', 'Al-Jabr']:
    idx = text.find(name)
    if idx != -1:
        out.append(f'=== Found: {name} at {idx} ===')
        out.append(text[idx-40:idx+900])
        out.append('='*50)
    else:
        out.append(f'Not found: {name}')

pathlib.Path('samples_output.txt').write_text('\n'.join(out), encoding='utf-8')
print('Scritto samples_output.txt')
