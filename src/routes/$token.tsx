import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getInvitationByToken, acceptInvitation } from '@/services/team/invitation.service';
import { supabase } from '@/integrations/supabase/client';
import type { TeamInvitation } from '@/types/team.types';

export const Route = createFileRoute('/$token')({
  component: InvitationAcceptPage,
  loader: async ({ params }) => {
    const invitation = await getInvitationByToken(params.token);
    return { invitation };
  },
});

type Step = 'loading' | 'invalid' | 'sign-in' | 'sign-up' | 'accepting' | 'success' | 'error';

function InvitationAcceptPage() {
  const { token } = Route.useParams();
  const { invitation: initialInvitation } = Route.useLoaderData() as { invitation: TeamInvitation | null };
  const navigate = useNavigate();

  const [invitation] = useState<TeamInvitation | null>(initialInvitation);
  const [step, setStep] = useState<Step>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    async function init() {
      if (!invitation) {
        setStep('invalid');
        return;
      }
      if (invitation.status !== 'pending') {
        setStep('invalid');
        return;
      }
      if (new Date(invitation.expires_at) < new Date()) {
        setStep('invalid');
        return;
      }

      const { data: userRes } = await supabase.auth.getUser();
      if (userRes?.user) {
        // Already signed in — try to accept directly (email match enforced server-side).
        await tryAccept();
      } else {
        // Determine sign-in vs sign-up by checking if a profile with this email exists.
        // Simplest approach: default to sign-up; user can switch to "I already have an account".
        setStep('sign-up');
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryAccept() {
    setStep('accepting');
    try {
      await acceptInvitation(token);
      setStep('success');
      setTimeout(() => navigate({ to: '/' }), 1500);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'Something went wrong accepting this invitation.');
      setStep('error');
    }
  }

  async function handleSignUp() {
    if (!invitation) return;
    setStep('accepting');
    const { error } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setErrorMessage(error.message);
      setStep('sign-up');
      return;
    }
    await tryAccept();
  }

  async function handleSignIn() {
    if (!invitation) return;
    setStep('accepting');
    const { error } = await supabase.auth.signInWithPassword({ email: invitation.email, password });
    if (error) {
      setErrorMessage(error.message);
      setStep('sign-in');
      return;
    }
    await tryAccept();
  }

  if (step === 'loading') {
    return <CenteredCard>Loading invitation…</CenteredCard>;
  }

  if (step === 'invalid') {
    return (
      <CenteredCard>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Invitation not available</AlertTitle>
          <AlertDescription>
            This invitation link is invalid, has expired, or has already been used. Ask an admin to send
            a new one.
          </AlertDescription>
        </Alert>
      </CenteredCard>
    );
  }

  if (step === 'accepting') {
    return <CenteredCard>Joining the team…</CenteredCard>;
  }

  if (step === 'success') {
    return (
      <CenteredCard>
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>You're in!</AlertTitle>
          <AlertDescription>Redirecting you to your dashboard…</AlertDescription>
        </Alert>
      </CenteredCard>
    );
  }

  if (step === 'error') {
    return (
      <CenteredCard>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't join company</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      </CenteredCard>
    );
  }

  // sign-up / sign-in
  return (
    <CenteredCard>
      <h1 className="text-xl font-semibold">
        Join {(invitation as any)?.company?.name ?? 'the company'} on FinFlow Track
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        You've been invited as <strong>{invitation?.role?.name}</strong>. Sign{' '}
        {step === 'sign-up' ? 'up' : 'in'} with <strong>{invitation?.email}</strong> to continue.
      </p>

      {errorMessage && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4 grid gap-3">
        {step === 'sign-up' && (
          <div className="grid gap-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button onClick={step === 'sign-up' ? handleSignUp : handleSignIn} disabled={!password}>
          {step === 'sign-up' ? 'Create account & join' : 'Sign in & join'}
        </Button>

        <button
          type="button"
          className="text-sm text-muted-foreground underline"
          onClick={() => setStep(step === 'sign-up' ? 'sign-in' : 'sign-up')}
        >
          {step === 'sign-up' ? 'I already have an account' : 'I need to create an account'}
        </button>
      </div>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md rounded-lg border bg-background p-8 shadow-sm">{children}</div>
    </div>
  );
}
