FROM node:alpine
WORKDIR /bot
RUN apk add --no-cache git && \
    npm install -g pm2 && \
    git config --global url."https://".insteadOf git:// && \
    git config --global url."https://github.com/".insteadOf git@github.com && \
    git clone https://github.com/mxgamecoder/X-Vortex.git . && \
    yarn install
EXPOSE 8000
CMD ["npm", "start"]
