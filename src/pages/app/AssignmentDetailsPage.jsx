import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  Pencil,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../../layouts/PageHeader.jsx';
import {
  Badge,
  Button,
  Card,
  ConfirmationDialog,
  ErrorState,
  LoadingSkeleton,
  ProgressBar,
  Table,
} from '../../components/ui/index.jsx';
import { assignmentService } from '../../services/assignmentService.js';
import { submissionService } from '../../services/submissionService.js';
import { useAuth } from '../../context/AuthContext.jsx';

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : '—';
}

function tone(status) {
  if (status === 'COMPLETED' || status === 'PUBLISHED' || status === 'CONFIRMED' || status === 'On-time') {
    return 'success';
  }
  if (status === 'COMPLETED_LATE' || status === 'OVERDUE' || status === 'REJECTED' || status === 'Late') {
    return 'danger';
  }
  if (status === 'PENDING' || status === 'AWAITING_CONFIRMATION') {
    return 'warning';
  }
  return 'neutral';
}

export default function AssignmentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const admin = user.role === 'ADMIN';

  const [assignment, setAssignment] = useState(null);
  const [rows, setRows] = useState([]);
  const [tracker, setTracker] = useState(null);
  const [mySub, setMySub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student declaration flow states
  const [uploadOpened, setUploadOpened] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const assignmentResult = await assignmentService.getById(id);
      setAssignment(assignmentResult.assignment);

      if (admin) {
        const [statusRes, trackerRes] = await Promise.all([
          submissionService.status(id).catch(() => ({ targets: [] })),
          submissionService.submissions(id).catch(() => null),
        ]);
        setRows(statusRes.targets ?? []);
        setTracker(trackerRes);
      } else {
        const [statusRes, mySubRes] = await Promise.all([
          submissionService.status(id).catch(() => ({ targets: [] })),
          submissionService.mySubmission(id).catch(() => null),
        ]);
        setRows(statusRes.targets ?? []);
        setMySub(mySubRes);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message ?? 'Unable to load assignment.');
    } finally {
      setLoading(false);
    }
  }, [id, admin]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-10" />
        <LoadingSkeleton className="h-72" />
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <Card>
        <ErrorState
          title={error?.toLowerCase().includes('not found') ? 'Assignment not found' : 'Unable to load assignment'}
          description={error || 'The requested assignment could not be loaded.'}
          action={<Button onClick={load}>Retry</Button>}
        />
      </Card>
    );
  }

  return admin ? (
    <ProfessorAssignmentDetails
      assignment={assignment}
      rows={rows}
      tracker={tracker}
    />
  ) : (
    <StudentAssignmentDetails
      assignment={assignment}
      rows={rows}
      mySub={mySub}
      user={user}
      uploadOpened={uploadOpened}
      setUploadOpened={setUploadOpened}
      acknowledged={acknowledged}
      setAcknowledged={setAcknowledged}
      confirmOpen={confirmOpen}
      setConfirmOpen={setConfirmOpen}
      submitting={submitting}
      setSubmitting={setSubmitting}
      onReload={load}
    />
  );
}

/* =========================================================================
   PROFESSOR DETAILS VIEW (SECTIONS 1 – 5)
   ========================================================================= */
