import { MailPlus, UserMinus, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import PageHeader from '../../layouts/PageHeader.jsx';
import InviteMemberDialog from './InviteMemberDialog.jsx';
import { Badge, Button, Card, ConfirmationDialog, EmptyState, ErrorState, LoadingSkeleton } from '../../components/ui/index.jsx';
import { groupService } from '../../services/groupService.js';
import { useAuth } from '../../context/AuthContext.jsx';

function initials(name) { return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(); }

export default function GroupPage() {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setGroup((await groupService.getMine()).group); } catch (requestError) { setError(requestError.response?.data?.error?.message ?? 'Unable to load your group.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  async function removeMember() { try { await groupService.removeMember(group.id, removeTarget.student_id); toast.success('Member removed from the group.'); setRemoveTarget(null); load(); } catch (requestError) { toast.error(requestError.response?.data?.error?.message ?? 'Unable to remove that member.'); } }
  if (loading) return <><PageHeader title="My Group" description="Manage your group and classmates." /><div className="space-y-4"><LoadingSkeleton className="h-32" /><LoadingSkeleton className="h-64" /></div></>;
  if (error) return <><PageHeader title="My Group" description="Manage your group and classmates." /><Card><ErrorState description={error} action={<Button onClick={load}>Try again</Button>} /></Card></>;
  if (!group) return <><PageHeader title="My Group" description="Manage your group and classmates." /><Card><EmptyState title="You're not part of a group yet." description="Create a group for your coursework or review pending invitations from classmates." action={<div className="flex flex-col justify-center gap-3 sm:flex-row"><Link className="primary-button" to="/student/group/create">Create a group</Link><Link className="secondary-button" to="/student/invitations">View invitations</Link></div>} /></Card></>;
  const isLeader = group.leader_id === user.id;
  return <><PageHeader title="My Group" description="Manage your group and classmates." action={isLeader && group.activeMemberCount < 5 ? <Button onClick={() => setInviteOpen(true)}><MailPlus size={17} />Invite member</Button> : null} /><div className="grid gap-4 sm:grid-cols-3"><Card className="p-5 sm:col-span-2"><p className="text-sm text-muted">Group name</p><h2 className="mt-2 text-xl font-semibold">{group.name}</h2><p className="mt-2 text-sm text-muted">Led by {group.members.find((member) => member.is_leader)?.full_name ?? 'your group leader'}</p></Card><Card className="p-5"><p className="text-sm text-muted">Active members</p><p className="mt-2 text-2xl font-semibold">{group.activeMemberCount}<span className="text-base font-normal text-muted"> / 5</span></p><p className="mt-1 text-xs text-muted">Maximum group size</p></Card></div><Card className="mt-6"><div className="flex items-center gap-3 border-b border-border px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand"><UsersRound size={18} /></span><div><h2 className="font-semibold">Members</h2><p className="mt-1 text-xs text-muted">Everyone currently active in this group.</p></div></div><div className="divide-y divide-border">{group.members.map((member) => <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" key={member.membership_id}><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-brand">{initials(member.full_name)}</span><div className="min-w-0"><p className="truncate text-sm font-medium">{member.full_name}</p><p className="truncate text-xs text-muted">{member.email} · {member.college_student_id}</p></div></div><div className="flex items-center gap-3 pl-[52px] sm:pl-0"><Badge tone={member.is_leader ? 'brand' : 'neutral'}>{member.is_leader ? 'Leader' : 'Member'}</Badge>{isLeader && !member.is_leader && <button className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:text-red-700" onClick={() => setRemoveTarget(member)}><UserMinus size={15} />Remove</button>}</div></div>)}</div></Card><InviteMemberDialog open={inviteOpen} groupId={group.id} onClose={() => setInviteOpen(false)} onInvited={load} /><ConfirmationDialog open={Boolean(removeTarget)} title="Remove group member?" description={removeTarget ? `Remove ${removeTarget.full_name} from ${group.name}? Their historical assignment records will remain unchanged.` : ''} onClose={() => setRemoveTarget(null)} onConfirm={removeMember} confirmLabel="Remove member" /></>;
}
