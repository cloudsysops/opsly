// Available template variables for email templates

export const TEMPLATE_VARIABLES: Record<string, { label: string; description: string; sample: string }> = {
  firstName: {
    label: "First Name",
    description: "Prospect's first name",
    sample: "John",
  },
  lastName: {
    label: "Last Name",
    description: "Prospect's last name",
    sample: "Smith",
  },
  fullName: {
    label: "Full Name",
    description: "Prospect's full name",
    sample: "John Smith",
  },
  email: {
    label: "Email",
    description: "Prospect's email address",
    sample: "john.smith@example.com",
  },
  territory: {
    label: "Territory",
    description: "Preferred territory/market",
    sample: "Austin, TX",
  },
  portalUrl: {
    label: "Portal URL",
    description: "Portal login URL",
    sample: "https://franchise-stc-993771038de6.herokuapp.com/portal",
  },
  setPasswordUrl: {
    label: "Set Password URL",
    description: "Set password link (with token)",
    sample: "https://franchise-stc-993771038de6.herokuapp.com/set-password?token=xxx",
  },
  resetPasswordUrl: {
    label: "Reset Password URL",
    description: "Reset password link (with token)",
    sample: "https://franchise-stc-993771038de6.herokuapp.com/reset-password?token=xxx",
  },
  currentDate: {
    label: "Current Date",
    description: "Today's date",
    sample: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  },
  currentYear: {
    label: "Current Year",
    description: "Current year",
    sample: new Date().getFullYear().toString(),
  },
  interestLevel: {
    label: "Interest Level",
    description: "Prospect's stated interest level",
    sample: "Seriously Considering",
  },
  phone: {
    label: "Phone",
    description: "Prospect's phone number",
    sample: "(555) 123-4567",
  },
};

// Get sample data for preview rendering
export function getSampleData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(TEMPLATE_VARIABLES)) {
    data[key] = value.sample;
  }
  return data;
}

// Variables available for Gmail completion emails (franchisee context)
export const GMAIL_TEMPLATE_VARIABLES: Record<string, { label: string; description: string; sample: string }> = {
  franchiseeFirstName: {
    label: "First Name",
    description: "Franchisee's first name",
    sample: "Aliya",
  },
  franchiseeLastName: {
    label: "Last Name",
    description: "Franchisee's last name",
    sample: "Anjarwalla",
  },
  franchiseeName: {
    label: "Full Name",
    description: "Franchisee's full name",
    sample: "Aliya Anjarwalla",
  },
  franchiseeEmail: {
    label: "Email",
    description: "Franchisee's email address",
    sample: "aliya@example.com",
  },
  marketName: {
    label: "Market",
    description: "Franchisee's market/territory name",
    sample: "Eastside",
  },
  moduleName: {
    label: "Module",
    description: "Name of the completed module",
    sample: "Payroll Setup",
  },
  currentDate: {
    label: "Current Date",
    description: "Today's date",
    sample: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  },
  currentYear: {
    label: "Current Year",
    description: "Current year",
    sample: new Date().getFullYear().toString(),
  },
};

// Get variable list for a quick reference
export function getVariableList(): string[] {
  return Object.keys(TEMPLATE_VARIABLES);
}
