import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Footer() {
  return (
    <footer className="w-full" style={{ backgroundColor: '#081A11' }}>
      {/* Top Section: About + Coming Soon + Contact Us */}
      <div className="px-6 md:px-10 lg:px-20 pt-10 pb-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-16">
          {/* About Section */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4 font-sans">
              About
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://www.vony-lending.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/70 hover:text-white transition-colors font-sans"
              >
                About Vony Lending
              </a>
              <a
                href="https://www.vony-lending.com#faq"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/70 hover:text-white transition-colors font-sans"
              >
                FAQ
              </a>
            </div>
          </div>

          {/* Coming Soon Section */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4 font-sans">
              Coming Soon
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                to={createPageUrl("Shop")}
                className="text-sm text-white/70 hover:text-white transition-colors font-sans"
              >
                Financial Products
              </Link>
              <Link
                to={createPageUrl("Learn")}
                className="text-sm text-white/70 hover:text-white transition-colors font-sans"
              >
                Learn
              </Link>
            </div>
          </div>

          {/* Contact Us Section */}
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4 font-sans">
              Contact Us
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href="https://www.vony-lending.com/contact-us"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-white/70 hover:text-white transition-colors font-sans"
              >
                Contact Page
              </a>
              <a
                href="mailto:hello@vony-lending.com"
                className="text-sm text-white/70 hover:text-white transition-colors font-sans"
              >
                hello@vony-lending.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="px-6 md:px-10 lg:px-20">
        <div className="max-w-6xl mx-auto border-t border-white/10" />
      </div>

      {/* Bottom Section: Logo + Flag, Legal, Copyright */}
      <div className="px-6 md:px-10 lg:px-20 pt-6 pb-8">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Logo Row + Flag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/e492d87a7_Logo.png"
                alt="Vony Logo"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="font-display italic text-xl text-white tracking-wide">
                Vony
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🇺🇸</span>
              <span className="text-sm text-white/70 font-sans">United States</span>
            </div>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap items-center gap-1 text-xs text-white/40 font-sans">
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="mx-1">|</span>
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Center</span>
            <span className="mx-1">|</span>
            <span className="hover:text-white cursor-pointer transition-colors">Do not sell or share my personal information</span>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-white/30 leading-relaxed font-sans">
            All users of our online services are subject to our Privacy Statement and agree to be bound by the Terms of Service. Please review.
          </p>

          {/* Copyright */}
          <p className="text-[11px] text-white/30 font-sans">
            © 2026 Vony Lending All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
