import React from 'react';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

// Containers whose image contains this string count as Seq instances.
const SEQ_IMAGE = 'datalust/seq';
// Where Seq mounts its storage inside the container, and the directory at
// that volume's root holding the event stream.
const SEQ_DATA_DIR = '/data';
const DIR = 'Stream';

// Note: This line relies on Docker Desktop's presence as a host application.
// If you're running this React app in a browser, it won't work properly.
const client = createDockerDesktopClient();

function useDockerDesktopClient() {
  return client;
}

interface SeqInstance {
  id: string;
  name: string;
  image: string;
  state: string;
  mount?: { kind: 'volume' | 'bind'; ref: string };
  blocked?: string; // why this instance can't be cleaned
}

function errorMessage(e: unknown): string {
  const err = e as { stderr?: string; message?: string };
  return err?.stderr?.trim() || err?.message || String(e);
}

export function App() {
  const [finding, setFinding] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [instances, setInstances] = React.useState<SeqInstance[]>([]);
  const [selectedId, setSelectedId] = React.useState('');
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [log, setLog] = React.useState<string[]>([]);
  const ddClient = useDockerDesktopClient();

  const append = (line: string) => setLog((prev) => [...prev, line]);

  // Find Seq containers and the volume each mounts at /data.
  const findInstances = async () => {
    setFinding(true);
    setLog([]);
    try {
      const ps = await ddClient.docker.cli.exec('ps', [
        '-a',
        '--format',
        // NOTE: exec() joins args into one shell command line — whitespace
        // splits an argument and metacharacters like | are interpreted.
        // The embedded quotes (SDK-documented pattern) keep this one token.
        '"{{json .}}"',
      ]);
      const all = (ps.stdout ?? '').trim() ? ps.parseJsonLines() : [];
      const seqContainers = all.filter(
        (c: { Image?: string }) =>
          typeof c.Image === 'string' &&
          c.Image.toLowerCase().includes(SEQ_IMAGE)
      );
      if (seqContainers.length === 0) {
        ddClient.desktopUI.toast.error(
          `No containers with a ${SEQ_IMAGE} image found.`
        );
        return;
      }

      const found: SeqInstance[] = [];
      for (const c of seqContainers) {
        const inst: SeqInstance = {
          id: c.ID,
          name: c.Names,
          image: c.Image,
          state: c.State,
        };
        const res = await ddClient.docker.cli.exec('container', [
          'inspect',
          c.ID,
          '--format',
          '"{{json .Mounts}}"',
        ]);
        const mounts: Array<{ Type: string; Name?: string; Source?: string; Destination: string }> =
          (res.stdout ?? '').trim() ? res.parseJsonObject() : [];
        const m = mounts.find((mt) => mt.Destination === SEQ_DATA_DIR);
        if (!m) {
          inst.blocked = `no ${SEQ_DATA_DIR} mount`;
        } else {
          const ref = m.Type === 'volume' ? m.Name : m.Source;
          if (!ref) {
            inst.blocked = `unsupported ${SEQ_DATA_DIR} mount`;
          } else if (/\s/.test(ref)) {
            // exec() would split this argument — see NOTE above.
            inst.blocked = 'mount path contains spaces';
          } else {
            inst.mount = { kind: m.Type === 'volume' ? 'volume' : 'bind', ref };
          }
        }
        found.push(inst);
      }
      setInstances(found);
      const first =
        found.find((i) => !i.blocked && i.state === 'running') ??
        found.find((i) => !i.blocked);
      setSelectedId(first?.id ?? '');
      setDialogOpen(true);
    } catch (e) {
      ddClient.desktopUI.toast.error(errorMessage(e));
    } finally {
      setFinding(false);
    }
  };

  const cleanup = async () => {
    const inst = instances.find((i) => i.id === selectedId);
    if (!inst?.mount) {
      return;
    }
    const { kind, ref } = inst.mount;
    setDialogOpen(false);
    setBusy(true);
    setLog([]);
    try {
      append(`Cleaning ${inst.name} (${kind}: ${ref})…`);

      // Which containers must be stopped? For a named volume: every running
      // container using it, not just the picked Seq instance. For a bind
      // mount: just the picked instance.
      let toRestart: { id: string; name: string }[];
      if (kind === 'volume') {
        const users = await ddClient.docker.cli.exec('ps', [
          '-a',
          '--filter',
          `volume=${ref}`,
          '--format',
          '"{{json .}}"',
        ]);
        const list = (users.stdout ?? '').trim() ? users.parseJsonLines() : [];
        toRestart = list
          .filter((c: { State: string }) => c.State === 'running')
          .map((c: { ID: string; Names: string }) => ({ id: c.ID, name: c.Names }));
      } else {
        toRestart =
          inst.state === 'running' ? [{ id: inst.id, name: inst.name }] : [];
      }

      for (const c of toRestart) {
        append(`Stopping ${c.name}…`);
        await ddClient.docker.cli.exec('stop', [c.id]);
      }

      // Remove the Stream directory via a throwaway helper container.
      // Capture a failure but don't bail: the containers we stopped must
      // be restarted either way.
      let rmError: unknown;
      append(`Removing ${DIR}/ from ${kind} ${ref}…`);
      try {
        await ddClient.docker.cli.exec('run', [
          '--rm',
          '-v',
          `${ref}:/volume`,
          'alpine',
          'rm',
          '-rf',
          `/volume/${DIR}`,
        ]);
      } catch (e) {
        rmError = e;
      }

      // Restart what was running — each independently, so one failure
      // doesn't strand the rest.
      for (const c of toRestart) {
        append(`Starting ${c.name}…`);
        try {
          await ddClient.docker.cli.exec('start', [c.id]);
        } catch (e) {
          append(`Failed to start ${c.name}: ${errorMessage(e)}`);
        }
      }

      if (rmError) {
        throw rmError;
      }
      append('Done.');
      ddClient.desktopUI.toast.success(
        `Removed ${DIR}/ from ${inst.name}'s data ${kind}; ${toRestart.length} container(s) restarted.`
      );
    } catch (e) {
      const msg = errorMessage(e);
      append(`Failed: ${msg}`);
      ddClient.desktopUI.toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const selected = instances.find((i) => i.id === selectedId);

  return (
    <>
      <Typography variant="h3">Seq Cleanup</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
        Removes all Seq event data by deleting the <code>{DIR}</code> directory
        on a Seq container's data volume. The extension finds containers running
        a <code>{SEQ_IMAGE}</code> image and asks which one to clean when there
        is more than one. Containers using the volume are stopped first and
        restarted afterwards.
      </Typography>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 4 }}>
        <Button
          variant="contained"
          color="error"
          disabled={busy || finding}
          onClick={findInstances}
        >
          Clean Seq event data
        </Button>
        {(busy || finding) && <CircularProgress size={24} />}
      </Stack>
      {log.length > 0 && (
        <Box sx={{ mt: 3 }}>
          {log.map((line, i) => (
            <Typography
              key={i}
              variant="body2"
              sx={{ fontFamily: 'monospace' }}
            >
              {line}
            </Typography>
          ))}
        </Box>
      )}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {instances.length > 1
            ? 'Which Seq instance?'
            : 'Delete all Seq event data?'}
        </DialogTitle>
        <DialogContent>
          {instances.length > 1 && (
            <DialogContentText sx={{ mb: 1 }}>
              Several Seq containers were found — pick the one to clean.
            </DialogContentText>
          )}
          <RadioGroup
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {instances.map((i) => (
              <FormControlLabel
                key={i.id}
                value={i.id}
                disabled={!!i.blocked}
                control={<Radio />}
                sx={{ alignItems: 'flex-start', my: 0.5 }}
                label={
                  <Box>
                    <Typography variant="body2">
                      {i.name}{' '}
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        ({i.image}, {i.state})
                      </Typography>
                    </Typography>
                    <Typography
                      variant="caption"
                      color={i.blocked ? 'error' : 'text.secondary'}
                    >
                      {i.blocked ?? `${i.mount!.kind}: ${i.mount!.ref}`}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </RadioGroup>
          <DialogContentText sx={{ mt: 2 }}>
            This permanently deletes the <code>{DIR}</code> directory on the
            selected instance's data volume — all logged events are lost.
            Containers using the volume will be stopped and restarted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!selected?.mount}
            onClick={cleanup}
          >
            Stop, clean &amp; restart
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
