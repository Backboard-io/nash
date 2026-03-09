import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Code2, CalendarDays, Sparkles } from 'lucide-react';
import { Button, Input, OGDialog, OGDialogTemplate, useToastContext } from '@librechat/client';
import { useEnterpriseInterestMutation } from '~/data-provider';

export default function Enterprise() {
  const { showToast } = useToastContext();
  const leadMutation = useEnterpriseInterestMutation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [notes, setNotes] = useState('');

  const submitLead = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      showToast({ message: 'Name and email are required', status: 'error' });
      return;
    }

    leadMutation.mutate(
      {
        eventType: 'form_submit',
        route: '/enterprise',
        name: trimmedName,
        email: trimmedEmail,
        company: company.trim(),
        role: role.trim(),
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          showToast({ message: 'Thanks. We will reach out shortly.', status: 'success' });
          setOpen(false);
          setName('');
          setEmail('');
          setCompany('');
          setRole('');
          setNotes('');
        },
        onError: () => {
          showToast({ message: 'Could not submit request. Please try again.', status: 'error' });
        },
      },
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-primary text-text-primary">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-bb-blue/10 blur-3xl dark:bg-bb-blue/20" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-bb-steel/30 blur-3xl dark:bg-bb-steelDark/50" />

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-center gap-4">
          <Link
            to="/c/new"
            className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-green-500"
          >
            <ArrowLeft size={16} />
            Back to Nash
          </Link>
        </div>

        <header className="rounded-2xl border border-border-light bg-gradient-to-br from-bb-blue/15 via-background to-bb-steel/20 p-7 shadow-sm transition-shadow duration-300 hover:shadow-md">
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-bb-blue/20 px-3 py-1.5 text-bb-blue dark:bg-bb-blue/35 dark:text-white">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-semibold tracking-wide">Backboard Enterprise</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Choose your path to enterprise AI rollout</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
            Start self-serve if you are technical, or book with a Forward Deployed Engineer for guided discovery and
            implementation planning.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border-light bg-surface-secondary/80 px-3 py-1 text-text-secondary">
              Guardrails
            </span>
            <span className="rounded-full border border-border-light bg-surface-secondary/80 px-3 py-1 text-text-secondary">
              Team rollout
            </span>
            <span className="rounded-full border border-border-light bg-surface-secondary/80 px-3 py-1 text-text-secondary">
              Backboard-native memory
            </span>
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border-light bg-surface-secondary/70 px-3 py-1 text-xs text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-bb-blue" />
            Built on Backboard.io
          </div>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="group rounded-2xl border border-border-light bg-surface-secondary/60 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="inline-flex items-center gap-2 rounded-lg bg-bb-blue/15 px-2.5 py-1.5 text-bb-blue dark:bg-bb-blue/30 dark:text-white">
              <Code2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Self-serve for developers</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold">Explore docs and create your developer account</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Start immediately with guides, API-first workflows, and a direct signup path for builders.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-text-secondary">
              <li>Quickstart docs and API references</li>
              <li>Direct sign up for your developer workspace</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="https://app.backboard.io/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl border border-border-medium px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover active:scale-[0.98]"
              >
                Explore docs
              </a>
              <a
                href="https://app.backboard.io/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl bg-bb-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bb-blueDark active:scale-[0.98]"
              >
                Sign up
              </a>
            </div>
          </article>

          <article className="group rounded-2xl border border-border-light bg-surface-secondary/60 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="inline-flex items-center gap-2 rounded-lg bg-bb-blue/15 px-2.5 py-1.5 text-bb-blue dark:bg-bb-blue/30 dark:text-white">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Guided for non-dev teams</span>
            </div>
            <h2 className="mt-4 text-xl font-semibold">Book a discovery call with an FDE</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Work with a Forward Deployed Engineer to map your workflows, guardrails, and rollout plan.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-text-secondary">
              <li>Tailored architecture walkthrough</li>
              <li>Implementation plan for your team</li>
            </ul>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-xl bg-bb-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-bb-blueDark active:scale-[0.98]"
              >
                Book discovery call
              </button>
            </div>
          </article>
        </section>
      </div>

      <OGDialog open={open} onOpenChange={setOpen}>
        <OGDialogTemplate
          title="Book an enterprise discovery call"
          className="w-full max-w-lg"
          main={
            <div className="flex flex-col gap-3 p-1">
              <p className="text-xs text-text-secondary">
                Tell us a bit about your team. We will route this directly into Closer Notes for follow-up.
              </p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name *"
              />
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email *"
              />
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Company"
              />
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role / title"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you trying to ship?"
                className="min-h-[100px] w-full resize-y rounded-md border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary"
              />
              <p className="text-xs text-text-secondary">
                By submitting, you agree to be contacted about enterprise setup.
              </p>
            </div>
          }
          buttons={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitLead} disabled={leadMutation.isLoading}>
                {leadMutation.isLoading ? 'Submitting...' : 'Submit request'}
              </Button>
            </div>
          }
        />
      </OGDialog>
    </div>
  );
}
