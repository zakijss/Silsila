# Silsila as a container: static files behind nginx, running as a non-root user on port 8080.
#   podman build -t silsila . && podman run --rm -p 8080:8080 silsila
# The first stage downloads the public sources (about 160 MB) and builds data/tree.js, data/ancient.js
# and data/world.js, which the repository does not ship; see THIRD-PARTY.md for their terms.

FROM docker.io/library/python:3.14.9-alpine AS data
RUN apk add --no-cache curl
WORKDIR /src
# Downloads first, so editing the build script does not fetch them again.
RUN mkdir cache && cd cache \
 && curl -fsSL --retry 3 -o haplotree.json https://www.familytreedna.com/public/y-dna-haplotree/get \
 && curl -fsSL --retry 3 -o yfull.json https://raw.githubusercontent.com/YFullTeam/YTree/master/current_tree.json \
 && curl -fsSL --retry 3 -o yfull-version.txt https://raw.githubusercontent.com/YFullTeam/YTree/master/current_version.txt \
 && curl -fsSL --retry 3 -o countries.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson \
 && curl -fsSL --retry 3 -o aadr.anno https://dataverse.harvard.edu/api/access/datafile/13994515
COPY tools/build_data.py tools/
COPY data/chips/ data/chips/
RUN python3 tools/build_data.py --ftdna cache/haplotree.json --yfull cache/yfull.json \
      --aadr cache/aadr.anno --chip data/chips/ftdna-family-finder-y.txt \
      --world cache/countries.geojson --aadr-version 'AADR v66' --yfull-version "$(cat cache/yfull-version.txt)" \
 && mkdir -p data/enrich \
 && echo 'window.SILSILA=window.SILSILA||{};SILSILA.enrichIndex=[];' > data/enrich/index.js

FROM docker.io/nginxinc/nginx-unprivileged:1.30.6-alpine
WORKDIR /usr/share/nginx/html
COPY index.html ./
COPY js/ js/
COPY lib/ lib/
COPY assets/ assets/
COPY data/str.js data/notes.js data/facts.js data/gmap.js data/
COPY --from=data /src/data/tree.js /src/data/ancient.js /src/data/world.js data/
COPY --from=data /src/data/enrich/index.js data/enrich/
# readable by nginx's user whatever the umask of the checkout was
USER root
RUN chmod -R a+rX /usr/share/nginx/html
USER 101
EXPOSE 8080
