#!/bin/bash
cd /home/kkells/gosr/gosr-data-legacy/un-lonely-new-york-city
echo "Total resources:"
jq 'length' resources-nyc.json
echo "Total organization entries:"
jq -r '.[].organization' resources-nyc.json | wc -l
echo "Unique organizations:"
jq -r '.[].organization' resources-nyc.json | sort | uniq | wc -l


