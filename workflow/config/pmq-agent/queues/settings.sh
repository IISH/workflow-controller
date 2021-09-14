export IDENTIFIER="$1"
WORKFLOW_ENDPOINT="$WORKFLOW_ENDPOINT"
WORKFLOW_ENDPOINT_TOKEN="$WORKFLOW_ENDPOINT_TOKEN"

if [[ -z "$IDENTIFIER" ]]
then
    echo "Identifier parameter empty."
    exit 1
fi

fileset=""
workflow=""
url="${WORKFLOW_ENDPOINT}/workflow/${IDENTIFIER}"
for t in 1 2 3
do
  workflow=$(curl --insecure --silent "${url}?${t}")
  fileset=$(jq -r .workflow.fileset <<< "$workflow")
  if [[ -z "$fileset" ]]
  then
    sleep 1
  else
    break;
  fi
done

if [ -z "$fileset" ] || [ "$fileset" == "null" ]
then
    echo "System error. Fileset ${fileset} No path found in record ${url}"
    exit 1
fi

if [ -f "$fileset" ]
then
    echo "${fileset} is a file, but expecting a directory!"
    exit 1
fi

set -e

echo "$(date +%Y-%m-%dT%H:%M:%S) Agent ${HOSTNAME} starts task ${0} ${IDENTIFIER}"
