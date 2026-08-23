import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-navy">Help & Support</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Documentation
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Learn how to use the Franchise CRM to manage prospects, track
              conversations, and monitor your pipeline.
            </p>
            <p className="text-sm text-gray-500">Coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-brand-navy">
              Contact Support
            </h2>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Need help? Reach out to the tech team.
            </p>
            <a
              href="mailto:admin@acmefranchise.com"
              className="text-brand-purple hover:underline"
            >
              admin@acmefranchise.com
            </a>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-brand-navy">
            Quick Links
          </h2>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>
              <Link
                href="/admin"
                className="text-brand-purple hover:underline"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/prospects"
                className="text-brand-purple hover:underline"
              >
                All Prospects
              </Link>
            </li>
            <li>
              <Link
                href="/admin/pipeline"
                className="text-brand-purple hover:underline"
              >
                Pipeline Board
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
