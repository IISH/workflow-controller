#!/bin/bash
#
# hello_world_4/startup.sh

#
source "${MESSAGE_QUEUES}/settings.sh"

function main() {
    echo "Hello world 4 on $(date)"
}

main

exit 0
