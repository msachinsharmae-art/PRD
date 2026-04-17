// @ts-check
// ESSPage — selectors, navigation helpers, and actions for the entire ESS Portal

const ESS_CREDENTIALS = {
  username: 'sachin.sharma+demo@zimyo.com',
  password: 'Zimyo@12345',
};

const ESS_URL = 'https://www.zimyo.net';

// ─── Selectors ──────────────────────────────────────────────
const S = {
  // Login
  username: '#username',
  password: '#password',
  loginBtn: 'button[type="submit"]',

  // App Switcher (nine-dot)
  appSwitcher: '.MuiIconButton-root svg[data-testid="AppsIcon"]',
  essOption: 'text=ESS',

  // Global ESS
  sidebar: {
    dashboard: 'a[href*="/ess/dashboard"]',
    engage: 'a[href*="/ess/engage"]',
    request: 'a[href*="/ess/request"]',
    attendance: 'a[href*="/ess/leave-and-attendance"]',
    pay: 'a[href*="/ess/pay"]',
    finance: 'a[href*="/ess/finance-bundle"]',
    task: 'a[href*="/ess/task"]',
    org: 'a[href*="/ess/hr"]',
    timesheet: 'a[href*="/ess/timesheet"]',
    rewards: 'a[href*="/ess/rewards"]',
    recruit: 'a[href*="/ess/recruit"]',
    learn: 'a[href*="/ess/learn"]',
    performance: 'a[href*="/ess/performance"]',
  },

  // Common UI patterns
  applyNewBtn: 'button:has-text("Apply New")',
  muiTab: (name) => `.MuiTab-root:has-text("${name}")`,
  muiTabSelected: (name) => `.MuiTab-root.Mui-selected:has-text("${name}")`,
  listItemBtn: (name) => `.MuiListItemButton-root:has-text("${name}")`,
  muiBtn: (name) => `button.MuiButton-root:has-text("${name}")`,
  muiIconBtn: (name) => `button.MuiIconButton-root:has-text("${name}")`,
  tableBody: 'table tbody, .MuiTableBody-root',
  tableRow: 'table tbody tr, .MuiTableBody-root .MuiTableRow-root',
  noDataText: 'text=No Requests Found',
  searchInput: 'input[placeholder*="Search"]',
  dateInputFrom: 'input[placeholder="dd/mm/yyyy"]:first-of-type',
  dateInputTo: 'input[placeholder="dd/mm/yyyy"]:last-of-type',
  modalDialog: '[role="dialog"], .MuiDialog-root, .MuiDrawer-root',
  popover: '.MuiPopover-paper, .MuiMenu-list',

  // ── Dashboard ──
  dashboard: {
    clockInBtn: 'button:has-text("Clock In")',
    clockOutBtn: 'button:has-text("Clock Out")',
    moodBtn: 'button:has-text("Mood")',
    addAnnouncementBtn: 'button:has-text("Add")',
    addTaskBtn: 'button:has-text("+ Add New")',
    celebrationsBtn: 'button:has-text("All Celebrations")',
    onLeaveBtn: 'button:has-text("On Leave")',
    referCandidateBtn: 'button:has-text("Refer Candidate")',
    copyBtn: 'button:has-text("Copy")',
  },

  // ── Request ──
  request: {
    selfTab: '.MuiTab-root:has-text("Self")',
    teamTab: '.MuiTab-root:has-text("Team")',
    bulkApproveBtn: 'button:has-text("Bulk Approve")',
    filterRaiseDate: 'text=Raise Date',
    filterApplyDate: 'text=Apply Date',
    statusDropdown: '#react-select-2-input, #react-select-3-input',
    // Request categories (left sidebar)
    categories: {
      employee: '.MuiListItemButton-root:has-text("Employee")',
      leaveAttendance: '.MuiListItemButton-root:has-text("Leave & Attendance")',
      document: '.MuiListItemButton-root:has-text("Document")',
      onboarding: '.MuiListItemButton-root:has-text("Onboarding")',
      offboarding: '.MuiListItemButton-root:has-text("Offboarding")',
      asset: '.MuiListItemButton-root:has-text("Asset")',
      requisition: '.MuiListItemButton-root:has-text("Requisition")',
      expense: '.MuiListItemButton-root:has-text("Expense")',
      vendor: '.MuiListItemButton-root:has-text("Vendor")',
      pettyCash: '.MuiListItemButton-root:has-text("Petty Cash")',
      travelDesk: '.MuiListItemButton-root:has-text("Travel Desk")',
      loanAdvance: '.MuiListItemButton-root:has-text("Loan and Advance")',
      taskManagement: '.MuiListItemButton-root:has-text("Task Mangement")',
      checklist: '.MuiListItemButton-root:has-text("Checklist")',
      internalJobPosting: '.MuiListItemButton-root:has-text("Internal Job Posting")',
      roaster: '.MuiListItemButton-root:has-text("Roaster")',
      myTeamApproval: '.MuiListItemButton-root:has-text("My Team Approval")',
    },
    // Inner tabs
    innerTabs: {
      makerChecker: '.MuiTab-root:has-text("Maker and Checker")',
      probationConfirmation: '.MuiTab-root:has-text("Probation Confirmation")',
      probationFeedback: '.MuiTab-root:has-text("Probation Feedback")',
      probationFeedbackSurvey: '.MuiTab-root:has-text("Probation Feedback Survey")',
      transfer: '.MuiTab-root:has-text("Transfer")',
      pip: '.MuiTab-root:has-text("Performance Improvement Plan")',
      rejoining: '.MuiTab-root:has-text("Rejoining Confirmation")',
    },
  },

  // ── Apply New dropdown items ──
  applyNewOptions: {
    leave: '[role="menuitem"]:has-text("Leave"), .MuiMenuItem-root:has-text("Leave")',
    regularisation: 'text=Regularisation',
    wfh: 'text=Work From Home',
    onDuty: 'text=On Duty',
    compOff: 'text=Comp Off',
    expense: 'li:has-text("Expense")',
    restrictedHoliday: 'text=Restricted Holiday',
    requisition: 'li:has-text("Requisition")',
    shortLeave: 'text=Short Leave',
    pettyCash: 'li:has-text("Petty Cash")',
    pettyExpense: 'text=Petty Expense',
    overtime: 'text=OverTime',
    travelDesk: 'li:has-text("Travel Desk")',
    documentRequest: 'text=Document Request',
    localStays: 'text=Local Stays',
    rejoiningRequest: 'text=Rejoining Request',
  },

  // ── Attendance ──
  attendance: {
    myAttendanceTab: '.MuiTab-root:has-text("My Attendance")',
    myLeaveTab: '.MuiTab-root:has-text("My Leave")',
    teamAttendanceTab: '.MuiTab-root:has-text("Team Attendance")',
    teamRosterTab: '.MuiTab-root:has-text("Team Roster")',
    snapshotTab: '.MuiTab-root:has-text("Attendance Snapshot")',
    applyLeaveBtn: 'button:has-text("Apply")',
    presentCard: 'text=Present',
    absentCard: 'text=Absent',
    holidayCard: 'text=Holiday',
    leavesCard: 'text=Leaves',
    weekOffCard: 'text=Week Off',
    penaltiesCard: 'text=Penalties',
  },

  // ── Finance ──
  finance: {
    expenseTab: '.MuiTab-root:has-text("Expense")',
    travelDeskTab: '.MuiTab-root:has-text("Travel Desk")',
    pettyCashTab: '.MuiTab-root:has-text("Petty Cash")',
    vendorTab: '.MuiTab-root:has-text("Vendor")',
    myExpenseSubTab: 'text=My Expense',
    apAccessSubTab: 'text=AP Access',
    apReportSubTab: 'text=AP Report',
    raiseNewRequestBtn: 'button:has-text("Raise New Request")',
    attachedPoliciesLink: 'text=Attached Policies',
  },

  // ── Task ──
  task: {
    dashboardTab: 'a[href*="/ess/task/dashboard"]',
    listTab: 'a[href*="/ess/task/list"]',
    totalTaskCard: 'text=Total Task',
    completedCard: 'text=Completed',
    pendingCard: 'text=Pending',
    overdueCard: 'text=Overdue',
  },

  // ── Org ──
  org: {
    dashboardTab: 'a[href*="/ess/hr/dashboard"]',
    directoryTab: 'a[href*="/ess/hr/directory"]',
    policyTab: 'a[href*="/ess/hr/policy"]',
    knowledgeBaseTab: 'a[href*="/ess/hr/knowledge-base"]',
    helpdeskTab: 'a[href*="/ess/hr/helpdesk"]',
    reportsTab: 'a[href*="/ess/hr/reports"]',
    directReportingTab: 'text=Direct Reporting',
    indirectReportingTab: 'text=Indirect Reporting',
    departmentTab: 'text=Department',
    raiseTicketBtn: 'button:has-text("Raise")',
  },

  // ── Timesheet ──
  timesheet: {
    dashboardTab: 'a[href*="/ess/timesheet/dashboard"]',
    tasksTab: 'a[href*="/ess/timesheet/tasks"]',
    projectsTab: 'a[href*="/ess/timesheet/projects"]',
    approvalsTab: 'a[href*="/ess/timesheet/approvals"]',
    timelogTab: 'a[href*="/ess/timesheet/timelog"]',
    reportsTab: 'a[href*="/ess/timesheet/reports"]',
    myDashboardToggle: 'text=My Dashboard',
    allTeamToggle: 'text=All Team',
    resetBtn: 'text=Reset',
    projectsCard: 'text=Projects',
    tasksCard: 'text=Tasks',
    logsCard: 'text=Logs',
    timesheetsCard: 'text=Timesheets',
  },

  // ── Rewards ──
  rewards: {
    homeTab: '.MuiTab-root:has-text("Home")',
    myRecognitionsTab: '.MuiTab-root:has-text("My Recognitions")',
    walletTab: '.MuiTab-root:has-text("Wallet")',
    recognizeBtn: 'button:has-text("Recognize")',
    teamToggle: 'text=Team',
    orgToggle: 'text=Organisation',
    badgesCard: 'text=Badges',
    pointsCard: 'text=Points',
    leaderboardCard: 'text=Leaderboard',
  },

  // ── Recruit ──
  recruit: {
    requisitionTab: '.MuiTab-root:has-text("Requisition")',
    interviewsTab: '.MuiTab-root:has-text("Interviews")',
    selfSubTab: 'text=Self',
    teamSubTab: 'text=Team',
    createNewBtn: 'button:has-text("Create New")',
    // Create Requisition form fields
    form: {
      minSalary: 'text=Minimum Salary',
      maxSalary: 'text=Maximum Salary',
      jobDescription: 'text=Job Description',
      submitBtn: 'button:has-text("Submit")',
      cancelBtn: 'button:has-text("Cancel")',
    },
  },

  // ── Engage ──
  engage: {
    feedSection: 'text=Feed',
    groupsSection: 'text=Groups',
    directMessagesSection: 'text=Direct Messages',
    postTextarea: 'textarea[placeholder="What\'s on your mind?"]',
    appreciateBtn: 'button:has-text("Appreciate")',
    scheduleBtn: 'button:has-text("Schedule")',
    giveFeedbackBtn: 'button:has-text("Give Feedback")',
    viewAllBtn: 'button:has-text("View All")',
    privateToggle: 'text=Make Yourself Private',
    photoVideoUpload: '#contained-button-file-photo-video',
    fileUpload: '#contained-button-file',
    searchGroup: 'input[placeholder="Search..."]',
  },
};

