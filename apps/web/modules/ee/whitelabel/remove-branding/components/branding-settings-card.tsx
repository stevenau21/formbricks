import { Project } from "@prisma/client";
import { SettingsCard } from "@/app/(app)/environments/[environmentId]/settings/components/SettingsCard";
import { getTranslate } from "@/lingodotdev/server";
import { EditBranding } from "@/modules/ee/whitelabel/remove-branding/components/edit-branding";
import { Alert, AlertDescription } from "@/modules/ui/components/alert";

interface BrandingSettingsCardProps {
  project: Project;
  isReadOnly: boolean;
}

export const BrandingSettingsCard = async ({
  project,
  isReadOnly,
}: BrandingSettingsCardProps) => {
  const t = await getTranslate();

  return (
    <SettingsCard
      title={t("environments.project.look.formbricks_branding")}
      description={t("environments.project.look.formbricks_branding_settings_description")}>
      <div className="space-y-4">
        <EditBranding
          type="linkSurvey"
          isEnabled={project.linkSurveyBranding}
          projectId={project.id}
          isReadOnly={isReadOnly}
        />
        <EditBranding
          type="appSurvey"
          isEnabled={project.inAppSurveyBranding}
          projectId={project.id}
          isReadOnly={isReadOnly}
        />
      </div>
      {isReadOnly && (
        <Alert variant="warning" className="mt-4">
          <AlertDescription>
            {t("common.only_owners_managers_and_manage_access_members_can_perform_this_action")}
          </AlertDescription>
        </Alert>
      )}
    </SettingsCard>
  );
};
