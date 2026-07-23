'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Users, Search, Plus, Loader2, Check, AlertCircle, X, Database, ChevronRight, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  contactType: string | null;
  status: string | null;
  city: string | null;
  state: string | null;
}

type Msg = { type: 'success' | 'error'; text: string } | null;

const TYPES = ['client', 'lead', 'prospect', 'company'];

export default function ClientsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [provisioned, setProvisioned] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', companyName: '', contactType: 'client' });

  function flash(m: Msg) { setMsg(m); if (m) setTimeout(() => setMsg(null), 3500); }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (type) params.set('type', type);
      const res = await fetch(`/api/crm/contacts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setProvisioned(data.provisioned !== false);
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  async function add() {
    setSaving(true);
    try {
      const res = await fetch('/api/crm/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setShowAdd(false);
      setForm({ firstName: '', lastName: '', email: '', phone: '', companyName: '', contactType: 'client' });
      flash({ type: 'success', text: 'Client added' });
      load();
    } catch (err) {
      flash({ type: 'error', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const name = (c: Contact) => c.fullName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.companyName || 'Unnamed';
  const initials = (n: string) => n.split(' ').map((x) => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const typeBadge = (t: string | null) => {
    switch (t) {
      case 'client': return 'border-green-500 text-green-500';
      case 'lead': return 'border-yellow-500 text-yellow-500';
      case 'prospect': return 'border-blue-500 text-blue-500';
      case 'company': return 'border-purple-500 text-purple-500';
      default: return '';
    }
  };

  const empty = useMemo(() => !loading && contacts.length === 0, [loading, contacts]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-brand" /> Clients
          </h1>
          <p className="text-muted-foreground">{loading ? 'Loading…' : `${total} record${total === 1 ? '' : 's'}`}</p>
        </div>
        <Button className="bg-brand hover:bg-brand/90" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {msg && (
        <div className={cn('mb-6 p-4 rounded-lg flex items-center gap-2',
          msg.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-500' : 'bg-red-500/10 border border-red-500/30 text-red-500')}>
          {msg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}{msg.text}
        </div>
      )}

      {!provisioned && (
        <div className="mb-6 p-4 rounded-lg flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
          <Database className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">CRM tables not provisioned. Apply the Redtail mirror migration to enable Clients.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company…" className="pl-9 bg-secondary border-border w-72" />
        </form>
        <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t} className="capitalize">{t[0].toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      <Card className="bg-card/50 border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
          ) : empty ? (
            <div className="text-center py-16 text-muted-foreground">{provisioned ? 'No clients yet. Add one, or sync Redtail.' : 'Provision the database to see clients.'}</div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-brand/20 text-brand flex items-center justify-center text-sm font-medium flex-shrink-0">{initials(name(c))}</div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{name(c)}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.email || c.phone || (c.city && c.state ? `${c.city}, ${c.state}` : '—')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.contactType && <Badge variant="outline" className={cn('text-xs capitalize', typeBadge(c.contactType))}>{c.contactType}</Badge>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-card border-border">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-brand" /> Add Client</h2>
                <button onClick={() => setShowAdd(false)} aria-label="Close"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm text-muted-foreground">First name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="bg-secondary border-border mt-1" /></div>
                <div><Label className="text-sm text-muted-foreground">Last name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-secondary border-border mt-1" /></div>
              </div>
              <div><Label className="text-sm text-muted-foreground">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-secondary border-border mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm text-muted-foreground">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-secondary border-border mt-1" /></div>
                <div>
                  <Label className="text-sm text-muted-foreground">Type</Label>
                  <select value={form.contactType} onChange={(e) => setForm({ ...form, contactType: e.target.value })} className="w-full h-10 px-3 mt-1 bg-secondary border border-border rounded-md text-foreground">
                    {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div><Label className="text-sm text-muted-foreground">Company</Label><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="bg-secondary border-border mt-1" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button onClick={add} disabled={saving} className="bg-brand hover:bg-brand/90">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
