import { SettingsCard } from "@/app/(app)/environments/[environmentId]/settings/components/SettingsCard";
import { getTranslate } from "@/lingodotdev/server";
import { ProjectConfigNavigation } from "@/modules/projects/settings/components/project-config-navigation";
import { PageContentWrapper } from "@/modules/ui/components/page-content-wrapper";
import { PageHeader } from "@/modules/ui/components/page-header";
import { BackupScriptDownloader } from "./components/backup-script-downloader";

export const BackupSettingsPage = async (props: { params: Promise<{ environmentId: string }> }) => {
  const params = await props.params;
  console.log("Rendering BackupSettingsPage for environment:", params.environmentId);
  const t = await getTranslate();

  return (
    <PageContentWrapper>
      <PageHeader pageTitle={t("common.project_configuration")}>
        <ProjectConfigNavigation environmentId={params.environmentId} activeId="backup" />
      </PageHeader>
      <SettingsCard
        title="Database Backup"
        description="Create a full backup of your Formbricks database for safekeeping or migration.">
        <BackupScriptDownloader />
      </SettingsCard>
    </PageContentWrapper>
  );
};
