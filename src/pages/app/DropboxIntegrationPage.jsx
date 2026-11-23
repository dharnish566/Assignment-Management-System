import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  FolderSync,
  Link2,
  RefreshCw,
  Unplug,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../../layouts/PageHeader.jsx';
import { Badge, Button, Card, ErrorState, LoadingSkeleton } from '../../components/ui/index.jsx';
import { dropboxService } from '../../services/dropboxService.js';

function formatDate(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DropboxIntegrationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [params] = useSearchParams();

  async function load() {
    setError('');
    try {
      setData(await dropboxService.status());
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message ?? 'Unable to load Dropbox status.');
    }
  }

  useEffect(() => {
    load();
    if (params.get('connected') === 'true') {
      toast.success('Dropbox account successfully connected.');
    }
    if (params.get('error')) {
      const errCode = params.get('error');
      toast.error(`Dropbox authorization failed: ${errCode.replaceAll('_', ' ')}`);
    }
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const result = await dropboxService.connect();
      const authUrl = result.authorizationUrl;

      // Listen for popup OAuth messages
      const handleMessage = (event) => {
        if (event.data?.type === 'DROPBOX_CONNECTED') {
          window.removeEventListener('message', handleMessage);
          toast.success('Dropbox account successfully connected.');
          load();
          setBusy(false);
        } else if (event.data?.type === 'DROPBOX_FAILED') {
          window.removeEventListener('message', handleMessage);
          toast.error(`Dropbox connection failed: ${event.data.error || 'Unknown error'}`);
          load();
          setBusy(false);
        }
      };
      window.addEventListener('message', handleMessage);

      // Try opening in a centered popup window so professor never navigates away
      const width = 640;
      const height = 720;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'dropbox_oauth_window',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // Fallback to normal navigation if popup was blocked by browser
        window.location.assign(authUrl);
      }
    } catch (requestError) {
      toast.error(requestError.response?.data?.error?.message ?? 'Unable to start Dropbox connection.');
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await dropboxService.disconnect();
      await load();
      toast.success('Dropbox account disconnected.');
    } catch (requestError) {
      toast.error(requestError.response?.data?.error?.message ?? 'Unable to disconnect Dropbox.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await dropboxService.sync();
      toast.success(`Sync finished. Processed ${result.processed ?? 0} requests, updated ${result.updated ?? 0}.`);
      await load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error?.message ?? 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  if (error) {
    return (
      <Card>
        <ErrorState
          title="Dropbox status unavailable"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      </Card>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-10" />
        <LoadingSkeleton className="h-64" />
      </div>
    );
  }

  const isConnected = data.connected && data.status === 'CONNECTED';
  const needsReauth = data.status === 'REAUTH_REQUIRED';

  return (
    <>
      <PageHeader
        title="Dropbox Integration"
        description="Connect your professor Dropbox account to automatically generate isolated File Requests for assignments."
      />

      <div className="max-w-3xl space-y-6">
        <Card className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Cloud size={26} />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-ink">
                  {isConnected
                    ? 'Dropbox Connected'
                    : needsReauth
                    ? 'Dropbox Re-authorization Required'
                    : 'Dropbox Not Connected'}
                </h2>
                <Badge tone={isConnected ? 'success' : needsReauth ? 'danger' : 'neutral'}>
                  {data.status ?? 'DISCONNECTED'}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted">
                Joineazy integrates with the official Dropbox API v2 using OAuth 2.0 PKCE.
                Only encrypted refresh tokens are stored server-side. Joineazy never accesses or
                stores assignment files directly—all uploads occur through official Dropbox File Requests.
              </p>
            </div>
          </div>

          {needsReauth && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              <div>
                <p className="font-medium">Authorization expired or revoked</p>
                <p className="mt-1 text-xs text-red-700">
                  Please reconnect your Dropbox account so assignments can continue provisioning submission requests and verifying files.
                </p>
              </div>
            </div>
          )}

          {isConnected && (
            <div className="mt-6 space-y-4 rounded-lg border border-border bg-slate-50/50 p-5 text-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-700">
                <CheckCircle2 size={18} />
                <span>Active Connection</span>
              </div>
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Account Name</dt>
                  <dd className="mt-0.5 font-medium text-ink">{data.account?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Account Email</dt>
                  <dd className="mt-0.5 font-medium text-ink">{data.account?.email || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Dropbox Account ID</dt>
                  <dd className="mt-0.5 font-mono text-xs text-ink">{data.account?.id || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Last Token Refresh</dt>
                  <dd className="mt-0.5 text-xs text-muted">{formatDate(data.lastRefreshedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Last Background Sync</dt>
                  <dd className="mt-0.5 text-xs text-muted">{formatDate(data.lastSyncAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Granted Scopes</dt>
                  <dd className="mt-0.5 text-xs text-muted">
                    {data.scopes?.length ? data.scopes.join(', ') : 'account_info, files, file_requests'}
                  </dd>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            {isConnected ? (
              <>
                <Button
                  variant="secondary"
                  disabled={busy || syncing}
                  onClick={handleSync}
                  className="gap-2"
                >
                  <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing…' : 'Sync Submissions'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || syncing}
                  onClick={disconnect}
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Unplug size={15} />
                  Disconnect Dropbox
                </Button>
              </>
            ) : (
              <Button disabled={busy} onClick={connect} className="gap-2">
                <Link2 size={16} />
                {busy ? 'Connecting…' : needsReauth ? 'Reconnect Dropbox' : 'Connect Dropbox'}
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-6 text-sm text-muted">
          <h3 className="font-semibold text-ink flex items-center gap-2">
            <FolderSync size={16} className="text-brand" />
            How Dropbox Submission Works
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5">
            <li>When you publish an assignment, Joineazy calls Dropbox API to generate a dedicated File Request for each student (or group).</li>
            <li>Students upload directly through Dropbox's secure upload page. Files are organized neatly in your Dropbox App folder.</li>
            <li>Students verify their upload on Joineazy: the server queries Dropbox metadata to ensure the file exists and meets policies before final confirmation.</li>
            <li>No files are stored on Joineazy servers, preserving full privacy and storage efficiency.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
