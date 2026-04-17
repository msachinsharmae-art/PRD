# Sachin Sharma

**Business Analyst | Product Management | Zimyo**

Building AI-powered HRMS tools, payroll systems, and test automation — bridging the gap between product thinking and engineering execution.

---

## What I Do

I work at the intersection of **product management** and **hands-on engineering** at Zimyo, an HR-tech platform. My focus: turning complex payroll/HR compliance problems into working software, automating QA workflows, and using AI (Claude API) to build intelligent systems.

---

## Projects

### US Payroll — Multi-Agent AI Payroll System
> Autonomous payroll processing powered by Claude Sonnet 4

- Built an **agentic orchestration loop** using the Anthropic SDK — Claude autonomously processes payroll runs, computes taxes, validates compliance, and generates ACH files
- **6-state tax engines** (CA, NY, TX, FL, GA, WA) with federal + state-specific calculations
- Full REST API: employee management, pay schedules, benefits, PTO, payslips, overtime plans
- Stack: **Node.js, Express, @anthropic-ai/sdk, Claude Sonnet 4**

### Payroll Templates — AI-Powered Salary Slip Customizer
> Configurable template engine for salary slip generation with compliance checks

- AI engine for template customization and salary computation
- Built-in calculators: gross pay, deductions, net pay
- Compliance modules: employee classification, minimum wage, overtime, pay frequency
- Report generators: labor cost, payroll register, tax liability
- Stack: **Node.js, Express**

### Playwright Test Suite — Zimyo Portal Automation
> Comprehensive E2E test automation for Zimyo HRMS (50+ test specs)

- **12 ESS module specs**: dashboard, attendance, timesheet, pay, rewards, recruitment, tasks, and more
- **12 payroll specs**: salary modification, payroll runs, tax compliance, payslip generation
- **5 employee module specs**: onboarding, master data, attendance log uploads
- Page Object Model architecture with reusable actions, components, and fixtures
- Mixpanel analytics integration for test reporting
- Stack: **Playwright, Node.js, PDF parsing**

### Zim-Bot — AI Knowledge Assistant for Zimyo
> Intelligent chatbot for Core HR, Workflows & Payroll documentation

- **TF-IDF semantic search engine** for knowledge retrieval across Zimyo documentation
- NLP-based module detection (Core HR, Payroll, Workflows, etc.)
- Configurable search thresholds with fallback to broad search
- 12 pre-defined topic hints for quick navigation
- Stack: **Node.js, Express, TF-IDF**

### ESS Pay Section — UI/UX Revamp (PRD)
> Product Requirements Document for redesigning the Employee Self-Service Pay experience

- Authored a **12-page PRD** covering the full ESS Pay module redesign: Pay Dashboard, Salary Structure, Salary Slips, Taxation, Reimbursements, Loans & Advances
- Defined **5 design principles**: Consistency, Clarity, Actionability, Scannability, Accessibility
- Standardized card + table views across Tax Declarations, Loan tracking, and Reimbursement modules
- Designed unified financial overview — Total Outstanding, Active Loans, Total Borrowed, Repaid at a glance
- Included dependency mapping, risk mitigation, and QA validation requirements
- Role: **Product Owner / BA** — wrote the spec that drives design and engineering execution

### Zimyo Payroll Guide — Operations Manual (92 pages)
> End-to-end documentation of the Zimyo Payroll platform

- Authored a **92-page comprehensive manual** covering the entire payroll lifecycle:
  - Payroll Dashboard, Budget Forecasting, CTC Analysis
  - 5-step payroll run process (Attendance → Arrears → Review → Payout → Payslips)
  - Employee Workspace, Salary Components, F&F Processing
  - Multi-level payroll approval workflows
  - Third-party integrations (Zoho Books, accounting entries)
- Serves as the reference guide for HR managers, finance teams, and system administrators

### Core HR & Workflows Manual (70 pages)
> Complete platform documentation for Zimyo Core HR module

- Authored a **70-page manual** covering every Core HR feature:
  - Standard + Custom Dashboards with dashlet configuration
  - Employee Master, Organization Chart, Roles & Permissions, Data Permissions
  - Attendance: Geo-fencing, Biometric, Selfie, Shift management
  - Leave Management: policies, negative balance, half-day, WFH rules
  - HR Documents, Document Library, Policy Management
  - Bulk operations: employee creation, transfers, updates
- Used as the knowledge base for the Zim-Bot AI assistant

### Automation Scripts
> Presentation and report generation tools

- **Competitor Analysis Generator** — auto-generates detailed PPTX comparing US payroll competitors (Gusto, Rippling, Workday)
- **Presentation Generator** — creates formatted slide decks from structured data
- **Visual Enhancer** — adds flowchart visuals to PowerPoint slides programmatically
- Stack: **Python (python-pptx), Node.js (Puppeteer)**

### Compliance Documentation
> Payroll compliance research and documentation

- **Saudi GoSI Compliance** — documented Saudi Arabia payroll compliance requirements
- **ESS Timesheet Module** — detailed change documentation for timelog features
- **US Payroll Competitor Analysis** — market research across US payroll platforms

---

## Tech Stack

| Area | Technologies |
|------|-------------|
| **AI / LLM** | Claude API (Sonnet 4), Anthropic SDK, Multi-agent orchestration, TF-IDF |
| **Backend** | Node.js, Express.js |
| **Testing** | Playwright, Page Object Model, PDF parsing |
| **Automation** | Python (pptx, data analysis), Puppeteer |
| **Product** | PRDs, UI/UX requirements, feature specs, stakeholder documentation |
| **Domain** | Payroll processing, Tax engines (US federal + 6 states), HR compliance, ESS modules |
| **Documentation** | 160+ pages of platform manuals (Payroll 92pp, Core HR 70pp) |

---

## What I've Learned Building with Claude AI

Through hands-on development with Claude Code and the Claude API, I've built real production tools:

- **Agentic Systems** — designed multi-agent orchestration where Claude autonomously executes payroll workflows using tool-use loops (10-iteration agent cycles with tool calling)
- **Tool Design** — created 30+ tool definitions that Claude uses to manage employees, run payroll, compute taxes, and generate compliance reports
- **AI-Powered Search** — built a TF-IDF semantic search engine paired with NLP module detection for intelligent document Q&A
- **Test Automation with AI** — used Claude Code to rapidly build and iterate on 50+ Playwright test specs across an entire HRMS platform
- **Document Generation** — automated creation of competitor analysis presentations and payroll reports using AI-assisted Python scripting
- **PRD Writing with AI** — used Claude Code to research, structure, and refine a 12-page ESS Pay section PRD with design principles, functional requirements, and risk analysis
- **Knowledge Base Creation** — authored 160+ pages of platform manuals (Payroll + Core HR) that power the Zim-Bot AI assistant's search index

---

## About Me

- Business Analyst in the Product Management team at **Zimyo**
- Focused on HRMS, Payroll, and Employee Self-Service (ESS) products
- I believe BAs should write code — it makes you a better product thinker
- Currently deepening my skills in Python (pandas, data analysis) and AI agent development

---

*Built with code, powered by curiosity.*
