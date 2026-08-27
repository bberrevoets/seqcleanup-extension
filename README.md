# Seq Cleanup

A Docker Desktop extension that removes all [Seq](https://datalust.co/seq) event data with one button.

When clicked, the extension:

1. Finds the containers running a `datalust/seq` image and reads the volume each mounts at `/data`.
2. Asks which instance to clean when more than one is found (bind-mounted data directories work too).
3. Stops the running containers that use the selected volume.
4. Deletes the `Stream` directory from the volume root (via a throwaway `alpine` helper container).
5. Restarts the containers it stopped.

The image match (`datalust/seq`), data mount point (`/data`), and directory name (`Stream`) are constants at the top of [ui/src/App.tsx](ui/src/App.tsx).

This is a UI-only extension: a React frontend built with MUI and Docker's theme, driving the Docker CLI through the extension API (`ddClient.docker.cli.exec`). There is no backend container.

## Installation

```shell
docker extension install bberrevoets/seqcleanup-extension:1.0.0
```

Requires Docker Desktop 4.8.0 or later. If Docker Desktop refuses the install, allow non-Marketplace
extensions under **Settings → Extensions → Allow only extensions distributed through the Docker Marketplace** (turn it off).

## Local development

You can use `docker` to build, install and push your extension. Also, we provide an opinionated [Makefile](Makefile) that could be convenient for you. There isn't a strong preference of using one over the other, so just use the one you're most comfortable with.

To build the extension, use `make build-extension` **or**:

```shell
  docker buildx build -t bberrevoets/seqcleanup-extension:latest . --load
```

To install the extension, use `make install-extension` **or**:

```shell
  docker extension install bberrevoets/seqcleanup-extension:latest
```

> If you want to automate this command, use the `-f` or `--force` flag to accept the warning message.

To preview the extension in Docker Desktop, open Docker Dashboard once the installation is complete. The left-hand menu displays a new tab with the name of your extension. You can also use `docker extension ls` to see that the extension has been installed successfully.

### Frontend development

During the development of the frontend part, it's helpful to use hot reloading to test your changes without rebuilding your entire extension. To do this, you can configure Docker Desktop to load your UI from a development server.
Assuming your app runs on the default port, start your UI app and then run:

```shell
  cd ui
  npm install
  npm run dev
```

This starts a development server that listens on port `3000`.

You can now tell Docker Desktop to use this as the frontend source. In another terminal run:

```shell
  docker extension dev ui-source bberrevoets/seqcleanup-extension:latest http://localhost:3000
```

In order to open the Chrome Dev Tools for your extension when you click on the extension tab, run:

```shell
  docker extension dev debug bberrevoets/seqcleanup-extension:latest
```

Each subsequent click on the extension tab will also open Chrome Dev Tools. To stop this behaviour, run:

```shell
  docker extension dev reset bberrevoets/seqcleanup-extension:latest
```

After changing the UI, redeploy with:

```shell
docker extension update bberrevoets/seqcleanup-extension:latest
```

> If you want to automate this command, use the `-f` or `--force` flag to accept the warning message.

### Clean up

To remove the extension:

```shell
docker extension rm bberrevoets/seqcleanup-extension:latest
```

## What's next?

- To learn more about how to build your extension refer to the Extension SDK docs at https://docs.docker.com/desktop/extensions-sdk/.
- To publish your extension in the Marketplace visit https://www.docker.com/products/extensions/submissions/.
- To report issues and feedback visit https://github.com/docker/extensions-sdk/issues.
- To look for other ideas of new extensions, or propose new ideas of extensions you would like to see, visit https://github.com/docker/extension-ideas/discussions.
