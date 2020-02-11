#!/bin/bash

version=$(git rev-parse master)
echo "<!-- ${version} -->" > views/version.pug
docker build --tag="registry.diginfra.net/lwo/workflow-controller:latest" .
docker push registry.diginfra.net/lwo/workflow-controller:latest
