import React, { useState, useEffect, useRef } from "react";
import { Loan, LoanAgreement, User, PublicProfile, Friendship } from "@/entities/all";
import { supabase } from '@/lib/supabaseClient';
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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import {
  DollarSign, Calendar, Percent, FileText, User as UserIcon,
  AlertCircle, Zap, ClipboardList, Send, Clock,
  TrendingUp, Pencil, X, Save, History, PlusCircle, Settings, BarChart3,
  Download, CheckCircle, FolderOpen, Info, UserPlus, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addMonths, addWeeks, addDays, format, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { jsPDF } from "jspdf";
import { formatMoney } from "@/components/utils/formatMoney";
import { toLocalDate, getLocalToday, daysUntil as daysUntilDate, daysBetween } from "@/components/utils/dateUtils";
import SidebarBottomSection from '../components/SidebarBottomSection';
import MeshMobileNav from "@/components/MeshMobileNav";
import UserAvatar from "@/components/ui/UserAvatar";

const STAR_CIRCLES = [
  {cx:82,cy:45,o:0.7},{cx:195,cy:112,o:0.5},{cx:310,cy:28,o:0.8},{cx:420,cy:198,o:0.4},
  {cx:530,cy:67,o:0.65},{cx:640,cy:245,o:0.55},{cx:755,cy:88,o:0.75},{cx:860,cy:156,o:0.45},
  {cx:970,cy:34,o:0.7},{cx:1085,cy:201,o:0.6},{cx:1190,cy:78,o:0.5},{cx:1300,cy:267,o:0.7},
  {cx:1410,cy:45,o:0.55},{cx:1520,cy:134,o:0.65},{cx:48,cy:189,o:0.4},{cx:158,cy:278,o:0.6},
  {cx:268,cy:156,o:0.5},{cx:378,cy:89,o:0.7},{cx:488,cy:234,o:0.45},{cx:598,cy:145,o:0.6},
  {cx:708,cy:312,o:0.35},{cx:818,cy:56,o:0.75},{cx:928,cy:223,o:0.5},{cx:1038,cy:98,o:0.65},
  {cx:1148,cy:289,o:0.4},{cx:1258,cy:167,o:0.7},{cx:1368,cy:234,o:0.55},{cx:1478,cy:78,o:0.6},
  {cx:1560,cy:256,o:0.45},{cx:125,cy:312,o:0.5},{cx:345,cy:267,o:0.6},{cx:565,cy:34,o:0.75},
  {cx:685,cy:178,o:0.4},{cx:905,cy:289,o:0.55},{cx:1125,cy:45,o:0.7},{cx:1345,cy:145,o:0.5},
];

export default function Lending({ initialTab }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingLoanData, setPendingLoanData] = useState(null);
  const [loanType, setLoanType] = useState('scheduled');
  const [loans, setLoans] = useState([]);
  const [publicProfiles, setPublicProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [loanToCancel, setLoanToCancel] = useState(null);
  const [activeSection, setActiveSection] = useState(() => {
    if (initialTab && ['lending', 'create', 'active'].includes(initialTab)) return initialTab;
    const tab = searchParams.get('tab');
    return ['lending', 'create', 'active'].includes(tab) ? tab : 'lending';
  }); // 'lending', 'create', 'active'

  const [manageLoanSelected, setManageLoanSelected] = useState(null);
  const [showEditLoanModal, setShowEditLoanModal] = useState(false);
  const [editLoanData, setEditLoanData] = useState(null);
  const [loanAgreements, setLoanAgreements] = useState([]);
  const [activeDocPopup, setActiveDocPopup] = useState(null); // 'promissory', 'amortization', 'summary'
  const [docPopupAgreement, setDocPopupAgreement] = useState(null);
  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null); // 'promissory' or 'amortization'
  const [friendships, setFriendships] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayFromPerson, setQuickPayFromPerson] = useState('');
  const [quickPayToPerson, setQuickPayToPerson] = useState('');
  const [allUserLoans, setAllUserLoans] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [showLoanSentModal, setShowLoanSentModal] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteRef = useRef(null);

  // Close invite dropdown on outside click
  useEffect(() => {
    if (!inviteOpen) return;
    const handler = (e) => { if (inviteRef.current && !inviteRef.current.contains(e.target)) setInviteOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inviteOpen]);

  // Typing animation for purpose placeholder
  const [purposePlaceholder, setPurposePlaceholder] = useState('');
  const purposeAnimRef = useRef({ termIndex: 0, charIndex: 0, isDeleting: false, timeoutId: null });
  const PURPOSE_TERMS = ['medical bills', 'car repairs', 'help with rent', 'travel expenses', 'bills'];

  useEffect(() => {
    const animate = () => {
      const ref = purposeAnimRef.current;
      const currentTerm = PURPOSE_TERMS[ref.termIndex];

      if (!ref.isDeleting) {
        // Typing forward
        ref.charIndex++;
        setPurposePlaceholder(`e.g., ${currentTerm.slice(0, ref.charIndex)}...`);

        if (ref.charIndex >= currentTerm.length) {
          // Pause at full word, then start deleting
          ref.timeoutId = setTimeout(() => {
            ref.isDeleting = true;
            ref.timeoutId = setTimeout(animate, 60);
          }, 2000);
          return;
        }
        ref.timeoutId = setTimeout(animate, 80);
      } else {
        // Deleting
        ref.charIndex--;
        if (ref.charIndex <= 0) {
          ref.isDeleting = false;
          ref.charIndex = 0;
          ref.termIndex = (ref.termIndex + 1) % PURPOSE_TERMS.length;
          ref.timeoutId = setTimeout(animate, 400);
          return;
        }
        setPurposePlaceholder(`e.g., ${currentTerm.slice(0, ref.charIndex)}...`);
        ref.timeoutId = setTimeout(animate, 40);
      }
    };

    animate();

    return () => {
      if (purposeAnimRef.current.timeoutId) {
        clearTimeout(purposeAnimRef.current.timeoutId);
      }
    };
  }, []);

  const [formData, setFormData] = useState({
    lender_username: '',
    borrower_username: '',
    amount: '',
    interest_rate: '',
    repayment_period: '',
    repayment_unit: 'months',
    custom_due_date: '',
    payment_frequency: 'monthly',
    purpose: '',
    is_repeating: false,
    repeating_frequency: 'weekly',
    repeating_day_of_week: 'monday',
    repeating_day_of_month: '1',
    repeating_time: '12:00',
    repeating_timezone: 'EST',
    repeating_start_date: '',
    repeating_num_payments: '',
    first_payment_date: '',
    lender_send_funds_date: '',
    loan_day_of_week: 'monday',
    loan_day_of_month: '1',
    loan_time: '12:00',
    loan_timezone: 'EST'
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

      const [allLoans, profiles, agreements, allFriendships] = await Promise.all([
        Loan.list('-created_at').catch(() => []),
        PublicProfile.list().catch(() => []),
        LoanAgreement.list().catch(() => []),
        Friendship.list().catch(() => [])
      ]);

      setLoans(allLoans || []);
      // Store all user loans (lending + borrowing) for record payment dropdowns
      const allMyLoans = (allLoans || []).filter(loan =>
        loan.borrower_id === user.id || loan.lender_id === user.id
      );
      setAllUserLoans(allMyLoans);
      setPublicProfiles(profiles || []);
      setLoanAgreements(agreements || []);
      setFriendships(allFriendships || []);

      // Get accepted friendships where user is either user_id or friend_id
      const acceptedFriendships = (allFriendships || []).filter(f =>
        f.status === 'accepted' &&
        (f.user_id === user.id || f.friend_id === user.id)
      );

      // Get friend user IDs
      const friendUserIds = acceptedFriendships.map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Filter profiles to only show friends, sorted with starred first
      const friendProfiles = (profiles || []).filter(p =>
        p && friendUserIds.includes(p.user_id)
      ).map(p => {
        const friendship = acceptedFriendships.find(f =>
          f.user_id === p.user_id || f.friend_id === p.user_id
        );
        return { ...p, is_starred: friendship?.is_starred || false };
      }).sort((a, b) => {
        // Starred friends first
        if (a.is_starred && !b.is_starred) return -1;
        if (!a.is_starred && b.is_starred) return 1;
        // Then alphabetically
        return (a.full_name || a.username || '').localeCompare(b.full_name || b.username || '');
      });

      setFriends(friendProfiles);
      setUsers(friendProfiles);

      // Store current user's profile for lender/borrower selection
      const myProfile = (profiles || []).find(p => p.user_id === user.id);
      setCurrentUserProfile(myProfile || null);
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
      const diffDays = Math.abs(daysUntilDate(formData.custom_due_date));
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
      return { totalAmount, paymentAmount, monthlyPayment: paymentAmount, totalInterest: totalAmount - amount };
    }
    return { totalAmount: 0, paymentAmount: 0, monthlyPayment: 0, totalInterest: 0 };
  };

  // Determine user role based on lender/borrower selection
  const isUserLender = !!(formData.lender_username && currentUserProfile && formData.lender_username === currentUserProfile.username);
  const isUserBorrower = !!(formData.borrower_username && currentUserProfile && formData.borrower_username === currentUserProfile.username);

  // Build users list with self at top, starred friends next, then other friends
  const usersWithSelf = React.useMemo(() => {
    const list = [];
    if (currentUserProfile) {
      list.push({ ...currentUserProfile, _isSelf: true, full_name: `${currentUserProfile.full_name || currentUserProfile.username} (You)` });
    }
    list.push(...users);
    return list;
  }, [currentUserProfile, users]);

  // All users appear in both dropdowns — selection logic handles swapping
  const lenderUsers = usersWithSelf;
  const borrowerUsers = usersWithSelf;

  const selfUsername = currentUserProfile?.username || '';

  const handleLenderSelect = (username) => {
    let newBorrower = formData.borrower_username;

    // If selected person is already the borrower → swap: they become lender, clear borrower
    if (username === newBorrower) {
      newBorrower = '';
    }

    // If the previous lender was the current user and we're now replacing them → auto-set user as borrower
    if (formData.lender_username === selfUsername && username !== selfUsername) {
      newBorrower = selfUsername;
    }

    // If selected person is not self and borrower is still empty → auto-fill self as borrower
    if (username !== selfUsername && !newBorrower) {
      newBorrower = selfUsername;
    }

    setFormData(prev => ({ ...prev, lender_username: username, borrower_username: newBorrower }));
  };

  const handleBorrowerSelect = (username) => {
    let newLender = formData.lender_username;

    // If selected person is already the lender → swap: they become borrower, clear lender
    if (username === newLender) {
      newLender = '';
    }

    // If the previous borrower was the current user and we're now replacing them → auto-set user as lender
    if (formData.borrower_username === selfUsername && username !== selfUsername) {
      newLender = selfUsername;
    }

    // If selected person is not self and lender is still empty → auto-fill self as lender
    if (username !== selfUsername && !newLender) {
      newLender = selfUsername;
    }

    setFormData(prev => ({ ...prev, lender_username: newLender, borrower_username: username }));
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

      if (!formData.lender_username.trim()) {
        alert("Please select a lender.");
        setIsSubmitting(false);
        return;
      }

      if (!formData.borrower_username.trim()) {
        alert("Please select a borrower.");
        setIsSubmitting(false);
        return;
      }

      if (formData.lender_username.trim() === formData.borrower_username.trim()) {
        alert("The lender and borrower cannot be the same person.");
        setIsSubmitting(false);
        return;
      }

      // Determine which person is the "other" (not the current user)
      const isCurrentUserTheLender = currentUserProfile && formData.lender_username.trim() === currentUserProfile.username;
      const otherUsername = isCurrentUserTheLender ? formData.borrower_username.trim() : formData.lender_username.trim();
      const otherProfile = await findUserByUsername(otherUsername);

      if (!otherProfile || !otherProfile.user_id) {
        alert(`User "${otherUsername}" could not be found.`);
        setIsSubmitting(false);
        return;
      }

      const lenderId = isCurrentUserTheLender ? currentUser.id : otherProfile.user_id;
      const borrowerId = isCurrentUserTheLender ? otherProfile.user_id : currentUser.id;

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

      const lenderName = isCurrentUserTheLender ? (currentUser.full_name || currentUserProfile?.username || 'Lender') : (otherProfile.full_name || otherUsername);
      const borrowerName = isCurrentUserTheLender ? (otherProfile.full_name || otherUsername) : (currentUser.full_name || currentUserProfile?.username || 'Borrower');

      const loanData = {
        lender_id: lenderId,
        borrower_id: borrowerId,
        lenderName,
        borrowerName,
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
      // Strip fields that aren't columns in loans table
      const { repayment_unit, borrowerName, lenderName, ...loanPayload } = pendingLoanData;
      const createdLoan = await Loan.create(loanPayload);

      const agreementPayload = {
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
      };
      // Try direct insert (works when auth.uid() = lender_id).
      // Fall back to edge function for borrower-initiated loans.
      // Either way, never block the loan creation flow on agreement errors.
      try {
        const { error: directError } = await supabase.from('loan_agreements').insert(agreementPayload);
        if (directError) {
          try {
            await supabase.functions.invoke('create-loan-agreement', { body: agreementPayload });
          } catch (_) {
            console.warn('Agreement record could not be saved:', directError.message);
          }
        }
      } catch (_) {
        // Agreement is supplementary — loan proceeds regardless
      }

      setShowSignatureModal(false);
      setFormData({
        lender_username: '',
        borrower_username: '',
        amount: '',
        interest_rate: '',
        repayment_period: '',
        repayment_unit: 'months',
        custom_due_date: '',
        payment_frequency: 'monthly',
        purpose: ''
      });
      setShowLoanSentModal(true);
      await loadData();
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
  const manageableLoans = lentLoans.filter(loan => loan.status === 'active' || loan.status === 'cancelled');
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

  // Get loan agreement for a specific loan
  const getAgreementForLoan = (loanId) => {
    return loanAgreements.find(a => a.loan_id === loanId);
  };

  // Get user by ID
  const getUserById = (userId) => {
    const profile = publicProfiles.find(p => p.user_id === userId);
    return profile || { username: 'user', full_name: 'Unknown User' };
  };

  // Record Payment box renderer (shared across all sections)
  const renderRecordPaymentBox = (extraClassName = '') => {
    if (activeLoans.length === 0) return null;
    const allActiveLoans = allUserLoans.filter(l => l.status === 'active');
    // "From" options: people who owe you money (borrowers in your lending loans)
    const lendingLoans = allActiveLoans.filter(l => l.lender_id === currentUser?.id);
    const fromBorrowerIds = [...new Set(lendingLoans.map(l => l.borrower_id))];
    const fromOptions = fromBorrowerIds.map(bId => {
      const profile = getUserById(bId);
      return { userId: bId, username: profile?.username || 'user', fullName: profile?.full_name || 'Unknown' };
    });
    // "To" options: people you owe money to (lenders in your borrowing loans)
    const borrowingLoans = allActiveLoans.filter(l => l.borrower_id === currentUser?.id);
    const toLenderIds = [...new Set(borrowingLoans.map(l => l.lender_id))];
    const toOptions = toLenderIds.map(lId => {
      const profile = getUserById(lId);
      return { userId: lId, username: profile?.username || 'user', fullName: profile?.full_name || 'Unknown' };
    });
    // Add self to both lists (at top)
    const selfProfile = getUserById(currentUser?.id);
    const selfOption = { userId: currentUser?.id, username: selfProfile?.username || 'you', fullName: selfProfile?.full_name || 'You' };
    const fromListWithSelf = [selfOption, ...fromOptions.filter(o => o.userId !== currentUser?.id)];
    const toListWithSelf = [selfOption, ...toOptions.filter(o => o.userId !== currentUser?.id)];
    // Filter out selected person from the other dropdown
    const filteredFromOptions = quickPayToPerson ? fromListWithSelf.filter(o => o.userId !== quickPayToPerson) : fromListWithSelf;
    const filteredToOptions = quickPayFromPerson ? toListWithSelf.filter(o => o.userId !== quickPayFromPerson) : toListWithSelf;

    const handleRecordSubmit = () => {
      let matchingLoans = [];
      if (quickPayFromPerson && quickPayToPerson) {
        matchingLoans = allActiveLoans.filter(l =>
          (l.borrower_id === quickPayFromPerson && l.lender_id === quickPayToPerson) ||
          (l.borrower_id === quickPayToPerson && l.lender_id === quickPayFromPerson)
        );
      } else if (quickPayFromPerson) {
        matchingLoans = allActiveLoans.filter(l =>
          l.borrower_id === quickPayFromPerson || l.lender_id === quickPayFromPerson
        );
      } else if (quickPayToPerson) {
        matchingLoans = allActiveLoans.filter(l =>
          l.borrower_id === quickPayToPerson || l.lender_id === quickPayToPerson
        );
      }
      if (matchingLoans.length === 1) {
        setSelectedLoan({ ...matchingLoans[0], _prefillAmount: quickPayAmount });
        setShowPaymentModal(true);
      } else if (matchingLoans.length > 1) {
        setSelectedLoan({ ...matchingLoans[0], _prefillAmount: quickPayAmount, _candidateLoans: matchingLoans });
        setShowPaymentModal(true);
      }
    };
    const canSubmit = quickPayAmount && (quickPayFromPerson || quickPayToPerson);

    return (
      <div className={`bg-[#2563EB]/10 rounded-2xl p-5 border-0 ${extraClassName}`}>
        <p className="text-[11px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          Record Payment
        </p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          <span>Record payment of</span>
          <span className="font-medium">$</span>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            placeholder=""
            value={quickPayAmount}
            onChange={(e) => setQuickPayAmount(e.target.value)}
            className="w-24 h-8 px-3 bg-white/80 inline-flex border-0 shadow-none"
            style={{ MozAppearance: 'textfield' }}
          />
          <span>from</span>
          <Select
            value={quickPayFromPerson}
            onValueChange={(val) => {
              setQuickPayFromPerson(val);
              if (val === quickPayToPerson) setQuickPayToPerson('');
            }}
          >
            <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
              <SelectValue placeholder="select person" />
            </SelectTrigger>
            <SelectContent>
              {filteredFromOptions.map((person) => (
                <SelectItem key={person.userId} value={person.userId}>
                  {person.full_name || person.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>to</span>
          <Select
            value={quickPayToPerson}
            onValueChange={(val) => {
              setQuickPayToPerson(val);
              if (val === quickPayFromPerson) setQuickPayFromPerson('');
            }}
          >
            <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
              <SelectValue placeholder="select person" />
            </SelectTrigger>
            <SelectContent>
              {filteredToOptions.map((person) => (
                <SelectItem key={person.userId} value={person.userId}>
                  {person.full_name || person.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={handleRecordSubmit}
            disabled={!canSubmit}
            className={`h-8 px-4 rounded-lg text-sm font-medium border-0 transition-all ${
              !canSubmit
                ? 'bg-[#03ACEA]/50 text-white/70 cursor-not-allowed'
                : 'bg-[#03ACEA] text-white hover:bg-[#5a7ae0]'
            }`}
          >
            Submit
          </Button>
        </div>
      </div>
    );
  };

  // Generate amortization schedule
  const generateAmortizationSchedule = (agreement) => {
    const schedule = [];
    const loanAmount = agreement.amount || 0;
    const frequency = agreement.payment_frequency || 'monthly';
    const annualRate = agreement.interest_rate || 0;

    if (loanAmount <= 0) return schedule;

    // Convert repayment period to total months
    const repaymentPeriod = agreement.repayment_period || 1;
    const repaymentUnit = agreement.repayment_unit || 'months';
    let totalMonths = repaymentPeriod;
    if (repaymentUnit === 'years') totalMonths = repaymentPeriod * 12;
    else if (repaymentUnit === 'weeks') totalMonths = repaymentPeriod / 4.333;

    // Total number of payments based on frequency
    let totalPayments;
    if (frequency === 'weekly') totalPayments = Math.round(totalMonths * 4.333);
    else if (frequency === 'biweekly') totalPayments = Math.round(totalMonths * 2.167);
    else if (frequency === 'daily') totalPayments = Math.round(totalMonths * 30.417);
    else totalPayments = Math.round(totalMonths);

    if (totalPayments <= 0) totalPayments = 1;

    // Periodic interest rate
    let periodsPerYear = 12;
    if (frequency === 'weekly') periodsPerYear = 52;
    else if (frequency === 'biweekly') periodsPerYear = 26;
    else if (frequency === 'daily') periodsPerYear = 365;

    const r = annualRate > 0 ? (annualRate / 100) / periodsPerYear : 0;

    // Payment using amortization formula: P = L * r / (1 - (1 + r)^(-n))
    // Keep raw (unrounded) for accurate schedule computation
    let rawPayment;
    if (r > 0) {
      rawPayment = loanAmount * r / (1 - Math.pow(1 + r, -totalPayments));
    } else {
      rawPayment = loanAmount / totalPayments;
    }

    let balance = loanAmount;
    let currentDate = new Date(agreement.created_at);
    let principalToDate = 0;
    let interestToDate = 0;

    for (let i = 1; i <= totalPayments; i++) {
      if (frequency === 'weekly') currentDate = addWeeks(currentDate, 1);
      else if (frequency === 'biweekly') currentDate = addWeeks(currentDate, 2);
      else if (frequency === 'daily') currentDate = addDays(currentDate, 1);
      else currentDate = addMonths(currentDate, 1);

      const startingBalance = balance;
      const interest = Math.round(balance * r * 100) / 100;
      let principal;

      if (i === totalPayments) {
        // Final payment: pay off remaining balance
        principal = balance;
        balance = 0;
      } else {
        // New balance = round(oldBalance * (1 + r) - payment, 2)
        const newBalance = Math.round((balance * (1 + r) - rawPayment) * 100) / 100;
        principal = Math.round((startingBalance - newBalance) * 100) / 100;
        balance = newBalance;
      }

      principalToDate = Math.round((principalToDate + principal) * 100) / 100;
      interestToDate = Math.round((interestToDate + interest) * 100) / 100;

      schedule.push({
        number: i,
        date: new Date(currentDate),
        startingBalance,
        principal,
        interest,
        principalToDate,
        interestToDate,
        endingBalance: balance
      });
    }

    return schedule;
  };

  // Download Promissory Note PDF
  const downloadPromissoryNote = (agreement) => {
    const doc = new jsPDF();
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('PROMISSORY NOTE', 105, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Document ID: ${agreement.id}`, 105, 35, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(11);
    doc.text(`Date: ${format(new Date(agreement.created_at), 'MMMM d, yyyy')}`, 20, 50);
    doc.text(`Location: United States`, 20, 58);

    doc.setFillColor(240, 240, 240);
    doc.rect(20, 68, 170, 25, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('PRINCIPAL AMOUNT', 25, 78);
    doc.setFontSize(20);
    doc.text(formatMoney(agreement.amount), 25, 88);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    let yPos = 105;
    const promiseText = `${lenderInfo.full_name} agrees to lend ${borrowerInfo.full_name} ${formatMoney(agreement.amount)}${agreement.purpose ? ` for ${agreement.purpose}` : ''}, with ${agreement.interest_rate}% interest. ${borrowerInfo.full_name} agrees to pay back ${formatMoney(agreement.total_amount)} in ${agreement.payment_frequency} payments of ${formatMoney(agreement.payment_amount)} over ${agreement.repayment_period} ${agreement.repayment_unit || 'months'}.`;
    const promiseLines = doc.splitTextToSize(promiseText, 170);
    doc.text(promiseLines, 20, yPos);
    yPos += promiseLines.length * 6 + 10;

    doc.setFont(undefined, 'bold');
    doc.text('TERMS OF REPAYMENT:', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');

    const terms = [
      `Total Amount Due: ${formatMoney(agreement.total_amount)}`,
      `Interest Rate: ${agreement.interest_rate}% per annum`,
      `Payment Amount: ${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}`,
      `Repayment Period: ${agreement.repayment_period} ${agreement.repayment_unit || 'months'}`,
      `Due Date: ${agreement.due_date ? format(new Date(agreement.due_date), 'MMMM d, yyyy') : 'As per payment schedule'}`,
    ];

    terms.forEach(term => {
      doc.text(`• ${term}`, 25, yPos);
      yPos += 7;
    });

    if (agreement.purpose) {
      yPos += 5;
      doc.text(`Purpose: ${agreement.purpose}`, 20, yPos);
      yPos += 10;
    }

    yPos += 5;
    doc.setFont(undefined, 'bold');
    doc.text('DEFAULT:', 20, yPos);
    yPos += 8;
    doc.setFont(undefined, 'normal');
    const defaultText = 'In the event of default in payment of any installment when due, the entire unpaid balance shall, at the option of the Lender, become immediately due and payable.';
    const defaultLines = doc.splitTextToSize(defaultText, 170);
    doc.text(defaultLines, 20, yPos);
    yPos += defaultLines.length * 6 + 15;

    doc.setFont(undefined, 'bold');
    doc.text('SIGNATURES:', 20, yPos);
    yPos += 12;

    doc.setFont(undefined, 'normal');
    doc.text('Borrower:', 20, yPos);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(16);
    doc.text(agreement.borrower_name || borrowerInfo.full_name, 20, yPos + 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    if (agreement.borrower_signed_date) {
      doc.text(`Signed: ${format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy h:mm a')}`, 20, yPos + 18);
    }

    doc.setFontSize(11);
    doc.text('Lender:', 120, yPos);
    doc.setFont(undefined, 'italic');
    doc.setFontSize(16);
    doc.text(agreement.lender_name || lenderInfo.full_name, 120, yPos + 10);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    if (agreement.lender_signed_date) {
      doc.text(`Signed: ${format(new Date(agreement.lender_signed_date), 'MMM d, yyyy h:mm a')}`, 120, yPos + 18);
    }

    if (agreement.contract_modified && agreement.modification_history) {
      const modifications = JSON.parse(agreement.modification_history || '[]');
      modifications.forEach((mod, index) => {
        doc.addPage();
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(`AMENDMENT ${index + 1}`, 105, 25, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Date of Amendment: ${mod.date ? format(new Date(mod.date), 'MMMM d, yyyy') : 'N/A'}`, 20, 45);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('CHANGES:', 20, 60);
        doc.setFont(undefined, 'normal');
        let modYPos = 70;
        const changeLines = doc.splitTextToSize(mod.changes || 'No changes recorded', 170);
        doc.text(changeLines, 20, modYPos);
      });
    }

    doc.save(`promissory-note-${agreement.id}.pdf`);
  };

  // Download Amortization Schedule PDF
  const downloadAmortizationSchedule = (agreement) => {
    const doc = new jsPDF('landscape');
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const schedule = generateAmortizationSchedule(agreement);

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('AMORTIZATION SCHEDULE', 148.5, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Loan Agreement: ${agreement.id}`, 20, 28);
    doc.text(`Lender: ${lenderInfo.full_name}`, 20, 35);
    doc.text(`Borrower: ${borrowerInfo.full_name}`, 20, 42);

    doc.setFillColor(240, 240, 240);
    doc.rect(20, 48, 257, 20, 'F');
    doc.setFontSize(10);
    doc.text(`Principal: ${formatMoney(agreement.amount)}`, 25, 58);
    doc.text(`Interest Rate: ${agreement.interest_rate}%`, 95, 58);
    doc.text(`Total Amount: ${formatMoney(agreement.total_amount)}`, 155, 58);
    doc.text(`Payment: ${formatMoney(agreement.payment_amount)} ${agreement.payment_frequency}`, 215, 58);

    let yPos = 78;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.text('Payment', 22, yPos);
    doc.text('Payment Date', 42, yPos);
    doc.text('Starting Bal.', 80, yPos);
    doc.text('Principal Pmt', 110, yPos);
    doc.text('Interest Pmt', 142, yPos);
    doc.text('Principal TD', 172, yPos);
    doc.text('Interest TD', 202, yPos);
    doc.text('Ending Bal.', 232, yPos);

    doc.line(20, yPos + 2, 277, yPos + 2);
    yPos += 7;

    doc.setFont(undefined, 'normal');
    schedule.forEach((row, index) => {
      if (yPos > 190) {
        doc.addPage('landscape');
        yPos = 20;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(8);
        doc.text('Payment', 22, yPos);
        doc.text('Payment Date', 42, yPos);
        doc.text('Starting Bal.', 80, yPos);
        doc.text('Principal Pmt', 110, yPos);
        doc.text('Interest Pmt', 142, yPos);
        doc.text('Principal TD', 172, yPos);
        doc.text('Interest TD', 202, yPos);
        doc.text('Ending Bal.', 232, yPos);
        doc.line(20, yPos + 2, 277, yPos + 2);
        yPos += 7;
        doc.setFont(undefined, 'normal');
      }

      doc.text(String(row.number), 22, yPos);
      doc.text(format(row.date, 'MMM d, yyyy'), 42, yPos);
      doc.text(formatMoney(row.startingBalance), 80, yPos);
      doc.text(formatMoney(row.principal), 110, yPos);
      doc.text(formatMoney(row.interest), 142, yPos);
      doc.text(formatMoney(row.principalToDate), 172, yPos);
      doc.text(formatMoney(row.interestToDate), 202, yPos);
      doc.text(formatMoney(row.endingBalance), 232, yPos);
      yPos += 5;
    });

    yPos += 5;
    doc.line(20, yPos, 277, yPos);
    yPos += 7;
    doc.setFont(undefined, 'bold');
    const totalPrincipal = schedule.reduce((sum, r) => sum + r.principal, 0);
    const totalInterest = schedule.reduce((sum, r) => sum + r.interest, 0);
    doc.text('TOTAL', 22, yPos);
    doc.text(formatMoney(totalPrincipal), 110, yPos);
    doc.text(formatMoney(totalInterest), 142, yPos);

    doc.save(`amortization-schedule-${agreement.id}.pdf`);
  };

  // Open document popup
  const openDocPopup = (type, agreement) => {
    setActiveDocPopup(type);
    setDocPopupAgreement(agreement);
  };

  const closeDocPopup = () => {
    setActiveDocPopup(null);
    setDocPopupAgreement(null);
  };

  // Promissory Note Popup Content
  const PromissoryNotePopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);

    return (
      <div className="space-y-5">
        <div className="text-center pb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Document</p>
          <h2 className="text-2xl font-bold text-slate-800">Promissory Note</h2>
          <p className="text-xs text-slate-400 mt-1">ID: {agreement.id}</p>
        </div>

        <div className="bg-[#2563EB]/10 rounded-2xl p-5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">Principal Amount</p>
          <p className="text-3xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
        </div>

        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            <span className="font-semibold">{lenderInfo.full_name}</span> agrees to lend <span className="font-semibold">{borrowerInfo.full_name}</span> <span className="font-semibold">{formatMoney(agreement.amount)}</span>{agreement.purpose ? <> for <span className="font-semibold">{agreement.purpose}</span></> : ''}, with <span className="font-semibold">{agreement.interest_rate}%</span> interest. <span className="font-semibold">{borrowerInfo.full_name}</span> agrees to pay back <span className="font-semibold">{formatMoney(agreement.total_amount)}</span> in <span className="font-semibold">{agreement.payment_frequency}</span> payments of <span className="font-semibold">{formatMoney(agreement.payment_amount)}</span> over <span className="font-semibold">{agreement.repayment_period} {agreement.repayment_unit || 'months'}</span>.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">Terms of Repayment</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#03ACEA]/8 rounded-xl p-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Total Due</p>
              <p className="font-bold text-slate-800">{formatMoney(agreement.total_amount)}</p>
            </div>
            <div className="bg-[#03ACEA]/12 rounded-xl p-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Interest</p>
              <p className="font-bold text-slate-800">{agreement.interest_rate}%</p>
            </div>
            <div className="bg-[#2563EB]/8 rounded-xl p-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Payment</p>
              <p className="font-bold text-slate-800">{formatMoney(agreement.payment_amount)}</p>
              <p className="text-xs text-slate-500 capitalize">{agreement.payment_frequency}</p>
            </div>
            <div className="bg-[#03ACEA]/8 rounded-xl p-3">
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Term</p>
              <p className="font-bold text-slate-800">{agreement.repayment_period} {agreement.repayment_unit || 'months'}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Borrower</p>
            <p className="text-lg font-serif italic text-slate-800">{agreement.borrower_name || borrowerInfo.full_name}</p>
            {agreement.borrower_signed_date && (
              <p className="text-xs text-slate-400 mt-1">Signed {format(new Date(agreement.borrower_signed_date), 'MMM d, yyyy')}</p>
            )}
          </div>
          <div className="glass-card rounded-2xl p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Lender</p>
            <p className="text-lg font-serif italic text-slate-800">{agreement.lender_name || lenderInfo.full_name}</p>
            {agreement.lender_signed_date && (
              <p className="text-xs text-slate-400 mt-1">Signed {format(new Date(agreement.lender_signed_date), 'MMM d, yyyy')}</p>
            )}
          </div>
        </div>

        <Button
          onClick={() => downloadPromissoryNote(agreement)}
          className="w-full bg-[#03ACEA] hover:bg-[#5a7ae0] text-white rounded-xl py-3"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    );
  };

  // Amortization Schedule Popup Content
  const AmortizationSchedulePopup = ({ agreement }) => {
    const schedule = generateAmortizationSchedule(agreement);
    const loan = manageLoanSelected;
    const paidPayments = loan?.amount_paid ? Math.floor(loan.amount_paid / agreement.payment_amount) : 0;

    return (
      <div className="space-y-5">
        <div className="text-center pb-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-1">Schedule</p>
          <h2 className="text-2xl font-bold text-slate-800">Amortization Schedule</h2>
          <p className="text-xs text-slate-400 mt-1">{schedule.length} payments · {agreement.payment_frequency}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#03ACEA]/8 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Principal</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
          </div>
          <div className="bg-[#03ACEA]/12 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Interest</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney((agreement.total_amount || 0) - (agreement.amount || 0))}</p>
          </div>
          <div className="bg-[#2563EB]/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-0.5">Total</p>
            <p className="text-lg font-bold text-slate-800">{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        <div className="max-h-[300px] overflow-x-auto overflow-y-auto rounded-2xl glass-card">
          <table className="w-full text-xs min-w-[580px]">
            <thead className="bg-white/90 backdrop-blur sticky top-0">
              <tr>
                <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500">Payment</th>
                <th className="px-2 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-slate-500">Date</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-slate-500">Start Bal.</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-slate-500">Principal</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-slate-500">Interest</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-slate-500">Princ. TD</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-slate-500">Int. TD</th>
                <th className="px-2 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-slate-500">End Bal.</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row, index) => (
                <tr
                  key={row.number}
                  className={index < paidPayments ? 'bg-[#03ACEA]/8/40' : index % 2 === 0 ? 'bg-white/40' : ''}
                >
                  <td className="px-2 py-2 text-slate-600">
                    {index < paidPayments && <CheckCircle className="w-3 h-3 text-[#03ACEA] inline mr-1" />}
                    {row.number}
                  </td>
                  <td className="px-2 py-2 text-slate-800">{format(row.date, 'MMM d, yyyy')}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.startingBalance)}</td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800">{formatMoney(row.principal)}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.interest)}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.principalToDate)}</td>
                  <td className="px-2 py-2 text-right text-slate-600">{formatMoney(row.interestToDate)}</td>
                  <td className="px-2 py-2 text-right font-medium text-slate-800">{formatMoney(row.endingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button
          onClick={() => downloadAmortizationSchedule(agreement)}
          className="w-full bg-[#03ACEA] hover:bg-[#5a7ae0] text-white rounded-xl py-3"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>
    );
  };

  // Loan Summary Popup Content
  const LoanSummaryPopup = ({ agreement }) => {
    const lenderInfo = getUserById(agreement.lender_id);
    const borrowerInfo = getUserById(agreement.borrower_id);
    const loan = manageLoanSelected;

    const getStatusColor = (status) => {
      switch(status) {
        case 'active': return 'bg-blue-50 text-blue-800 border-blue-200';
        case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Loan Summary</h2>
            <p className="text-sm text-slate-500 mt-1">{format(new Date(agreement.created_at), 'MMMM d, yyyy')}</p>
          </div>
          <Badge className={`${getStatusColor(loan?.status)} capitalize`}>{loan?.status || 'active'}</Badge>
        </div>

        <div className="bg-[#03ACEA]/8 rounded-xl p-4 mb-1">
          <p className="text-xs text-slate-600 mb-1">Purpose</p>
          <p className="text-sm font-semibold text-slate-800">{loan?.purpose || agreement.purpose || '_'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#2563EB]/8 rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Loan Amount</p>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(agreement.amount)}</p>
          </div>
          <div className="bg-[#03ACEA]/8 rounded-xl p-4">
            <p className="text-xs text-slate-600 mb-1">Total Due</p>
            <p className="text-2xl font-bold text-[#03ACEA]">{formatMoney(agreement.total_amount)}</p>
          </div>
        </div>

        {loan && (
          <div className="glass-card rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Payment Progress</span>
              <span className="text-sm font-medium text-slate-800">
                {formatMoney(loan.amount_paid || 0)} / {formatMoney(agreement.total_amount)}
              </span>
            </div>
            <div className="w-full bg-white rounded-full h-1.5">
              <div
                className="bg-[#03ACEA] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, ((loan.amount_paid || 0) / agreement.total_amount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Interest Rate</p>
                <p className="font-semibold text-slate-800">{agreement.interest_rate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Payment Amount</p>
                <p className="font-semibold text-slate-800">{formatMoney(agreement.payment_amount)}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Payment Frequency</p>
                <p className="font-semibold text-slate-800 capitalize">{agreement.payment_frequency}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-500">Due Date</p>
                <p className="font-semibold text-slate-800">{agreement.due_date ? format(new Date(agreement.due_date), 'MMM d, yyyy') : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-800 mb-3">Parties</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <UserAvatar name={lenderInfo.full_name} src={lenderInfo.profile_picture_url} size={40} />
              <div>
                <p className="text-xs text-slate-500">Lender</p>
                <p className="font-medium text-slate-800">{lenderInfo.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserAvatar name={borrowerInfo.full_name} src={borrowerInfo.profile_picture_url} size={40} />
              <div>
                <p className="text-xs text-slate-500">Borrower</p>
                <p className="font-medium text-slate-800">{borrowerInfo.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'lending', label: 'All' },
    { id: 'active', label: 'Manage Loans' },
  ];

  const PageCard = ({ title, headerRight, children, style, highlight }) => (
    <div style={{ marginBottom: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: highlight ? '#03ACEA' : '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{title}</div>
        {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
      </div>
      <div style={{ height: 1, background: highlight ? 'rgba(3,172,234,0.2)' : 'rgba(0,0,0,0.06)', marginBottom: 14 }} />
      <div style={{ overflow: 'visible' }}>{children}</div>
    </div>
  );

  return (
    <>
      {/* Loan Sent Modal */}
      <AnimatePresence>
        {showLoanSentModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              style={{ background: 'white', borderRadius: 24, maxWidth: 400, width: '100%', padding: '40px 32px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.14)', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} style={{ color: '#03ACEA' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: '0 0 8px', letterSpacing: '-0.02em' }}>Loan Sent!</h3>
              <p style={{ fontSize: 14, color: '#787776', margin: '0 0 28px', lineHeight: 1.6 }}>
                Your loan has been created and sent. The other party will need to sign to make it active.
              </p>
              <button
                onClick={() => setShowLoanSentModal(false)}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 14, border: 'none',
                  background: '#03ACEA', color: 'white', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.01em',
                }}
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Popup Modal */}
      <AnimatePresence>
        {activeDocPopup && docPopupAgreement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeDocPopup}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center rounded-t-2xl z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#03ACEA]/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-[#03ACEA]" />
                  </div>
                  <span className="font-medium text-slate-800">
                    {activeDocPopup === 'promissory' && 'Promissory Note'}
                    {activeDocPopup === 'amortization' && 'Amortization Schedule'}
                    {activeDocPopup === 'summary' && 'Loan Summary'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={closeDocPopup} className="text-slate-500 hover:text-slate-800">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                {activeDocPopup === 'promissory' && <PromissoryNotePopup agreement={docPopupAgreement} />}
                {activeDocPopup === 'amortization' && <AmortizationSchedulePopup agreement={docPopupAgreement} />}
                {activeDocPopup === 'summary' && <LoanSummaryPopup agreement={docPopupAgreement} />}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div style={{ minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", background: '#ffffff' }}>
        <MeshMobileNav user={currentUser} activePage="Create Loan" />
        <div className="mesh-layout" style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 0, minHeight: '100vh' }}>
          {/* COL 1 - left nav */}
          <div className="mesh-left" style={{ background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ position: 'sticky', top: 0, padding: '24px 8px 0' }}>
              <Link to="/" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontStyle: 'italic', fontSize: '1.3rem', color: '#1A1918', textDecoration: 'none', display: 'block', marginBottom: 16, paddingLeft: 6 }}>Vony</Link>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Home', to: '/' },
                  { label: 'Upcoming', to: createPageUrl("Upcoming") },
                  { label: 'Create Loan', to: createPageUrl("CreateOffer") },
                  { label: 'Record Payment', to: createPageUrl("RecordPayment") },
                  { label: 'My Loans', to: createPageUrl("YourLoans") },
                  { label: 'Friends', to: createPageUrl("Friends") },
                  { label: 'Recent Activity', to: createPageUrl("RecentActivity") },
                  { label: 'Documents', to: createPageUrl("LoanAgreements") },
                ].map(({ label, to }) => {
                  const currentPath = window.location.pathname;
                  const isActive = to === '/' ? currentPath === '/' : currentPath.includes(to.split('?')[0].replace('/app/', ''));
                  const navIcons = {
                    'Home': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
                    'Upcoming': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
                    'Create Loan': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
                    'Record Payment': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
                    'My Loans': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                    'Friends': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                    'Recent Activity': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                    'Documents': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                  };
                  return (
                    <Link key={label} to={to} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                      fontSize: 13, fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#1A1918' : '#787776',
                      background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent',
                      fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
                    }}>
                      <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: isActive ? 'rgba(0,0,0,0.07)' : 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{navIcons[label]}</span>
                      {label}
                    </Link>
                  );
                })}
                {/* Coming Soon section */}
                <div style={{ marginTop: 16, marginBottom: 4, paddingLeft: 12 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Coming Soon</span>
                </div>
                {[
                  { label: 'Learn', to: createPageUrl("ComingSoon") },
                  { label: 'Loan Help', to: createPageUrl("LoanHelp") },
                ].map(({ label, to }) => {
                  const soonIcons = {
                    'Learn': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
                    'Loan Help': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
                  };
                  return (
                    <Link key={label} to={to} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 12px', borderRadius: 9, textDecoration: 'none',
                      fontSize: 13, fontWeight: 500, color: '#787776',
                      background: 'transparent', fontFamily: "'DM Sans', sans-serif",
                      width: '100%', boxSizing: 'border-box',
                    }}>
                      <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, background: 'rgba(0,0,0,0.04)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{soonIcons[label]}</span>
                      <span style={{ flex: 1 }}>{label}</span>
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#9B9A98', background: 'rgba(0,0,0,0.05)', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, flexShrink: 0 }}>SOON</span>
                    </Link>
                  );
                })}
              </nav>
              <SidebarBottomSection />
            </div>
          </div>

          {/* COL 2 - main content */}
          <div className="mesh-center" style={{ background: 'white', padding: '28px 48px 80px' }}>
            <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 600, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 12 }}>Create Loan</div>
            <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 20 }} />

          {/* ── No Friends Banner at the very top ── */}
          {activeSection === 'create' && !isLoadingUsers && friends.length === 0 && (
            <div style={{
              marginBottom: 28, padding: '20px 22px', borderRadius: 14,
              background: 'white', border: '1px solid rgba(0,0,0,0.07)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1918', letterSpacing: '-0.02em', marginBottom: 4, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                👋 Loans are more fun with friends!
              </div>
              <div style={{ fontSize: 13, color: '#787776', lineHeight: 1.55, marginBottom: 16 }}>
                You can only send loan offers to people in your friends list. Add a friend first and you'll be ready to go.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  to={createPageUrl('Friends')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#03ACEA', color: 'white', textDecoration: 'none', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Find Friends
                </Link>
                <div ref={inviteRef} style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setInviteOpen(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'white', color: '#1A1918', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif", border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer' }}
                  >
                    Invite a Friend
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transition: 'transform 0.15s', transform: inviteOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                  {inviteOpen && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.09)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: 180, overflow: 'hidden' }}>
                      <a
                        href="sms:?body=Hey! Join me on Vony — an easy way to manage loans with friends. Sign up here: https://www.vony-lending.com"
                        onClick={() => setInviteOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, color: '#1A1918', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Message
                      </a>
                      <a
                        href="mailto:?subject=Join me on Vony&body=Hey!%0A%0AI've been using Vony to manage loans with friends and wanted to invite you.%0A%0ASign up here: https://www.vony-lending.com%0A%0ASee you there!"
                        onClick={() => setInviteOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, color: '#1A1918', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f4f0'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Email
                      </a>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText('https://www.vony-lending.com').then(() => { setInviteCopied(true); setTimeout(() => { setInviteCopied(false); setInviteOpen(false); }, 1500); }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', fontSize: 13, color: inviteCopied ? '#16A34A' : '#1A1918', background: inviteCopied ? 'rgba(22,163,74,0.05)' : 'transparent', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                        onMouseEnter={e => { if (!inviteCopied) e.currentTarget.style.background = '#f5f4f0'; }}
                        onMouseLeave={e => { if (!inviteCopied) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {inviteCopied
                          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#787776" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        }
                        {inviteCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Loan Type + Borrower Will Pay + Loan Summary ── */}
          {activeSection === 'create' && (
            <div className="lending-summary-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              {/* Loan Type */}
              <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loan Type</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: loanType === 'scheduled' ? '#1A1918' : '#9B9A98' }}>Loan</span>
                  <button
                    type="button"
                    onClick={() => setLoanType(loanType === 'flexible' ? 'scheduled' : 'flexible')}
                    style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0, background: loanType === 'flexible' ? '#03ACEA' : 'rgba(0,0,0,0.12)', transition: 'background 0.2s' }}
                  >
                    <div style={{ position: 'absolute', top: 3, left: loanType === 'flexible' ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 500, color: loanType === 'flexible' ? '#1A1918' : '#9B9A98' }}>Quick Pay</span>
                </div>
                <p style={{ fontSize: 11, color: '#9B9A98', lineHeight: 1.5, margin: 0 }}>
                  {loanType === 'flexible' ? 'One-time payment, perfect for splitting expenses' : 'Structured repayment plan with interest'}
                </p>
              </div>

              {/* Loan Summary */}
              <div className="lending-loan-summary-card" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loan Summary</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {formData.purpose && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9B9A98', marginBottom: 1 }}>For</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.purpose}</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#9B9A98' }}>Amount</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918' }}>{formData.amount ? `$${parseFloat(formData.amount).toLocaleString()}` : '$0.00'}</span>
                  </div>
                  {loanType === 'scheduled' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 12, color: '#9B9A98' }}>Interest</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918' }}>{formData.amount && formData.interest_rate ? `$${details.totalInterest.toFixed(2)}` : '$0.00'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Borrower Will Pay */}
              <div className="lending-pay-card" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Borrower Will Pay</span>
                </div>
                {loanType === 'scheduled' ? (
                  <>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#03ACEA', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                      {formData.amount && details.monthlyPayment > 0 ? `$${details.monthlyPayment.toFixed(2)}` : '$0.00'}
                    </div>
                    <div style={{ fontSize: 12, color: '#9B9A98' }}>{formData.payment_frequency || 'monthly'} after interest</div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#9B9A98' }}>N/A for Quick Pay</div>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation — hidden when accessed as standalone Create Loan page */}
          {!initialTab && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                variant={activeSection === tab.id ? 'default' : 'outline'}
                className={`whitespace-nowrap rounded-full ${
                  activeSection === tab.id
                    ? 'bg-[#03ACEA] hover:bg-[#5a7ae0] text-white border-0'
                    : 'bg-white/90 backdrop-blur-sm border border-black/10 text-slate-600 hover:bg-white shadow-sm'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </Button>
            ))}
          </div>
          )}

          {/* Content Sections */}
          <AnimatePresence mode="wait">
            {activeSection === 'lending' && (
              <motion.div
                key="lending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-7"
              >
                {/* Lending Overview Section */}
                <PageCard title="Lending Overview">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {/* Pie Chart */}
                    <div className="rounded-xl p-3 flex flex-col items-center justify-center" style={{ backgroundColor: 'rgba(3,172,234,0.08)' }}>
                      {(() => {
                        const totalOwed = activeLoans.reduce((sum, loan) => sum + (loan.total_amount || loan.amount || 0), 0);
                        const totalPaid = activeLoans.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0);
                        const percentPaid = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;

                        return (
                          <>
                            <div className="relative w-24 h-24">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(3,172,234,0.15)" strokeWidth="7" />
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="52"
                                  fill="none"
                                  stroke="#03ACEA"
                                  strokeWidth="7"
                                  strokeLinecap="round"
                                  strokeDasharray={2 * Math.PI * 52}
                                  strokeDashoffset={2 * Math.PI * 52 - (percentPaid / 100) * 2 * Math.PI * 52}
                                  className="transition-all duration-500"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-lg font-bold text-slate-800">{percentPaid}%</span>
                                <span className="text-[9px] text-slate-500 uppercase tracking-wider">Repaid</span>
                              </div>
                            </div>
                            <div className="mt-2 text-center">
                              <p className="text-xs text-slate-500">
                                ${totalPaid.toLocaleString()} of ${totalOwed.toLocaleString()}
                              </p>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Next Incoming card — mirrors Home middle box */}
                    {(() => {
                      const days = nextPaymentLoan ? Math.ceil((nextPaymentLoan.date.getTime() - Date.now()) / 86400000) : null;
                      const isLate = days !== null && days < 0;
                      const daysLabel = days === null ? null : isLate ? `${Math.abs(days)}d late` : days === 0 ? 'today' : `${days}d`;
                      const badgeColor = isLate ? '#E8726E' : '#03ACEA';
                      const badgeBg = isLate ? 'rgba(232,114,110,0.08)' : 'rgba(3,172,234,0.10)';
                      const borrower = nextPaymentLoan ? publicProfiles.find(p => p.user_id === nextPaymentLoan.borrower_id) : null;
                      const firstName = borrower?.full_name?.split(' ')[0] || 'User';
                      return (
                        <div style={{
                          padding: '12px 14px', borderRadius: 14,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(3,172,234,0.06) 60%, rgba(3,172,234,0.10) 100%)',
                          backdropFilter: 'blur(10px) saturate(1.6)', WebkitBackdropFilter: 'blur(10px) saturate(1.6)',
                          border: '2px solid #03ACEA',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 16px rgba(3,172,234,0.07), 0 0 0 4px rgba(3,172,234,0.15), 0 0 24px rgba(3,172,234,0.18), 0 0 48px rgba(3,172,234,0.08), 0 2px 12px rgba(0,0,0,0.04)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(3,172,234,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Next Incoming</span>
                          </div>
                          {nextPaymentLoan ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                <span style={{ fontSize: 19, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em' }}>{format(nextPaymentLoan.date, 'MMM d')}</span>
                                {daysLabel && <span style={{ fontSize: 9, fontWeight: 700, color: badgeColor, background: badgeBg, borderRadius: 5, padding: '2px 6px', flexShrink: 0 }}>{daysLabel}</span>}
                              </div>
                              <div style={{ fontSize: 11, color: '#9B9A98', textAlign: 'right' }}>{format(nextPaymentLoan.date, 'do MMMM')}</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 15, fontWeight: 700, color: '#C5C3C0', marginBottom: 4 }}>—</div>
                              <div style={{ fontSize: 11, color: '#9B9A98' }}>None incoming ✨</div>
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Active Lending bar chart */}
                    {(() => {
                      const totalOwed = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
                      const totalPaid = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
                      const pct = totalOwed > 0 ? Math.round((totalPaid / totalOwed) * 100) : 0;
                      return (
                        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'white', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(3,172,234,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active Lending</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1918', letterSpacing: '-0.02em' }}>{formatMoney(totalOwed)}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#03ACEA' }}>{pct}%</span>
                          </div>
                          <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(3,172,234,0.12)', overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${pct}%`, transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
                          </div>
                          <div style={{ fontSize: 10, color: '#9B9A98' }}>{formatMoney(totalPaid)} of {formatMoney(totalOwed)} repaid</div>
                        </div>
                      );
                    })()}
                  </div>
                </PageCard>

                {/* Upcoming Payments */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Upcoming</span>
                    <Link to={createPageUrl("Upcoming")} style={{ fontSize: 11, fontWeight: 500, color: '#9B9A98', textDecoration: 'none' }}>Full schedule →</Link>
                  </div>
                  {(() => {
                    const rows = activeLoans
                      .filter(l => l.next_payment_date)
                      .map(l => {
                        const borrower = publicProfiles.find(p => p.user_id === l.borrower_id);
                        const days = daysUntilDate(l.next_payment_date);
                        return { ...l, borrowerName: borrower?.full_name?.split(' ')[0] || 'User', days };
                      })
                      .sort((a, b) => a.days - b.days)
                      .slice(0, 5);
                    if (rows.length === 0) return <div style={{ padding: '10px 0', fontSize: 13, color: '#9B9A98', textAlign: 'center' }}>You're all clear! Nothing coming up yet 🎉</div>;
                    return rows.map((loan, idx) => {
                      const isOverdue = loan.days < 0;
                      const daysLabel = isOverdue ? `${Math.abs(loan.days)}d late` : loan.days === 0 ? 'today' : `${loan.days}d`;
                      return (
                        <div key={loan.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                          <div style={{
                            minWidth: 42, textAlign: 'center', flexShrink: 0,
                            fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                            color: isOverdue ? '#E8726E' : loan.days <= 3 ? '#F59E0B' : '#9B9A98',
                            background: isOverdue ? 'rgba(232,114,110,0.08)' : loan.days <= 3 ? 'rgba(245,158,11,0.08)' : 'rgba(0,0,0,0.04)',
                            borderRadius: 6, padding: '3px 6px',
                          }}>{daysLabel}</div>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong>{loan.borrowerName}</strong> pays you{loan.purpose ? <span style={{ color: '#9B9A98', fontWeight: 400 }}> · {loan.purpose}</span> : ''}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0, color: '#03ACEA', letterSpacing: '-0.01em' }}>
                            +{formatMoney(loan.payment_amount || 0)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                  {/* Loan Progress */}
                  <PageCard title="Loan Progress">
                    <div style={{ padding: '14px 0 4px' }}>
                      {activeLoans.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#787776', margin: 0 }}>No active loans yet 🌱</p>
                      ) : (() => {
                        const totalAll = activeLoans.reduce((s, l) => s + (l.total_amount || l.amount || 0), 0);
                        const paidAll = activeLoans.reduce((s, l) => s + (l.amount_paid || 0), 0);
                        const pctAll = totalAll > 0 ? Math.round((paidAll / totalAll) * 100) : 0;
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1918' }}>Active Loans</div>
                              <div style={{ fontSize: 12, color: '#787776' }}>{pctAll}%</div>
                            </div>
                            <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(3,172,234,0.15)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, background: '#03ACEA', width: `${pctAll}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                            </div>
                            <div style={{ fontSize: 11, color: '#787776', marginTop: 6 }}>{formatMoney(paidAll)} of {formatMoney(totalAll)} repaid</div>
                          </div>
                        );
                      })()}
                    </div>
                  </PageCard>

                {/* Month Repayment + Loan History */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Left column: Month Repayment Amount + Overview stacked */}
                  <div className="space-y-4">
                    {/* Month Repayment Amount Box */}
                    {(() => {
                      const monthEnd = endOfMonth(selectedMonth);
                      let totalReceive = 0;

                      activeLoans.forEach(loan => {
                        if (!loan.next_payment_date) return;
                        const paymentDate = new Date(loan.next_payment_date);
                        const paymentAmount = loan.payment_amount || 0;

                        const addAmountIfInMonth = (date) => {
                          if (isSameMonth(date, selectedMonth)) {
                            totalReceive += paymentAmount;
                          }
                        };

                        addAmountIfInMonth(paymentDate);

                        const frequency = loan.payment_frequency;
                        if (frequency && frequency !== 'none') {
                          let currentDate = new Date(loan.next_payment_date);
                          let iterations = 0;
                          while (iterations < 10) {
                            if (frequency === 'weekly') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                            } else if (frequency === 'biweekly') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
                            } else if (frequency === 'monthly') {
                              currentDate = addMonths(currentDate, 1);
                            } else if (frequency === 'daily') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
                            } else {
                              break;
                            }
                            if (currentDate > monthEnd) break;
                            addAmountIfInMonth(currentDate);
                            iterations++;
                          }
                        }
                      });

                      return (
                        <div className="bg-[#03ACEA]/12 rounded-xl p-3 flex items-center justify-between">
                          <p className="text-[11px] text-[#1A1918] uppercase tracking-[0.12em] font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                            {format(selectedMonth, 'MMMM')} Repayment Amount
                          </p>
                          <p className="text-sm font-bold text-[#1A1918]">
                            +${totalReceive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Month Repayment Overview Box */}
                    <PageCard title={`${format(selectedMonth, 'MMMM')} Repayment Overview`} headerRight={
                      <div className="relative">
                        <button
                          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                          className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-wider font-medium hover:text-slate-700 transition-colors"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showMonthDropdown && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMonthDropdown(false)} />
                            <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-lg border z-20 py-2 min-w-[160px] max-h-[120px] overflow-y-auto">
                              {Array.from({ length: 12 }, (_, i) => {
                                const monthDate = new Date(new Date().getFullYear(), i, 1);
                                return (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      setSelectedMonth(monthDate);
                                      setShowMonthDropdown(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[#2563EB]/10 transition-colors ${
                                      isSameMonth(monthDate, selectedMonth) ? 'bg-[#2563EB]/10 font-medium text-[#03ACEA]' : 'text-slate-700'
                                    }`}
                                  >
                                    {format(monthDate, 'MMMM')}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    }>
                    <div className="p-4">
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{
                    maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
                  }}>
                    {(() => {
                      const monthEnd = endOfMonth(selectedMonth);
                      const events = [];

                      activeLoans.forEach(loan => {
                        if (!loan.next_payment_date) return;

                        const paymentDate = new Date(loan.next_payment_date);
                        const borrower = publicProfiles.find(p => p.user_id === loan.borrower_id);

                        const addEventIfInMonth = (date) => {
                          if (isSameMonth(date, selectedMonth)) {
                            events.push({
                              date: new Date(date),
                              amount: loan.payment_amount || 0,
                              username: borrower?.username || 'user'
                            });
                          }
                        };

                        addEventIfInMonth(paymentDate);

                        const frequency = loan.payment_frequency;
                        if (frequency && frequency !== 'none') {
                          let currentDate = new Date(loan.next_payment_date);
                          let iterations = 0;
                          while (iterations < 10) {
                            if (frequency === 'weekly') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
                            } else if (frequency === 'biweekly') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 14));
                            } else if (frequency === 'monthly') {
                              currentDate = addMonths(currentDate, 1);
                            } else if (frequency === 'daily') {
                              currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
                            } else {
                              break;
                            }
                            if (currentDate > monthEnd) break;
                            addEventIfInMonth(currentDate);
                            iterations++;
                          }
                        }
                      });

                      events.sort((a, b) => a.date - b.date);

                      if (events.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                            <Calendar className="w-10 h-10 opacity-40 mb-2" />
                            <p className="text-sm">No repayments expected this month</p>
                          </div>
                        );
                      }

                      const colors = ['rgba(3,172,234,0.06)', 'rgba(3,172,234,0.1)', 'rgba(37,99,235,0.08)', 'rgba(3,172,234,0.08)', 'rgba(3,172,234,0.12)', 'rgba(37,99,235,0.06)'];

                      return events.map((event, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ backgroundColor: colors[index % 6] }}
                        >
                          <div className="bg-[#03ACEA]/8 rounded-lg px-3 py-2 flex-shrink-0 text-center min-w-[50px]">
                            <p className="text-xs text-slate-500 uppercase" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                              {format(event.date, 'MMM')}
                            </p>
                            <p className="text-lg font-bold text-slate-800">
                              {format(event.date, 'd')}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              <span className="text-[#03ACEA]">Receive</span>
                              {' '}
                              <span className="font-bold">${event.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              {' '}
                              <span className="text-slate-600">from</span>
                              {' '}
                              <span className="font-medium">{event.full_name || event.username}</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#03ACEA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="19" x2="12" y2="5"></line>
                              <polyline points="5 12 12 5 19 12"></polyline>
                            </svg>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  </div>
                  </PageCard>
                  </div>

                  {/* Loan History - Right */}
                  <PageCard title="Loan History">
                    <div className="p-4">
                    <div className="space-y-3">
                      {/* Total Amount Lent */}
                      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(3,172,234,0.06)' }}>
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <DollarSign className="w-4 h-4 text-[#1A1918]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                            Total Lent
                          </p>
                          <p className="text-lg font-bold text-slate-800">
                            ${lentLoans.reduce((sum, l) => sum + (l.amount || 0), 0).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Number of Loans */}
                      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(3,172,234,0.1)' }}>
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-[#1A1918]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                            Loans
                          </p>
                          <p className="text-lg font-bold text-slate-800">
                            {lentLoans.length}
                          </p>
                        </div>
                      </div>

                      {/* Friends Lent To */}
                      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-4 h-4 text-[#1A1918]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                            Friends Lent To
                          </p>
                          <p className="text-lg font-bold text-slate-800">
                            {new Set(lentLoans.map(l => l.borrower_id)).size}
                          </p>
                        </div>
                      </div>
                    </div>
                    </div>
                  </PageCard>

                </div>
              </motion.div>
            )}

            {activeSection === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Form */}
                <div>
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Lender + Borrower — side by side with persistent labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                          {/* Lender */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Lender</div>
                            {isLoadingUsers ? (
                              <div style={{ height: 38, background: 'rgba(0,0,0,0.05)', borderRadius: 10 }} />
                            ) : (
                              <UserSelector
                                users={lenderUsers}
                                value={formData.lender_username}
                                onSelect={handleLenderSelect}
                                placeholder="Choose a person..."
                                showAddFriends={true}
                                onAddFriends={() => navigate(createPageUrl('Friends') + '?tab=add')}
                              />
                            )}
                          </div>
                          {/* Borrower */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Borrower</div>
                            {isLoadingUsers ? (
                              <div style={{ height: 38, background: 'rgba(0,0,0,0.05)', borderRadius: 10 }} />
                            ) : (
                              <UserSelector
                                users={borrowerUsers}
                                value={formData.borrower_username}
                                onSelect={handleBorrowerSelect}
                                placeholder="Choose a person..."
                                showAddFriends={true}
                                onAddFriends={() => navigate(createPageUrl('Friends') + '?tab=add')}
                              />
                            )}
                          </div>
                        </div>

                        {/* Amount and Purpose - Only for Quick Payment Request (non-repeating) */}
                        {loanType === 'flexible' && !formData.is_repeating && (
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="amount">
                                Payment Amount
                              </Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
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
                                  className="pl-7 border-0 shadow-none bg-white/80"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="purpose">
                                What's this for?
                              </Label>
                              <Input
                                id="purpose"
                                type="text"
                                placeholder="e.g., Concert tickets..."
                                value={formData.purpose}
                                onChange={(e) => handleInputChange('purpose', e.target.value)}
                                maxLength={100}
                                className="border-0 shadow-none bg-white/80"
                              />
                            </div>
                          </div>
                        )}

                        {/* Repeating Request Toggle - Only for Quick Payment Request */}
                        {loanType === 'flexible' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <div>
                                <Label className="flex items-center gap-2 text-sm font-medium">
                                  Repeating Request
                                </Label>
                                <p className="text-xs text-slate-500 mt-0.5">Will this payment repeat regularly?</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleInputChange('is_repeating', !formData.is_repeating)}
                                className={`relative w-12 h-6 rounded-full transition-all ${
                                  formData.is_repeating ? 'bg-[#03ACEA]' : 'bg-slate-300'
                                }`}
                              >
                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                                  formData.is_repeating ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>

                            {/* Repeating Options */}
                            {formData.is_repeating && (
                              <div style={{ padding: '18px 20px 6px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(3,172,234,0.06) 60%, rgba(3,172,234,0.10) 100%)', backdropFilter: 'blur(10px) saturate(1.6)', WebkitBackdropFilter: 'blur(10px) saturate(1.6)', border: '2px solid #03ACEA', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 16px rgba(3,172,234,0.07), 0 0 0 4px rgba(3,172,234,0.15), 0 0 24px rgba(3,172,234,0.18), 0 2px 12px rgba(0,0,0,0.04)' }}>
                                <p className="text-sm text-slate-700 leading-[4.2] [&_input]:inline-flex [&_input]:align-baseline [&_input]:my-[2px] [&_input[type=number]]:appearance-none [&_input[type=number]]:[-moz-appearance:textfield] [&_input[type=number]::-webkit-outer-spin-button]:appearance-none [&_input[type=number]::-webkit-inner-spin-button]:appearance-none [&_.inline-flex]:my-[2px]">
                                  Payments of ${' '}
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder=""
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className="w-24 h-8 px-3 bg-white inline-flex"
                                    style={{ MozAppearance: 'textfield' }}
                                  />{' '}
                                  will be due{' '}
                                  <Select
                                    value={formData.repeating_frequency}
                                    onValueChange={(value) => handleInputChange('repeating_frequency', value)}
                                  >
                                    <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="weekly">weekly</SelectItem>
                                      <SelectItem value="monthly">monthly</SelectItem>
                                    </SelectContent>
                                  </Select>{' '}
                                  {formData.repeating_frequency === 'monthly' ? 'on the ' : 'on '}
                                  {formData.repeating_frequency === 'weekly' ? (
                                    <Select
                                      value={formData.repeating_day_of_week}
                                      onValueChange={(value) => handleInputChange('repeating_day_of_week', value)}
                                    >
                                      <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="monday">Monday</SelectItem>
                                        <SelectItem value="tuesday">Tuesday</SelectItem>
                                        <SelectItem value="wednesday">Wednesday</SelectItem>
                                        <SelectItem value="thursday">Thursday</SelectItem>
                                        <SelectItem value="friday">Friday</SelectItem>
                                        <SelectItem value="saturday">Saturday</SelectItem>
                                        <SelectItem value="sunday">Sunday</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Select
                                      value={formData.repeating_day_of_month}
                                      onValueChange={(value) => handleInputChange('repeating_day_of_month', value)}
                                    >
                                      <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                          <SelectItem key={day} value={day.toString()}>
                                            {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}{' '}
                                  at{' '}
                                  <Input
                                    type="time"
                                    value={formData.repeating_time}
                                    onChange={(e) => handleInputChange('repeating_time', e.target.value)}
                                    className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md"
                                  />{' '}
                                  <Select
                                    value={formData.repeating_timezone}
                                    onValueChange={(value) => handleInputChange('repeating_timezone', value)}
                                  >
                                    <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="EST">EST</SelectItem>
                                      <SelectItem value="CST">CST</SelectItem>
                                      <SelectItem value="MST">MST</SelectItem>
                                      <SelectItem value="PST">PST</SelectItem>
                                      <SelectItem value="HST">HST</SelectItem>
                                      <SelectItem value="AKST">AKST</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  , starting on{' '}
                                  <Input
                                    type="date"
                                    value={formData.repeating_start_date}
                                    onChange={(e) => handleInputChange('repeating_start_date', e.target.value)}
                                    min={format(new Date(), 'yyyy-MM-dd')}
                                    className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md"
                                  />{' '}
                                  and ending after{' '}
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder=""
                                    value={formData.repeating_num_payments}
                                    onChange={(e) => handleInputChange('repeating_num_payments', e.target.value)}
                                    className="w-16 h-8 px-3 bg-white inline-flex"
                                    style={{ MozAppearance: 'textfield' }}
                                  />{' '}
                                  payments. These payments will be for{' '}
                                  <Input
                                    type="text"
                                    placeholder={purposePlaceholder}
                                    value={formData.purpose}
                                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                                    className="flex-1 h-8 px-3 bg-white min-w-[200px] inline-flex"
                                    maxLength={100}
                                  />.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Scheduled loan fields - Sentence format */}
                        {loanType === 'scheduled' && (
                          <div style={{ padding: '18px 20px 6px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(3,172,234,0.06) 60%, rgba(3,172,234,0.10) 100%)', backdropFilter: 'blur(10px) saturate(1.6)', WebkitBackdropFilter: 'blur(10px) saturate(1.6)', border: '2px solid #03ACEA', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 16px rgba(3,172,234,0.07), 0 0 0 4px rgba(3,172,234,0.15), 0 0 24px rgba(3,172,234,0.18), 0 2px 12px rgba(0,0,0,0.04)' }}>
                            <p className="text-sm text-slate-700 leading-[4.2] [&_input]:inline-flex [&_input]:align-baseline [&_input]:my-[2px] [&_input[type=number]]:appearance-none [&_input[type=number]]:[-moz-appearance:textfield] [&_input[type=number]::-webkit-outer-spin-button]:appearance-none [&_input[type=number]::-webkit-inner-spin-button]:appearance-none [&_.inline-flex]:my-[2px] [&:last-child]:mb-0">
                              {isUserBorrower ? (
                                <>
                                  The borrower requests to receive a loan of ${' '}
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="5000"
                                    placeholder=""
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className="w-24 h-8 px-3 bg-white inline-flex"
                                    style={{ MozAppearance: 'textfield' }}
                                  />{' '}
                                  from{' '}
                                  <span className="font-medium" style={{ color: '#54A6CF' }}>
                                    {formData.lender_username ? formData.lender_username : 'the lender'}
                                  </span>{' '}
                                </>
                              ) : (
                                <>
                                  The lender agrees to lend{' '}
                                  <span className="font-medium" style={{ color: '#54A6CF' }}>
                                    {formData.borrower_username ? formData.borrower_username : 'the borrower'}
                                  </span>{' '}
                                  ${' '}
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="5000"
                                    placeholder=""
                                    value={formData.amount}
                                    onChange={(e) => handleInputChange('amount', e.target.value)}
                                    className="w-24 h-8 px-3 bg-white inline-flex"
                                    style={{ MozAppearance: 'textfield' }}
                                  />{' '}
                                </>
                              )}
                              before{' '}
                              <Input
                                type="date"
                                value={formData.lender_send_funds_date}
                                onChange={(e) => handleInputChange('lender_send_funds_date', e.target.value)}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md"
                              />{' '}
                              at an interest rate of{' '}
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="8"
                                placeholder=""
                                value={formData.interest_rate}
                                onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                                className="w-16 h-8 px-3 bg-white inline-flex"
                                style={{ MozAppearance: 'textfield' }}
                              />
                              . The loan will be repaid over{' '}
                              <Input
                                type="number"
                                min="1"
                                placeholder=""
                                value={formData.repayment_period}
                                onChange={(e) => handleInputChange('repayment_period', e.target.value)}
                                className="w-16 h-8 px-3 bg-white inline-flex"
                                style={{ MozAppearance: 'textfield' }}
                              />{' '}
                              <Select
                                value={formData.repayment_unit}
                                onValueChange={(value) => handleInputChange('repayment_unit', value)}
                              >
                                <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weeks">weeks</SelectItem>
                                  <SelectItem value="months">months</SelectItem>
                                </SelectContent>
                              </Select>{' '}
                              in{' '}
                              <Select
                                value={formData.payment_frequency}
                                onValueChange={(value) => handleInputChange('payment_frequency', value)}
                              >
                                <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="weekly">weekly</SelectItem>
                                  <SelectItem value="monthly">monthly</SelectItem>
                                </SelectContent>
                              </Select>{' '}
                              payments of{' '}
                              <span className="font-bold" style={{ color: '#54A6CF' }}>
                                ${details.monthlyPayment.toFixed(2)}
                              </span>
                              . Payments will be due{' '}
                              {formData.payment_frequency === 'monthly' ? 'on the ' : 'on '}
                              {formData.payment_frequency === 'weekly' ? (
                                <Select
                                  value={formData.loan_day_of_week}
                                  onValueChange={(value) => handleInputChange('loan_day_of_week', value)}
                                >
                                  <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monday">Monday</SelectItem>
                                    <SelectItem value="tuesday">Tuesday</SelectItem>
                                    <SelectItem value="wednesday">Wednesday</SelectItem>
                                    <SelectItem value="thursday">Thursday</SelectItem>
                                    <SelectItem value="friday">Friday</SelectItem>
                                    <SelectItem value="saturday">Saturday</SelectItem>
                                    <SelectItem value="sunday">Sunday</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Select
                                  value={formData.loan_day_of_month}
                                  onValueChange={(value) => handleInputChange('loan_day_of_month', value)}
                                >
                                  <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                      <SelectItem key={day} value={day.toString()}>
                                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}{' '}
                              at{' '}
                              <Input
                                type="time"
                                value={formData.loan_time}
                                onChange={(e) => handleInputChange('loan_time', e.target.value)}
                                className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md"
                              />{' '}
                              <Select
                                value={formData.loan_timezone}
                                onValueChange={(value) => handleInputChange('loan_timezone', value)}
                              >
                                <SelectTrigger className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EST">EST</SelectItem>
                                  <SelectItem value="CST">CST</SelectItem>
                                  <SelectItem value="MST">MST</SelectItem>
                                  <SelectItem value="PST">PST</SelectItem>
                                  <SelectItem value="HST">HST</SelectItem>
                                  <SelectItem value="AKST">AKST</SelectItem>
                                </SelectContent>
                              </Select>
                              {(() => {
                                const numPayments = formData.payment_frequency === 'weekly'
                                  ? Math.ceil(parseInt(formData.repayment_period || 0) * (formData.repayment_unit === 'months' ? 4 : 1))
                                  : parseInt(formData.repayment_period || 0);

                                const firstPaymentDate = formData.first_payment_date ? new Date(formData.first_payment_date) : null;
                                let lastPaymentDate = null;

                                if (firstPaymentDate && numPayments > 0) {
                                  if (formData.payment_frequency === 'weekly') {
                                    lastPaymentDate = addWeeks(firstPaymentDate, numPayments - 1);
                                  } else {
                                    lastPaymentDate = addMonths(firstPaymentDate, numPayments - 1);
                                  }
                                }

                                return (
                                  <>
                                    , with the first of the{' '}
                                    <span className="font-bold" style={{ color: '#54A6CF' }}>{numPayments || '_'}</span>{' '}
                                    payments due on{' '}
                                    <Input
                                      type="date"
                                      value={formData.first_payment_date}
                                      onChange={(e) => handleInputChange('first_payment_date', e.target.value)}
                                      min={format(new Date(), 'yyyy-MM-dd')}
                                      className="w-auto h-8 px-3 bg-white/80 inline-flex border-0 shadow-none rounded-md"
                                    />{' '}
                                    and the last payment due on{' '}
                                    <span className="font-bold" style={{ color: '#54A6CF' }}>
                                      {lastPaymentDate ? format(lastPaymentDate, 'MMM d, yyyy') : '_'}
                                    </span>
                                    .
                                  </>
                                );
                              })()}
                              {' '}This loan is for{' '}
                              <Input
                                type="text"
                                placeholder={purposePlaceholder}
                                value={formData.purpose}
                                onChange={(e) => handleInputChange('purpose', e.target.value)}
                                className="flex-1 h-8 px-3 bg-white min-w-[200px] inline-flex"
                                maxLength={100}
                              />
                              .
                            </p>
                          </div>
                        )}

                        {/* Mobile-only: Borrower Will Pay + Loan Summary (shown below blue box on mobile) */}
                        <div className="lending-mobile-pay-summary" style={{ display: 'none', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          {/* Borrower Will Pay */}
                          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Borrower Will Pay</span>
                            </div>
                            {loanType === 'scheduled' ? (
                              <>
                                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#03ACEA', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                                  {formData.amount && details.monthlyPayment > 0 ? `$${details.monthlyPayment.toFixed(2)}` : '$0.00'}
                                </div>
                                <div style={{ fontSize: 12, color: '#9B9A98' }}>{formData.payment_frequency || 'monthly'} after interest</div>
                              </>
                            ) : (
                              <div style={{ fontSize: 13, color: '#9B9A98' }}>N/A for Quick Pay</div>
                            )}
                          </div>
                          {/* Loan Summary */}
                          <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', borderRadius: 14, border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '14px 18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loan Summary</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {formData.purpose && (
                                <div>
                                  <div style={{ fontSize: 11, color: '#9B9A98', marginBottom: 1 }}>For</div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1A1918', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.purpose}</div>
                                </div>
                              )}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontSize: 12, color: '#9B9A98' }}>Amount</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918' }}>{formData.amount ? `$${parseFloat(formData.amount).toLocaleString()}` : '$0.00'}</span>
                              </div>
                              {loanType === 'scheduled' && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                  <span style={{ fontSize: 12, color: '#9B9A98' }}>Interest</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1918' }}>{formData.amount && formData.interest_rate ? `$${details.totalInterest.toFixed(2)}` : '$0.00'}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {(() => {
                          const isDisabled = isSubmitting || !formData.lender_username || !formData.borrower_username || !formData.amount || !formData.purpose || (loanType === 'scheduled' && (!formData.interest_rate || !formData.repayment_period || !formData.lender_send_funds_date || !formData.first_payment_date)) || (loanType === 'flexible' && formData.is_repeating && (!formData.repeating_start_date || !formData.repeating_num_payments));
                          return (
                            <button
                              type="submit"
                              disabled={isDisabled}
                              style={{
                                width: '100%', padding: '12px 20px',
                                background: isDisabled ? 'rgba(3,172,234,0.35)' : '#03ACEA',
                                color: 'white', border: 'none', borderRadius: 12, cursor: isDisabled ? 'not-allowed' : 'pointer',
                                fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
                                letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'background 0.2s',
                              }}
                            >
                              <Send size={14} />
                              {isSubmitting ? "Sending…" : (loanType === 'flexible' ? "Send Quick Payment Request" : (isUserBorrower ? "Send Loan Request" : "Send Loan Offer"))}
                            </button>
                          );
                        })()}
                      </form>
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
                    <div className="w-8 h-8 border-2 border-[#03ACEA] border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : manageableLoans.length === 0 ? (
                  <PageCard title="Loans">
                  <div className="p-8">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-[#03ACEA]/8 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-[#03ACEA]" />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mb-2">All Clear</p>
                      <p className="text-lg font-semibold text-slate-800 mb-1">No loans to manage yet</p>
                      <p className="text-sm text-slate-500 mb-5">You're all caught up! Create a new loan offer to get started.</p>
                      <Button
                        onClick={() => setActiveSection('create')}
                        className="bg-[#03ACEA] hover:bg-[#5a7ae0] text-white rounded-xl px-6 h-11"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create a Loan Offer
                      </Button>
                    </div>
                  </div>
                  </PageCard>
                ) : (
                  <div className="space-y-4">
                    {/* Loan Selector Dropdown */}
                    <PageCard title="Your Loans">
                    <div className="p-4">
                        <Select
                          value={manageLoanSelected?.id || ''}
                          onValueChange={(value) => {
                            const loan = manageableLoans.find(l => l.id === value);
                            setManageLoanSelected(loan || null);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a loan to manage...">
                              {manageLoanSelected && (() => {
                                const borrower = publicProfiles.find(p => p.user_id === manageLoanSelected.borrower_id);
                                return (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#03ACEA]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#03ACEA]">
                                        {borrower?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span>{borrower?.full_name || 'User'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500 truncate max-w-[120px]">{manageLoanSelected.purpose || 'Reason'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-[#03ACEA] font-medium">${manageLoanSelected.amount?.toLocaleString()}</span>
                                    {manageLoanSelected.status === 'cancelled' && (
                                      <span className="text-red-500 text-xs font-medium">(Cancelled)</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {manageableLoans.map((loan) => {
                              const borrower = publicProfiles.find(p => p.user_id === loan.borrower_id);
                              return (
                                <SelectItem key={loan.id} value={loan.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#03ACEA]/20 flex items-center justify-center">
                                      <span className="text-xs font-medium text-[#03ACEA]">
                                        {borrower?.full_name?.charAt(0) || '?'}
                                      </span>
                                    </div>
                                    <span>{borrower?.full_name || 'User'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500 truncate max-w-[120px]">{loan.purpose || 'Reason'}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-[#03ACEA] font-medium">${loan.amount?.toLocaleString()}</span>
                                    {loan.status === 'cancelled' && (
                                      <span className="text-red-500 text-xs font-medium">(Cancelled)</span>
                                    )}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                    </div>
                    </PageCard>

                    {/* Loan Details - Below Dropdown */}
                    {!manageLoanSelected ? (
                      <PageCard title="Loan Details">
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center text-[#787776]">
                          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Select a loan above to view details</p>
                        </div>
                      </div>
                      </PageCard>
                    ) : (
                      <>
                          {/* Loan Information Box */}
                          <PageCard title="Loan Information">
                          <div className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div className="bg-[#03ACEA]/8 rounded-xl p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Amount</p>
                                <p className="text-xl font-bold text-slate-800">
                                  ${(manageLoanSelected.amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <div className="bg-[#03ACEA]/10 rounded-xl p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Interest</p>
                                <p className="text-xl font-bold text-slate-800">
                                  {manageLoanSelected.interest_rate || 0}%
                                </p>
                              </div>
                              <div className="bg-[#2563EB]/8 rounded-xl p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Term</p>
                                <p className="text-xl font-bold text-slate-800">
                                  {manageLoanSelected.repayment_period || 0} {manageLoanSelected.repayment_unit || 'months'}
                                </p>
                              </div>
                              <div className="bg-[#2563EB]/8 rounded-xl p-4">
                                <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Payment</p>
                                <p className="text-xl font-bold text-slate-800">
                                  ${(manageLoanSelected.payment_amount || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          </PageCard>

                          {/* Progress Pie Chart + Next Payment + Payment Amount */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Pie Chart - Left */}
                            <div className="bg-[#03ACEA]/8 rounded-2xl p-5">
                              <p className="text-[10px] text-slate-600 uppercase tracking-[0.12em] font-medium mb-4" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                                Payment Progress
                              </p>
                              <div className="flex flex-col items-center">
                                {(() => {
                                  const totalOwed = manageLoanSelected.total_amount || manageLoanSelected.amount || 0;
                                  const amountPaid = manageLoanSelected.amount_paid || 0;
                                  const remaining = totalOwed - amountPaid;
                                  const percentPaid = totalOwed > 0 ? Math.round((amountPaid / totalOwed) * 100) : 0;
                                  const circumference = 2 * Math.PI * 45;
                                  const strokeDashoffset = circumference - (percentPaid / 100) * circumference;

                                  return (
                                    <>
                                      <div className="relative w-32 h-32">
                                        <svg className="w-full h-full transform -rotate-90">
                                          <circle cx="64" cy="64" r="45" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                          <circle
                                            cx="64"
                                            cy="64"
                                            r="45"
                                            fill="none"
                                            stroke="#03ACEA"
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            className="transition-all duration-500"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                          <span className="text-2xl font-bold text-slate-800">{percentPaid}%</span>
                                          <span className="text-xs text-slate-500">Paid</span>
                                        </div>
                                      </div>
                                      <div className="mt-3 text-center">
                                        <p className="text-xs text-slate-600">
                                          <span className="text-slate-800 font-semibold">${remaining.toLocaleString()}</span> remaining{manageLoanSelected.next_payment_date ? ` due ${format(new Date(manageLoanSelected.next_payment_date), 'MMM d')}` : ''}
                                        </p>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Next Payment Date - Middle */}
                            <div className="bg-[#03ACEA]/8 rounded-2xl p-5 flex flex-col">
                              <p className="text-[10px] text-slate-700 uppercase tracking-[0.12em] font-medium mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                                Next Payment Date
                              </p>
                              <div className="flex-1 flex flex-col items-center justify-center">
                                <p className="text-2xl font-bold text-slate-800">
                                  {manageLoanSelected.next_payment_date
                                    ? format(new Date(manageLoanSelected.next_payment_date), 'MMM d, yyyy')
                                    : 'N/A'}
                                </p>
                                {manageLoanSelected.next_payment_date && (
                                  <div className="mt-2 px-3 py-1 bg-white rounded-full">
                                    <p className="text-sm font-semibold text-[#03ACEA]">
                                      {(() => {
                                        const days = daysUntilDate(manageLoanSelected.next_payment_date);
                                        return days > 0 ? `${days} day${days !== 1 ? 's' : ''} away` : days === 0 ? 'Due today' : `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} overdue`;
                                      })()}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Payment Amount - Right */}
                            <div className="bg-[#03ACEA]/8 rounded-2xl p-5 flex flex-col">
                              <p className="text-[10px] text-slate-700 uppercase tracking-[0.12em] font-medium mb-2" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                                Payment Amount
                              </p>
                              <div className="flex-1 flex flex-col items-center justify-center">
                                <p className="text-3xl font-bold text-slate-800">
                                  ${(manageLoanSelected.payment_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-sm text-slate-600 mt-1 capitalize">
                                  {manageLoanSelected.payment_frequency || 'One-time'} payment
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Interest + Document Center Row */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Interest Box + Loan Amounts - Left */}
                            <div className="space-y-4">
                              <PageCard title="Interest">
                              <div className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="bg-[#03ACEA]/8 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Interest Accrued</p>
                                    <p className="text-xl font-bold text-slate-800">
                                      ${(() => {
                                        const principal = manageLoanSelected.amount || 0;
                                        const total = manageLoanSelected.total_amount || principal;
                                        return (total - principal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      })()}
                                    </p>
                                  </div>
                                  <div className="bg-[#03ACEA]/8 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Predicted Interest</p>
                                    <p className="text-xl font-bold text-slate-800">
                                      ${(() => {
                                        const principal = manageLoanSelected.amount || 0;
                                        const rate = (manageLoanSelected.interest_rate || 0) / 100;
                                        const period = manageLoanSelected.repayment_period || 12;
                                        const unit = manageLoanSelected.repayment_unit || 'months';
                                        const years = unit === 'months' ? period / 12 : period / 52;
                                        return (principal * rate * years).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              </PageCard>
                              {/* Loan Progress Box */}
                              <PageCard title="Loan Progress">
                              <div className="p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="bg-[#03ACEA]/10 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Amount Paid</p>
                                    <p className="text-xl font-bold text-black">
                                      ${(manageLoanSelected.amount_paid || 0).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="bg-[#03ACEA]/10 rounded-xl p-4">
                                    <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>Completed Payments</p>
                                    <p className="text-xl font-bold text-slate-800">
                                      {(() => {
                                        const paymentAmt = manageLoanSelected.payment_amount || 0;
                                        const totalAmt = manageLoanSelected.total_amount || manageLoanSelected.amount || 0;
                                        const amtPaid = manageLoanSelected.amount_paid || 0;
                                        const completed = paymentAmt > 0 ? Math.floor(amtPaid / paymentAmt) : 0;
                                        const totalPayments = paymentAmt > 0 ? Math.ceil(totalAmt / paymentAmt) : 0;
                                        return `${completed}/${totalPayments}`;
                                      })()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              </PageCard>
                            </div>

                            {/* Document Center Box - Right */}
                            <PageCard title="Document Center">
                            <div className="p-4">
                              {(() => {
                                const agreement = getAgreementForLoan(manageLoanSelected.id);
                                if (!agreement) {
                                  return (
                                    <div className="text-center py-6 text-slate-500">
                                      <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No signed agreement found for this loan</p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="flex flex-col gap-3">
                                    {/* Loan Summary */}
                                    <button
                                      onClick={() => openDocPopup('summary', agreement)}
                                      className="bg-[#03ACEA]/8 rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3"
                                    >
                                      <div className="w-9 h-9 rounded-full bg-[#03ACEA]/10 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-4 h-4 text-[#1A1918]" />
                                      </div>
                                      <p className="font-semibold text-[#1A1918] text-[14px] group-hover:text-[#5a7ae0] transition-colors">
                                        Loan Summary
                                      </p>
                                    </button>

                                    {/* Promissory Note */}
                                    <button
                                      onClick={() => openDocPopup('promissory', agreement)}
                                      className="bg-[#03ACEA]/10 rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3"
                                    >
                                      <div className="w-9 h-9 rounded-full bg-[#03ACEA]/10 flex items-center justify-center flex-shrink-0">
                                        <ClipboardList className="w-4 h-4 text-[#1A1918]" />
                                      </div>
                                      <p className="font-semibold text-[#1A1918] text-[14px] group-hover:text-[#5a7ae0] transition-colors">
                                        Promissory Note
                                      </p>
                                      <div
                                        className="relative ml-auto"
                                        onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip('promissory'); }}
                                        onMouseLeave={() => setActiveInfoTooltip(null)}
                                        onClick={(e) => { e.stopPropagation(); setActiveInfoTooltip(activeInfoTooltip === 'promissory' ? null : 'promissory'); }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center cursor-help shadow-sm">
                                          <span className="text-[10px] font-bold text-white">i</span>
                                        </div>
                                        {activeInfoTooltip === 'promissory' && (
                                          <div className="absolute bottom-full right-0 mb-2 z-[9999] w-56 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg">
                                            A promissory note is a legal document where the borrower promises to repay the loan amount plus any interest by a specific date. It serves as written proof of the debt.
                                            <div className="absolute top-full right-2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
                                          </div>
                                        )}
                                      </div>
                                    </button>

                                    {/* Amortization Schedule */}
                                    <button
                                      onClick={() => openDocPopup('amortization', agreement)}
                                      className="bg-[#2563EB]/8 rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3"
                                    >
                                      <div className="w-9 h-9 rounded-full bg-[#03ACEA]/10 flex items-center justify-center flex-shrink-0">
                                        <BarChart3 className="w-4 h-4 text-[#1A1918]" />
                                      </div>
                                      <p className="font-semibold text-[#1A1918] text-[14px] group-hover:text-[#5a7ae0] transition-colors">
                                        Amortization Schedule
                                      </p>
                                      <div
                                        className="relative ml-auto"
                                        onMouseEnter={(e) => { e.stopPropagation(); setActiveInfoTooltip('amortization'); }}
                                        onMouseLeave={() => setActiveInfoTooltip(null)}
                                        onClick={(e) => { e.stopPropagation(); setActiveInfoTooltip(activeInfoTooltip === 'amortization' ? null : 'amortization'); }}
                                      >
                                        <div className="w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center cursor-help shadow-sm">
                                          <span className="text-[10px] font-bold text-white">i</span>
                                        </div>
                                        {activeInfoTooltip === 'amortization' && (
                                          <div className="absolute bottom-full right-0 mb-2 z-[9999] w-56 bg-slate-800 text-white text-xs rounded-lg p-3 shadow-lg">
                                            An amortization schedule shows the breakdown of each payment over the life of the loan, including how much goes toward principal vs. interest.
                                            <div className="absolute top-full right-2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800" />
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                            </PageCard>
                          </div>

                          {/* Actions Box - only show for active loans */}
                          {manageLoanSelected.status !== 'cancelled' && (
                          <PageCard title="Loan Actions">
                          <div className="p-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() => handleMakePayment(manageLoanSelected)}
                                className="bg-[#03ACEA]/8 rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3 flex-1"
                              >
                                <div className="w-9 h-9 rounded-full bg-[#03ACEA]/10 flex items-center justify-center flex-shrink-0">
                                  <DollarSign className="w-4 h-4 text-[#1A1918]" />
                                </div>
                                <p className="font-semibold text-[#1A1918] text-[14px] group-hover:text-[#5a7ae0] transition-colors">
                                  Record Payment
                                </p>
                              </button>
                              <button
                                onClick={() => handleEditLoan(manageLoanSelected)}
                                className="bg-[#03ACEA]/10 rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3 flex-1"
                              >
                                <div className="w-9 h-9 rounded-full bg-[#03ACEA]/10 flex items-center justify-center flex-shrink-0">
                                  <Pencil className="w-4 h-4 text-[#1A1918]" />
                                </div>
                                <p className="font-semibold text-[#1A1918] text-[14px] group-hover:text-[#5a7ae0] transition-colors">
                                  Request Loan Edit
                                </p>
                              </button>
                              <button
                                onClick={() => handleCancelLoan(manageLoanSelected)}
                                className="bg-[#2563EB]/8 rounded-xl p-3 md:p-4 text-left hover:opacity-90 transition-all duration-200 cursor-pointer group flex items-center gap-3 flex-1"
                              >
                                <div className="w-9 h-9 rounded-full bg-[#03ACEA]/10 flex items-center justify-center flex-shrink-0">
                                  <X className="w-4 h-4 text-[#1A1918]" />
                                </div>
                                <p className="font-semibold text-[#1A1918] text-[14px] group-hover:text-[#5a7ae0] transition-colors">
                                  Request Loan Cancellation
                                </p>
                              </button>
                            </div>
                          </div>
                          </PageCard>
                          )}

                          {/* Cancelled notice */}
                          {manageLoanSelected.status === 'cancelled' && (
                            <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
                              <p className="text-sm text-red-600 font-medium">This loan has been cancelled. Documentation is still available above.</p>
                            </div>
                          )}
                        </>
                      )}
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>

          </div>

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
        <AlertDialogContent className="rounded-2xl border-0 p-0 overflow-hidden" style={{ backgroundColor: '#fafafa' }}>
          <div className="p-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}>Cancel Loan</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-slate-600 mt-1">
                Are you sure you want to cancel this loan? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="flex-1 rounded-xl border-0 font-semibold text-[#1A1918] text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: 'rgba(3,172,234,0.1)' }}>
              Keep Loan
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelLoan} className="flex-1 rounded-xl border-0 font-semibold text-[#1A1918] text-[14px] h-12 hover:opacity-90 transition-all" style={{ backgroundColor: 'rgba(3,172,234,0.12)' }}>
              Request Loan Cancellation
            </AlertDialogAction>
          </div>
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
