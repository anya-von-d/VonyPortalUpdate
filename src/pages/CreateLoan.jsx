import React, { useState, useEffect } from "react";
import { Loan, LoanAgreement, User, PublicProfile, Friendship } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserSelector } from "@/components/ui/user-selector";
import SignatureModal from "@/components/loans/SignatureModal";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PlusCircle, DollarSign, Calendar, Percent, FileText, User as UserIcon, AlertCircle, Zap, ClipboardList, Users, Send } from "lucide-react";
import { motion } from "framer-motion";
import { addMonths, format } from "date-fns";

export default function CreateLoan() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [friends, setFriends] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingLoanData, setPendingLoanData] = useState(null);
  const [loanType, setLoanType] = useState('flexible'); // 'flexible' or 'scheduled'
  const [hasFriends, setHasFriends] = useState(true);
  const [formData, setFormData] = useState({
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

  // Determine if user is the lender or borrower based on selection
  const isUserLender = !formData.lender_username || formData.lender_username === currentUserProfile?.username;
  const isUserBorrower = formData.lender_username && formData.lender_username !== currentUserProfile?.username;

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const [publicProfiles, allFriendships] = await Promise.all([
        PublicProfile.list().catch(() => []),
        Friendship.list().catch(() => [])
      ]);
      const safeProfiles = Array.isArray(publicProfiles) ? publicProfiles : [];

      // Get current user's profile
      const myProfile = safeProfiles.find(p => p.user_id === user.id);
      setCurrentUserProfile(myProfile || { user_id: user.id, username: user.username, full_name: user.full_name });

      // Get accepted friendships involving this user
      const myFriendships = allFriendships.filter(f =>
        f.status === 'accepted' &&
        (f.user_id === user.id || f.friend_id === user.id)
      );

      if (myFriendships.length === 0) {
        setHasFriends(false);
        setFriends([]);
        setIsLoadingUsers(false);
        return;
      }

      setHasFriends(true);

      // Get friend user IDs
      const friendUserIds = myFriendships.map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Build friendship starred map
      const starredMap = {};
      myFriendships.forEach(f => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
        starredMap[friendId] = f.is_starred || false;
      });

      // Filter profiles to only friends, exclude sample users
      const friendProfiles = safeProfiles
        .filter(p => p && friendUserIds.includes(p.user_id) && !p.user_id.startsWith('sample-user-'))
        .map(p => ({ ...p, is_starred: starredMap[p.user_id] || false }));

      // Remove duplicates
      const uniqueFriends = Array.from(new Map(friendProfiles.map(u => [u.user_id, u])).values());

      // Sort: starred first, then alphabetically
      uniqueFriends.sort((a, b) => {
        if (a.is_starred && !b.is_starred) return -1;
        if (!a.is_starred && b.is_starred) return 1;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

      setFriends(uniqueFriends);

    } catch (error) {
      console.error("Error loading users:", error);
      setFriends([]);
    }
    setIsLoadingUsers(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        default: // monthly
          paymentAmount = totalAmount / periodInMonths;
      }
      return { totalAmount, paymentAmount, totalInterest: totalAmount - amount };
    }
    return { totalAmount: 0, paymentAmount: 0, totalInterest: 0 };
  };

  const findUserByUsername = async (username) => {
    if (!username) return null;

    // Check if it's the current user
    if (currentUserProfile && currentUserProfile.username === username) {
      return currentUserProfile;
    }

    const foundInLocal = friends.find(u => u && u.username === username);
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

      // Determine lender and borrower based on role
      let lenderUsername, borrowerUsername;
      if (isUserLender) {
        lenderUsername = currentUserProfile?.username;
        borrowerUsername = formData.borrower_username.trim();
      } else {
        lenderUsername = formData.lender_username.trim();
        borrowerUsername = currentUserProfile?.username;
      }

      if (!borrowerUsername) {
        alert("Please select or enter the borrower.");
        setIsSubmitting(false);
        return;
      }
      if (!lenderUsername) {
        alert("Please select or enter the lender.");
        setIsSubmitting(false);
        return;
      }

      const lenderProfile = await findUserByUsername(lenderUsername);
      const borrowerProfile = await findUserByUsername(borrowerUsername);

      if (!lenderProfile || !lenderProfile.user_id) {
        alert(`Lender "${lenderUsername}" could not be found.`);
        setIsSubmitting(false);
        return;
      }

      if (!borrowerProfile || !borrowerProfile.user_id) {
        alert(`Borrower "${borrowerUsername}" could not be found.`);
        setIsSubmitting(false);
        return;
      }

      if (lenderProfile.user_id === borrowerProfile.user_id) {
        alert("The lender and borrower cannot be the same person.");
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
        dueDate = addMonths(new Date(), parseInt(formData.repayment_period));
      }

      const loanData = {
        lender_id: lenderProfile.user_id,
        borrower_id: borrowerProfile.user_id,
        amount: parseFloat(formData.amount),
        interest_rate: parseFloat(formData.interest_rate),
        repayment_period: parseInt(formData.repayment_period),
        repayment_unit: formData.repayment_unit,
        payment_frequency: formData.payment_frequency,
        purpose: formData.purpose,
        status: 'pending',
        due_date: format(dueDate, 'yyyy-MM-dd'),
        total_amount: details.totalAmount,
        payment_amount: details.paymentAmount,
        next_payment_date: format(addMonths(new Date(), 1), 'yyyy-MM-dd')
      };

      // Store loan data and show signature modal
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
      // Create the loan
      const createdLoan = await Loan.create(pendingLoanData);

      // Create the agreement with signer's signature
      const agreementData = {
        loan_id: createdLoan.id,
        lender_id: pendingLoanData.lender_id,
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

      if (isUserLender) {
        agreementData.lender_name = signature;
        agreementData.lender_signed_date = new Date().toISOString();
      } else {
        agreementData.borrower_name = signature;
        agreementData.borrower_signed_date = new Date().toISOString();
      }

      await LoanAgreement.create(agreementData);

      setShowSignatureModal(false);
      navigate(createPageUrl("MyLoans"));
    } catch (error) {
      console.error("Error creating loan and agreement:", error);
      alert(`Error: ${error.message || "Please try again."}`);
    }
    setIsSubmitting(false);
  };

  const details = calculateLoanDetails();

  // Build lender dropdown users: self first, then starred friends, then others
  const lenderDropdownUsers = (() => {
    const selfEntry = currentUserProfile ? [{
      ...currentUserProfile,
      full_name: `${currentUserProfile.full_name || 'You'} (Yourself)`,
      _isSelf: true
    }] : [];
    return [...selfEntry, ...friends.filter(f => f.username !== formData.borrower_username)];
  })();

  // Build borrower dropdown users: self first (if user is borrower), then starred friends, then others
  const borrowerDropdownUsers = (() => {
    if (isUserBorrower) {
      // User is borrower — no need for dropdown, but show self
      return [];
    }
    // User is lender — show friends excluding selected lender
    return friends.filter(f => f.username !== formData.lender_username);
  })();

  // Get the selected other party's username for display
  const otherPartyUsername = isUserLender
    ? formData.borrower_username
    : formData.lender_username;

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
        signingAs={isUserLender ? "Lender" : "Borrower"}
      />
      <div className="min-h-screen p-6" style={{background: `linear-gradient(to bottom right, rgb(var(--theme-bg-from)), rgb(var(--theme-bg-to)))`}}>
        <div className="max-w-4xl mx-auto space-y-7">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-5"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight text-left">
            {isUserLender ? 'Create Loan Offer' : 'Request to Borrow'}
          </h1>
        </motion.div>

        {/* No Friends Banner */}
        {!isLoadingUsers && !hasFriends && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="rounded-xl px-5 py-4 bg-amber-50 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  You can only send offers to people in your friends list
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={createPageUrl("Friends")}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#35B276] text-white font-semibold text-sm hover:bg-[#2da068] transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Find Your Friends
                </Link>
                <Link
                  to={createPageUrl("Friends")}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Invite Your Friends
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="bg-[#DBFFEB] backdrop-blur-sm border-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4 text-green-600" />
                  </div>
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-3">
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Lender Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-green-600" />
                      Select the Lender
                    </Label>

                    {isLoadingUsers ? (
                      <div className="h-10 bg-slate-100 rounded-md animate-pulse flex items-center px-3">
                        <span className="text-slate-500">Loading friends...</span>
                      </div>
                    ) : (
                      <UserSelector
                        users={lenderDropdownUsers}
                        value={formData.lender_username || currentUserProfile?.username || ''}
                        onSelect={(username) => {
                          handleInputChange('lender_username', username);
                          // If selecting yourself as lender, clear borrower if it was auto-set to self
                          if (username === currentUserProfile?.username || !username) {
                            // User is lender — keep borrower as is
                          } else {
                            // User is borrower — clear borrower_username since it'll be auto self
                            handleInputChange('borrower_username', '');
                          }
                        }}
                        placeholder="Choose the lender (yourself or a friend)..."
                        showAddFriends
                        onAddFriends={() => navigate(createPageUrl("Friends"))}
                      />
                    )}
                  </div>

                  {/* Borrower Selection — only show if user is lender */}
                  {isUserLender && (
                    <div className="space-y-2">
                      <Label htmlFor="borrower_username" className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-green-600" />
                        Select the Borrower
                      </Label>

                      {isLoadingUsers ? (
                        <div className="h-10 bg-slate-100 rounded-md animate-pulse flex items-center px-3">
                          <span className="text-slate-500">Loading friends...</span>
                        </div>
                      ) : (
                        <UserSelector
                          users={borrowerDropdownUsers}
                          value={formData.borrower_username}
                          onSelect={(username) => handleInputChange('borrower_username', username)}
                          placeholder="Choose a friend..."
                          showAddFriends
                          onAddFriends={() => navigate(createPageUrl("Friends"))}
                        />
                      )}
                    </div>
                  )}

                  {/* If user is borrower, show who they're borrowing from */}
                  {isUserBorrower && formData.lender_username && (
                    <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        The borrower requests to receive a loan of
                        <span className="font-bold"> ${parseFloat(formData.amount || 0).toLocaleString() || '___'}</span> from
                        <span className="font-bold"> @{formData.lender_username}</span>
                        {loanType === 'scheduled' && formData.repayment_period && (
                          <span> before <span className="font-bold">
                            {formData.repayment_unit === 'custom' && formData.custom_due_date
                              ? format(new Date(formData.custom_due_date), 'MMMM d, yyyy')
                              : formData.repayment_unit === 'days'
                              ? format(new Date(new Date().setDate(new Date().getDate() + parseInt(formData.repayment_period || 0))), 'MMMM d, yyyy')
                              : formData.repayment_unit === 'weeks'
                              ? format(new Date(new Date().setDate(new Date().getDate() + parseInt(formData.repayment_period || 0) * 7)), 'MMMM d, yyyy')
                              : format(addMonths(new Date(), parseInt(formData.repayment_period || 0)), 'MMMM d, yyyy')
                            }
                          </span></span>
                        )}.
                      </p>
                    </div>
                  )}

                  {/* Loan Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
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

                  {/* What's this for? */}
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      What's this for?
                    </Label>
                    <Input
                      id="purpose"
                      type="text"
                      placeholder="e.g., Concert tickets, Rent, Trip to Vegas..."
                      value={formData.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                      maxLength={100}
                    />
                    <p className="text-xs text-slate-500">
                      {isUserLender
                        ? "Help your friend understand what this loan is for"
                        : "Explain why you need to borrow this amount"}
                    </p>
                  </div>

                  {/* Interest Rate - Only show for scheduled loans */}
                  {loanType === 'scheduled' && (
                    <div className="space-y-2">
                      <Label htmlFor="interest_rate" className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-green-600" />
                        Interest Rate (% per year)
                      </Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        step="0.1"
                        min="0"
                        max="8"
                        placeholder="Enter rate (max 8%)"
                        value={formData.interest_rate}
                        onChange={(e) => handleInputChange('interest_rate', e.target.value)}
                        required={loanType === 'scheduled'}
                      />
                    </div>
                  )}

                  {/* Repayment Period - Only show for scheduled loans */}
                  {loanType === 'scheduled' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        Repayment Period
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Select
                          value={formData.repayment_unit}
                          onValueChange={(value) => handleInputChange('repayment_unit', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time unit" />
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
                            required={loanType === 'scheduled'}
                          />
                        ) : (
                          <Input
                            id="repayment_period"
                            type="number"
                            min="1"
                            placeholder={`Enter ${formData.repayment_unit}`}
                            value={formData.repayment_period}
                            onChange={(e) => handleInputChange('repayment_period', e.target.value)}
                            required={loanType === 'scheduled'}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Frequency - Only show for scheduled loans */}
                  {loanType === 'scheduled' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        Payment Frequency
                      </Label>
                      <Select
                        value={formData.payment_frequency}
                        onValueChange={(value) => handleInputChange('payment_frequency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment frequency" />
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
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || !hasFriends || (isUserLender ? !formData.borrower_username : !formData.lender_username) || !formData.amount || (loanType === 'scheduled' && (!formData.interest_rate || (formData.repayment_unit === 'custom' ? !formData.custom_due_date : !formData.repayment_period)))}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
                  >
                    {isSubmitting
                      ? (isUserLender ? "Sending Loan Offer..." : "Sending Borrow Request...")
                      : (isUserLender ? "Send Loan Offer" : "Request to Borrow")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Loan Summary */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="text-white sticky top-6" style={{backgroundColor: '#35B276'}}>
              <CardHeader>
                <CardTitle className="text-2xl">Loan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {formData.purpose && (
                    <div className="pb-2 border-b border-green-400/50">
                      <span className="opacity-75 text-sm">For:</span>
                      <p className="font-medium">{formData.purpose}</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="opacity-90">Loan Amount:</span>
                    <span className="font-bold">
                      ${parseFloat(formData.amount || 0).toLocaleString()}
                    </span>
                  </div>

                  {loanType === 'scheduled' && (
                    <div className="flex justify-between">
                      <span className="opacity-90">Total Interest:</span>
                      <span className="font-bold">
                        ${details.totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  )}

                  <div className="border-t opacity-80 pt-3">
                    <div className="flex justify-between text-lg">
                      <span>Total Repayment:</span>
                      <span className="font-bold">
                        ${loanType === 'flexible'
                          ? parseFloat(formData.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                          : details.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                  </div>

                  {/* Monthly payment info — adapts to lender/borrower role */}
                  {loanType === 'scheduled' && details.paymentAmount > 0 && formData.payment_frequency !== 'none' && (
                    <div className="border-t border-green-400/50 pt-3">
                      <p className="text-sm opacity-90">
                        {isUserBorrower
                          ? `You will pay $${details.paymentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${formData.payment_frequency} after interest`
                          : `Borrower will pay $${details.paymentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${formData.payment_frequency} after interest`}
                      </p>
                    </div>
                  )}
                </div>

                {loanType === 'scheduled' && ((formData.repayment_period && formData.repayment_unit !== 'custom') || (formData.repayment_unit === 'custom' && formData.custom_due_date)) && (
                  <div className="text-sm opacity-90 border-t border-green-400 pt-3">
                    <p>Loan will be fully repaid by:</p>
                    <p className="font-semibold text-green-100">
                      {formData.repayment_unit === 'custom' && formData.custom_due_date
                        ? format(new Date(formData.custom_due_date), 'MMMM d, yyyy')
                        : formData.repayment_unit === 'days'
                        ? format(new Date(new Date().setDate(new Date().getDate() + parseInt(formData.repayment_period || 0))), 'MMMM d, yyyy')
                        : formData.repayment_unit === 'weeks'
                        ? format(new Date(new Date().setDate(new Date().getDate() + parseInt(formData.repayment_period || 0) * 7)), 'MMMM d, yyyy')
                        : format(addMonths(new Date(), parseInt(formData.repayment_period || 0)), 'MMMM d, yyyy')
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flexible/Scheduled Switch */}
            <div className="bg-[#DBFFEB] backdrop-blur-sm border-0 rounded-lg p-4">
              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-medium ${loanType === 'flexible' ? 'text-[#35B276]' : 'text-slate-400'}`}>Flexible</span>
                <button
                  type="button"
                  onClick={() => setLoanType(loanType === 'flexible' ? 'scheduled' : 'flexible')}
                  className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
                    loanType === 'scheduled' ? 'bg-[#35B276]' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-white ${
                    loanType === 'scheduled' ? 'translate-x-8' : 'translate-x-0'
                  }`}>
                    {loanType === 'flexible' ? (
                      <Zap className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ClipboardList className="w-3 h-3 text-[#35B276]" />
                    )}
                  </div>
                </button>
                <span className={`text-sm font-medium ${loanType === 'scheduled' ? 'text-[#35B276]' : 'text-slate-400'}`}>Scheduled</span>
              </div>
              <p className="text-xs text-slate-500 text-center mt-3">
                {loanType === 'flexible'
                  ? "Perfect for casual loans between friends, no interest, no strict schedule. Pay back whenever works for both of you."
                  : "For formal agreements with interest rates and set payment schedules. Ideal for larger amounts that need structure."}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
