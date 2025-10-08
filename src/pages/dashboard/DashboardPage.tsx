import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { CallStatusBar } from "../../components/dialer/CallStatusBar";
import { DialPad } from "../../components/dialer/DialPad";
import { CallControls } from "../../components/dialer/CallControls";
import { SipProfileForm } from "../../components/dialer/SipProfileForm";
import { CallLogList } from "../../components/dialer/CallLogList";
import { useSipProfiles } from "../../hooks/useSipProfiles";
import { useCallManager } from "../../hooks/useCallManager";
import { useCallHistory } from "../../hooks/useCallHistory";
import { useSipEvents } from "../../hooks/useSipEvents";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { type SipProfile } from "../../types/sip";

export const DashboardPage = () => {
  const { profiles, loading: profilesLoading, addProfile, updateProfile, removeProfile, setPrimaryProfile } = useSipProfiles();
  const { logs, appendLog } = useCallHistory();
  const { events } = useSipEvents();
  const {
    status,
    registration,
    activeProfile,
    remoteIdentity,
    direction,
    muted,
    registerProfile,
    placeCall,
    hangupCall,
    toggleMute,
    transferCall,
  } = useCallManager();
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [dialValue, setDialValue] = useState("");
  const [callStart, setCallStart] = useState<Date | null>(null);
  const [editingProfile, setEditingProfile] = useState<SipProfile | null>(null);

  useEffect(() => {
    if (!profiles.length) {
      setSelectedProfileId("");
      return;
    }
    const current = profiles.find((profile) => profile.id === selectedProfileId);
    if (current) {
      return;
    }
    const primary = profiles.find((profile) => profile.isPrimary);
    const auto = profiles.find((profile) => profile.autoRegister);
    const initial = primary ?? auto ?? profiles[0];
    if (initial) {
      setSelectedProfileId(initial.id);
      registerProfile(initial).catch(console.error);
    }
  }, [profiles, registerProfile, selectedProfileId]);

  useEffect(() => {
    if (!activeProfile || !profiles.length) return;
    if (activeProfile.id !== selectedProfileId) {
      setSelectedProfileId(activeProfile.id);
    }
  }, [activeProfile, profiles, selectedProfileId]);

  useEffect(() => {
    if (status === "calling" || status === "ringing") {
      setCallStart((current) => current ?? new Date());
    }
    if (status === "active" && !callStart) {
      setCallStart(new Date());
    }
    if ((status === "ended" || status === "error") && callStart) {
      const durationSeconds = Math.max(0, (Date.now() - callStart.getTime()) / 1000);
      const callStatus = status === "error" ? "failed" : "answered";
      appendLog({
        id: nanoid(),
        profileId: activeProfile?.id ?? selectedProfileId,
        direction: direction ?? "outgoing",
        peer: remoteIdentity ?? dialValue,
        startedAt: callStart.toISOString(),
        durationSeconds,
        status: callStatus,
      }).catch(console.error);
      setCallStart(null);
      setDialValue("");
    }
  }, [appendLog, callStart, status, direction, remoteIdentity, dialValue, activeProfile, selectedProfileId]);

  const handleSelectProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    setSelectedProfileId(profileId);
    registerProfile(profile).catch(console.error);
  };

  const handleSetPrimary = async (profileId: string) => {
    await setPrimaryProfile(profileId);
    const profile = profiles.find((item) => item.id === profileId);
    if (profile) {
      setSelectedProfileId(profileId);
      registerProfile(profile).catch(console.error);
    }
  };

  const handleCall = async () => {
    if (!dialValue) return;
    try {
      await placeCall(dialValue);
    } catch (error) {
      console.error(error);
    }
  };

  const handleTransfer = () => {
    if (!dialValue) return;
    try {
      transferCall(dialValue);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddProfile = async (profile: Omit<SipProfile, "id">) => {
    await addProfile(profile);
  };

  const handleUpdateProfile = async (profile: Omit<SipProfile, "id">) => {
    if (!editingProfile) return;
    await updateProfile(editingProfile.id, profile);
    setEditingProfile(null);
  };

  const handleDeleteProfile = async (profile: SipProfile) => {
    const confirmed = window.confirm(`Delete SIP profile "${profile.label}"?`);
    if (!confirmed) return;
    await removeProfile(profile.id);
    if (editingProfile?.id === profile.id) {
      setEditingProfile(null);
    }
  };

  const statusBadge = useMemo(() => {
    const variant = status === "error" ? "destructive" : status === "active" ? "default" : "secondary";
    return <Badge variant={variant}>{status}</Badge>;
  }, [status]);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-background p-4">
      <CallStatusBar
        profiles={profiles}
        activeProfile={activeProfile ?? profiles.find((profile) => profile.id === selectedProfileId) ?? null}
        registration={registration}
        callStatus={status}
        onSelectProfile={handleSelectProfile}
      />
      <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dialer</CardTitle>
            {statusBadge}
          </CardHeader>
          <CardContent className="space-y-6">
            <DialPad
              value={dialValue}
              onChange={setDialValue}
              onCall={handleCall}
              onBackspace={() => setDialValue((value) => value.slice(0, -1))}
              disabled={registration !== "registered" || status === "calling" || status === "ringing"}
            />
            <CallControls status={status} muted={muted} onHangup={hangupCall} onToggleMute={toggleMute} onTransfer={handleTransfer} />
            {remoteIdentity ? (
              <div className="rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">
                Talking to <span className="font-medium text-foreground">{remoteIdentity}</span>
              </div>
            ) : null}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SIP Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              {profilesLoading ? (
                <p className="text-sm text-muted-foreground">Loading profiles…</p>
              ) : profiles.length ? (
                <ul className="space-y-2">
                  {profiles.map((profile) => (
                    <li
                      key={profile.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{profile.label}</p>
                          {profile.isPrimary ? <Badge variant="secondary">Primary</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{profile.username}@{profile.domain}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={selectedProfileId === profile.id ? "default" : "outline"}
                          onClick={() => handleSelectProfile(profile.id)}
                        >
                          {selectedProfileId === profile.id ? "Active" : "Use"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingProfile(profile)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleSetPrimary(profile.id)} disabled={profile.isPrimary}>
                          Primary
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteProfile(profile)}>
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No SIP profiles yet. Add one below.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <CallLogList logs={logs} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Registration &amp; Call Events</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length ? (
                <ul className="space-y-3 text-sm">
                  {events.slice(0, 10).map((event) => (
                    <li key={event.id} className="rounded-md border border-border bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium capitalize">{event.type}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground">{event.message}</p>
                      {event.context ? <p className="text-xs text-muted-foreground">{event.context}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recent events.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {editingProfile ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit SIP Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <SipProfileForm
              key={editingProfile.id}
              initialValues={editingProfile}
              onSubmit={handleUpdateProfile}
              submitting={profilesLoading}
              onCancel={() => setEditingProfile(null)}
              submitLabel="Update profile"
            />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>{editingProfile ? "Add another SIP Profile" : "Add SIP Profile"}</CardTitle>
        </CardHeader>
        <CardContent>
          <SipProfileForm onSubmit={handleAddProfile} submitting={profilesLoading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
