import pathlib, re, json

lines = pathlib.Path('public/assets/aistudio/mappa_matematica_abfc31bf.md').read_text(encoding='utf-8').splitlines()

# Tree parser that preserves full subtree hierarchy
def extract_full_tree(lines):
    entities = []
    current_ent = None
    current_sec = ""
    
    for line in lines:
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        
        if stripped.startswith('# '):
            current_sec = stripped[2:].strip()
        elif stripped.startswith('- ') and indent == 2:
            if current_ent:
                entities.append(current_ent)
            current_ent = {
                'raw': stripped[2:].strip(),
                'section': current_sec,
                'bullets': []
            }
        elif indent >= 4 and current_ent:
            clean_sub = stripped.lstrip('-* ').strip()
            current_ent['bullets'].append((indent, clean_sub))
            
    if current_ent:
        entities.append(current_ent)
    return entities

ents = extract_full_tree(lines)

targets = ['Papiro di Rhind', 'Plimpton 322', 'Al-Kitāb al-Mukhtaṣar']
res = []

for e in ents:
    for t in targets:
        if t.lower() in e['raw'].lower():
            desc_items = []
            for ind, b in e['bullets']:
                prefix = ' - ' if ind >= 6 else '; ' if desc_items else ''
                desc_items.append(prefix + b)
            full_desc = f"{e['raw']}. Contenuto e dettagli: " + ''.join(desc_items)
            res.append({
                'target': t,
                'raw': e['raw'],
                'full_desc': full_desc,
                'sub_bullet_count': len(e['bullets'])
            })

pathlib.Path('sample_tree_descriptions.json').write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Estratti {len(res)} esempi.')
