#!/bin/bash
#
# hello_world_2/startup.sh

#
source "${MESSAGE_QUEUES}/settings.sh"

# greeting
function greeting() {
  echo "Hello world ${i} on $(date)"
}

function main() {
    for i in 3 4
    do
    	greeting
	sleep 5
    done
}

main

exit 0
