import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingSkeleton } from '../../components/ui/index.jsx';

export default function DropboxCallbackPage() {
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    // Forward the OAuth code and state to Express backend callback on port 4000
    const backendUrl = `http://localhost:4000/api/integrations/dropbox/callback${window.location.search}`;
    window.location.replace(backendUrl);
  }, [params]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink">Completing Dropbox authorization…</h2>
        <p className="text-xs text-muted">Exchanging authorization code and saving connection.</p>
        <LoadingSkeleton className="mx-auto h-8 w-48" />
      </div>
    </div>
  );
}
