import { OrganizationSettingsNavbar } from "@/app/(app)/environments/[environmentId]/settings/(organization)/components/OrganizationSettingsNavbar";
import { SmtpSettings } from "@/app/(app)/environments/[environmentId]/settings/(organization)/smtp/components/smtp-settings";
import {
  IS_FORMBRICKS_CLOUD,
  MAIL_FROM,
  MAIL_FROM_NAME,
  SMTP_AUTHENTICATED,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_REJECT_UNAUTHORIZED_TLS,
  SMTP_SECURE_ENABLED,
  SMTP_USER,
} from "@/lib/constants";
import { getUser } from "@/lib/user/service";
import { getTranslate } from "@/lingodotdev/server";
import { getEnvironmentAuth } from "@/modules/environments/lib/utils";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";

const Page = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  const t = await getTranslate();

  const { session, currentUserMembership, organization, isOwner, isManager } = await getEnvironmentAuth(
    params.environmentId
  );
  const user = session?.user?.id ? await getUser(session.user.id) : null;

  const hasAuthConfig = !SMTP_AUTHENTICATED || Boolean(SMTP_USER && SMTP_PASSWORD);
  const isConfigured = Boolean(SMTP_HOST && SMTP_PORT && MAIL_FROM && hasAuthConfig);
  const isReadOnly = !(isOwner || isManager);

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.organization_settings")}>
        <OrganizationSettingsNavbar
          environmentId={params.environmentId}
          isFormbricksCloud={IS_FORMBRICKS_CLOUD}
          membershipRole={currentUserMembership?.role}
          activeId="smtp"
        />
      </PageHeader>
      <SmtpSettings
        organizationId={organization.id}
        userEmail={user?.email}
        isReadOnly={isReadOnly}
        smtpConfig={{
          host: SMTP_HOST,
          port: SMTP_PORT,
          secure: SMTP_SECURE_ENABLED,
          authenticated: SMTP_AUTHENTICATED,
          rejectUnauthorizedTls: SMTP_REJECT_UNAUTHORIZED_TLS,
          user: SMTP_USER,
          mailFrom: MAIL_FROM,
          mailFromName: MAIL_FROM_NAME,
          passwordSet: Boolean(SMTP_PASSWORD),
          isConfigured,
        }}
      />
    </PageContentWrapper>
  );
};

export default Page;
