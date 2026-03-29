import json

try:
    with open('/home/kkells/gosr/gosr-data-legacy/un-lonely-new-york-city/resources-nyc.json', 'r') as f:
        data = json.load(f)
    
    orgs = []
    for item in data:
        if 'organization' in item:
            orgs.append(item['organization'])
    
    unique_orgs = set(orgs)
    
    print(f"Total organizations: {len(orgs)}")
    print(f"Unique organizations: {len(unique_orgs)}")
    
except Exception as e:
    print(f"Error: {e}")