// ─── URLs ───────────────────────────────────────────────────
const URLS = {
  login: `${ESS_URL}/login`,
  base: `${ESS_URL}/ess`,
  dashboard: `${ESS_URL}/ess/dashboard/my-dashboard`,
  engage: `${ESS_URL}/ess/engage`,
  request: {
    self: `${ESS_URL}/ess/request/my-requests`,
    team: `${ESS_URL}/ess/request/pending-on-me`,
  },
  attendance: {
    myAttendance: `${ESS_URL}/ess/leave-and-attendance/my-attendance`,
    myLeave: `${ESS_URL}/ess/leave-and-attendance/my-leave`,
    teamAttendance: `${ESS_URL}/ess/leave-and-attendance/team-attendance`,
    teamRoster: `${ESS_URL}/ess/leave-and-attendance/team-roster`,
    snapshot: `${ESS_URL}/ess/leave-and-attendance/attendance-snapshot`,
  },
  pay: `${ESS_URL}/ess/pay`,
  finance: {
    myExpense: `${ESS_URL}/ess/finance-bundle/expense/my-expense`,
    apAccess: `${ESS_URL}/ess/finance-bundle/expense/ap-access`,
    apReport: `${ESS_URL}/ess/finance-bundle/expense/ap-report`,
    travelDesk: `${ESS_URL}/ess/finance-bundle/travel-desk`,
    pettyCash: `${ESS_URL}/ess/finance-bundle/petty-cash`,
    vendor: `${ESS_URL}/ess/finance-bundle/vendor`,
  },
  task: {
    dashboard: `${ESS_URL}/ess/task/dashboard`,
    list: `${ESS_URL}/ess/task/list`,
  },
  org: {
    dashboard: `${ESS_URL}/ess/hr/dashboard`,
    directory: `${ESS_URL}/ess/hr/directory`,
    policy: `${ESS_URL}/ess/hr/policy`,
    knowledgeBase: `${ESS_URL}/ess/hr/knowledge-base`,
    helpdesk: `${ESS_URL}/ess/hr/helpdesk`,
    reports: `${ESS_URL}/ess/hr/reports`,
  },
  timesheet: {
    dashboard: `${ESS_URL}/ess/timesheet/dashboard`,
    tasks: `${ESS_URL}/ess/timesheet/tasks`,
    projects: `${ESS_URL}/ess/timesheet/projects`,
    approvals: `${ESS_URL}/ess/timesheet/approvals`,
    timelog: `${ESS_URL}/ess/timesheet/timelog`,
    reports: `${ESS_URL}/ess/timesheet/reports`,
  },
  rewards: {
    home: `${ESS_URL}/ess/rewards/home`,
    myRecognitions: `${ESS_URL}/ess/rewards/my-recognitions`,
    wallet: `${ESS_URL}/ess/rewards/wallet`,
  },
  recruit: {
    myRequisition: `${ESS_URL}/ess/recruit/requisition/my-requisition`,
    teamRequisition: `${ESS_URL}/ess/recruit/requisition/emp-requisition`,
    interviews: `${ESS_URL}/ess/recruit/interviews`,
    createRequisition: `${ESS_URL}/ess/requisition/my-requisition/create`,
  },
  learn: `${ESS_URL}/ess/learn`,
  performance: `${ESS_URL}/ess/performance`,
};

