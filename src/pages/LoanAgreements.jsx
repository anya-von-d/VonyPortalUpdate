import React, { useState, useEffect } from "react";
import { LoanAgreement, User, PublicProfile, Loan, Payment } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Users, Download, ArrowUpRight, ArrowDownRight, ChevronDown, Filter } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import LoanActivity from "../components/loans/LoanActivity";
import { formatMoney } from "@/components/utils/formatMoney";

export default function LoanAgreements() {
  const [agreements, setAgreements] = useState([]);
  const [user, setUser] = useState(null);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [roleFilter, setRoleFilter] = useState('both'); // 'lender', 'borrower', 'both'
  const [statusFilter, setStatusFilter] = useState('all'); // 'active', 'completed', 'cancelled', 'all'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [currentUser, allAgreements, profiles, allLoans, allPayments] = await Promise.all([
        User.me(),
        LoanAgreement.list('-created_at'),
        PublicProfile.list(),
        Loan.list(),
        Payment.list()
      ]);
      
      setUser(currentUser);
      setPublicProfiles(profiles || []);
      setLoans(allLoans || []);
      setPayments(allPayments || []);
      
      // Only show agreements that are fully signed (both lender and borrower have signed)
      const myAgreements = (allAgreements || []).filter(
        agreement =>
          (agreement.lender_id === currentUser.id || agreement.borrower_id === currentUser.id) &&
          agreement.lender_signed_date &&
          agreement.borrower_signed_date
      );
      setAgreements(myAgreements);
      
      // Refresh selected agreement if open
      if (selectedAgreement) {
        const updated = myAgreements.find(a => a.id === selectedAgreement.id);
        if (updated) setSelectedAgreement(updated);
      }
    } catch (error) {
      console.error("Error loading agreements:", error);
    }
    setIsLoading(false);
  };

  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };

  const getLoanStatus = (loanId) => {
    const loan = loans.find(l => l.id === loanId);
    return loan?.status || 'unknown';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const buildActivityLog = (agreement) => {
    const activities = [];
    const loanPayments = payments.filter(p => p.loan_id === agreement.loan_id);

    if (agreement.borrower_signed_date) {
      activities.push({
        timestamp: new Date(agreement.borrower_signed_date),
        type: 'signature',
        person: 'Borrower',
        description: 'Signed the loan agreement'
      });
    }

    if (agreement.lender_signed_date) {
      activities.push({
        timestamp: new Date(agreement.lender_signed_date),
        type: 'signature',
        person: 'Lender',
        description: 'Signed the loan agreement'
      });
    }

    loanPayments.forEach(payment => {
       activities.push({
         timestamp: new Date(payment.payment_date),
         type: 'payment',
         person: 'Borrower',
         amount: payment.amount,
         description: `Made payment of ${formatMoney(payment.amount)}`
       });
     });

    if (agreement.cancelled_by) {
      activities.push({
        timestamp: new Date(agreement.cancelled_date),
        type: 'cancellation',
        person: agreement.cancelled_by,
        description: 'Cancelled the loan'
      });
    }

    return activities.sort((a, b) => a.timestamp - b.timestamp);
  };

  const downloadPDF = (agreement) => {
    const doc = new jsPDF();
    const isLender = agreement.lender_id === user?.id;
    const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
    const otherParty = getUserById(otherPartyId);
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('LOAN AGREEMENT', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${format(new Date(agreement.created_at), 'MMMM d, yyyy')}`, 20, 35);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PARTIES:', 20, 50);
    doc.setFont(undefined, 'normal');
    doc.text(`Lender: ${lenderInfo.full_name} (@${lenderInfo.username})`, 20, 60);
    doc.text(`Borrower: ${borrowerInfo.full_name} (@${borrowerInfo.username})`, 20, 70);

    doc.setFont(undefined, 'bold');
    doc.text('LOAN TERMS:', 20, 85);
    doc.setFont(undefined, 'normal');
    doc.text(`Loan Amount: ${formatMoney(agreement.amount)}`, 20, 95);
    doc.text(`Interest Rate: ${agreement.interest_rate}%`, 20, 105);
    doc.text(`Repayment Period: ${agreement.repayment_period} ${agreement.repayment_unit || 'months'}`, 20, 115);
    doc.text(`Payment Frequency: ${agreement.payment_frequency}`, 20, 125);
    doc.text(`Payment Amount: ${formatMoney(agreement.payment_amount)}`, 20, 135);
    doc.text(`Total Amount Due: ${formatMoney(agreement.total_amount)}`, 20, 145);
    if (agreement.due_date) {
      doc.text(`Due Date: ${format(new Date(agreement.due_date), 'MMMM d, yyyy')}`, 20, 155);
    }
    if (agreement.purpose) {
      doc.text(`Purpose: ${agreement.purpose}`, 20, 165);
    }

    doc.setFont(undefined, 'bold');
    doc.text('AGREEMENT:', 20, 180);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const agreementText = `The Lender agrees to lend the Borrower the specified loan amount under the terms outlined above. The Borrower agrees to repay the full amount plus interest according to the payment schedule. Both parties acknowledge and accept these terms.`;
    const lines = doc.splitTextToSize(agreementText, 170);
    doc.text(lines, 20, 190);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('SIGNATURES:', 20, 220);
    
    doc.setFont(undefined, 'normal');
    doc.text('Lender:', 20, 235);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(14);
    doc.text(agreement.lender_name || '', 20, 245);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`Signed: ${format(new Date(agreement.lender_signed_date), 'MMM d, yyyy h:mm a')}`, 20, 253);

    doc.setFontSize(12);
    doc.text('Borrower:', 120, 235);
    if (agreement.borrower_signed_date) {
      doc.setFont(undefined, 'italic');
      doc.setFontSize(14);
      doc.text(agreement.borrower_name, 120, 245);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`Signed: ${format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy h:mm a')}`, 120, 253);
    } else {
      doc.setFont(undefined, 'italic');
      doc.text('Pending signature', 120, 245);
    }

    if (agreement.cancelled_by) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text(agreement.cancellation_note || `Loan Cancelled by ${agreement.cancelled_by}`, 20, 265);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`${format(new Date(agreement.cancelled_date), 'MMM d, yyyy h:mm a')}`, 20, 273);
      doc.setTextColor(0, 0, 0);
    }

    // Add screenshot pages
    if (agreement.lender_screenshot_url) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('LENDER SIGNATURE PAGE', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Screenshot of the exact page the lender signed', 105, 30, { align: 'center' });
      
      try {
        doc.addImage(agreement.lender_screenshot_url, 'PNG', 10, 40, 190, 0);
      } catch (error) {
        doc.text('Failed to load lender screenshot', 105, 100, { align: 'center' });
      }
    }

    if (agreement.borrower_screenshot_url) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text('BORROWER SIGNATURE PAGE', 105, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Screenshot of the exact page the borrower signed', 105, 30, { align: 'center' });
      
      try {
        doc.addImage(agreement.borrower_screenshot_url, 'PNG', 10, 40, 190, 0);
      } catch (error) {
        doc.text('Failed to load borrower screenshot', 105, 100, { align: 'center' });
      }
    }

    // Loan Activity page
    doc.addPage();
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('LOAN ACTIVITY', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Agreement ID: ${agreement.id}`, 20, 35);

    const activities = buildActivityLog(agreement);
    
    if (activities.length === 0) {
      doc.setFontSize(11);
      doc.text('No activity recorded', 20, 55);
    } else {
      let yPos = 55;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Activity Log:', 20, yPos);
      yPos += 10;

      activities.forEach((activity, index) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFont(undefined, 'bold');
         doc.setFontSize(10);
         doc.text(`${index + 1}. ${activity.description}${activity.amount ? ` - ${formatMoney(activity.amount)}` : ''}`, 20, yPos);
        yPos += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`${activity.person} • ${format(activity.timestamp, 'MMM d, yyyy h:mm a')}`, 25, yPos);
        yPos += 8;
      });
    }

    doc.save(`loan-agreement-${agreement.id}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-96">
          <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`}}>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor: `rgb(var(--theme-primary))`}}></div>
                <p className="text-slate-600">Loading agreements...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const lendingAgreements = agreements.filter(a => a.lender_id === user?.id);
  const borrowingAgreements = agreements.filter(a => a.borrower_id === user?.id);

  const AgreementPreview = ({ agreement, onClick, type }) => {
    const isLender = agreement.lender_id === user?.id;
    const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
    const otherParty = getUserById(otherPartyId);
    const loanStatus = getLoanStatus(agreement.loan_id);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card
          style={{backgroundColor: `rgb(var(--theme-card-bg))`}}
          className="backdrop-blur-sm border-slate-200/60 hover:shadow-lg transition-all"
        >
          <CardContent className="p-4">
            {/* Desktop layout */}
            <div className="hidden md:flex items-center gap-4">
              <img
                src={otherParty.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((otherParty.full_name || 'User').charAt(0))}&background=22c55e&color=fff&size=128`}
                alt={otherParty.full_name}
                className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{otherParty.full_name}</h3>
                <p className="text-xs text-slate-500 truncate">
                  {isLender ? 'Borrower' : 'Lender'}: @{otherParty.username} • {format(new Date(agreement.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-600">Total Due</p>
                <p className="font-bold text-lg" style={{color: `rgb(var(--theme-primary))`}}>{formatMoney(agreement.total_amount)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(loanStatus)} text-xs capitalize`}>
                  {loanStatus}
                </Badge>
                <Button onClick={() => downloadPDF(agreement)} variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
                <Button onClick={onClick} className="bg-black hover:bg-gray-800 text-white" size="sm">
                  Details
                </Button>
              </div>
            </div>

            {/* Mobile layout */}
            <div className="md:hidden space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={otherParty.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((otherParty.full_name || 'User').charAt(0))}&background=22c55e&color=fff&size=128`}
                  alt={otherParty.full_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">{otherParty.full_name}</h3>
                  <p className="text-xs text-slate-500 truncate">
                    {isLender ? 'Borrower' : 'Lender'}: @{otherParty.username}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">Total Due</p>
                  <p className="font-bold text-lg" style={{color: `rgb(var(--theme-primary))`}}>{formatMoney(agreement.total_amount)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">{format(new Date(agreement.created_at), 'MMM d, yyyy')}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(loanStatus)} text-xs capitalize`}>
                    {loanStatus}
                  </Badge>
                  <Button onClick={() => downloadPDF(agreement)} variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button onClick={onClick} className="bg-black hover:bg-gray-800 text-white" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <>
      {selectedAgreement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAgreement(null)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`}} className="backdrop-blur-sm overflow-hidden">
              {/* Header with solid green */}
              <div className="bg-[#35B276] p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 md:w-6 md:h-6 text-[#F3F0EC]" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg md:text-xl text-[#F3F0EC]">
                        Loan Agreement
                      </CardTitle>
                      <p className="text-xs md:text-sm text-[#F3F0EC]/80 mt-1 truncate">
                        Agreement with @{getUserById(selectedAgreement.lender_id === user?.id ? selectedAgreement.borrower_id : selectedAgreement.lender_id).username} • {selectedAgreement.created_at ? format(new Date(selectedAgreement.created_at), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Button onClick={() => downloadPDF(selectedAgreement)} variant="outline" size="sm" className="gap-1 md:gap-2 bg-white/10 border-white/30 text-[#F3F0EC] hover:bg-white/20 text-xs md:text-sm">
                      <Download className="w-4 h-4" />
                      <span className="hidden md:inline">Download PDF</span>
                      <span className="md:hidden">PDF</span>
                    </Button>
                    <Button onClick={() => setSelectedAgreement(null)} variant="ghost" size="sm" className="text-[#F3F0EC] hover:bg-white/10">✕</Button>
                  </div>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-800 mb-3">Loan Details</h4>

                  <div className="grid md:grid-cols-3 gap-6 mb-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                      <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}} className="backdrop-blur-sm">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-slate-600 mb-2">Loan Amount</p>
                          <p className="text-2xl font-bold text-slate-800">{formatMoney(selectedAgreement.amount)}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <Card style={{backgroundColor: `rgb(var(--theme-card-bg))`, borderColor: `rgb(var(--theme-border))`}} className="backdrop-blur-sm">
                        <CardContent className="p-4">
                          <p className="text-sm font-medium text-slate-600 mb-2">Total Amount Due</p>
                          <p className="text-2xl font-bold" style={{color: `rgb(var(--theme-primary))`}}>{formatMoney(selectedAgreement.total_amount)}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <div></div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-600">Interest Rate</p>
                        <p className="font-semibold text-slate-900">{selectedAgreement.interest_rate}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Payment Amount</p>
                        <p className="font-semibold text-slate-900">{formatMoney(selectedAgreement.payment_amount)}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-slate-600">Repayment Period</p>
                        <p className="font-semibold text-slate-900">{selectedAgreement.repayment_period} {selectedAgreement.repayment_unit || 'months'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Payment Frequency</p>
                        <p className="font-semibold text-slate-900 capitalize">{selectedAgreement.payment_frequency}</p>
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col justify-end">
                      <div>
                        <p className="text-sm text-slate-600">Due Date</p>
                        <p className="font-semibold text-slate-900">{selectedAgreement.due_date ? format(new Date(selectedAgreement.due_date), 'MMM d, yyyy') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedAgreement.purpose && (
                    <div className="mt-4">
                      <p className="text-sm text-slate-600">Purpose</p>
                      <p className="font-medium text-slate-900">{selectedAgreement.purpose}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200/40 pt-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Agreement</h4>
                  <div className="bg-[#35B276]/10 border border-[#35B276]/30 rounded-xl p-4">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      This loan agreement confirms that both the <span className="font-semibold text-[#35B276]">Lender</span> and <span className="font-semibold text-[#35B276]">Borrower</span> have reviewed and agreed to the terms stated above. The Lender commits to providing the loan amount, and the Borrower commits to repaying the full amount plus interest according to the agreed payment schedule.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200/40 pt-6">
                  <h4 className="font-semibold text-slate-800 mb-4">Signatures</h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-2">Lender</p>
                      <p className="text-xl font-serif text-slate-900 mb-1">{selectedAgreement.lender_name}</p>
                      <p className="text-xs text-slate-500">Signed {format(new Date(selectedAgreement.lender_signed_date), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-sm text-slate-600 mb-2">Borrower</p>
                      {selectedAgreement.borrower_signed_date ? (
                        <>
                          <p className="text-xl font-serif text-slate-900 mb-1">{selectedAgreement.borrower_name}</p>
                          <p className="text-xs text-slate-500">Signed {format(new Date(selectedAgreement.borrower_signed_date), 'MMM d, yyyy h:mm a')}</p>
                        </>
                      ) : (
                        <p className="text-slate-500 italic">Pending signature</p>
                      )}
                    </div>
                  </div>
                  {selectedAgreement.cancelled_by && selectedAgreement.cancellation_note && (
                    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800 font-semibold">{selectedAgreement.cancellation_note.replace(/ on .+$/, '')}</p>
                      <p className="text-xs text-red-600 mt-1">{format(new Date(selectedAgreement.cancelled_date), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  )}
                </div>

                <LoanActivity 
                  agreement={selectedAgreement} 
                  loan={loans.find(l => l.id === selectedAgreement.loan_id)}
                  user={user}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      <div className="min-h-screen p-4 md:p-6 overflow-x-hidden" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto space-y-6 overflow-hidden">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-5">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-center">Document Center</h1>
            <p className="text-lg text-slate-600 text-center">View all your signed loan agreements</p>
          </motion.div>

          {/* Role Filter Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  You are the:
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => setRoleFilter('lender')}
                    variant={roleFilter === 'lender' ? 'default' : 'outline'}
                    className={`flex-1 min-w-[100px] ${
                      roleFilter === 'lender'
                        ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Lender
                  </Button>
                  <Button
                    onClick={() => setRoleFilter('borrower')}
                    variant={roleFilter === 'borrower' ? 'default' : 'outline'}
                    className={`flex-1 min-w-[100px] ${
                      roleFilter === 'borrower'
                        ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Borrower
                  </Button>
                  <Button
                    onClick={() => setRoleFilter('both')}
                    variant={roleFilter === 'both' ? 'default' : 'outline'}
                    className={`flex-1 min-w-[100px] ${
                      roleFilter === 'both'
                        ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Both
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Agreements List with Status Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-[#DBFFEB] border-0 rounded-2xl">
              <CardContent className="p-5">
                {/* Header with Status Filter */}
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    Loan Agreements
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 gap-2">
                        <Filter className="w-3.5 h-3.5" />
                        <span className="capitalize">{statusFilter === 'all' ? 'All Status' : statusFilter}</span>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 bg-white">
                      <DropdownMenuItem onClick={() => setStatusFilter('all')} className={statusFilter === 'all' ? 'bg-slate-100' : ''}>
                        View All
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')} className={statusFilter === 'active' ? 'bg-slate-100' : ''}>
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('completed')} className={statusFilter === 'completed' ? 'bg-slate-100' : ''}>
                        Completed
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('cancelled')} className={statusFilter === 'cancelled' ? 'bg-slate-100' : ''}>
                        Cancelled
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Filtered Agreements List */}
                {(() => {
                  // Filter by role
                  let filteredAgreements = agreements;
                  if (roleFilter === 'lender') {
                    filteredAgreements = lendingAgreements;
                  } else if (roleFilter === 'borrower') {
                    filteredAgreements = borrowingAgreements;
                  }

                  // Filter by status
                  if (statusFilter !== 'all') {
                    filteredAgreements = filteredAgreements.filter(agreement => {
                      const loanStatus = getLoanStatus(agreement.loan_id);
                      return loanStatus === statusFilter;
                    });
                  }

                  if (filteredAgreements.length === 0) {
                    return (
                      <div className="bg-white rounded-xl p-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#DBFFEB] flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-8 h-8 text-[#00A86B]" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Agreements Found</h3>
                        <p className="text-sm text-slate-500">
                          {agreements.length === 0
                            ? "Your signed loan agreements will appear here once you create or accept a loan offer."
                            : "No agreements match the current filters. Try adjusting your filter settings."}
                        </p>
                      </div>
                    );
                  }

                  const colors = ['#D0ED6F', '#83F384', '#6EE8B5'];

                  return (
                    <div className="space-y-3">
                      {filteredAgreements.map((agreement, index) => {
                        const isLender = agreement.lender_id === user?.id;
                        const otherPartyId = isLender ? agreement.borrower_id : agreement.lender_id;
                        const otherParty = getUserById(otherPartyId);
                        const loanStatus = getLoanStatus(agreement.loan_id);

                        return (
                          <motion.div
                            key={agreement.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 rounded-xl"
                            style={{ backgroundColor: colors[index % 3] }}
                          >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <img
                                  src={otherParty.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((otherParty.full_name || 'User').charAt(0))}&background=22c55e&color=fff&size=128`}
                                  alt={otherParty.full_name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-white flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-slate-800 truncate">{otherParty.full_name}</p>
                                  <p className="text-xs text-slate-600 truncate">
                                    {isLender ? 'Borrower' : 'Lender'}: @{otherParty.username} • {format(new Date(agreement.created_at), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 justify-between md:justify-end">
                                <div className="text-right">
                                  <p className="text-xs text-slate-600">Total Due</p>
                                  <p className="font-bold text-lg text-slate-800">{formatMoney(agreement.total_amount)}</p>
                                </div>
                                <Badge className={`${getStatusColor(loanStatus)} text-xs capitalize flex-shrink-0`}>
                                  {loanStatus}
                                </Badge>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => downloadPDF(agreement)}
                                    variant="outline"
                                    size="sm"
                                    className="bg-[#DBFFEB] border-0 hover:bg-white/50"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => setSelectedAgreement(agreement)}
                                    size="sm"
                                    className="bg-slate-800 hover:bg-slate-900 text-white"
                                  >
                                    Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </>
  );
}