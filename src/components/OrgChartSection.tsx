import React from "react";
import { OrgMember } from "../types";
import { ProfessionalOrgStructure, ProfessionalOrgStructureProps } from "./ProfessionalOrgStructure";

export interface OrgChartSectionProps {
  members?: OrgMember[];
  lang?: "ar" | "en";
  associationName?: string;
  licenseNumber?: string;
  className?: string;
  showHeader?: boolean;
}

/**
 * قسم الهيكل الإداري الاحترافي
 * OrgChartSection - Delegates to ProfessionalOrgStructure
 */
export const OrgChartSection: React.FC<OrgChartSectionProps> = (props) => {
  return <ProfessionalOrgStructure {...props} />;
};

export { ProfessionalOrgStructure };
export default OrgChartSection;
