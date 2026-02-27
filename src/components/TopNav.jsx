import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const mainNavItems = [
  {
    title: "Home",
    url: createPageUrl("Home"),
  },
  {
    title: "Lending",
    url: createPageUrl("Lending"),
  },
  {
    title: "Borrowing",
    url: createPageUrl("Borrowing"),
  },
];

const moreMenuItems = [
  {
    title: "Agreements",
    url: createPageUrl("LoanAgreements"),
  },
  {
    title: "Activity",
    url: createPageUrl("RecentActivity"),
  },
  {
    title: "Learn (Coming Soon)",
    url: createPageUrl("Learn"),
  },
  {
    title: "Shop (Coming Soon)",
    url: createPageUrl("Shop"),
  },
  {
    title: "Profile",
    url: createPageUrl("Profile"),
  },
];

const allNavItems = [...mainNavItems, ...moreMenuItems];

export default function TopNav({ location, colors, user, isLoading, theme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="bg-white shadow-sm px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo on the left - italic serif style like RebrandMainWebsite */}
        <Link to={createPageUrl("Home")} className="font-serif italic text-2xl text-[#0A1A10] tracking-wide">
          Vony
        </Link>

        {/* Mobile Hamburger Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <button className="p-2">
              <Menu className="w-6 h-6 text-[#0A1A10]" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-white">
            <nav className="flex flex-col gap-2 mt-8">
              {allNavItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                    location.pathname === item.url
                      ? "text-[#00A86B] bg-[#E8FCF0]"
                      : "text-[#4A6B55] hover:text-[#00A86B] hover:bg-[#E8FCF0]"
                  }`}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Centered navigation - text only, no icons */}
        <nav className="hidden lg:flex items-center gap-8">
          {mainNavItems.map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === item.url
                  ? "text-[#00A86B]"
                  : "text-[#4A6B55] hover:text-[#00A86B]"
              }`}
            >
              {item.title}
            </Link>
          ))}

          {/* More dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-sm font-medium text-[#4A6B55] hover:text-[#00A86B] transition-colors duration-200">
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white border border-[#7AD4A0]/30">
              {moreMenuItems.map((item) => (
                <DropdownMenuItem key={item.title} asChild>
                  <Link
                    to={item.url}
                    className="cursor-pointer text-[#4A6B55] hover:text-[#00A86B]"
                  >
                    {item.title}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Empty space on the right for balance */}
        <div className="w-10 h-10 hidden lg:block"></div>
      </div>
    </div>
  );
}