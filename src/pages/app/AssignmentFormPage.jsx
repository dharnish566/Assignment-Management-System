import { ArrowLeft, ExternalLink, Link2, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../../layouts/PageHeader.jsx';
import { Button, Card, Input, Select, Textarea } from '../../components/ui/index.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { dropboxService } from '../../services/dropboxService.js';

const providerInfo = {
  DROPBOX: {
    label: 'Dropbox',
    heading: 'Dropbox Submission',
    entry: 'https://www.dropbox.com/requests',
    hosts: ['dropbox.com'],
  },
  ONEDRIVE: {
    label: 'OneDrive',
    heading: 'OneDrive File Request',
    help: 'Create a OneDrive File Request, copy its upload link, and paste it below.',
    entry: 'https://www.microsoft365.com/',
    hosts: ['onedrive.live.com', '1drv.ms', 'sharepoint.com'],
  },
};

function localDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validProviderUrl(value, provider) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      providerInfo[provider].hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}

export default function AssignmentFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    dueAt: '',
    submissionProvider: 'DROPBOX',
    submissionUrl: '',
    audienceType: 'ALL_STUDENTS',
    groupIds: [],
  });

  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [dropboxStatus, setDropboxStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      assignmentService.groups(),
      dropboxService.status().catch(() => ({ connected: false })),
      editing ? assignmentService.getById(id) : Promise.resolve({ assignment: null }),
    ])
      .then(([groupResult, dbxResult, assignmentResult]) => {
        setGroups(groupResult.groups);
        setDropboxStatus(dbxResult);
        if (assignmentResult.assignment) {
          const a = assignmentResult.assignment;
          setForm({
            title: a.title,
            description: a.description,
            dueAt: localDateTime(a.due_at),
            submissionProvider: a.submission_provider ?? 'DROPBOX',
            submissionUrl: a.submission_url ?? a.onedrive_url ?? '',
            audienceType: a.audience_type,
            groupIds: a.assignedGroups?.map((g) => g.id) || [],
          });
        }
      })
      .catch((requestError) =>
        setError(requestError.response?.data?.error?.message ?? 'Unable to load assignment data.')
      )
      .finally(() => setLoading(false));
  }, [editing, id]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const visibleGroups = useMemo(
    () => groups.filter((group) => group.name.toLowerCase().includes(groupSearch.toLowerCase())),
    [groups, groupSearch]
  );

  function toggleGroup(groupId) {
    setForm((current) => ({
      ...current,
      groupIds: current.groupIds.includes(groupId)
        ? current.groupIds.filter((idVal) => idVal !== groupId)
        : [...current.groupIds, groupId],
    }));
  }

  async function submit(event, shouldPublish) {
    event.preventDefault();
    setError('');
    if (!form.dueAt || new Date(form.dueAt) <= new Date()) {
      return setError('Choose a deadline in the future.');
    }
    if (form.audienceType === 'SELECTED_GROUPS' && !form.groupIds.length) {
      return setError('Select at least one group.');
    }
    if (form.submissionProvider === 'DROPBOX' && shouldPublish && !dropboxStatus?.connected) {
      return setError('Connect your Dropbox account before publishing a Dropbox assignment.');
    }
    if (form.submissionUrl && !validProviderUrl(form.submissionUrl.trim(), form.submissionProvider)) {
      return setError(`Use a valid HTTPS ${providerInfo[form.submissionProvider].label} URL.`);
    }
    if (shouldPublish && form.submissionProvider === 'ONEDRIVE' && !form.submissionUrl.trim()) {
      return setError('Add a OneDrive submission link before publishing.');
    }

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      dueAt: new Date(form.dueAt).toISOString(),
      submissionProvider: form.submissionProvider,
      submissionUrl: form.submissionUrl?.trim() || undefined,
      audienceType: form.audienceType,
      groupIds: form.audienceType === 'SELECTED_GROUPS' ? form.groupIds : [],
    };

    try {
      const result = editing ? await assignmentService.update(id, payload) : await assignmentService.create(payload);
      const assignmentId = result.assignment?.id;
      if (!assignmentId) throw new Error('The server did not return an assignment ID.');

      if (shouldPublish) {
        await assignmentService.publish(assignmentId);
      }
      toast.success(shouldPublish ? 'Assignment published.' : 'Draft saved.');
      navigate(`/admin/assignments/${assignmentId}`, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ??
          requestError.message ??
          'Unable to save the assignment.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  const provider = providerInfo[form.submissionProvider];
  const isDropbox = form.submissionProvider === 'DROPBOX';
  const isDropboxConnected = dropboxStatus?.connected && dropboxStatus?.status === 'CONNECTED';

  return (
    <>
      <PageHeader
        title={editing ? 'Edit assignment' : 'Create assignment'}
        description="Provide instructions and configure automated, isolated submission requests."
        action={
          <Link className="secondary-button" to="/admin/assignments">
            <ArrowLeft size={16} />
            Back to assignments
          </Link>
        }
      />

      <form onSubmit={(event) => submit(event, false)}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="p-6 sm:p-8">
            <div className="space-y-6">
              <Input
                label="Assignment title"
                required
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                maxLength={200}
                placeholder="e.g. Distributed Systems Milestone 1"
              />

              <Textarea
                label="Description & Instructions"
                required
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                rows={5}
                placeholder="Detailed submission guidelines for students..."
              />

              <Input
                label="Due date and time"
                required
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) => update('dueAt', event.target.value)}
              />

              <section className="border-t border-border pt-6">
                <h2 className="font-semibold text-ink">{provider.heading}</h2>

                {isDropbox ? (
                  <div className="mt-4 space-y-4">
                    {!isDropboxConnected ? (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <p className="font-medium">Dropbox Disconnected</p>
                        <p className="mt-1 text-xs text-amber-800">
                          Connect your Dropbox account to create secure assignment submission links.
                        </p>
                        <Link
                          to="/admin/integrations/dropbox"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          <Link2 size={14} />
                          Connect Dropbox
                        </Link>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        <p className="font-medium text-emerald-800">
                          Automatic Isolated File Request Provisioning
                        </p>
                        <p className="mt-1 text-xs leading-5 text-emerald-700">
                          Dropbox will create a separate upload request for each assigned student or group.
                          {form.audienceType === 'ALL_STUDENTS'
                            ? ' One request per student will be generated automatically.'
                            : ' One request per selected group will be generated automatically.'}
                        </p>
                        <p className="mt-2 text-xs font-medium text-emerald-800">
                          Connected Account: {dropboxStatus.account?.name || dropboxStatus.account?.email || 'Active'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <p className="max-w-2xl text-sm leading-6 text-muted">{provider.help}</p>
                    <div className="flex gap-2">
                      <Input
                        label="Submission URL"
                        type="url"
                        value={form.submissionUrl}
                        onChange={(event) => update('submissionUrl', event.target.value)}
                        placeholder="Paste your OneDrive upload link"
                      />
                      <a
                        className="secondary-button self-end"
                        href={provider.entry}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={16} />
                        Open OneDrive
                      </a>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </Card>

          <Card className="h-fit p-6">
            <h2 className="font-semibold text-ink">Audience & Provider</h2>
            <div className="mt-5 space-y-5">
              <Select
                label="Submission provider"
                value={form.submissionProvider}
                onChange={(event) => update('submissionProvider', event.target.value)}
              >
                <option value="DROPBOX">Dropbox (Automated Isolated Requests)</option>
                <option value="ONEDRIVE">OneDrive (Manual URL)</option>
              </Select>

              <div>
                <p className="text-sm font-medium text-ink">Audience</p>
                <div className="mt-3 space-y-3">
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 text-sm">
                    <input
                      type="radio"
                      name="audience"
                      checked={form.audienceType === 'ALL_STUDENTS'}
                      onChange={() => update('audienceType', 'ALL_STUDENTS')}
                    />
                    <span>
                      <b className="block text-ink">All students</b>
                      <span className="text-xs text-muted">Individual assignment targets.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 text-sm">
                    <input
                      type="radio"
                      name="audience"
                      checked={form.audienceType === 'SELECTED_GROUPS'}
                      onChange={() => update('audienceType', 'SELECTED_GROUPS')}
                    />
                    <span>
                      <b className="block text-ink">Selected groups</b>
                      <span className="text-xs text-muted">One shared request per group.</span>
                    </span>
                  </label>
                </div>
              </div>

              {form.audienceType === 'SELECTED_GROUPS' && (
                <div>
                  <Input
                    label="Search groups"
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder="Find a group"
                  />
                  <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
                    {visibleGroups.map((group) => (
                      <label
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm"
                        key={group.id}
                      >
                        <input
                          type="checkbox"
                          checked={form.groupIds.includes(group.id)}
                          onChange={() => toggleGroup(group.id)}
                        />
                        <span>
                          <b className="block text-ink">{group.name}</b>
                          <span className="text-xs text-muted">
                            {group.active_member_count} active members
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" variant="secondary" disabled={saving}>
                  {saving && <LoaderCircle className="animate-spin" size={17} />}
                  Save Draft
                </Button>
                <Button type="button" disabled={saving} onClick={(event) => submit(event, true)}>
                  {saving && <LoaderCircle className="animate-spin" size={17} />}
                  Save & Publish
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </>
  );
}
