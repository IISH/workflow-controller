#!/bin/bash
#
# hello_world_3/startup.sh

#
source "${MESSAGE_QUEUES}/settings.sh"

function main() {
    echo "Hello world 3 on $(date)"
}

main

exit 0
