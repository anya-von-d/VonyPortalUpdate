import React, { useState, useEffect } from "react";
import { Loan, LoanAgreement, User, PublicProfile } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSelector } from "@/components/ui/user-selector";
import SignatureModal from "@/components/loans/SignatureModal";
import LoanCard from "@/components/loans/LoanCard";
import RecordPaymentModal from "@/components/loans/RecordPaymentModal";
import LoanDetailsModal from "@/components/loans/LoanDetailsModal";
import MyLoanOffers from "@/components/dashboard/MyLoanOffers";
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
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DollarSign, Calendar, Percent, FileText, User as UserIcon,
  AlertCircle, Zap, ClipboardList, Send, Clock,
  TrendingUp, Pencil, X, Save, History, PlusCircle, Settings, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addMonths, format } from "date-fns";

export default function Lending() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingLoanData, setPendingLoanData] = useState(null);
  const [loanType, setLoanType] = useState('flexible');
  const [loans, setLoans] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [activeSection, setActiveSection] = useState('lending'); // 'lending', 'create', 'active', 'offers', 'history'
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [editLoanData, setEditLoanData] = useState(null);

  const [formData, setFormData] = useState({
    borrower_username: '',
    amount: '',
    interest_rate: '',
    repayment_period: '',
    repayment_unit: 'months',
    custom_due_date: '',
    payment_frequency: 'monthly',
    purpose: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadingUsers(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [allLoans, profiles] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => [])
      ]);

      setLoans(allLoans || []);
      setPublicProfiles(profiles || []);

      // Filter out current user for borrower selection
      const otherUsers = (profiles || []).filter(p => p && p.user_id !== user.id && !p.user_id?.startsWith('sample-user-'));
      const uniqueUsers = Array.from(new Map(otherUsers.map(u => [u.user_id, u])).values());
      setUsers(uniqueUsers);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
    setIsLoadingUsers(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateLoanDetails = () => {
    const amount = parseFloat(formData.amount) || 0;
    const interestRate = parseFloat(formData.interest_rate) || 0;
    const period = parseInt(formData.repayment_period) || 0;

    let periodInMonths = period;
    if (formData.repayment_unit === 'days') {
      periodInMonths = period / 30;
    } else if (formData.repayment_unit === 'weeks') {
      periodInMonths = period / 4.33;
    } else if (formData.repayment_unit === 'custom' && formData.custom_due_date) {
      const today = new Date();
      const dueDate = new Date(formData.custom_due_date);
      const diffTime = Math.abs(dueDate - today);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      periodInMonths = diffDays / 30;
    }

    if (amount > 0 && interestRate >= 0 && periodInMonths > 0) {
      const totalAmount = amount * (1 + (interestRate / 100) * (periodInMonths / 12));
      let paymentAmount;
      switch (formData.payment_frequency) {
        case 'none':
          paymentAmount = 0;
          break;
        case 'daily':
          paymentAmount = totalAmount / (periodInMonths * 30);
          break;
        case 'weekly':
          paymentAmount = totalAmount / (periodInMonths * (52 / 12));
          break;
        case 'biweekly':
          paymentAmount = totalAmount / (periodInMonths * (26 / 12));
          break;
        default:
          paymentAmount = totalAmount / periodInMonths;
      }
      return { totalAmount, paymentAmount, totalInterest: totalAmount - amount };
    }
    return { totalAmount: 0, paymentAmount: 0, totalInterest: 0 };
  };

  const findUserByUsername = async (username) => {
    if (!username) return null;
    const foundInLocal = users.find(u => u && u.username === username);
    if (foundInLocal) return foundInLocal;

    try {
      const profiles = await PublicProfile.filter({ username: { eq: username.trim() } });
      if (profiles && profiles.length > 0) return profiles[0];
    } catch (error) {
      console.error(`Error searching for profile with username ${username}:`, error);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!currentUser) {
        alert("Please log in to create a loan offer.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.borrower_username.trim()) {
        alert("Please select or enter a borrower's username.");
        setIsSubmitting(false);
        return;
      }

      const borrowerProfile = await findUserByUsername(formData.borrower_username.trim());

      if (!borrowerProfile || !borrowerProfile.user_id) {
        alert(`User "${formData.borrower_username}" could not be found.`);
        setIsSubmitting(false);
        return;
      }

      if (borrowerProfile.user_id === currentUser.id) {
        alert("You cannot create a loan offer to yourself.");
        setIsSubmitting(false);
        return;
      }

      const details = calculateLoanDetails();
      let dueDate;
      if (formData.repayment_unit === 'custom') {
        dueDate = new Date(formData.custom_due_date);
      } else if (formData.repayment_unit === 'days') {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + parseInt(formData.repayment_period));
      } else if (formData.repayment_unit === 'weeks') {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + parseInt(formData.repayment_period) * 7);
      } else {
        dueDate = addMonths(new Date(), parseInt(formData.repayment_period) || 1);
      }

      const loanData = {
        lender_id: currentUser.id,
        borrower_id: borrowerProfile.user_id,
        amount: parseFloat(formData.amount),
        interest_rate: loanType === 'flexible' ? 0 : parseFloat(formData.interest_rate) || 0,
        repayment_period: loanType === 'flexible' ? 0 : parseInt(formData.repayment_period) || 0,
        repayment_unit: formData.repayment_unit,
        payment_frequency: loanType === 'flexible' ? 'none' : formData.payment_frequency,
        purpose: formData.purpose,
        status: 'pending',
        due_date: loanType === 'flexible' ? null : format(dueDate, 'yyyy-MM-dd'),
        total_amount: loanType === 'flexible' ? parseFloat(formData.amount) : details.totalAmount,
        payment_amount: loanType === 'flexible' ? 0 : details.paymentAmount,
        next_payment_date: loanType === 'flexible' ? null : format(addMonths(new Date(), 1), 'yyyy-MM-dd')
      };

      setPendingLoanData(loanData);
      setShowSignatureModal(true);
      setIsSubmitting(false);
    } catch (error) {
      console.error("Error creating loan:", error);
      alert(`Error creating loan offer: ${error.message || "Please try again."}`);
      setIsSubmitting(false);
    }
  };

  const handleSign = async (signature) => {
    setIsSubmitting(true);
    try {
      const createdLoan = await Loan.create(pendingLoanData);

      await LoanAgreement.create({
        loan_id: createdLoan.id,
        lender_id: pendingLoanData.lender_id,
        lender_name: signature,
        lender_signed_date: new Date().toISOString(),
        borrower_id: pendingLoanData.borrower_id,
        amount: pendingLoanData.amount,
        interest_rate: pendingLoanData.interest_rate,
        repayment_period: pendingLoanData.repayment_period,
        payment_frequency: pendingLoanData.payment_frequency,
        purpose: pendingLoanData.purpose || '',
        due_date: pendingLoanData.due_date,
        total_amount: pendingLoanData.total_amount,
        payment_amount: pendingLoanData.payment_amount,
        is_fully_signed: false
      });

      setShowSignatureModal(false);
      setFormData({
        borrower_username: '',
        amount: '',
        interest_rate: '',
        repayment_period: '',
        repayment_unit: 'months',
        custom_due_date: '',
        payment_frequency: 'monthly',
        purpose: ''
      });
      await loadData();
      setActiveSection('offers');
    } catch (error) {
      console.error("Error creating loan and agreement:", error);
      alert(`Error: ${error.message || "Please try again."}`);
    }
    setIsSubmitting(false);
  };

  const handleMakePayment = (loan) => {
    setSelectedLoan(loan);
    setShowPaymentModal(true);
  };

  const handleViewDetails = (loan) => {
    setSelectedLoanDetails({ loan, type: 'lent' });
    setShowDetailsModal(true);
  };

  const handlePaymentComplete = async () => {
    setShowPaymentModal(false);
    setSelectedLoan(null);
    await loadData();
  };

  const handleCancelLoan = (loan) => {
    setLoanToCancel(loan);
    setShowCancelDialog(true);
  };

  const confirmCancelLoan = async () => {
    if (!loanToCancel) return;
    try {
      await Loan.update(loanToCancel.id, { status: 'cancelled' });
      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === loanToCancel.id);
      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          cancelled_by: currentUser.full_name,
          cancelled_date: new Date().toISOString(),
          cancellation_note: `Loan Cancelled by ${currentUser.full_name}`
        });
      }
      setShowCancelDialog(false);
      setLoanToCancel(null);
      await loadData();
    } catch (error) {
      console.error("Error cancelling loan:", error);
    }
  };

  const handleDeleteOffer = async (loanId) => {
    try {
      await Loan.delete(loanId);
      loadData();
    } catch (error) {
      console.error("Error deleting loan offer:", error);
    }
  };

  const handleEditLoan = (loan) => {
    setEditLoanData({
      id: loan.id,
      amount: loan.amount || 0,
      interest_rate: loan.interest_rate || 0,
      repayment_period: loan.repayment_period || 0,
      payment_frequency: loan.payment_frequency || 'monthly',
      due_date: loan.due_date || '',
      payment_amount: loan.payment_amount || 0,
      purpose: loan.purpose || '',
      notes: ''
    });
    setShowEditLoanModal(true);
  };

  const handleSaveEditLoan = async () => {
    if (!editLoanData || !manageLoanSelected) return;

    try {
      // Calculate new total amount based on changes
      const amount = parseFloat(editLoanData.amount) || 0;
      const interestRate = parseFloat(editLoanData.interest_rate) || 0;
      const period = parseInt(editLoanData.repayment_period) || 0;
      const periodInMonths = period;
      const totalAmount = amount * (1 + (interestRate / 100) * (periodInMonths / 12));

      // Calculate new payment amount
      let paymentAmount = editLoanData.payment_amount;
      if (editLoanData.payment_frequency !== 'none' && period > 0) {
        switch (editLoanData.payment_frequency) {
          case 'daily':
            paymentAmount = totalAmount / (periodInMonths * 30);
            break;
          case 'weekly':
            paymentAmount = totalAmount / (periodInMonths * (52 / 12));
            break;
          case 'biweekly':
            paymentAmount = totalAmount / (periodInMonths * (26 / 12));
            break;
          default:
            paymentAmount = totalAmount / periodInMonths;
        }
      }

      // Build change log
      const changes = [];
      if (editLoanData.amount !== manageLoanSelected.amount) {
        changes.push(`Amount: $${manageLoanSelected.amount} → $${editLoanData.amount}`);
      }
      if (editLoanData.interest_rate !== manageLoanSelected.interest_rate) {
        changes.push(`Interest Rate: ${manageLoanSelected.interest_rate}% → ${editLoanData.interest_rate}%`);
      }
      if (editLoanData.repayment_period !== manageLoanSelected.repayment_period) {
        changes.push(`Repayment Period: ${manageLoanSelected.repayment_period} → ${editLoanData.repayment_period} months`);
      }
      if (editLoanData.payment_frequency !== manageLoanSelected.payment_frequency) {
        changes.push(`Payment Frequency: ${manageLoanSelected.payment_frequency} → ${editLoanData.payment_frequency}`);
      }
      if (editLoanData.due_date !== manageLoanSelected.due_date) {
        changes.push(`Due Date: ${manageLoanSelected.due_date || 'None'} → ${editLoanData.due_date || 'None'}`);
      }

      const changeLog = changes.length > 0 ? changes.join('; ') : 'No changes';

      // Update loan
      await Loan.update(editLoanData.id, {
        amount: parseFloat(editLoanData.amount),
        interest_rate: parseFloat(editLoanData.interest_rate),
        repayment_period: parseInt(editLoanData.repayment_period),
        payment_frequency: editLoanData.payment_frequency,
        due_date: editLoanData.due_date,
        total_amount: totalAmount,
        payment_amount: paymentAmount,
        purpose: editLoanData.purpose,
        contract_modified: true,
        contract_modified_date: new Date().toISOString(),
        contract_modification_notes: editLoanData.notes || changeLog,
        status: 'pending_borrower_approval' // Mark as needing borrower approval for changes
      });

      // Update loan agreement
      const agreements = await LoanAgreement.list();
      const agreement = agreements.find(a => a.loan_id === editLoanData.id);
      if (agreement) {
        await LoanAgreement.update(agreement.id, {
          amount: parseFloat(editLoanData.amount),
          interest_rate: parseFloat(editLoanData.interest_rate),
          repayment_period: parseInt(editLoanData.repayment_period),
          payment_frequency: editLoanData.payment_frequency,
          due_date: editLoanData.due_date,
          total_amount: totalAmount,
          payment_amount: paymentAmount,
          modification_history: JSON.stringify([
            ...(agreement.modification_history ? JSON.parse(agreement.modification_history) : []),
            {
              date: new Date().toISOString(),
              modified_by: currentUser.full_name,
              changes: changeLog,
              notes: editLoanData.notes
            }
          ]),
          is_fully_signed: false, // Requires borrower re-signature
          borrower_name: null,
          borrower_signed_date: null
        });
      }

      setShowEditLoanModal(false);
      setEditLoanData(null);
      await loadData();

      // Update selected loan with new data
      const updatedLoans = await Loan.list('-created_at');
      const updatedLoan = updatedLoans.find(l => l.id === editLoanData.id);
      if (updatedLoan) {
        setManageLoanSelected(updatedLoan);
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      alert(`Error updating loan: ${error.message || "Please try again."}`);
    }
  };

  // Filter loans where user is the lender
  const lentLoans = loans.filter(loan => loan.lender_id === currentUser?.id);
  const activeLoans = lentLoans.filter(loan => loan.status === 'active');
  const pendingOffers = lentLoans.filter(loan => loan.status === 'pending');
  const completedLoans = lentLoans.filter(loan => loan.status === 'completed' || loan.status === 'cancelled');

  const totalLent = activeLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
  const totalExpectedBack = activeLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);

  // Find next expected payment (as lender receiving payment)
  const nextPaymentLoan = activeLoans
    .filter(loan => loan.next_payment_date)
    .map(loan => ({ ...loan, date: new Date(loan.next_payment_date) }))
    .sort((a, b) => a.date - b.date)[0];

  const details = calculateLoanDetails();

  const tabs = [
    { id: 'lending', label: 'All' },
    { id: 'create', label: 'Create Offer' },
    { id: 'active', label: 'Manage Loans' },
    { id: 'offers', label: 'Pending Offers' },
    { id: 'history', label: 'History' },
  ];

  return (
    <>
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setPendingLoanData(null);
        }}
        onSign={handleSign}
        loanDetails={pendingLoanData || {}}
        userFullName={currentUser?.full_name || ''}
        signingAs="Lender"
      />

      <div className="min-h-screen p-3 md:p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-4"
          >
            <h1 className="text-3xl md:text-5xl font-bold text-slate-800 mb-3 tracking-tight text-center">
              Lending
            </h1>
            <p className="text-base md:text-lg text-slate-600 text-center">
              Create offers, track your loans, and manage repayments
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                variant={activeSection === tab.id ? 'default' : 'outline'}
                className={`whitespace-nowrap ${
                  activeSection === tab.id
                    ? 'bg-[#00A86B] hover:bg-[#0D9B76] text-white'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </Button>
            ))}
          </div>

          {/* Content Sections */}
          <AnimatePresence mode="wait">
            {activeSection === 'lending' && (
              <motion.div
                key="lending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Pie Chart + Stats Cards Row */}
                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                  {/* Pie Chart - Left Side */}
                  <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60 md:w-1/3">
                    <CardContent className="p-4 flex flex-col items-center justify-center h-full">
                      <p className="text-sm font-medium text-slate-600 mb-3">Repayment Progress</p>
                      {(() => {
                        const totalOwed = activeLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
                        const totalPaid = activeLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
                        const percentPaid = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
                        const circumference = 2 * Math.PI * 45;
                        const strokeDashoffset = circumference - (percentPaid / 100) * circumference;

                        return (
                          <div className="relative w-36 h-36">
                            <svg className="w-full h-full transform -rotate-90">
                              {/* Background circle */}
                              <circle
                                cx="72"
                                cy="72"
                                r="45"
                                fill="none"
                                stroke="#e2e8f0"
                                strokeWidth="12"
                              />
                              {/* Progress circle */}
                              <circle
                                cx="72"
                                cy="72"
                                r="45"
                                fill="none"
                                stroke="#35B276"
                                strokeWidth="12"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-500"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-bold text-slate-800">{percentPaid}%</span>
                              <span className="text-xs text-slate-500">Repaid</span>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="mt-3 text-center">
                        <p className="text-xs text-slate-500">
                          ${activeLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0).toLocaleString()} of ${activeLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats Cards - Right Side (2x2 Grid) */}
                  <div className="flex-1 grid grid-cols-2 gap-3 md:gap-4">
                    <Card className="text-white" style={{backgroundColor: '#00A86B'}}>
                      <CardContent className="p-4">
                        <p className="text-xs md:text-sm opacity-90 mb-1">Total Lent</p>
                        <p className="text-xl md:text-2xl font-bold">${totalLent.toLocaleString()}</p>
                        <p className="text-xs opacity-75">{activeLoans.length} active loans</p>
                      </CardContent>
                    </Card>

                    <Card className="text-white" style={{backgroundColor: '#36CE8E'}}>
                      <CardContent className="p-4">
                        <p className="text-xs md:text-sm opacity-90 mb-1">Expected Back</p>
                        <p className="text-xl md:text-2xl font-bold">${totalExpectedBack.toLocaleString()}</p>
                        <p className="text-xs opacity-75">Including interest</p>
                      </CardContent>
                    </Card>

                    <Card className="text-white" style={{backgroundColor: '#83F384'}}>
                      <CardContent className="p-4">
                        <p className="text-xs md:text-sm text-[#0A1A10] mb-1">Pending Offers</p>
                        <p className="text-xl md:text-2xl font-bold text-[#0A1A10]">{pendingOffers.length}</p>
                        <p className="text-xs text-[#0A1A10]/70">Awaiting response</p>
                      </CardContent>
                    </Card>

                    <Card className="text-white" style={{backgroundColor: '#D0ED6F'}}>
                      <CardContent className="p-4">
                        <p className="text-xs md:text-sm text-[#0A1A10] mb-1">Next Payment</p>
                        <p className="text-xl md:text-2xl font-bold text-[#0A1A10]">
                          {nextPaymentLoan ? format(new Date(nextPaymentLoan.next_payment_date), 'MMM d') : '-'}
                        </p>
                        <p className="text-xs text-[#0A1A10]/70">
                          {nextPaymentLoan ? `$${nextPaymentLoan.payment_amount?.toLocaleString() || 0}` : 'No payments due'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Upcoming Payments + Individual Loan Progress */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Upcoming Payments - Left */}
                  <Card className="bg-white border-[#7AD4A0]/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-[#0A1A10]">
                        Upcoming Payments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activeLoans.filter(l => l.next_payment_date).length === 0 ? (
                        <p className="text-slate-500 text-sm">No upcoming payments</p>
                      ) : (
                        <div className="space-y-3">
                          {activeLoans
                            .filter(l => l.next_payment_date)
                            .sort((a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date))
                            .slice(0, 3)
                            .map(loan => {
                              const borrower = publicProfiles.find(p => p.user_id === loan.borrower_id);
                              return (
                                <div key={loan.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                                  <div>
                                    <p className="font-medium text-sm text-slate-800">
                                      ${loan.payment_amount?.toLocaleString() || 0} from @{borrower?.username || 'user'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Due {format(new Date(loan.next_payment_date), 'MMM d, yyyy')}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.ceil((new Date(loan.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24))} days
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Individual Loan Progress - Right */}
                    <Card className="bg-white border-[#7AD4A0]/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-[#0A1A10]">
                          Individual Loan Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activeLoans.length === 0 ? (
                          <p className="text-slate-500 text-sm">No active loans to track</p>
                        ) : (
                          <div className="space-y-4">
                            {activeLoans.slice(0, 5).map(loan => {
                              const borrower = publicProfiles.find(p => p.user_id === loan.borrower_id);
                              const totalOwed = loan.total_amount || loan.amount || 0;
                              const amountPaid = loan.amount_paid || 0;
                              const percentPaid = totalOwed > 0 ? Math.round((amountPaid / totalOwed) * 100) : 0;

                              return (
                                <div key={loan.id} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                        <span className="text-xs font-medium text-[#00A86B]">
                                          {borrower?.full_name?.charAt(0) || '?'}
                                        </span>
                                      </div>
                                      <span className="text-sm font-medium text-slate-700">@{borrower?.username || 'user'}</span>
                                    </div>
                                    <span className="text-xs text-slate-500">{percentPaid}%</span>
                                  </div>
                                  <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="absolute top-0 left-0 h-full bg-[#00A86B] rounded-full transition-all duration-500"
                                      style={{ width: `${percentPaid}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <span>${amountPaid.toLocaleString()} paid</span>
                                    <span>${totalOwed.toLocaleString()} total</span>
                                  </div>
                                </div>
                              );
                            })}
                            {activeLoans.length > 5 && (
                              <Button
                                variant="ghost"
                                className="w-full text-[#00A86B]"
                                onClick={() => setActiveSection('active')}
                              >
                                View all {activeLoans.length} loans
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                </div>
              </motion.div>
            )}

            {activeSection === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid lg:grid-cols-3 gap-6"
              >
                {/* Form */}
                <div className="lg:col-span-2">
                  <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                        <div className="w-8 h-8 rounded-full bg-[#E8FCF0] flex items-center justify-center">
                          <PlusCircle className="w-4 h-4 text-[#00A86B]" />
                        </div>
                        Create Loan Offer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-3">
                      <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Borrower Selection */}
                        <div className="space-y-2">
                          <Label htmlFor="borrower_username" className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-[#00A86B]" />
                            Select Borrower
                          </Label>
                          {isLoadingUsers ? (
                            <div className="h-10 bg-slate-100 rounded-md animate-pulse" />
                          ) : (
                            <UserSelector
                              users={users}
                              value={formData.borrower_username}
                              onSelect={(username) => handleInputChange('borrower_username', username)}
                              placeholder="Choose a user..."
                            />
                          )}
                        </div>

                        {/* Amount and Purpose */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="amount" className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-[#00A86B]" />
                              Loan Amount
                            </Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              min="0"
                              max="5000"
                              placeholder="Enter amount"
                              value={formData.amount}
                              onChange={(e) => handleInputChange('amount', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="purpose" className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#00A86B]" />
                              What's this for?
                            </Label>
                            <Input
                              id="purpose"
                              type="text"
                              placeholder="e.g., Concert tickets..."
                              value={formData.purpose}
                              onChange={(e) => handleInputChange('purpose', e.target.value)}
                              maxLength={100}
                            />
                          </div>
                        </div>

                        {/* Scheduled loan fields */}
                        {loanType === 'scheduled' && (
                          <>
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Percent className="w-4 h-4 text-[#00A86B]" />
                                  Interest Rate (% per year)
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="8"
                                  placeholder="Enter rate"
                                  value={formData.interest_rate}
                                  onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[#00A86B]" />
                                  Payment Frequency
                                </Label>
                                <Select
                                  value={formData.payment_frequency}
                                  onValueChange={(value) => handleInputChange('payment_frequency', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select frequency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#00A86B]" />
                                Repayment Period
                              </Label>
                              <div className="grid grid-cols-2 gap-3">
                                <Select
                                  value={formData.repayment_unit}
                                  onValueChange={(value) => handleInputChange('repayment_unit', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select unit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="days">Days</SelectItem>
                                    <SelectItem value="weeks">Weeks</SelectItem>
                                    <SelectItem value="months">Months</SelectItem>
                                    <SelectItem value="custom">Custom Date</SelectItem>
                                  </SelectContent>
                                </Select>
                                {formData.repayment_unit === 'custom' ? (
                                  <Input
                                    type="text"
                                    placeholder="MM/DD/YYYY"
                                    value={formData.custom_due_date}
                                    onChange={(e) => handleInputChange('custom_due_date', e.target.value)}
                                  />
                                ) : (
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder={`Enter ${formData.repayment_unit}`}
                                    value={formData.repayment_period}
                                    onChange={(e) => handleInputChange('repayment_period', e.target.value)}
                                  />
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        <Button
                          type="submit"
                          disabled={isSubmitting || !formData.borrower_username || !formData.amount}
                          className="w-full bg-[#00A86B] hover:bg-[#0D9B76] text-white py-3 text-lg font-semibold"
                        >
                          {isSubmitting ? "Sending..." : "Send Loan Offer"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-4">
                  <Card className="text-white sticky top-6" style={{backgroundColor: '#35B276'}}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl">Loan Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {formData.purpose && (
                        <div className="pb-2 border-b border-green-400/50">
                          <span className="opacity-75 text-sm">For:</span>
                          <p className="font-medium">{formData.purpose}</p>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="opacity-90">Amount:</span>
                        <span className="font-bold">${parseFloat(formData.amount || 0).toLocaleString()}</span>
                      </div>
                      {loanType === 'scheduled' && (
                        <div className="flex justify-between">
                          <span className="opacity-90">Interest:</span>
                          <span className="font-bold">${details.totalInterest.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t border-green-400/50 pt-2">
                        <div className="flex justify-between text-lg">
                          <span>Total:</span>
                          <span className="font-bold">
                            ${loanType === 'flexible'
                              ? parseFloat(formData.amount || 0).toFixed(2)
                              : details.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Loan Type Toggle */}
                  <div className="bg-white/70 backdrop-blur-sm border border-slate-200/60 rounded-lg p-4">
                    <div className="flex items-center justify-center gap-4">
                      <span className={`text-sm font-medium ${loanType === 'flexible' ? 'text-[#00A86B]' : 'text-slate-400'}`}>
                        Flexible
                      </span>
                      <button
                        type="button"
                        onClick={() => setLoanType(loanType === 'flexible' ? 'scheduled' : 'flexible')}
                        className={`relative w-14 h-7 rounded-full transition-all ${
                          loanType === 'scheduled' ? 'bg-[#00A86B]' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                          loanType === 'scheduled' ? 'translate-x-7' : 'translate-x-0'
                        }`}>
                          {loanType === 'flexible' ? (
                            <Zap className="w-3 h-3 text-slate-500 m-1" />
                          ) : (
                            <ClipboardList className="w-3 h-3 text-[#00A86B] m-1" />
                          )}
                        </div>
                      </button>
                      <span className={`text-sm font-medium ${loanType === 'scheduled' ? 'text-[#00A86B]' : 'text-slate-400'}`}>
                        Scheduled
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {loanType === 'flexible'
                        ? "Casual loans, no interest or schedule"
                        : "Formal loans with interest and payments"}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'active' && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : activeLoans.length === 0 ? (
                  <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                    <CardContent className="py-12">
                      <div className="text-center text-slate-500">
                        <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No active loans to manage</p>
                        <Button
                          onClick={() => setActiveSection('create')}
                          className="mt-4 bg-[#00A86B] hover:bg-[#0D9B76]"
                        >
                          Create a Loan Offer
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Loan Selector Dropdown */}
                    <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <div className="w-8 h-8 rounded-full bg-[#E8FCF0] flex items-center justify-center">
                            <Settings className="w-4 h-4 text-[#00A86B]" />
                          </div>
                          Manage Loans
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select
                          value={manageLoanSelected?.id || ''}
                          onValueChange={(value) => {
                            const loan = activeLoans.find(l => l.id === value);
                            setManageLoanSelected(loan || null);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a loan to manage...">
                              {manageLoanSelected && (() => {
                                const borrower = publicProfiles.find(p => p.user_id === manageLoanSelected.borrower_id);
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#00A86B]">
                                        {borrower?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span>@{borrower?.username || 'user'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-[#00A86B] font-medium">${manageLoanSelected.amount?.toLocaleString()}</span>
                                    {manageLoanSelected.purpose && (
                                      <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500 truncate">{manageLoanSelected.purpose}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {activeLoans.map((loan) => {
                              const borrower = publicProfiles.find(p => p.user_id === loan.borrower_id);
                              return (
                                <SelectItem key={loan.id} value={loan.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#00A86B]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#00A86B]">
                                        {borrower?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span>@{borrower?.username || 'user'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-[#00A86B] font-medium">${loan.amount?.toLocaleString()}</span>
                                    {loan.purpose && (
                                      <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-500">{loan.purpose}</span>
                                      </>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Loan Details - Below Dropdown */}
                    {!manageLoanSelected ? (
                      <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                        <CardContent className="flex items-center justify-center py-16">
                          <div className="text-center text-slate-400">
                            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Select a loan above to view payment history</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                          {/* Payment History Bar Chart */}
                          <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-base">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                  <BarChart3 className="w-4 h-4 text-blue-600" />
                                </div>
                                Payment History
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              {(() => {
                                const loan = manageLoanSelected;
                                const totalOwed = loan.total_amount || loan.amount || 0;
                                const amountPaid = loan.amount_paid || 0;
                                const frequency = loan.payment_frequency || 'monthly';
                                const period = loan.repayment_period || 6;
                                const unit = loan.repayment_unit || 'months';

                                // Generate payment periods for the chart
                                const generatePeriodLabels = () => {
                                  const labels = [];
                                  const startDate = new Date(loan.created_at || new Date());

                                  let numPeriods = period;
                                  if (frequency === 'daily') numPeriods = Math.min(period, 14);
                                  else if (frequency === 'weekly') numPeriods = Math.min(Math.ceil(period / 7), 12);
                                  else if (frequency === 'biweekly') numPeriods = Math.min(Math.ceil(period / 14), 12);
                                  else numPeriods = Math.min(period, 12);

                                  for (let i = 0; i < numPeriods; i++) {
                                    const date = new Date(startDate);
                                    if (frequency === 'daily') {
                                      date.setDate(date.getDate() + i);
                                      labels.push(format(date, 'MMM d'));
                                    } else if (frequency === 'weekly') {
                                      date.setDate(date.getDate() + (i * 7));
                                      const endDate = new Date(date);
                                      endDate.setDate(endDate.getDate() + 6);
                                      labels.push(`${format(date, 'M/d')}-${format(endDate, 'M/d')}`);
                                    } else if (frequency === 'biweekly') {
                                      date.setDate(date.getDate() + (i * 14));
                                      const endDate = new Date(date);
                                      endDate.setDate(endDate.getDate() + 13);
                                      labels.push(`${format(date, 'M/d')}-${format(endDate, 'M/d')}`);
                                    } else {
                                      date.setMonth(date.getMonth() + i);
                                      labels.push(format(date, 'MMM'));
                                    }
                                  }
                                  return labels;
                                };

                                const labels = generatePeriodLabels();
                                const paymentAmount = loan.payment_amount || (totalOwed / labels.length);

                                // Simulate which payments have been made (based on amount_paid)
                                const paidPeriods = Math.floor(amountPaid / paymentAmount);

                                // Calculate the expected payment line position (as percentage of chart height)
                                // This represents where the expected payment amount should be on the y-axis
                                const maxBarValue = paymentAmount; // Each bar represents one payment period
                                const expectedLinePercent = 100; // 100% because payment amount equals full bar height

                                return (
                                  <div className="space-y-4">
                                    <div className="flex">
                                      {/* Y-axis labels */}
                                      <div className="flex flex-col justify-between h-32 pr-2 text-[9px] text-slate-400 text-right w-12">
                                        <span>${paymentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span>${(paymentAmount / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        <span>$0</span>
                                      </div>

                                      {/* Chart area */}
                                      <div className="flex-1 relative">
                                        {/* Dashed line at expected payment amount - positioned at top of bar area */}
                                        <div
                                          className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500 z-10 flex items-center"
                                          style={{ top: '0px' }}
                                        >
                                          <span className="absolute -right-1 -top-3 text-[9px] text-amber-600 font-medium bg-white px-1 rounded whitespace-nowrap">
                                            Expected: ${paymentAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                          </span>
                                        </div>

                                        {/* Bars */}
                                        <div className="flex items-end gap-1 h-32">
                                          {labels.map((label, index) => {
                                            const isPaid = index < paidPeriods;
                                            const isPartial = index === paidPeriods && (amountPaid % paymentAmount) > 0;
                                            const partialPercent = isPartial ? ((amountPaid % paymentAmount) / paymentAmount) * 100 : 0;

                                            return (
                                              <div key={index} className="flex-1 flex flex-col items-center gap-1 h-full">
                                                <div className="w-full flex-1 bg-slate-100 rounded-t relative flex items-end">
                                                  <div
                                                    className={`w-full rounded-t transition-all duration-300 ${
                                                      isPaid ? 'bg-[#00A86B]' : isPartial ? 'bg-[#00A86B]/50' : 'bg-slate-200'
                                                    }`}
                                                    style={{ height: isPaid ? '100%' : isPartial ? `${partialPercent}%` : '10%' }}
                                                  />
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>

                                        {/* X-axis labels */}
                                        <div className="flex gap-1 mt-1">
                                          {labels.map((label, index) => (
                                            <div key={index} className="flex-1 text-center">
                                              <span className="text-[10px] text-slate-500 leading-tight">
                                                {label}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-center gap-4 text-xs">
                                      <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-[#00A86B] rounded" />
                                        <span className="text-slate-600">Paid</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 bg-slate-200 rounded" />
                                        <span className="text-slate-600">Upcoming</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-6 h-0 border-t-2 border-dashed border-amber-500" />
                                        <span className="text-slate-600">Expected Payment</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </CardContent>
                          </Card>

                          {/* Loan Info Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                              <CardContent className="p-3">
                                <p className="text-xs text-slate-500 mb-1">Total Loan Amount</p>
                                <p className="text-lg font-bold text-slate-800">
                                  ${(manageLoanSelected.total_amount || manageLoanSelected.amount || 0).toLocaleString()}
                                </p>
                              </CardContent>
                            </Card>
                            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                              <CardContent className="p-3">
                                <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                                <p className="text-lg font-bold text-[#00A86B]">
                                  ${(manageLoanSelected.amount_paid || 0).toLocaleString()}
                                </p>
                              </CardContent>
                            </Card>
                            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                              <CardContent className="p-3">
                                <p className="text-xs text-slate-500 mb-1">Next Payment Date</p>
                                <p className="text-lg font-bold text-slate-800">
                                  {manageLoanSelected.next_payment_date
                                    ? format(new Date(manageLoanSelected.next_payment_date), 'MMM d')
                                    : 'N/A'}
                                </p>
                              </CardContent>
                            </Card>
                            <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                              <CardContent className="p-3">
                                <p className="text-xs text-slate-500 mb-1">Percentage Paid</p>
                                <p className="text-lg font-bold text-[#00A86B]">
                                  {(() => {
                                    const total = manageLoanSelected.total_amount || manageLoanSelected.amount || 0;
                                    const paid = manageLoanSelected.amount_paid || 0;
                                    return total > 0 ? Math.round((paid / total) * 100) : 0;
                                  })()}%
                                </p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3">
                            <Button
                              onClick={() => handleMakePayment(manageLoanSelected)}
                              className="flex-1 min-w-[140px] bg-[#00A86B] hover:bg-[#0D9B76]"
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Record Payment
                            </Button>
                            <Button
                              onClick={() => handleEditLoan(manageLoanSelected)}
                              variant="outline"
                              className="flex-1 min-w-[140px] border-amber-500 text-amber-600 hover:bg-amber-50"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Loan
                            </Button>
                            <Button
                              onClick={() => handleViewDetails(manageLoanSelected)}
                              variant="outline"
                              className="flex-1 min-w-[140px]"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View Full Details
                            </Button>
                          </div>
                        </>
                      )}
                  </div>
                )}
              </motion.div>
            )}

            {activeSection === 'offers' && (
              <motion.div
                key="offers"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Send className="w-4 h-4 text-blue-600" />
                      </div>
                      Pending Offers Sent
                    </CardTitle>
                    <p className="text-sm text-slate-500">Loan offers waiting for acceptance</p>
                  </CardHeader>
                  <CardContent>
                    {pendingOffers.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No pending offers</p>
                      </div>
                    ) : (
                      <MyLoanOffers
                        offers={pendingOffers}
                        users={publicProfiles}
                        currentUser={currentUser}
                        onDelete={handleDeleteOffer}
                        hideHeader={true}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeSection === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/70 backdrop-blur-sm border-slate-200/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-slate-600" />
                      </div>
                      Loan History
                    </CardTitle>
                    <p className="text-sm text-slate-500">Completed and cancelled loans</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {completedLoans.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No loan history yet</p>
                      </div>
                    ) : (
                      completedLoans.map((loan, index) => (
                        <motion.div
                          key={loan.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <LoanCard
                            loan={loan}
                            type="lent"
                            onDetails={() => handleViewDetails(loan)}
                          />
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && selectedLoan && (
        <RecordPaymentModal
          loan={selectedLoan}
          onClose={() => setShowPaymentModal(false)}
          onPaymentComplete={handlePaymentComplete}
          isLender={true}
        />
      )}

      {showDetailsModal && selectedLoanDetails && (
        <LoanDetailsModal
          loan={selectedLoanDetails.loan}
          type="lent"
          isOpen={showDetailsModal}
          user={currentUser}
          onCancel={() => handleCancelLoan(selectedLoanDetails.loan)}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLoanDetails(null);
          }}
        />
      )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this loan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Loan</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelLoan} className="bg-red-600 hover:bg-red-700">
              Cancel Loan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Loan Modal */}
      {showEditLoanModal && editLoanData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Edit Loan Contract</h2>
                    <p className="text-sm text-slate-500">Changes will be sent to borrower for approval</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEditLoanModal(false);
                    setEditLoanData(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Warning Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Contract Modification Notice</p>
                    <p className="text-amber-700">All changes will be recorded in the loan history and the borrower will need to approve the new terms.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Loan Amount */}
                <div className="space-y-2">
                  <Label htmlFor="edit-amount" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    Loan Amount
                  </Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editLoanData.amount}
                    onChange={(e) => setEditLoanData(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-2">
                  <Label htmlFor="edit-interest" className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-600" />
                    Interest Rate (% per year)
                  </Label>
                  <Input
                    id="edit-interest"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={editLoanData.interest_rate}
                    onChange={(e) => setEditLoanData(prev => ({ ...prev, interest_rate: e.target.value }))}
                  />
                </div>

                {/* Repayment Period */}
                <div className="space-y-2">
                  <Label htmlFor="edit-period" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Repayment Period (months)
                  </Label>
                  <Input
                    id="edit-period"
                    type="number"
                    min="1"
                    value={editLoanData.repayment_period}
                    onChange={(e) => setEditLoanData(prev => ({ ...prev, repayment_period: e.target.value }))}
                  />
                </div>

                {/* Payment Frequency */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Payment Frequency
                  </Label>
                  <Select
                    value={editLoanData.payment_frequency}
                    onValueChange={(value) => setEditLoanData(prev => ({ ...prev, payment_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="edit-due-date" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Due Date
                  </Label>
                  <Input
                    id="edit-due-date"
                    type="date"
                    value={editLoanData.due_date || ''}
                    onChange={(e) => setEditLoanData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>

                {/* Purpose */}
                <div className="space-y-2">
                  <Label htmlFor="edit-purpose" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Purpose
                  </Label>
                  <Input
                    id="edit-purpose"
                    type="text"
                    value={editLoanData.purpose}
                    onChange={(e) => setEditLoanData(prev => ({ ...prev, purpose: e.target.value }))}
                    maxLength={100}
                  />
                </div>

                {/* Notes for Borrower */}
                <div className="space-y-2">
                  <Label htmlFor="edit-notes" className="flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-600" />
                    Notes for Borrower (optional)
                  </Label>
                  <textarea
                    id="edit-notes"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    rows={3}
                    placeholder="Explain why you're making these changes..."
                    value={editLoanData.notes}
                    onChange={(e) => setEditLoanData(prev => ({ ...prev, notes: e.target.value }))}
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200">
                <Button
                  onClick={() => {
                    setShowEditLoanModal(false);
                    setEditLoanData(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditLoan}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save & Send to Borrower
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
