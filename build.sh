#!/bin/bash

version=$(git rev-parse master)
tag=$(git describe --tags)
name="registry.diginfra.net/lwo/workflow-controller"

echo "<!-- git rev ${version} workflow controller version ${tag} -->" > views/version.pug

docker build --tag="${name}:${tag}" .
docker tag "${name}:${tag}" "${name}:latest"
docker push "${name}:${tag}" 
docker push "${name}:latest"
