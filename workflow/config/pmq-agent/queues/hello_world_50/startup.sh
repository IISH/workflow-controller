#!/bin/bash
#
# hello_world_50/startup.sh

source "${MESSAGE_QUEUES}/settings.sh"

# greeting
function greeting() {
  echo "Hello world ${1} on $(date)"
  sleep 1 # 1 seconds
}

function main() {
    	greeting "$IDENTIFIER"
}

main

exit 0