function ProfessorAssignmentDetails({ assignment, rows, tracker }) {
  const isDropbox = assignment.submission_provider === 'DROPBOX';
  const submissionUrl = assignment.submission_url || assignment.onedrive_url || rows[0]?.request_url;
  const isGroupTargeted = assignment.audience_type === 'SELECTED_GROUPS' || rows[0]?.target_type === 'GROUP';

  // Section 4 calculations from tracker summary or rows
  const summary = tracker?.summary || (() => {
    const totalRecipients = isGroupTargeted
      ? new Set(rows.map((r) => r.target_id)).size
      : rows.length;
    const confirmedCount = isGroupTargeted
      ? new Set(rows.filter((r) => r.submitted_at).map((r) => r.target_id)).size
      : rows.filter((r) => r.confirmed_at).length;
    const lateCount = rows.filter((r) => {
      const confDate = r.submitted_at || r.confirmed_at;
      return confDate && new Date(confDate) > new Date(r.due_at);
    }).length;
    return {
      totalRecipients,
      confirmed: confirmedCount,
      pending: totalRecipients - confirmedCount,
      completionPercentage: totalRecipients ? Math.round((confirmedCount / totalRecipients) * 100) : 0,
      onTime: confirmedCount - lateCount,
      late: lateCount,
    };
  })();

  async function copySubmissionLink() {
    if (!submissionUrl) return;
    await navigator.clipboard.writeText(submissionUrl);
    toast.success('Submission destination link copied to clipboard.');
  }

  function openSubmissionLink() {
    if (!submissionUrl) return;
    window.open(submissionUrl, '_blank', 'noopener,noreferrer');
  }

  // Section 5 Columns
  const groupColumns = [
    {
      key: 'group_name',
      label: 'Group Name',
      render: (row) => (
        <span className="font-medium text-ink flex items-center gap-1.5">
          <Users size={14} className="text-muted" /> {row.groupName || row.group_name}
        </span>
      ),
    },
    {
      key: 'leader_name',
      label: 'Group Leader',
      render: (row) => (
        <span className="text-ink">{row.leaderName || row.leader_name || '—'}</span>
      ),
    },
    {
      key: 'eligible_members',
      label: 'Eligible Members',
      render: (row) => (
        <span className="text-muted">{row.eligibleMembers ?? row.eligible_members_count ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Group Submission',
      render: (row) => {
        const isConf = row.status === 'CONFIRMED' || Boolean(row.submitted_at);
        return (
          <Badge tone={isConf ? 'success' : 'warning'}>
            {isConf ? 'CONFIRMED' : 'PENDING'}
          </Badge>
        );
      },
    },
    {
      key: 'acknowledgments',
      label: 'Individual Confirmations',
      render: (row) => (
        <span className="text-xs text-muted">
          {row.individualConfirmations ?? row.individual_confirmations_count ?? 0} confirmed
        </span>
      ),
    },
    {
      key: 'submitted_at',
      label: 'Submission Timestamp',
      render: (row) => formatDate(row.submittedAt || row.submitted_at),
    },
    {
      key: 'timing_status',
      label: 'Status',
      render: (row) => {
        const timing = row.timingStatus || (
          row.submitted_at
            ? (new Date(row.submitted_at) > new Date(assignment.due_at) ? 'Late' : 'On-time')
            : '—'
        );
        return <Badge tone={tone(timing)}>{timing}</Badge>;
      },
    },
  ];

  const studentColumns = [
    {
      key: 'student_name',
      label: 'Student Name',
      render: (row) => (
        <span className="font-medium text-ink">{row.studentName || row.student_name}</span>
      ),
    },
    {
      key: 'student_id',
      label: 'Student ID',
      render: (row) => (
        <span className="font-mono text-xs text-muted">
          {row.studentNumber || row.student_number || row.studentId || row.student_id || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Confirmation Status',
      render: (row) => {
        const isConf = row.status === 'CONFIRMED' || Boolean(row.confirmed_at);
        return (
          <Badge tone={isConf ? 'success' : 'warning'}>
            {isConf ? 'CONFIRMED' : 'PENDING'}
          </Badge>
        );
      },
    },
    {
      key: 'confirmed_at',
      label: 'Confirmation Timestamp',
      render: (row) => formatDate(row.confirmedAt || row.confirmed_at),
    },
    {
      key: 'timing_status',
      label: 'Status',
      render: (row) => {
        const timing = row.timingStatus || (
          row.confirmed_at
            ? (new Date(row.confirmed_at) > new Date(assignment.due_at) ? 'Late' : 'On-time')
            : '—'
        );
        return <Badge tone={tone(timing)}>{timing}</Badge>;
      },
    },
  ];

  // Group tracker data
  const groupTableData = tracker?.groupTrackers || (() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.target_id)) {
        map.set(r.target_id, {
          targetId: r.target_id,
          groupName: r.group_name,
          leaderName: r.leader_name || '—',
          eligibleMembers: r.eligible_members_count || 1,
          individualConfirmations: r.individual_confirmations_count || 0,
          status: r.submitted_at ? 'CONFIRMED' : 'PENDING',
          submittedAt: r.submitted_at,
          timingStatus: r.submitted_at ? (new Date(r.submitted_at) > new Date(assignment.due_at) ? 'Late' : 'On-time') : '—',
        });
      }
    }
    return [...map.values()];
  })();

  const studentTableData = tracker?.studentTrackers || rows.map((r) => ({
    targetStudentId: r.target_student_id,
    studentName: r.student_name,
    studentNumber: r.student_number || r.student_id,
    status: r.confirmed_at ? 'CONFIRMED' : 'PENDING',
    confirmedAt: r.confirmed_at,
    timingStatus: r.confirmed_at ? (new Date(r.confirmed_at) > new Date(assignment.due_at) ? 'Late' : 'On-time') : '—',
  }));

  return (
    <>
      {/* SECTION 1: HEADER */}
      <nav className="mb-3 text-xs text-muted flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/admin/assignments" className="hover:text-brand">
          Assignments
        </Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-md">{assignment.title}</span>
      </nav>

      <PageHeader
        title={assignment.title}
        description="Review assignment specifications, submission destination, recipient completion progress, and tracking records."
        action={
          <div className="flex items-center gap-2">
            <Link className="secondary-button" to="/admin/assignments">
              <ArrowLeft size={16} />
              Back to assignments
            </Link>
            {assignment.status === 'DRAFT' && (
              <Link className="primary-button" to={`/admin/assignments/${assignment.id}/edit`}>
                <Pencil size={16} />
                Edit assignment
              </Link>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={tone(assignment.status)}>{assignment.status}</Badge>
        <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
          <Clock size={14} className="text-muted" /> Due {formatDate(assignment.due_at)}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* SECTION 2: ASSIGNMENT INFORMATION */}
        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink">Assignment Information</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">
            {assignment.description}
          </p>

          <dl className="mt-8 grid gap-5 border-t border-border pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Created by</dt>
              <dd className="mt-1 font-medium text-ink">{assignment.professor_name || 'Professor'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Created at</dt>
              <dd className="mt-1 font-medium text-ink">{formatDate(assignment.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Due date and time</dt>
              <dd className="mt-1 font-medium text-ink flex items-center gap-1.5">
                <Clock size={15} className="text-muted" />
                {formatDate(assignment.due_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Assignment audience</dt>
              <dd className="mt-1 font-medium text-ink">
                {assignment.audience_type === 'ALL_STUDENTS'
                  ? 'Individual Students (All enrolled students)'
                  : 'Assigned Groups'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted">Assigned recipients</dt>
              <dd className="mt-1.5 font-medium text-ink">
                {isGroupTargeted ? (
                  <div className="flex flex-wrap gap-2">
                    {assignment.assignedGroups?.length ? (
                      assignment.assignedGroups.map((g) => (
                        <span
                          key={g.id}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-800"
                        >
                          <Users size={12} className="text-muted" /> {g.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted text-xs">Selected Groups</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-ink">
                    All enrolled students ({summary.totalRecipients} recipients)
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </Card>

        {/* SECTION 3: SUBMISSION DESTINATION */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-ink">Submission Destination</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            Students use this link to upload their assignments externally.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Provider</span>
              <p className="mt-1 text-sm font-medium text-ink">
                {isDropbox ? 'Dropbox (File Request)' : 'OneDrive'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">Upload URL</span>
              {submissionUrl ? (
                <div className="mt-1.5 break-all rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs text-slate-800 select-all">
                  {submissionUrl}
                </div>
              ) : (
                <p className="mt-1.5 rounded-lg border border-dashed border-border p-3 text-xs text-muted">
                  Submission request link will be provisioned when the assignment is published.
                </p>
              )}
            </div>

            {submissionUrl && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={openSubmissionLink} className="gap-2 text-xs">
                  <ExternalLink size={14} />
                  Open Submission Link
                </Button>
                <Button variant="secondary" onClick={copySubmissionLink} className="gap-2 text-xs">
                  <Copy size={14} />
                  Copy Link
                </Button>
                {assignment.status === 'DRAFT' && (
                  <Link
                    to={`/admin/assignments/${assignment.id}/edit`}
                    className="secondary-button text-xs gap-1.5"
                  >
                    <Pencil size={14} />
                    Edit Link
                  </Link>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* SECTION 4: SUBMISSION OVERVIEW */}
      <Card className="mt-8 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Submission Overview</h2>
            <p className="mt-1 text-xs text-muted">
              Live completion metrics calculated directly from PostgreSQL records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Completion Rate:</span>
            <span className="text-lg font-bold text-brand">{summary.completionPercentage}%</span>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar value={summary.completionPercentage} label="Recipients Finalized" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 border-t border-border pt-6">
          <div className="rounded-lg bg-slate-50 p-3.5">
            <p className="text-xs text-muted">Total Assigned</p>
            <p className="mt-1.5 text-xl font-bold text-ink">{summary.totalRecipients}</p>
          </div>
          <div className="rounded-lg bg-emerald-50/70 p-3.5">
            <p className="text-xs text-emerald-800">Confirmed</p>
            <p className="mt-1.5 text-xl font-bold text-emerald-900">{summary.confirmed}</p>
          </div>
          <div className="rounded-lg bg-amber-50/70 p-3.5">
            <p className="text-xs text-amber-800">Pending</p>
            <p className="mt-1.5 text-xl font-bold text-amber-900">{summary.pending}</p>
          </div>
          <div className="rounded-lg bg-blue-50/70 p-3.5">
            <p className="text-xs text-blue-800">Completion %</p>
            <p className="mt-1.5 text-xl font-bold text-blue-900">{summary.completionPercentage}%</p>
          </div>
          <div className="rounded-lg bg-emerald-50/70 p-3.5">
            <p className="text-xs text-emerald-800">On-time</p>
            <p className="mt-1.5 text-xl font-bold text-emerald-900">{summary.onTime}</p>
          </div>
          <div className="rounded-lg bg-red-50/70 p-3.5">
            <p className="text-xs text-red-800">Late</p>
            <p className="mt-1.5 text-xl font-bold text-red-900">{summary.late}</p>
          </div>
        </div>
      </Card>

      {/* SECTION 5: GROUP/STUDENT TRACKER */}
      <Card className="mt-8">
        <div className="border-b border-border p-6">
          <h2 className="text-base font-semibold text-ink">
            {isGroupTargeted ? 'Group Submission Tracker' : 'Student Submission Tracker'}
          </h2>
          <p className="mt-1 text-xs text-muted">
            {isGroupTargeted
              ? 'Tracking group-level submission declarations and individual member confirmations.'
              : 'Tracking individual student submission confirmations and timestamps.'}
          </p>
        </div>
        <Table
          columns={isGroupTargeted ? groupColumns : studentColumns}
          rows={isGroupTargeted ? groupTableData : studentTableData}
          emptyMessage="No recipient records found for this assignment."
        />
      </Card>
    </>
  );
}

/* =========================================================================
   STUDENT DETAILS VIEW (4-STATE SUBMISSION LIFECYCLE)
   ========================================================================= */
function StudentAssignmentDetails({
  assignment,
  rows,
  mySub,
  user,
  uploadOpened,
  setUploadOpened,
  acknowledged,
  setAcknowledged,
  confirmOpen,
  setConfirmOpen,
  submitting,
  setSubmitting,
  onReload,
}) {
  const isDropbox = assignment.submission_provider === 'DROPBOX';
  const target = rows[0];
  const submissionUrl =
    mySub?.dropboxRequest?.url ||
    target?.request_url ||
    assignment.submission_url ||
    assignment.onedrive_url;

  const isGroupAssignment = target?.target_type === 'GROUP' || mySub?.target?.type === 'GROUP';
  const isGroupLeader = Boolean(mySub?.target?.isLeader ?? target?.can_declare_group_submission);
  const isConfirmed = Boolean(mySub?.confirmation?.isConfirmed || target?.confirmed_at || target?.submitted_at);
  const confirmedAt = mySub?.confirmation?.confirmedAt || target?.confirmed_at || target?.submitted_at;
  const isOverdue = new Date(assignment.due_at) < new Date();

  function openLink() {
    if (!submissionUrl) return;
    setUploadOpened(true);
    window.open(submissionUrl, '_blank', 'noopener,noreferrer');
  }

  async function copyLink() {
    if (!submissionUrl) return;
    await navigator.clipboard.writeText(submissionUrl);
    toast.success('Submission link copied to clipboard.');
  }

  async function handleConfirmSubmission() {
    setSubmitting(true);
    try {
      await submissionService.confirmSubmission(assignment.id, {
        targetStudentId: target?.target_student_id || mySub?.target?.targetStudentId,
        targetId: target?.target_id || mySub?.target?.targetId,
      });
      setConfirmOpen(false);
      setAcknowledged(false);
      toast.success('Your submission confirmation has been recorded.');
      await onReload();
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.error?.message ??
          requestError.message ??
          'Unable to confirm submission.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* SECTION 1: HEADER */}
      <nav className="mb-3 text-xs text-muted flex items-center gap-1.5" aria-label="Breadcrumb">
        <Link to="/student/assignments" className="hover:text-brand">
          Assignments
        </Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-md">{assignment.title}</span>
      </nav>

      <PageHeader
        title={assignment.title}
        description="Follow the submission steps to upload your assignment and confirm your completed coursework."
        action={
          <Link className="secondary-button" to="/student/assignments">
            <ArrowLeft size={16} />
            Back to assignments
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        {isConfirmed ? (
          <Badge tone="success">
            <CheckCircle2 size={13} className="mr-1 inline" />
            Student Confirmed
          </Badge>
        ) : isOverdue ? (
          <Badge tone="danger">Overdue</Badge>
        ) : (
          <Badge tone="warning">Pending</Badge>
        )}
        <span className="text-xs text-muted flex items-center gap-1.5 font-medium">
          <Clock size={14} className="text-muted" /> Due {formatDate(assignment.due_at)}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* SECTION 2: ASSIGNMENT INFORMATION */}
        <Card className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-ink">Assignment Information</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-ink">
            {assignment.description}
          </p>

          <dl className="mt-8 grid gap-5 border-t border-border pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Professor</dt>
              <dd className="mt-1 font-medium text-ink">{assignment.professor_name || 'Professor'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Deadline</dt>
              <dd className="mt-1 font-medium text-ink flex items-center gap-1.5">
                <Clock size={15} className="text-muted" />
                {formatDate(assignment.due_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Audience</dt>
              <dd className="mt-1 font-medium text-ink">
                {assignment.audience_type === 'ALL_STUDENTS' ? 'Individual Students' : 'Assigned Groups'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Submission Provider</dt>
              <dd className="mt-1 font-medium text-ink">
                {isDropbox ? 'Dropbox (External File Request)' : 'OneDrive'}
              </dd>
            </div>
          </dl>
        </Card>

        {/* SECTION 3: 4-STATE SUBMISSION LIFECYCLE */}
        <div>
          {isConfirmed ? (
            /* STATE 4: STUDENT_CONFIRMED */
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Submission Confirmation</h2>
                <Badge tone="success">
                  <CheckCircle2 size={13} className="mr-1 inline" />
                  Student Confirmed
                </Badge>
              </div>

              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900">
                <p className="font-semibold text-emerald-800">
                  Your submission confirmation has been recorded.
                </p>
                <p className="mt-1 text-emerald-700 leading-5">
                  Your confirmation timestamp has been securely recorded for your professor in PostgreSQL.
                </p>
              </div>

              <dl className="mt-6 space-y-3.5 border-t border-border pt-5 text-xs">
                <div>
                  <dt className="text-muted">Assignment Title</dt>
                  <dd className="mt-0.5 font-medium text-ink">{assignment.title}</dd>
                </div>
                <div>
                  <dt className="text-muted">Confirmation Timestamp</dt>
                  <dd className="mt-0.5 font-medium text-ink">{formatDate(confirmedAt)}</dd>
                </div>
                {isGroupAssignment ? (
                  <div>
                    <dt className="text-muted">Group Information</dt>
                    <dd className="mt-0.5 font-medium text-ink">
                      {target?.group_name || mySub?.target?.groupName || 'Group'} · Confirmed by{' '}
                      {mySub?.confirmation?.submittedBy || target?.submitted_by_name || 'Group Leader'}
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-muted">Submitted By</dt>
                    <dd className="mt-0.5 font-medium text-ink">{user.full_name}</dd>
                  </div>
                )}
              </dl>

              {submissionUrl && (
                <div className="mt-6 border-t border-border pt-4">
                  <Button variant="secondary" onClick={openLink} className="gap-2 text-xs w-full justify-center">
                    <ExternalLink size={14} />
                    Reopen {isDropbox ? 'Dropbox' : 'OneDrive'} Link
                  </Button>
                </div>
              )}
            </Card>
          ) : !uploadOpened ? (
            /* STATE 1: PENDING */
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Assignment Submission</h2>
                <Badge tone="warning">Pending</Badge>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted">
                Upload your completed assignment using the link below. Once you have uploaded your file to{' '}
                {isDropbox ? 'Dropbox' : 'OneDrive'}, return to this page to declare and confirm your submission.
              </p>

              {isGroupAssignment && (
                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                  <Users size={16} className="mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-semibold">
                      Group Assignment: {target?.group_name || mySub?.target?.groupName}
                    </p>
                    <p className="mt-0.5 text-blue-800">
                      {isGroupLeader
                        ? 'You are the group leader and authorized to confirm the group submission.'
                        : 'Your group leader must finalize this submission after members complete their work.'}
                    </p>
                  </div>
                </div>
              )}

              {submissionUrl ? (
                <div className="mt-5 space-y-3">
                  <div className="break-all rounded-lg border border-border bg-slate-50 p-3 font-mono text-xs text-slate-800 select-all">
                    {submissionUrl}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button onClick={openLink} className="gap-2 text-xs flex-1 justify-center">
                      <ExternalLink size={14} />
                      Open {isDropbox ? 'Dropbox' : 'OneDrive'} Upload
                    </Button>
                    <Button variant="secondary" onClick={copyLink} className="gap-2 text-xs">
                      <Copy size={14} />
                      Copy Link
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-border bg-slate-50 p-3 text-xs text-muted">
                  Submission request link is not available yet. Please contact your professor.
                </p>
              )}

              <p className="mt-5 border-t border-border pt-4 text-xs text-muted leading-5">
                External uploads are hosted by {isDropbox ? 'Dropbox' : 'OneDrive'}. Opening the upload link does
                not mark your assignment as submitted.
              </p>
            </Card>
          ) : (
            /* STATE 2: AWAITING_CONFIRMATION */
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">Submission Confirmation</h2>
                <Badge tone="warning">Awaiting Confirmation</Badge>
              </div>

              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                <p className="font-medium text-blue-900">Upload link opened</p>
                <p className="mt-0.5 text-blue-800 leading-5">
                  After completing your file upload on {isDropbox ? 'Dropbox' : 'OneDrive'}, confirm your completed
                  submission below.
                </p>
              </div>

              {isGroupAssignment && !isGroupLeader ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
                  <p className="font-medium">Group Leader Authorization Required</p>
                  <p className="mt-1">
                    Only your designated group leader can finalize the group submission for {target?.group_name || mySub?.target?.groupName}.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <h3 className="font-semibold text-ink text-sm">Have you completed your upload?</h3>
                    <p className="mt-1 text-xs text-muted leading-5">
                      Opening the link does not prove an upload succeeded. Please declare that you have uploaded
                      your assignment to proceed with final confirmation.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-border p-3.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    <span className="leading-5 font-medium text-ink">
                      Yes, I have uploaded my assignment.
                    </span>
                  </label>

                  <Button
                    className="w-full text-xs justify-center"
                    disabled={!acknowledged || submitting}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Continue
                  </Button>
                </div>
              )}

              <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between text-xs text-muted">
                <span>Need to upload again?</span>
                <button
                  type="button"
                  onClick={openLink}
                  className="font-medium text-brand hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Reopen {isDropbox ? 'Dropbox' : 'OneDrive'} Link
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* STATE 3: CONFIRMATION_DIALOG */}
      <ConfirmationDialog
        open={confirmOpen}
        title="Confirm Submission"
        description={`Have you successfully uploaded your assignment to ${
          isDropbox ? 'Dropbox' : 'OneDrive'
        }? Your confirmation will be recorded for your professor.`}
        onClose={() => !submitting && setConfirmOpen(false)}
        onConfirm={handleConfirmSubmission}
        confirmDisabled={submitting}
        confirmLabel={submitting ? 'Confirming…' : 'Confirm Submission'}
      />
    </>
  );
}
