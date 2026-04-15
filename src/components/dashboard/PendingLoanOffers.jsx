import React from "react";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
export default function PendingLoanOffers({ offers }) {
  const safeOffers = Array.isArray(offers) ? offers : [];

  if (safeOffers.length === 0) {
    return null;
  }

  const offerCount = safeOffers.length;
  const offerText = offerCount === 1 ? "loan offer" : "loan offers";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white rounded-xl p-5 max-w-[85%] mx-auto lg:max-w-none">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-[#0A1A10]" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">
                You have {offerCount} pending {offerText}!
              </h3>
              <p className="text-slate-600 text-xs">
                Review and accept offers from your friends
              </p>
            </div>
          </div>
          <Link to="/Requests">
            <Button
              className="bg-[#00A86B] hover:bg-[#0D9B76] text-white font-semibold gap-2 text-sm"
            >
              View Offers
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
