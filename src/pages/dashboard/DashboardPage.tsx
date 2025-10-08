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
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { type SipProfile } from "../../types/sip";

export const DashboardPage = () => {
  const { profiles, loading: profilesLoading, addProfile } = useSipProfiles();
  const { logs, appendLog } = useCallHistory();
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

  useEffect(() => {
    if (!profiles.length || selectedProfileId) return;
    const auto = profiles.find((profile) => profile.autoRegister);
    const initial = auto ?? profiles[0];
    setSelectedProfileId(initial.id);
    registerProfile(initial).catch(console.error);
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
                      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{profile.label}</p>
                        <p className="text-xs text-muted-foreground">{profile.username}@{profile.domain}</p>
                      </div>
                      <Button size="sm" variant={selectedProfileId === profile.id ? "default" : "outline"} onClick={() => handleSelectProfile(profile.id)}>
                        {selectedProfileId === profile.id ? "Active" : "Use"}
                      </Button>
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
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add SIP Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <SipProfileForm onSubmit={handleAddProfile} submitting={profilesLoading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
