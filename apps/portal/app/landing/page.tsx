'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Zap, TrendingUp, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 sticky top-0 z-50 bg-slate-950/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">Opsly</div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300">
                Sign In
              </Button>
            </Link>
            <Link href="/landing#trial">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Deploy Customer Automation.
            <br />
            <span className="text-blue-400">Manage from One Dashboard.</span>
            <br />
            Bill Automatically.
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            Agencies: Turn workflow automation into a white-label service without hiring ops. Deploy n8n, monitor uptime, handle billing—all automatically.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/landing#trial">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Start 14-Day Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="ghost" className="border border-slate-700 text-white hover:bg-slate-900">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Deploy in Minutes */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
            <div className="bg-blue-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Deploy in Minutes</h3>
            <p className="text-slate-400">
              No Docker. No Kubernetes. No DevOps hire. Spin up n8n + Uptime Kuma per customer in under 5 minutes.
            </p>
          </div>

          {/* Monitor Everywhere */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
            <div className="bg-green-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Monitor Everywhere</h3>
            <p className="text-slate-400">
              Single dashboard for all customer uptime. Alerts to your team. Fewer support tickets.
            </p>
          </div>

          {/* Bill Automatically */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
            <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Lock className="text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Bill Automatically</h3>
            <p className="text-slate-400">
              Stripe integration built-in. Per-customer billing, daily backups, no manual invoices.
            </p>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-12">
          <h2 className="text-3xl font-bold text-white mb-8">ROI in 30 Days</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">15+</div>
              <p className="text-slate-400">Hours saved per month</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">10x</div>
              <p className="text-slate-400">Return on investment</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">100%</div>
              <p className="text-slate-400">Uptime monitoring</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">$1.3k</div>
              <p className="text-slate-400">Monthly ops cost saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-white mb-12 text-center">Simple Pricing</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Startup */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-white mb-2">Startup</h3>
            <p className="text-slate-400 mb-4">For small agencies</p>
            <div className="text-3xl font-bold text-white mb-6">$49<span className="text-lg text-slate-400">/mo</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="h-4 w-4 text-blue-400" />
                n8n + Uptime Kuma
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="h-4 w-4 text-blue-400" />
                1 primary domain
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="h-4 w-4 text-blue-400" />
                Weekly backups
              </li>
            </ul>
            <Button className="w-full bg-slate-800 hover:bg-slate-700">Choose Plan</Button>
          </div>

          {/* Business */}
          <div className="bg-blue-950 border-2 border-blue-600 rounded-lg p-8 relative">
            <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              Popular
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Business</h3>
            <p className="text-slate-300 mb-4">For growing agencies</p>
            <div className="text-3xl font-bold text-white mb-6">$149<span className="text-lg text-slate-400">/mo</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-slate-200">
                <Check className="h-4 w-4 text-blue-400" />
                Everything in Startup
              </li>
              <li className="flex items-center gap-2 text-slate-200">
                <Check className="h-4 w-4 text-blue-400" />
                Daily backups
              </li>
              <li className="flex items-center gap-2 text-slate-200">
                <Check className="h-4 w-4 text-blue-400" />
                Priority support
              </li>
              <li className="flex items-center gap-2 text-slate-200">
                <Check className="h-4 w-4 text-blue-400" />
                Up to 10 customers
              </li>
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Start Free Trial</Button>
          </div>

          {/* Enterprise */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
            <h3 className="text-xl font-semibold text-white mb-2">Enterprise</h3>
            <p className="text-slate-400 mb-4">For agencies at scale</p>
            <div className="text-3xl font-bold text-white mb-6">Custom</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="h-4 w-4 text-blue-400" />
                Everything in Business
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="h-4 w-4 text-blue-400" />
                Multi-region deployment
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="h-4 w-4 text-blue-400" />
                SLA + dedicated support
              </li>
            </ul>
            <Button variant="ghost" className="w-full border border-slate-700 text-white hover:bg-slate-900">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Trial CTA */}
      <section id="trial" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to automate your customers?</h2>
          <p className="text-blue-100 mb-8">14-day free trial of Business plan. No credit card required.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/login?mode=signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="ghost" className="border border-white text-white hover:bg-blue-700">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="text-lg font-bold text-white mb-4">Opsly</div>
              <p className="text-slate-400 text-sm">Deploy customer automation. Manage everywhere.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="#" className="hover:text-white">Features</Link></li>
                <li><Link href="#" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="#" className="hover:text-white">About</Link></li>
                <li><Link href="#" className="hover:text-white">Blog</Link></li>
                <li><Link href="#" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="#" className="hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white">Terms</Link></li>
                <li><Link href="#" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2026 Opsly, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
