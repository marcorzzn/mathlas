import json, pathlib, re

nodes = json.loads(pathlib.Path('nodes.json').read_text(encoding='utf-8'))
lines = pathlib.Path('public/assets/aistudio/mappa_matematica_abfc31bf.md').read_text(encoding='utf-8').splitlines()

# Build normalized dictionary of existing nodes
node_lookup = {}
for n in nodes:
    norm = re.sub(r'[^a-z0-9]', '', n['label'].lower())
    node_lookup[norm] = n

# Also build token sets for key figures
figures = ['talete', 'pitagora', 'euclide', 'archimede', 'apollonio', 'eratostene', 'diofanto', 'ipazia', 
           'al-khwarizmi', 'khwarizmi', 'fibonacci', 'cardano', 'tartaglia', 'ferrari', 'descartes', 
           'fermat', 'pascal', 'newton', 'leibniz', 'eulero', 'euler', 'gauss', 'cauchy', 'galois', 
           'abel', 'riemann', 'poincare', 'hilbert', 'noether', 'turing', 'godel', 'neumann', 'grothendieck']

matches = []

for line in lines:
    if not line.strip() or not line.strip().startswith('- '):
        continue
    indent = len(line) - len(line.lstrip())
    if indent != 2:
        continue
    
    raw = line.strip()[2:].strip()
    norm = re.sub(r'[^a-z0-9]', '', re.sub(r'\(.*?\)', '', raw).lower())
    
    # Exact or sub-match
    matched_node = None
    if norm in node_lookup:
        matched_node = node_lookup[norm]
    else:
        for f in figures:
            if f in norm:
                # find in existing
                for k, n in node_lookup.items():
                    if f in k:
                        matched_node = n
                        break
                if matched_node:
                    break
    
    if matched_node:
        matches.append({
            'raw_historical': raw,
            'existing_id': matched_node['id'],
            'existing_label': matched_node['label'],
            'existing_desc': matched_node['desc']
        })

report = [
    f'Totale corrispondenze/duplicati individuati: {len(matches)}',
    '| # | Entità in mappa_matematica.md | Nodo Esistente in ontologyData_full.ts | ID Esistente | Azione di Merge |',
    '|---|---|---|---|---|'
]

for i, m in enumerate(matches[:30]):
    action = 'Arricchimento Description (_updated: true)'
    if 'elementi' in m['raw_historical'].lower() and 'euclide' in m['existing_label'].lower() and 'elementi' not in m['existing_label'].lower():
        action = 'Separazione Ambiguità (euclide_elementi)'
    report.append(f"| {i+1} | {m['raw_historical'][:38]} | {m['existing_label'][:32]} | {m['existing_id']} | {action} |")

pathlib.Path('duplicates_report.txt').write_text('\n'.join(report), encoding='utf-8')
print(f'Trovati {len(matches)} potenziali duplicati.')
