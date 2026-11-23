import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FolderSync,
  RefreshCw,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import PageHeader from '../../layouts/PageHeader.jsx';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingSkeleton,
  Modal,
  ProgressBar,
  Select,
  Table,
} from '../../components/ui/index.jsx';
import { analyticsService } from '../../services/analyticsService.js';
import { assignmentService } from '../../services/assignmentService.js';
import { submissionService } from '../../services/submissionService.js';

function tone(status) {
  if (status === 'COMPLETED' || status === 'VERIFIED' || status === 'CONFIRMED') return 'success';
  if (status === 'COMPLETED_LATE' || status === 'OVERDUE' || status === 'NEEDS_REVIEW' || status === 'REJECTED') {
    return 'danger';
  }
  return 'warning';
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';
}

function formatBytes(bytes) {
  if (!bytes || Number(bytes) === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminSubmissionsPage() {
  const [data, setData] = useState(null);
  const [assignmentSummary, setAssignmentSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState({ assignmentId: '', groupId: '', status: '', due: '' });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Review modal state
  const [reviewItem, setReviewItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    Promise.all([assignmentService.list(), assignmentService.groups()])
      .then(([a, g]) => {
        setAssignments(a.assignments);
        setGroups(g.groups);
      })
      .catch(() => setError('Unable to load tracker filters.'));
  }, []);

  const load = useCallback(() => {
    setRefreshing(true);
    analyticsService
      .submissions({
        ...filters,
        assignmentId: filters.assignmentId || undefined,
        groupId: filters.groupId || undefined,
        status: filters.status || undefined,
        due: filters.due || undefined,
        page,
      })
      .then((res) => {
        setData(res);
      })
      .catch((requestError) => setError(requestError.response?.data?.error?.message ?? 'Unable to load submissions.'))
      .finally(() => setRefreshing(false));

    if (filters.assignmentId) {
      submissionService
        .submissions(filters.assignmentId)
        .then((res) => setAssignmentSummary(res.summary))
        .catch(() => setAssignmentSummary(null));
    } else {
      setAssignmentSummary(null);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReviewDecision(decision) {
    if (!reviewItem) return;
    if (decision === 'REJECTED' && !rejectReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    setReviewing(true);
    try {
      await submissionService.review(
        reviewItem.assignment_id,
        reviewItem.verification_id,
        decision,
        decision === 'REJECTED' ? rejectReason.trim() : undefined
      );
      toast.success(
        decision === 'VERIFIED'
          ? 'Match approved. The student or group leader may now finalize submission.'
          : 'Match rejected.'
      );
      setReviewItem(null);
      setRejectReason('');
      load();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error?.message ?? 'Review decision failed.');
    } finally {
      setReviewing(false);
    }
  }

  const columns = [
    { key: 'assignment_name', label: 'Assignment' },
    {
      key: 'target_type',
      label: 'Target',
      render: (row) =>
        row.target_type === 'GROUP' ? (
          <span className="flex items-center gap-1.5 font-medium text-ink">
            <Users size={14} className="text-muted" /> Group · {row.group_name}
          </span>
        ) : (
          <span className="font-medium text-ink">Student · {row.student_name}</span>
        ),
    },
    {
      key: 'verification_status',
      label: 'Dropbox Evidence',
      render: (row) => (
        <Badge tone={tone(row.verification_status)}>
          {row.verification_status ?? 'NOT_SUBMITTED'}
        </Badge>
      ),
    },
    {
      key: 'verified_filename',
      label: 'File & Size',
      render: (row) =>
        row.verified_filename ? (
          <div className="text-xs">
            <p className="font-medium text-ink">{row.verified_filename}</p>
            {row.verified_file_size && (
              <p className="text-muted">{formatBytes(row.verified_file_size)}</p>
            )}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'late',
      label: 'Timing',
      render: (row) =>
        row.is_late ? (
          <Badge tone="danger">Late</Badge>
        ) : (
          <span className="text-xs text-muted">On time</span>
        ),
    },
    {
      key: 'completion_status',
      label: 'Confirmation',
      render: (row) => <Badge tone={tone(row.completion_status)}>{row.completion_status}</Badge>,
    },
    {
      key: 'confirmed_at',
      label: 'Confirmed At',
      render: (row) => formatDate(row.confirmed_at || row.group_submitted_at),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) =>
        row.verification_status === 'NEEDS_REVIEW' && row.verification_id ? (
          <Button
            variant="secondary"
            className="h-7 px-2 text-xs text-amber-700 hover:text-amber-800"
            onClick={() => setReviewItem(row)}
          >
            <ShieldAlert size={13} className="mr-1 inline text-amber-600" />
            Review
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Submission Tracker"
        description="Monitor automated Dropbox verification, review ambiguous uploads, and track confirmations."
        action={
          <Button variant="secondary" onClick={load} disabled={refreshing} className="gap-2 text-xs">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      {/* Assignment Specific Metrics Banner */}
      {assignmentSummary && (
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-ink">Assignment Submission Metrics</h3>
              <p className="text-xs text-muted">
                {assignmentSummary.confirmed} of {assignmentSummary.totalRecipients} recipients finalized.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-brand">
                {assignmentSummary.completionPercentage}%
              </span>
              <p className="text-xs text-muted">Completion</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={assignmentSummary.completionPercentage} label="Completion" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4 lg:grid-cols-7 text-center text-xs">
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-muted">Total</p>
              <p className="mt-0.5 text-base font-bold text-ink">{assignmentSummary.totalRecipients}</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-2">
              <p className="text-emerald-700">Confirmed</p>
              <p className="mt-0.5 text-base font-bold text-emerald-800">{assignmentSummary.confirmed}</p>
            </div>
            <div className="rounded-md bg-blue-50 p-2">
              <p className="text-blue-700">Verified</p>
              <p className="mt-0.5 text-base font-bold text-blue-800">{assignmentSummary.verified}</p>
            </div>
            <div className="rounded-md bg-amber-50 p-2">
              <p className="text-amber-700">Needs Review</p>
              <p className="mt-0.5 text-base font-bold text-amber-800">{assignmentSummary.needsReview}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <p className="text-muted">Pending</p>
              <p className="mt-0.5 text-base font-bold text-ink">{assignmentSummary.notSubmitted}</p>
            </div>
            <div className="rounded-md bg-red-50 p-2">
              <p className="text-red-700">Rejected</p>
              <p className="mt-0.5 text-base font-bold text-red-800">{assignmentSummary.rejected}</p>
            </div>
            <div className="rounded-md bg-red-50 p-2">
              <p className="text-red-700">Late</p>
              <p className="mt-0.5 text-base font-bold text-red-800">{assignmentSummary.late}</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        {/* Filters */}
        <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Assignment"
            value={filters.assignmentId}
            onChange={(event) => {
              setPage(1);
              setFilters({ ...filters, assignmentId: event.target.value });
            }}
          >
            <option value="">All assignments</option>
            {assignments.map((assignment) => (
              <option value={assignment.id} key={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </Select>

          <Select
            label="Group"
            value={filters.groupId}
            onChange={(event) => {
              setPage(1);
              setFilters({ ...filters, groupId: event.target.value });
            }}
          >
            <option value="">All groups</option>
            {groups.map((group) => (
              <option value={group.id} key={group.id}>
                {group.name}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            value={filters.status}
            onChange={(event) => {
              setPage(1);
              setFilters({ ...filters, status: event.target.value });
            }}
          >
            <option value="">All statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="NEEDS_REVIEW">Needs review</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
          </Select>

          <Select
            label="Due date"
            value={filters.due}
            onChange={(event) => {
              setPage(1);
              setFilters({ ...filters, due: event.target.value });
            }}
          >
            <option value="">All due dates</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="OVERDUE">Overdue</option>
          </Select>
        </div>

        {error ? (
          <EmptyState
            title="Unable to load tracker"
            description={error}
            action={<Button onClick={load}>Try again</Button>}
          />
        ) : !data ? (
          <div className="space-y-3 p-5">
            <LoadingSkeleton className="h-12" />
            <LoadingSkeleton className="h-12" />
          </div>
        ) : data.rows.length ? (
          <>
            <Table
              columns={columns}
              rows={data.rows}
              emptyMessage="No submissions match these filters."
            />
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-sm text-muted">
              <span>{data.total} recipient records</span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="h-8"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  className="h-8"
                  disabled={data.total <= page * data.pageSize}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="No submission records"
            description="Published assignments and recipient verifications will appear here."
          />
        )}
      </Card>

      {/* Professor Manual Review Dialog */}
      {reviewItem && (
        <Modal
          open={Boolean(reviewItem)}
          onClose={() => !reviewing && setReviewItem(null)}
          title="Manual Submission Review"
        >
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={17} className="text-amber-600" />
                Ambiguous Submission Detected
              </div>
              <p className="mt-1 text-xs text-amber-800">
                This upload triggered automated review rules (e.g. multiple competing files or conflicting file claims).
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-xs">
              <div>
                <dt className="text-muted">Assignment</dt>
                <dd className="mt-0.5 font-medium text-ink">{reviewItem.assignment_name}</dd>
              </div>
              <div>
                <dt className="text-muted">Recipient</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {reviewItem.target_type === 'GROUP'
                    ? `Group: ${reviewItem.group_name}`
                    : `Student: ${reviewItem.student_name}`}
                </dd>
              </div>
              <div>
                <dt className="text-muted">File Name</dt>
                <dd className="mt-0.5 font-medium text-ink">{reviewItem.verified_filename || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted">File Size</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {reviewItem.verified_file_size ? formatBytes(reviewItem.verified_file_size) : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted">Dropbox File ID</dt>
                <dd className="mt-0.5 font-mono text-xs text-ink">{reviewItem.dropbox_file_id || '—'}</dd>
              </div>
            </dl>

            <div>
              <Input
                label="Rejection Reason (Required if Rejecting)"
                placeholder="Explain why this match is rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted">
              Note: Approving this match grants <b>VERIFIED</b> status so the student/group leader can finalize their submission. It does not silently mark the submission confirmed.
            </p>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                variant="secondary"
                disabled={reviewing}
                onClick={() => setReviewItem(null)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                disabled={reviewing}
                className="gap-1.5 text-red-600 hover:text-red-700"
                onClick={() => handleReviewDecision('REJECTED')}
              >
                <XCircle size={15} />
                Reject Match
              </Button>
              <Button
                disabled={reviewing}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleReviewDecision('VERIFIED')}
              >
                <FileCheck2 size={15} />
                Approve Match
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
