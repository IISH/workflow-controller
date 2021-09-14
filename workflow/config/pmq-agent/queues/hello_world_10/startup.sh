#!/bin/bash
#
# hello_world_10/startup.sh

source "${MESSAGE_QUEUES}/settings.sh"

# greeting
function greeting() {
  echo "Hello world ${1} on $(date)"
  sleep 1
}

function main() {
    	greeting "$IDENTIFIER"
}

main

exit 0
