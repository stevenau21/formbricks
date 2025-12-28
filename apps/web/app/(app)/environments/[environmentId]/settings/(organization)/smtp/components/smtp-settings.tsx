"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { SettingsCard } from "@/app/(app)/environments/[environmentId]/settings/components/SettingsCard";
import { getFormattedErrorMessage } from "@/lib/utils/helper";
import { Alert, AlertDescription, AlertTitle } from "@/modules/ui/components/alert";
import { Button } from "@/modules/ui/components/button";
import { InlineCode, Small } from "@/modules/ui/components/typography";
import { sendSmtpTestEmailAction } from "../actions";

interface SmtpConfig {
  host?: string | null;
  port?: string | null;
  secure: boolean;
  authenticated: boolean;
  rejectUnauthorizedTls: boolean;
  user?: string | null;
  mailFrom?: string | null;
  mailFromName?: string | null;
  passwordSet: boolean;
  isConfigured: boolean;
}

interface SmtpSettingsProps {
  organizationId: string;
  isReadOnly: boolean;
  userEmail?: string | null;
  smtpConfig: SmtpConfig;
}

const formatValue = (value: string | boolean | null | undefined): string => {
  if (value === undefined || value === null || value === "") {
    return "Not set";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return value;
};

export const SmtpSettings = ({ organizationId, isReadOnly, userEmail, smtpConfig }: SmtpSettingsProps) => {
  const [isSending, setIsSending] = useState(false);
  const canSend = smtpConfig.isConfigured && !!userEmail && !isReadOnly;

  const handleSendTestEmail = async () => {
    setIsSending(true);
    const response = await sendSmtpTestEmailAction({ organizationId });

    if (response?.data) {
      toast.success("Test email sent.");
    } else {
      const errorMessage = getFormattedErrorMessage(response);
      toast.error(errorMessage);
    }

    setIsSending(false);
  };

  const configRows = [
    { label: "MAIL_FROM", value: smtpConfig.mailFrom },
    { label: "MAIL_FROM_NAME", value: smtpConfig.mailFromName },
    { label: "SMTP_HOST", value: smtpConfig.host },
    { label: "SMTP_PORT", value: smtpConfig.port },
    { label: "SMTP_USER", value: smtpConfig.user },
    { label: "SMTP_PASSWORD", value: smtpConfig.passwordSet ? "set" : "Not set" },
    { label: "SMTP_AUTHENTICATED", value: smtpConfig.authenticated },
    { label: "SMTP_SECURE_ENABLED", value: smtpConfig.secure },
    { label: "SMTP_REJECT_UNAUTHORIZED_TLS", value: smtpConfig.rejectUnauthorizedTls },
  ];

  return (
    <SettingsCard
      title="SMTP settings"
      description="Confirm SMTP configuration and send a test email to your account.">
      <Alert variant={smtpConfig.isConfigured ? "success" : "warning"}>
        <AlertTitle>{smtpConfig.isConfigured ? "SMTP is configured" : "SMTP is not configured"}</AlertTitle>
        <AlertDescription>
          {smtpConfig.isConfigured
            ? userEmail
              ? `Test email will be sent to ${userEmail}.`
              : "Add an email address to your profile to send a test email."
            : "Set the SMTP environment variables in docker-compose.yml and restart the container."}
        </AlertDescription>
      </Alert>

      <div className="mt-4 space-y-2 text-sm">
        {configRows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-center justify-between gap-3">
            <InlineCode>{row.label}</InlineCode>
            <span className="break-all text-slate-600">{formatValue(row.value)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={handleSendTestEmail} loading={isSending} disabled={!canSend}>
          Send test email
        </Button>
        <Small color="muted">Restart containers after changing SMTP values.</Small>
      </div>

      {!canSend && isReadOnly && (
        <Alert variant="warning" className="mt-4">
          <AlertDescription>Only owners and managers can send a test email.</AlertDescription>
        </Alert>
      )}
    </SettingsCard>
  );
};
