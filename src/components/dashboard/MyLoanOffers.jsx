import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Trash2,
  DollarSign,
  Calendar,
  Percent,
  AlertTriangle,
  FileText,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BorrowerSignatureModal from "@/components/loans/BorrowerSignatureModal";

export default function MyLoanOffers({ offers, users, currentUser, onDelete, onSign, onDecline, hideHeader = false }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [processingOfferId, setProcessingOfferId] = useState(null);

  const getUserById = (userId) => {
    const safeUsers = Array.isArray(users) ? users : [];
    return safeUsers.find(u => u && u.user_id === userId);
  };

  const handleDeleteClick = (loan) => {
    setLoanToDelete(loan);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (loanToDelete) {
      await onDelete(loanToDelete.id);
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
    }
  };

  const handleDetailsClick = (offer) => {
    setSelectedOffer(offer);
    setShowSignatureModal(true);
  };

  const handleSignComplete = async (signature) => {
    if (selectedOffer && onSign) {
      setProcessingOfferId(selectedOffer.id);
      await onSign(selectedOffer.id, signature);
      setProcessingOfferId(null);
      setShowSignatureModal(false);
      setSelectedOffer(null);
    }
  };

  const handleDeclineFromModal = async () => {
    if (selectedOffer && onDecline) {
      setProcessingOfferId(selectedOffer.id);
      await onDecline(selectedOffer.id);
      setProcessingOfferId(null);
      setShowSignatureModal(false);
      setSelectedOffer(null);
    }
  };

  const safeOffers = Array.isArray(offers) ? offers : [];

  if (safeOffers.length === 0) {
    return null;
  }

  // Get lender info for the selected offer
  const selectedOfferLender = selectedOffer ? getUserById(selectedOffer.lender_id) : null;

  const renderOffersList = () => (
    <div className="space-y-4">
      {safeOffers.map((offer, index) => {
                if (!offer) return null;

                // Determine if current user is lender or borrower
                const isLender = currentUser && offer.lender_id === currentUser.id;
                const isBorrower = currentUser && offer.borrower_id === currentUser.id;

                // Get the other party's info
                const otherPartyId = isLender ? offer.borrower_id : offer.lender_id;
                const otherParty = getUserById(otherPartyId);
                const otherPartyRole = isLender ? 'Borrower' : 'Lender';
                const myRole = isLender ? 'Lender' : 'Borrower';

                return (
                  <motion.div
                    key={offer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}}
                    className="rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <img
                            src={otherParty?.profile_picture_url || `https://ui-avatars.com/api/?name=${otherParty?.full_name || 'User'}&background=678AFB&color=fff`}
                            alt={otherParty?.full_name || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">
                              {otherParty?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-slate-500">
                              {otherPartyRole}: @{otherParty?.username || 'unknown'} • {offer.created_at ? format(new Date(offer.created_at), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium">${offer.amount?.toLocaleString() || '0'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-blue-600" />
                            <span>{offer.interest_rate || 0}% APR</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-purple-600" />
                            <span>{offer.repayment_period || 0}m term</span>
                          </div>
                          <div className="text-slate-600">
                            <span>${offer.payment_amount?.toFixed(2) || '0.00'} {offer.payment_frequency || 'monthly'}</span>
                          </div>
                        </div>

                        {offer.purpose && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">Purpose</p>
                            <p className="text-sm text-slate-600">{offer.purpose}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-wrap items-center">
                        {/* Status Badge */}
                        <Badge
                          className={
                            offer.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border-amber-300 border'
                              : offer.status === 'active'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {offer.status ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1) : 'Pending'}
                        </Badge>

                        {/* Lender can delete the offer */}
                        {isLender && (
                          <Button
                            onClick={() => handleDeleteClick(offer)}
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Cancel Offer
                          </Button>
                        )}

                        {/* Borrower sees Details button to view and sign contract */}
                        {isBorrower && offer.status === 'pending' && (
                          <Button
                            onClick={() => handleDetailsClick(offer)}
                            disabled={processingOfferId === offer.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
    </div>
  );

  return (
    <>
      {hideHeader ? (
        renderOffersList()
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}} className="backdrop-blur-sm">
            <CardHeader className="pb-4 border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Send className="w-5 h-5 text-green-600" />
                My Loan Offers ({safeOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {renderOffersList()}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete Loan Offer
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this loan offer? This action cannot be undone.
              {loanToDelete?.status === 'active' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <strong>Warning:</strong> This loan is currently active. Deleting it may cause issues with the borrower.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Borrower Signature Modal */}
      {showSignatureModal && selectedOffer && (
        <BorrowerSignatureModal
          isOpen={showSignatureModal}
          onClose={() => {
            setShowSignatureModal(false);
            setSelectedOffer(null);
          }}
          onSign={handleSignComplete}
          onDecline={handleDeclineFromModal}
          loanDetails={selectedOffer}
          lenderName={selectedOfferLender?.full_name || 'Lender'}
          borrowerFullName={currentUser?.full_name || ''}
        />
      )}
    </>
  );
}
