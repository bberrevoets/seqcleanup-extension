FROM --platform=$BUILDPLATFORM node:24-alpine AS client-builder
WORKDIR /ui
# cache packages in layer
COPY ui/package.json /ui/package.json
COPY ui/package-lock.json /ui/package-lock.json
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && \
    npm ci
# install
COPY ui /ui
RUN npm run build

FROM scratch
# TODO: submit to the Docker Extensions Marketplace (https://www.docker.com/products/extensions/submissions/)
#   when ready; keep docs/screenshot.png and the hosted label URLs below in sync when the UI changes.
#   docs/screenshot.png lives in Git LFS, so the screenshot label must use media.githubusercontent.com
#   (raw.githubusercontent.com would serve the LFS pointer file instead of the image).
LABEL org.opencontainers.image.title="Seq Cleanup" \
    org.opencontainers.image.description="Finds your Seq containers and, with one click, stops them, removes the Stream directory from their data volume, and restarts them." \
    org.opencontainers.image.vendor="Berrevoets Systems" \
    com.docker.desktop.extension.api.version="0.4.2" \
    com.docker.extension.screenshots="[{\"alt\":\"Seq Cleanup in Docker Desktop\",\"url\":\"https://media.githubusercontent.com/media/bberrevoets/seqcleanup-extension/main/docs/screenshot.png\"}]" \
    com.docker.desktop.extension.icon="https://raw.githubusercontent.com/bberrevoets/seqcleanup-extension/main/docker.svg" \
    com.docker.extension.detailed-description="<h1>Seq Cleanup</h1><p>One button to wipe your local Seq instance clean.</p><h2>What it does</h2><ul><li>Finds the containers running a <code>datalust/seq</code> image and the data volume each mounts at <code>/data</code>; asks which instance to clean when several are found.</li><li>Stops the ones that are running.</li><li>Deletes the <code>Stream</code> directory (all logged events) from the volume.</li><li>Restarts the containers it stopped.</li></ul><p>A confirmation dialog guards against accidental clicks, and a progress log shows each step.</p>" \
    com.docker.extension.publisher-url="https://github.com/bberrevoets/seqcleanup-extension" \
    com.docker.extension.additional-urls="[{\"title\":\"Source code\",\"url\":\"https://github.com/bberrevoets/seqcleanup-extension\"},{\"title\":\"Issue tracker\",\"url\":\"https://github.com/bberrevoets/seqcleanup-extension/issues\"}]" \
    com.docker.extension.categories="volumes,utility-tools" \
    com.docker.extension.changelog="<h3>1.0.1</h3><ul><li>Fixed the Marketplace screenshot, which no longer loaded after the repository moved images to Git LFS.</li><li>The extension details now describe how Seq instances are found (by the <code>datalust/seq</code> image, with an instance picker) instead of a fixed <code>seq-data</code> volume.</li><li>Updated the UI build tooling (Vite 8); the cleanup itself is unchanged.</li></ul><h3>1.0.0</h3><ul><li>One-click cleanup: discovers Seq containers, stops the ones using the selected data volume, removes the <code>Stream</code> directory, and restarts them.</li><li>Instance picker when several Seq containers are found; bind-mounted data directories supported.</li><li>Confirmation dialog before deletion and a step-by-step progress log.</li><li>Custom extension icon.</li></ul>"

COPY metadata.json .
COPY docker.svg .
COPY --from=client-builder /ui/build ui
