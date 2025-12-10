"""
scripts/inspect_payload.py

Python helper to inspect migration-payload.json and extract hub-like items.

Usage:
  python3 scripts/inspect_payload.py migration-payload.json
  python3 scripts/inspect_payload.py migration-payload.json --extract-hubs
"""

import json
import sys
import os
from typing import Any, Dict, List

def read_json(fp: str) -> Any:
    with open(fp, 'r', encoding='utf-8') as f:
        return json.load(f)

H_KEYS = ['hub','city','country','country_code','lat','lng','lon','latitude','longitude','location','coords','postal','zip','name']

def detect_fields(obj: Any, prefix='') -> List[str]:
    found = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            lk = k.lower()
            for h in H_KEYS:
                if h in lk:
                    found.add(prefix + k if prefix else k)
            # recurse
            if isinstance(v, (dict, list)):
                for sub in detect_fields(v, prefix + k + '.' if prefix else k + '.'):
                    found.add(sub)
            elif isinstance(v, str):
                vs = v.lower()
                for h in ['hub','city','country','latitude','longitude']:
                    if h in vs:
                        found.add(f'(value contains {h})')
    elif isinstance(obj, list):
        for i, el in enumerate(obj):
            for sub in detect_fields(el, f'{prefix}[{i}].'):
                found.add(sub)
    return list(found)

def extract_latlon(obj: Any):
    def to_num(v):
        if v is None: return None
        try:
            return float(str(v).replace(',', '.'))
        except:
            return None
    if isinstance(obj, dict):
        lat = lon = None
        for k, v in obj.items():
            lk = k.lower()
            if any(x in lk for x in ['lat','latitude']):
                lat = to_num(v) or lat
            if any(x in lk for x in ['lon','lng','longitude']):
                lon = to_num(v) or lon
            if isinstance(v, dict):
                nested = extract_latlon(v)
                if nested:
                    lat = lat or nested.get('lat')
                    lon = lon or nested.get('lon')
        if lat is not None or lon is not None:
            return {'lat': lat, 'lon': lon}
    return None

def normalize_payload(raw):
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        if 'collections' in raw and isinstance(raw['collections'], dict):
            all_items = []
            for k, v in raw['collections'].items():
                if isinstance(v, list):
                    for it in v:
                        if 'collection_name' not in it:
                            it['collection_name'] = k
                        all_items.append(it)
            if all_items:
                return all_items
        # fallback: find first array of objects
        for k, v in raw.items():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
    return []

def main():
    if len(sys.argv) < 2 or '--help' in sys.argv or '-h' in sys.argv:
        print('Usage: python3 scripts/inspect_payload.py migration-payload.json [--extract-hubs]')
        sys.exit(0)
    fp = sys.argv[1]
    extract = '--extract-hubs' in sys.argv
    if not os.path.exists(fp):
        print('File not found:', fp)
        sys.exit(2)
    raw = read_json(fp)
    items = normalize_payload(raw)
    print('Loaded payload. Item count:', len(items))
    # collections summary
    colcounts = {}
    for it in items:
        cname = it.get('collection_name') if isinstance(it, dict) else 'unknown'
        colcounts[cname] = colcounts.get(cname, 0) + 1
    print('\\nCollections summary:')
    for k, v in sorted(colcounts.items(), key=lambda kv: -kv[1]):
        print(f' - {k}: {v}')
    print('\\nSample previews:')
    for i, it in enumerate(items[:20]):
        preview = json.dumps(it.get('item', it))[:200]
        print(f'{i+1}. collection: {it.get("collection_name","unknown")} preview: {preview}')
    # detect hub-like
    hubs = []
    for it in items:
        obj = it.get('item', it) if isinstance(it, dict) else it
        fields = detect_fields(obj)
        latlon = extract_latlon(obj)
        if fields or latlon:
            hubs.append({'collection_name': it.get('collection_name','unknown'), 'id': it.get('id'), 'fields': fields, 'latlon': latlon, 'item': obj})
    print('\\nFound', len(hubs), 'hub-like candidate(s).')
    for i, h in enumerate(hubs[:50]):
        print(f'\\n[{i+1}] collection: {h["collection_name"]} id:{h.get("id","-")} fields:{",".join(h["fields"])} latlon:{h.get("latlon")}')
        print(' preview:', json.dumps(h['item'])[:400])
    if extract:
        out = 'hubs_candidates.json'
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(hubs, f, indent=2, ensure_ascii=False)
        print('\\nWrote hubs candidates to', out)
    else:
        print('\\nTip: re-run with --extract-hubs to write hubs_candidates.json') 

if __name__ == '__main__':
    main()