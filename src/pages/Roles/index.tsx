import { useCallback, useEffect, useState } from 'react';
import { UserCircle, RefreshCw, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAgentsStore } from '@/stores/agents';
import { hostApiFetch } from '@/lib/host-api';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface RoleInfo {
  id: string;
  name: string;
  description: string;
}

interface ApplyRoleDialogProps {
  role: RoleInfo;
  open: boolean;
  onClose: () => void;
  onApply: (agentId: string, addressAs: string, addressToMe: string) => Promise<void>;
}

function ApplyRoleDialog({ role, open, onClose, onApply }: ApplyRoleDialogProps) {
  const { t } = useTranslation('agents');
  const agents = useAgentsStore((s) => s.agents);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [addressAs, setAddressAs] = useState('');
  const [addressToMe, setAddressToMe] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedAgentId(agents[0]?.id || '');
      setAddressAs(role.name || '');
      setAddressToMe('');
    }
  }, [open, agents, role.name]);

  const handleSubmit = async () => {
    if (!selectedAgentId) return;
    setSaving(true);
    try {
      await onApply(selectedAgentId, addressAs, addressToMe);
      toast.success(t('toast.roleApplied'));
      onClose();
    } catch (error) {
      toast.error(t('toast.roleApplyFailed', { error: String(error) }));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-2xl bg-[#f3f1e9] dark:bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-serif font-normal tracking-tight">
              {t('applyRoleDialog.title')}
            </CardTitle>
            <CardDescription className="text-[15px] mt-1 text-foreground/70">
              {t('applyRoleDialog.description', { roleName: role.name })}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 p-6">
          {/* Role description */}
          <div className="rounded-xl bg-black/5 dark:bg-white/5 p-4">
            <div className="text-[14px] text-foreground/80 leading-relaxed prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {role.description}
              </ReactMarkdown>
            </div>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="agent-select" className="text-[14px] text-foreground/80 font-bold">
              {t('applyRoleDialog.selectAgent')}
            </Label>
            <select
              id="agent-select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="h-[44px] w-full rounded-xl font-mono text-[13px] bg-[#eeece3] dark:bg-muted border border-black/10 dark:border-white/10 shadow-sm transition-all text-foreground px-3"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="address-as" className="text-[14px] text-foreground/80 font-bold">
              {t('applyRoleDialog.addressAs')}
            </Label>
            <Input
              id="address-as"
              value={addressAs}
              onChange={(e) => setAddressAs(e.target.value)}
              placeholder={t('applyRoleDialog.addressAsPlaceholder')}
              className="h-[44px] rounded-xl font-mono text-[13px] bg-[#eeece3] dark:bg-muted border-black/10 dark:border-white/10 shadow-sm transition-all text-foreground placeholder:text-foreground/40"
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="address-to-me" className="text-[14px] text-foreground/80 font-bold">
              {t('applyRoleDialog.addressToMe')}
            </Label>
            <Input
              id="address-to-me"
              value={addressToMe}
              onChange={(e) => setAddressToMe(e.target.value)}
              placeholder={t('applyRoleDialog.addressToMePlaceholder')}
              className="h-[44px] rounded-xl font-mono text-[13px] bg-[#eeece3] dark:bg-muted border-black/10 dark:border-white/10 shadow-sm transition-all text-foreground placeholder:text-foreground/40"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground"
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={saving || !selectedAgentId}
              className="h-9 text-[13px] font-medium rounded-full px-4 shadow-none"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('applying')}
                </>
              ) : (
                t('common:actions.confirm')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleCard({
  role,
  onClick,
}: {
  role: RoleInfo;
  onClick: () => void;
}) {
  // Generate DiceBear avatar URL based on role name
  const avatarUrl = `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(role.name)}`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start p-4 rounded-2xl transition-all text-left border relative overflow-hidden',
        'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5',
        'hover:border-black/10 dark:hover:border-white/10',
      )}
    >
      {/* Role avatar with name overlay */}
      <div className="relative h-24 w-full rounded-xl overflow-hidden mb-3">
        <img
          src={avatarUrl}
          alt={role.name}
          className="h-full w-full object-contain"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <UserCircle className="absolute inset-0 m-auto h-12 w-12 text-white/50 hidden" />
        <h3 className="absolute bottom-2 left-2 right-2 text-[14px] font-semibold text-white truncate drop-shadow-md">
          {role.name}
        </h3>
      </div>

      <div className="text-[13.5px] text-muted-foreground leading-relaxed markdown-content line-clamp-1 prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {role.description}
        </ReactMarkdown>
      </div>
    </button>
  );
}

export function Roles() {
  const { t } = useTranslation('agents');
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await hostApiFetch<{ success: boolean; roles: RoleInfo[] }>('/api/roles');
      setRoles(response.roles || []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRoles();
    void fetchAgents();
  }, [fetchRoles, fetchAgents]);

  const handleApplyRole = async (agentId: string, addressAs: string, addressToMe: string) => {
    if (!selectedRole) return;
    await hostApiFetch('/api/roles/apply', {
      method: 'POST',
      body: JSON.stringify({
        roleId: selectedRole.id,
        agentId,
        addressAs,
        addressToMe,
      }),
    });
  };

  const filteredRoles = roles.filter((role) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      role.name.toLowerCase().includes(query) ||
      role.description.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col -m-6 dark:bg-background min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col -m-6 dark:bg-background h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full p-10 pt-16">
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 shrink-0 gap-4">
          <div>
            <h1
              className="text-5xl md:text-6xl font-serif text-foreground mb-3 font-normal tracking-tight"
              style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
            >
              {t('rolesTitle')}
            </h1>
            <p className="text-[17px] text-foreground/70 font-medium">{t('rolesSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3 md:mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('common:actions.search')}
                className="h-9 pl-9 pr-4 rounded-full text-[13px] font-medium border border-black/10 dark:border-white/10 bg-[#eeece3] dark:bg-muted shadow-none w-48 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-muted-foreground"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void fetchRoles()}
              className="h-9 text-[13px] font-medium rounded-full px-4 border-black/10 dark:border-white/10 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 shadow-none text-foreground/80 hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-2" />
              {t('refresh')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex items-center gap-3">
            <span className="text-destructive text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 -mr-2">
          {filteredRoles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">{searchQuery ? t('noSearchResults') : t('noRoles')}</p>
              <p className="text-sm mt-1">{searchQuery ? t('noSearchResultsDesc') : t('noRolesDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onClick={() => setSelectedRole(role)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRole && (
        <ApplyRoleDialog
          role={selectedRole}
          open={!!selectedRole}
          onClose={() => setSelectedRole(null)}
          onApply={handleApplyRole}
        />
      )}
    </div>
  );
}

export default Roles;
