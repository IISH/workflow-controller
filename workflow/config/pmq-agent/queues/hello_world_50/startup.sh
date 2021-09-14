#!/bin/bash
#
# hello_world_5/startup.sh

#
source "${MESSAGE_QUEUES}/settings.sh"

function main() {
    echo "Hello world 5 on $(date)"
    sleep 1000
}

main

exit 0
