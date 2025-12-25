import "server-only";
import { Organization } from "@prisma/client";
import { AUDIT_LOG_ENABLED, IS_RECAPTCHA_CONFIGURED } from "@/lib/constants";

export const getRemoveBrandingPermission = async (
  _billingPlan: Organization["billing"]["plan"]
): Promise<boolean> => {
  return true;
};

export const getWhiteLabelPermission = async (
  _billingPlan: Organization["billing"]["plan"]
): Promise<boolean> => {
  return true;
};

export const getBiggerUploadFileSizePermission = async (
  _billingPlan: Organization["billing"]["plan"]
): Promise<boolean> => {
  return true;
};

export const getIsMultiOrgEnabled = async (): Promise<boolean> => {
  return true;
};

export const getIsContactsEnabled = async (): Promise<boolean> => {
  return true;
};

export const getIsTwoFactorAuthEnabled = async (): Promise<boolean> => {
  return true;
};

export const getIsSsoEnabled = async (): Promise<boolean> => {
  return true;
};

export const getIsQuotasEnabled = async (_billingPlan: Organization["billing"]["plan"]): Promise<boolean> => {
  return true;
};

export const getIsAuditLogsEnabled = async (): Promise<boolean> => {
  if (!AUDIT_LOG_ENABLED) return false;
  return true;
};

export const getIsSamlSsoEnabled = async (): Promise<boolean> => {
  return true;
};

export const getIsSpamProtectionEnabled = async (
  _billingPlan: Organization["billing"]["plan"]
): Promise<boolean> => {
  if (!IS_RECAPTCHA_CONFIGURED) return false;
  return true;
};

export const getMultiLanguagePermission = async (
  _billingPlan: Organization["billing"]["plan"]
): Promise<boolean> => {
  return true;
};

export const getAccessControlPermission = async (
  _billingPlan: Organization["billing"]["plan"]
): Promise<boolean> => {
  return true;
};

export const getOrganizationProjectsLimit = async (
  _limits: Organization["billing"]["limits"]
): Promise<number> => {
  return Infinity;
};
