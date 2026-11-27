FROM ubuntu:22.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
 openjdk-17-jre-headless xvfb xauth x11-utils xdotool imagemagick \
 libsecret-1-0 libusb-1.0-0 libgtk-3-0 libwebkit2gtk-4.0-37 libxxf86vm1 libsm6 fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home probe
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends librsvg2-common shared-mime-info strace && rm -rf /var/lib/apt/lists/*
COPY run.sh /usr/local/bin/probe-simulator
RUN chmod 755 /usr/local/bin/probe-simulator
USER probe
ENV HOME=/home/probe DISPLAY=:99 CIQ_HOME=/sdk
ENTRYPOINT ["/usr/local/bin/probe-simulator"]
