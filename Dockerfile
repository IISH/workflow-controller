FROM node:alpine3.11
LABEL Description="Workflow controller" Version="v1.1.3"

COPY . /home/node

RUN rm -rf /home/node/.git /home/node/config /home/node/.gitignore /home/node/bin/sessions

WORKDIR /home/node

EXPOSE 3000

ENV NODE_ENV=production \
    CONFIG_FILE="./config.json"

USER node

CMD ["/usr/local/bin/node", "/home/node/bin/www"]
