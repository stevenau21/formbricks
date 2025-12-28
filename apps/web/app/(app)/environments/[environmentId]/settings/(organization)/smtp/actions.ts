"use server";

import { z } from "zod";
import { ZId } from "@formbricks/types/common";
import { InvalidInputError, OperationNotAllowedError, ResourceNotFoundError } from "@formbricks/types/errors";
import { getOrganization } from "@/lib/organization/service";
import { authenticatedActionClient } from "@/lib/utils/action-client";
import { checkAuthorizationUpdated } from "@/lib/utils/action-client/action-client-middleware";
import { IS_SMTP_CONFIGURED, sendEmail } from "@/modules/email";

const ZSendSmtpTestEmailAction = z.object({
  organizationId: ZId,
});

export const sendSmtpTestEmailAction = authenticatedActionClient
  .schema(ZSendSmtpTestEmailAction)
  .action(async ({ ctx, parsedInput }) => {
    const organization = await getOrganization(parsedInput.organizationId);

    if (!organization) {
      throw new ResourceNotFoundError("Organization", parsedInput.organizationId);
    }

    await checkAuthorizationUpdated({
      userId: ctx.user.id,
      organizationId: organization.id,
      access: [{ type: "organization", roles: ["owner", "manager"] }],
    });

    if (!IS_SMTP_CONFIGURED) {
      throw new OperationNotAllowedError("SMTP is not configured");
    }

    if (!ctx.user.email) {
      throw new InvalidInputError("User email not found");
    }

    const subject = "Formbricks SMTP test";
    const html = `<p>Your SMTP configuration is working.</p>
<p>Organization: ${organization.name}</p>`;
    const text = `Your SMTP configuration is working.\nOrganization: ${organization.name}`;

    await sendEmail({
      to: ctx.user.email,
      subject,
      html,
      text,
    });

    return { success: true };
  });
