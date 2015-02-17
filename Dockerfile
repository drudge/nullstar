#
# nullstar
# Copyright(c) 2014 Nicholas Penree <nick@penree.com>
# MIT Licensed
#

FROM ubuntu:trusty
MAINTAINER Nicholas Penree <nick@penree.com>

ENV NULLSTAR_GIT_DOMAIN lab.weborate.com
ENV NULLSTAR_GIT_URL git@$NULLSTAR_GIT_DOMAIN:drudge/nullstar.git

# Prepare the system

ENV DEBIAN_FRONTEND noninteractive

USER root

## Fix locales
RUN locale-gen en_US.UTF-8 && dpkg-reconfigure locales

## Fix timezone
RUN echo "America/New_York" > /etc/timezone && dpkg-reconfigure tzdata

# Run upgrades
RUN echo 'deb http://us.archive.ubuntu.com/ubuntu/ precise trusty multiverse' >> /etc/apt/sources.list;\
  echo 'deb http://us.archive.ubuntu.com/ubuntu/ trusty-updates main restricted universe' >> /etc/apt/sources.list;\
  echo 'deb http://security.ubuntu.com/ubuntu trusty-security main restricted universe' >> /etc/apt/sources.list;\
  echo 'deb http://ppa.launchpad.net/chris-lea/node.js/ubuntu trusty main' > /etc/apt/sources.list.d/nodejs.list;\
  echo 'deb http://ppa.launchpad.net/git-core/ppa/ubuntu trusty main' > /etc/apt/sources.list.d/git.list;\
  echo udev hold | dpkg --set-selections;\
  echo initscripts hold | dpkg --set-selections;\
  echo upstart hold | dpkg --set-selections;\
  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10;\
  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv C7917B12;\
  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv E1DF1F24;\
  apt-get update;\
  apt-get -y upgrade

## Install system packages
RUN apt-get -y install nodejs git python build-essential libxml2-dev

## Install node packages
RUN npm install -g node-gyp repl-client pm2

## Create Node user
RUN adduser --disabled-login --gecos 'Node' node

ENV HOME /home/node

## Place our private key in the proper place
ADD deploy.key /home/node/.ssh/id_rsa
RUN chown -R node:node /home/node/.ssh

# Clone app repo
USER node
RUN ssh-keyscan -t rsa $NULLSTAR_GIT_DOMAIN 2>&1 >> /home/node/.ssh/known_hosts;
RUN git clone $NULLSTAR_GIT_URL -b deploy /home/node/nullstar

# Setup app, install dependencies, etc.
USER node
WORKDIR /home/node/nullstar
RUN npm install --production

# Add our config to the container
USER root
ADD config.json /home/node/nullstar/config.json
RUN chown node:node /home/node/nullstar/config.json

VOLUME /home/node/nullstar/logs
VOLUME /home/node/nullstar/data

# Start the app
USER node
CMD ["pm2", "--no-daemon", "start", "app.json"]
