#
# nullstar
# Copyright(c) 2014 Nicholas Penree <nick@penree.com>
# MIT Licensed
#

FROM ubuntu:12.04
MAINTAINER Nicholas Penree <nick@penree.com>

ENV DEBIAN_FRONTEND noninteractive

# Fix locales
RUN locale-gen en_US.UTF-8 && dpkg-reconfigure locales

# Fix timezone
RUN echo "America/New_York" > /etc/timezone && dpkg-reconfigure tzdata

# Run upgrades
RUN echo 'deb http://us.archive.ubuntu.com/ubuntu/ precise main universe multiverse' > /etc/apt/sources.list;\
  echo 'deb http://us.archive.ubuntu.com/ubuntu/ precise-updates main restricted universe' >> /etc/apt/sources.list;\
  echo 'deb http://security.ubuntu.com/ubuntu precise-security main restricted universe' >> /etc/apt/sources.list;\
  echo 'deb http://ppa.launchpad.net/chris-lea/node.js/ubuntu precise main' > /etc/apt/sources.list.d/nodejs.list;\
  echo 'deb http://ppa.launchpad.net/git-core/ppa/ubuntu precise main' > /etc/apt/sources.list.d/git.list;\
  echo udev hold | dpkg --set-selections;\
  echo initscripts hold | dpkg --set-selections;\
  echo upstart hold | dpkg --set-selections;\
  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10;\
  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv C7917B12;\
  apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv E1DF1F24;\
  apt-get update;\
  apt-get -y upgrade

# Install Node.js, MongoDB, and git
RUN apt-get -y install nodejs git

run npm install -g repl-client

# Create Node user
RUN adduser --disabled-login --gecos 'Node' node

# Install GitLab
RUN cd /home/node;\
  su node -c "git clone https://lab.weborate.com/drudge/nullstar.git -b deploy nullstar"

RUN cd /home/node/nullstar;\
  su node -c "npm install"

ADD ./config.json /home/node/nullstar/config.json

WORKDIR /home/node/nullstar

CMD ["/bin/su", "node", "-c", "node app.js"]
