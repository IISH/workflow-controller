#!/bin/bash
#
# hello_world_1/startup.sh

source "${MESSAGE_QUEUES}/settings.sh"

# greeting
function greeting() {
  echo "Hello world ${i} on $(date)"
}

function main() {
    for i in 1 2
    do
    	greeting "$i"
	sleep 5
    done
}

main

exit 0
