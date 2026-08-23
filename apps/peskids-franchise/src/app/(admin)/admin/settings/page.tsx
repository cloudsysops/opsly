import { Card, CardContent } from "@/components/shared/Card";
import Link from "next/link";
import {
  UserGroupIcon,
  EnvelopeIcon,
  ServerStackIcon,
  CurrencyDollarIcon,
  BoltIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

const settingsLinks = [
  {
    name: "Users & Roles",
    description: "Manage admin users and their access permissions",
    href: "/admin/settings/users",
    icon: UserGroupIcon,
    color: "bg-brand-purple/10 text-brand-purple",
  },
  {
    name: "Email Configuration",
    description: "Configure SendGrid settings and email templates",
    href: "/admin/settings/email",
    icon: EnvelopeIcon,
    color: "bg-brand-cyan/10 text-brand-cyan",
  },
  {
    name: "Integrations",
    description: "Manage TutorCruncher, Stripe, and STC database connections",
    href: "/admin/settings/integrations",
    icon: ServerStackIcon,
    color: "bg-brand-navy/10 text-brand-navy",
  },
  {
    name: "Royalty Configuration",
    description: "Set royalty percentages and fee structures",
    href: "/admin/settings/royalties",
    icon: CurrencyDollarIcon,
    color: "bg-brand-green/10 text-brand-green",
  },
  {
    name: "Workflow Automation",
    description: "Configure automated workflows and triggers",
    href: "/admin/settings/workflows",
    icon: BoltIcon,
    color: "bg-brand-orange/10 text-brand-orange",
  },
  {
    name: "System Logs",
    description: "View system activity and error logs",
    href: "/admin/settings/logs",
    icon: ClipboardDocumentListIcon,
    color: "bg-gray-100 text-gray-600",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Settings</h1>
        <p className="mt-1 text-gray-600">
          Manage system configuration and preferences
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${link.color}`}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-brand-navy">
                      {link.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {link.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
