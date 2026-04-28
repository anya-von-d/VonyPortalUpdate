/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import BorrowingSummary from './pages/BorrowingSummary';
import CreateOffer from './pages/CreateOffer';
import Home from './pages/Home';
import LendingSummary from './pages/LendingSummary';
import LoanAgreements from './pages/LoanAgreements';
import Profile from './pages/Profile';
import RecordPayment from './pages/RecordPayment';
import RecentActivity from './pages/RecentActivity';
import ComingSoon from './pages/ComingSoon';
import LoanHelp from './pages/LoanHelp';
import Upcoming from './pages/Upcoming';
import YourLoans from './pages/YourLoans';
import LendingBorrowing from './pages/LendingBorrowing';
import Notifications from './pages/Notifications';
import PlanYourMonth from './pages/PlanYourMonth';
import Friends from './pages/Friends';
import LoanDetail from './pages/LoanDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Borrowing": BorrowingSummary,
    "CreateOffer": CreateOffer,
    "Home": Home,
    "Lending": LendingSummary,
    "LoanAgreements": LoanAgreements,
    "Profile": Profile,
    "RecordPayment": RecordPayment,
    "RecentActivity": RecentActivity,
    "ComingSoon": ComingSoon,
    "Learn": ComingSoon,
    "LoanHelp": LoanHelp,
    "Upcoming": Upcoming,
    "YourLoans": YourLoans,
    "LendingBorrowing": LendingBorrowing,
    "Notifications": Notifications,
    "PlanYourMonth": PlanYourMonth,
    "Friends": Friends,
    "LoanDetail": LoanDetail,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};