"use client";

import { Flame, Github, Twitter } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Scenario Marketplace", href: "/marketplace" },
  ],
  Company: [
    { label: "Blog", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "Contact", href: "mailto:hello@founderfate.com" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Founder<span className="text-violet-600">Fate</span>
              </span>
            </a>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Consequence simulation for founders who want to see the future of their decisions
              before they make them.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/FelixKramer/Founders_Fate"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/founderfate"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter / X"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="font-semibold text-sm mb-4">{group}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Founder Fate. All rights reserved.</p>
          <p>
            Simulations are for decision support only and do not constitute financial,
            legal, or investment advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
