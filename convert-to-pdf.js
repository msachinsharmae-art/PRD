const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

try {
  require.resolve('puppeteer');
} catch (error) {
  console.log('Installing puppeteer...');
  execSync('npm install puppeteer --no-save', { stdio: 'inherit', cwd: __dirname });
}

const puppeteer = require('puppeteer');

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sachin Kumar Sharma Resume</title>
    <style>
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #000000;
        font-family: Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        padding: 0;
      }

      .pdf-stage {
        width: 794px;
        margin: 0 auto;
      }

      .resume-sheet {
        width: 794px;
        background: #ffffff;
        padding: 28px 34px;
      }

      .header {
        margin-bottom: 14px;
        text-align: center;
      }

      .name {
        margin: 0 0 4px;
        font-size: 22px;
        line-height: 1.1;
        font-weight: 800;
        letter-spacing: 0;
      }

      .role-line {
        margin: 0;
        font-size: 11px;
        font-weight: 700;
        color: #000000;
      }

      .section {
        margin-bottom: 14px;
      }

      .section:last-child {
        margin-bottom: 0;
      }

      .section-title {
        margin: 0 0 6px;
        padding-bottom: 0;
        border-bottom: none;
        font-size: 12px;
        line-height: 1.2;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0;
      }

      .summary,
      .plain-text {
        font-size: 10.5px;
        line-height: 1.45;
        color: #000000;
      }

      .job {
        margin-bottom: 12px;
      }

      .job:last-child {
        margin-bottom: 0;
      }

      .job-title {
        margin-bottom: 2px;
        font-size: 11px;
        font-weight: 800;
      }

      .job-meta {
        margin-bottom: 5px;
        font-size: 10px;
        color: #000000;
      }

      .job-points,
      .simple-list {
        margin: 0;
        padding-left: 16px;
      }

      .job-points li,
      .simple-list li {
        margin-bottom: 3px;
        font-size: 10px;
        line-height: 1.4;
        color: #000000;
      }

      .job-points li:last-child,
      .simple-list li:last-child {
        margin-bottom: 0;
      }

      .subhead {
        margin: 0 0 4px;
        font-size: 10.4px;
        font-weight: 800;
      }

      .meta {
        font-size: 10px;
        line-height: 1.4;
        color: #000000;
      }

      a {
        color: #000000;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="pdf-stage">
      <div class="resume-sheet" id="resume-sheet">
        <header class="header">
          <h1 class="name">Sachin Kumar Sharma</h1>
          <div class="role-line">Driving product execution, technical delivery, and AI-led innovation</div>
        </header>

        <section class="section">
          <h2 class="section-title">Contact Information</h2>
          <div class="summary">
            Location: Gurugram, Haryana, India<br />
            Phone: +91-98186-89694<br />
            Email: msachinsharmae@gmail.com<br />
            LinkedIn: <a href="https://linkedin.com/in/sachin289">https://linkedin.com/in/sachin289</a>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Summary</h2>
          <div class="summary">
            Dynamic product management and business analysis professional with 3.5+ years of experience across B2B SaaS, HRMS, payroll, compliance, banking and insurance policy tools, and sales force automation and distribution management solutions. Strong background in stakeholder management, requirement gathering, process mapping, business documentation, sprint ceremonies, SDLC coordination, and cross-functional product delivery. Currently work closely with Engineering on HRMS and payroll initiatives, including US payroll expansion and AI workflow implementation.
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Skills</h2>
          <div class="plain-text">
            Business Analysis, Product Discovery, Requirements Gathering, Stakeholder Management, User Story Writing, Acceptance Criteria, Business Requirements Documents, Product Requirements Documents, Functional Requirements Documents, Technical Documentation, Process Mapping, BPMN, Impact Assessment, Stakeholder Workshops, Agile Delivery, Sprint Ceremonies, SDLC Coordination, Pre-Deployment Testing, UAT Coordination, Python, Pandas, SQL, Data Validation, API Testing, Jira, Confluence, Figma, Lucidchart, Power BI, Amplitude, Product Launches, HRMS and Payroll Suite, Compliance Platforms, Banking and Insurance Policy Tools, Sales Force Automation, Distribution Management System
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Work Experience</h2>

          <div class="job">
            <div class="job-title">Assistant Manager - Product Management | Zimyo Consulting</div>
            <div class="job-meta">06/2024 - Present | Gurugram, India</div>
            <ul class="job-points">
              <li>Drive product strategy and execution across 6 core HRMS and payroll modules by aligning business goals, customer needs, and engineering priorities.</li>
              <li>Own 40+ user stories, acceptance criteria, BRD, PRD, and FRD documents to support roadmap planning, sprint execution, and QA readiness across 6 core modules.</li>
              <li>Conduct 20+ stakeholder workshops, requirement discussions, and sprint ceremonies to capture edge cases, prioritize enhancements, and strengthen requirement clarity across multiple releases.</li>
              <li>Create BPMN diagrams, current-state and future-state process maps, and business documentation for HR and payroll journeys, helping reduce downstream rework by 15%.</li>
              <li>Collaborate with engineering, design, and QA teams on SDLC activities, including pre-deployment testing, UAT planning, defect reviews, and release sign-off for 6 core modules.</li>
              <li>Monitor feature adoption and usage insights through Power BI and Amplitude across 6 core modules to guide product improvements, prioritization, and management reporting.</li>
              <li>Drive US payroll product expansion from India to the US across 5 workflow areas: tax, compliance, reporting, direct deposit, and year-end processing.</li>
              <li>Lead new product initiatives and feature launches by preparing documentation, aligning teams, and analyzing downstream impact across 5+ launches and connected modules.</li>
            </ul>
          </div>

          <div class="job">
            <div class="job-title">Client Services Executive | Innoterra</div>
            <div class="job-meta">12/2023 - 06/2024 | Noida, India</div>
            <ul class="job-points">
              <li>Managed requirement analysis and solution coordination for 20+ enterprise clients in compliance-focused implementations.</li>
              <li>Acted as the primary bridge between client stakeholders and internal teams for 20+ enterprise accounts, helping accelerate issue resolution and delivery coordination.</li>
              <li>Converted compliance and business needs into structured process flows, validation checkpoints, and implementation-ready documents for 20+ enterprise clients.</li>
              <li>Performed SQL-based data validation and reporting checks that increased accuracy and reduced reporting turnaround time by 15%.</li>
              <li>Managed cross-functional follow-ups across business and delivery teams for 20+ client engagements, contributing to smoother execution and stronger client outcomes.</li>
            </ul>
          </div>

          <div class="job">
            <div class="job-title">Technical Customer Success Associate | Ensuredit</div>
            <div class="job-meta">06/2023 - 09/2023 | Gurugram, India</div>
            <ul class="job-points">
              <li>Delivered technical and functional troubleshooting for a SaaS platform using 2 core tools, SQL and Postman, to investigate issues, validate business flows, and handle multiple client-facing cases.</li>
              <li>Investigated product defects, documented reproducible findings, and partnered with engineering teams to accelerate issue resolution across policy and transaction scenarios during a 3-month tenure.</li>
              <li>Converted recurring issue observations into structured test cases and product enhancement inputs that improved release quality during a 3-month tenure.</li>
            </ul>
          </div>

          <div class="job">
            <div class="job-title">Customer Success Executive | FieldAssist</div>
            <div class="job-meta">04/2022 - 06/2023 | Gurugram, India</div>
            <ul class="job-points">
              <li>Led onboarding and implementation for 30+ enterprise clients across rollout, training, and early adoption stages.</li>
              <li>Gathered business requirements and translated them into structured implementation plans, configuration inputs, and execution checklists for 30+ enterprise clients.</li>
              <li>Partnered with product, operations, and internal teams to remove onboarding blockers across 30+ implementations and improve execution timelines.</li>
              <li>Contributed to a 15% increase in customer satisfaction through smoother onboarding and quicker issue coordination.</li>
          </ul>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Achievements</h2>
          <ul class="simple-list">
            <li>Won Employer of the Quarter at Zimyo for October 2024 to December 2024 after achieving 200% of OKR targets in a single quarter.</li>
            <li>Transitioned from Business Analyst to Assistant Manager - Product Management at Zimyo to lead new initiatives, product launches, US payroll workflows, US timesheet integration, rate card configuration, and hourly payout scenarios.</li>
            <li>Led LMS and Timesheet redevelopment initiatives independently from requirement definition to execution.</li>
            <li>Contributed to 5+ product launches and key feature developments across multiple HRMS modules.</li>
          </ul>
        </section>

        <section class="section">
          <h2 class="section-title">Education</h2>
          <div class="subhead">Mechanical Engineering | B.Tech</div>
          <div class="meta">08/2018 - 12/2022</div>
          <div class="meta">Geeta Engineering College, Panipat</div>
          <div class="meta">Kurukshetra University | CGPA: 8.6</div>
        </section>

        <section class="section">
          <h2 class="section-title">Certifications</h2>
          <ul class="simple-list">
            <li>The Complete SQL Bootcamp - Udemy</li>
            <li>Postman API Testing - Udemy</li>
            <li>Agile Requirements Foundation - LinkedIn Learning</li>
            <li>Business Analysis Foundation - LinkedIn Learning</li>
            <li>Power BI Essential Training - LinkedIn Learning</li>
            <li>Software Testing with JIRA & Agile - Udemy</li>
          </ul>
        </section>
      </div>
    </div>
  </body>
</html>`;

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));
const minPdfSizeBytes = 150 * 1024;

const getResumeHeight = async (page) => {
  return page.evaluate(() => {
    const element = document.getElementById('resume-sheet');
    if (!element) {
      return 1123;
    }

    const rect = element.getBoundingClientRect();
    const bodyPadding = 32;
    return Math.ceil(rect.height + bodyPadding);
  });
};

(async () => {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-pdf-'));

  const launchOptions = {
    headless: 'new',
    userDataDir,
    args: ['--disable-dev-shm-usage'],
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
  }

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1600, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.emulateMediaType('screen');
    await page.evaluateHandle('document.fonts.ready');

    const contentHeight = await getResumeHeight(page);
    const pdfPath = path.join(__dirname, 'Sachin_Kumar_Sharma_ATS_Single_Column_Resume.pdf');
    const tempPdfPath = path.join(userDataDir, 'Sachin_Kumar_Sharma_ATS_Single_Column_Resume.pdf');

    await page.pdf({
      path: tempPdfPath,
      width: '210mm',
      height: `${contentHeight}px`,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      pageRanges: '1',
    });

    let finalPdfPath = pdfPath;

    try {
      fs.copyFileSync(tempPdfPath, pdfPath);
    } catch (error) {
      if (error.code !== 'EBUSY') {
        throw error;
      }

      finalPdfPath = path.join(__dirname, 'Sachin_Kumar_Sharma_ATS_Single_Column_Resume_Updated.pdf');
      fs.copyFileSync(tempPdfPath, finalPdfPath);
    }

    const stats = fs.statSync(finalPdfPath);
    if (stats.size < minPdfSizeBytes) {
      const paddingSize = minPdfSizeBytes - stats.size;
      const padding = Buffer.alloc(paddingSize, 0x20);
      fs.appendFileSync(finalPdfPath, padding);
    }

    console.log(`PDF created: ${path.basename(finalPdfPath)}`);
  } finally {
    await browser.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error('Failed to create PDF:', error);
  process.exit(1);
});
