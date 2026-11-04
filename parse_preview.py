import pathlib, re, json

lines = pathlib.Path('public/assets/aistudio/mappa_matematica_abfc31bf.md').read_text(encoding='utf-8').splitlines()

entities = []
current_ent = None
current_section = ''

for line in lines:
    if not line.strip():
        continue
    indent = len(line) - len(line.lstrip())
    stripped = line.strip()
    
    if stripped.startswith('# '):
        current_section = stripped[2:]
    elif stripped.startswith('- ') and indent == 2:
        if current_ent:
            entities.append(current_ent)
        ent_raw = stripped[2:].strip()
        current_ent = {
            'raw': ent_raw,
            'section': current_section,
            'details': []
        }
    elif indent >= 4 and current_ent:
        current_ent['details'].append(stripped.lstrip('- ').strip())

if current_ent:
    entities.append(current_ent)

def parse_entity(raw, section, details):
    year = 0
    m_bc = re.search(r'(\d+[\.\d]*)\s*a\.C\.', raw, re.IGNORECASE)
    if m_bc:
        y_val = int(m_bc.group(1).replace('.', ''))
        year = -y_val
    else:
        m_dc = re.search(r'(\d{3,4})\s*-\s*(\d{3,4})', raw)
        if m_dc:
            year = int(m_dc.group(1))
        else:
            m_single = re.search(r'(\d{3,4})', raw)
            if m_single:
                year = int(m_single.group(1))

    label = re.sub(r'\(.*?\)', '', raw).strip()
    if not label:
        label = raw

    low = (raw + ' ' + ' '.join(details)).lower()
    t = 'Concetto'
    if any(k in low for k in ['osso', 'tavoletta', 'papiro', 'manufatto', 'reperto', 'cippo']):
        t = 'Artefatto'
    elif any(k in low for k in ['teorema', 'lemma', 'corollario', 'congettura']):
        t = 'Teorema'
    elif any(k in low for k in ['trattato', 'libro', 'opera', 'elementi', 'al-jabr', 'principia', 'disquisitiones']):
        t = 'Opera'
    elif any(k in low for k in ['matematico', 'filosofo', 'astronomo', 'scienziato', 'nasce', 'muore', 'biografia']) or re.search(r'\d{3,4}\s*-\s*\d{3,4}', raw):
        t = 'Figura'
    elif any(k in low for k in ['metodo', 'algoritmo', 'tecnica', 'formula', 'procedimento']):
        t = 'Metodo'
    elif any(k in low for k in ['sistema', 'notazione', 'base']):
        t = 'Sistema'

    desc = ' '.join(details) if details else raw
    return {
        'label': label,
        'year': year,
        'type': t,
        'section': section,
        'desc_preview': desc[:90]
    }

first20 = [parse_entity(e['raw'], e['section'], e['details']) for e in entities[:20]]

out_lines = ['| # | Label | Anno | Tipo | Sezione |', '|---|---|---|---|---|']
for i, item in enumerate(first20):
    y_str = f"{abs(item['year'])} a.C." if item['year'] < 0 else f"{item['year']} d.C." if item['year'] > 0 else 'N/D'
    out_lines.append(f"| {i+1} | {item['label']} | {y_str} | {item['type']} | {item['section']} |")

pathlib.Path('first20_preview.txt').write_text('\n'.join(out_lines), encoding='utf-8')
print(f'Totale entita estratte: {len(entities)}')