class ESSPage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {import('@playwright/test').BrowserContext} context
   */
  constructor(page, context) {
    this.page = page;
    this.context = context;
    this.essPage = page; // will be replaced if ESS opens in new tab
  }

  // ─── Login & Navigation ───────────────────────────────────

  /** Login to Zimyo and navigate to ESS portal */
  async loginToESS() {
    // Try direct ESS URL first
    await this.page.goto(URLS.dashboard, { timeout: 60000 });
    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.page.waitForTimeout(3000);

    const url = this.page.url();
    if (url.includes('/login') || url === ESS_URL + '/' || url === ESS_URL) {
      // Need to login
      await this.page.locator(S.username).waitFor({ state: 'visible', timeout: 15000 });
      await this.page.locator(S.username).fill(ESS_CREDENTIALS.username);
      await this.page.locator(S.password).fill(ESS_CREDENTIALS.password);
      await this.page.waitForTimeout(1000);
      await this.page.locator(S.loginBtn).click();
      await this.page.waitForTimeout(10000);

      // Navigate to ESS via nine-dot
      await this.page.locator(S.appSwitcher).click();
      await this.page.waitForTimeout(2000);
      const [newPage] = await Promise.all([
        this.context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
        this.page.locator(S.essOption).first().click(),
      ]);
      if (newPage) {
        this.essPage = newPage;
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForLoadState('networkidle').catch(() => {});
        await newPage.waitForTimeout(3000);
      }
    } else if (url.includes('/admin/')) {
      // On admin, switch to ESS
      await this.page.locator(S.appSwitcher).click();
      await this.page.waitForTimeout(2000);
      const [newPage] = await Promise.all([
        this.context.waitForEvent('page', { timeout: 10000 }).catch(() => null),
        this.page.locator(S.essOption).first().click(),
      ]);
      if (newPage) {
        this.essPage = newPage;
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.waitForLoadState('networkidle').catch(() => {});
        await newPage.waitForTimeout(3000);
      }
    } else {
      this.essPage = this.page;
    }

    return this.essPage;
  }

  /** Navigate to an ESS URL (within the ESS tab) */
  async goto(url) {
    await this.essPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.essPage.waitForLoadState('networkidle').catch(() => {});
    await this.essPage.waitForTimeout(2000);
  }

  /** Click a sidebar menu item by text */
  async clickSidebarMenu(menuName) {
    const menu = this.essPage.locator(`text="${menuName}"`).first();
    await menu.click();
    await this.essPage.waitForLoadState('networkidle').catch(() => {});
    await this.essPage.waitForTimeout(2000);
  }

  /** Click a sub-tab (MUI Tab) by text */
  async clickTab(tabName) {
    const tab = this.essPage.locator(S.muiTab(tabName)).first();
    await tab.click();
    await this.essPage.waitForTimeout(2000);
  }

  /** Click a left-sidebar category in Request module */
  async clickRequestCategory(categoryName) {
    const cat = this.essPage.locator(S.listItemBtn(categoryName)).first();
    await cat.click();
    await this.essPage.waitForTimeout(1500);
  }

  /** Click Apply New and select an option */
  async applyNew(optionText) {
    await this.essPage.locator(S.applyNewBtn).first().click();
    await this.essPage.waitForTimeout(1500);
    if (optionText) {
      await this.essPage.locator(`text="${optionText}"`).first().click();
      await this.essPage.waitForTimeout(2000);
    }
  }

  /** Close any open modal/dialog */
  async closeModal() {
    await this.essPage.keyboard.press('Escape');
    await this.essPage.waitForTimeout(500);
  }

  /** Take a screenshot */
  async screenshot(name) {
    await this.essPage.screenshot({ path: `screenshots/ess-${name}.png`, fullPage: true });
  }

  /** Check if specific text is visible on page */
  async isVisible(text) {
    return this.essPage.locator(`text="${text}"`).first().isVisible().catch(() => false);
  }

  /** Get page text content */
  async getPageText() {
    return this.essPage.evaluate(() => document.body.innerText);
  }

  /** Check the current URL contains expected path */
  async verifyUrl(expectedPath) {
    const url = this.essPage.url();
    return url.includes(expectedPath);
  }

  /** Count table rows */
  async getTableRowCount() {
    return this.essPage.locator(S.tableRow).count();
  }

  /** Get all button texts visible on page */
  async getVisibleButtons() {
    return this.essPage.evaluate(() => {
      return Array.from(document.querySelectorAll('button.MuiButton-root'))
        .map(b => b.innerText?.trim())
        .filter(t => t && t.length < 50);
    });
  }

  /** Get all tab texts on current page */
  async getVisibleTabs() {
    return this.essPage.evaluate(() => {
      return Array.from(document.querySelectorAll('.MuiTab-root'))
        .map(t => t.innerText?.trim())
        .filter(t => t && t.length < 50);
    });
  }

  /** Check if a modal/dialog is currently open */
  async isModalOpen() {
    return this.essPage.locator(S.modalDialog).isVisible().catch(() => false);
  }

  /** Scroll to bottom of page */
  async scrollToBottom() {
    await this.essPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.essPage.waitForTimeout(1000);
  }
}

module.exports = { ESSPage, S, URLS, ESS_CREDENTIALS };
