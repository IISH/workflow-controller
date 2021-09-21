#!/bin/bash

version=$(git rev-parse master)
tag=$(git describe --tags)
name="registry.diginfra.net/lwo/workflow-controller"

echo '<!--' > views/version.pug
echo "git rev ${version} workflow controller version ${tag} -->" >> views/version.pug

docker_tag=${tag:1}
docker build --tag="${name}:${docker_tag}" .
docker tag "${name}:${docker_tag}" "${name}:latest"
docker push "${name}:${docker_tag}"
docker push "${name}:latest"
