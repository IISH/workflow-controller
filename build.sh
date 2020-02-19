#!/bin/bash

./build.dev.sh
docker push registry.diginfra.net/lwo/workflow-controller:latest
