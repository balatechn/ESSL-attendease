import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER || "smtp.mailgun.org",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_LOGIN,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const FROM = process.env.EMAIL_FROM || "no-reply@nationalgroupindia.com";

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}

// ─── Leave Emails ──────────────────────────────────────────────────

export async function sendLeaveAppliedEmail(
  managerEmail: string,
  managerName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string
) {
  const subject = `Leave Application: ${employeeName} - ${leaveType} (${totalDays} days)`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">New Leave Application</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p>Hi ${managerName},</p>
        <p><strong>${employeeName}</strong> has applied for leave and needs your approval.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Leave Type</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${leaveType}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">From</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${startDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">To</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${endDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total Days</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${totalDays}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Reason</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${reason}</td></tr>
        </table>
        <p>Please log in to the AttendEase portal to approve or reject this request.</p>
        <p style="color: #6b7280; font-size: 12px;">— AttendEase | National Group India</p>
      </div>
    </div>
  `;
  await sendEmail(managerEmail, subject, html);
}

export async function sendLeaveStatusEmail(
  employeeEmail: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  status: string,
  approverName: string,
  approverRole: string,
  note?: string
) {
  const approved = status.includes("APPROVED");
  const statusLabel = approved ? "Approved" : "Rejected";
  const statusColor = approved ? "#059669" : "#dc2626";

  const subject = `Leave ${statusLabel} by ${approverRole}: ${leaveType} (${startDate} - ${endDate})`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Leave ${statusLabel}</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p>Hi ${employeeName},</p>
        <p>Your leave application has been <strong style="color: ${statusColor};">${statusLabel.toLowerCase()}</strong> by <strong>${approverName}</strong> (${approverRole}).</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Leave Type</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${leaveType}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">From</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${startDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">To</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${endDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total Days</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${totalDays}</td></tr>
          ${note ? `<tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Note</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${note}</td></tr>` : ""}
        </table>
        ${status === "MANAGER_APPROVED" ? "<p><em>Your leave is now pending HR approval.</em></p>" : ""}
        ${status === "HR_APPROVED" ? "<p><em>Your leave has been fully approved. Leave balance has been updated.</em></p>" : ""}
        <p style="color: #6b7280; font-size: 12px;">— AttendEase | National Group India</p>
      </div>
    </div>
  `;
  await sendEmail(employeeEmail, subject, html);
}

export async function sendLeaveToHREmail(
  hrEmail: string,
  hrName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string
) {
  const subject = `Leave Pending HR Approval: ${employeeName} - ${leaveType} (${totalDays} days)`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #d97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Leave Pending Your Approval</h2>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p>Hi ${hrName},</p>
        <p><strong>${employeeName}</strong>'s leave has been approved by their manager and needs your final approval.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Leave Type</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${leaveType}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">From</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${startDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">To</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${endDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Total Days</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${totalDays}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: bold;">Reason</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${reason}</td></tr>
        </table>
        <p>Please log in to the AttendEase portal to approve or reject this request.</p>
        <p style="color: #6b7280; font-size: 12px;">— AttendEase | National Group India</p>
      </div>
    </div>
  `;
  await sendEmail(hrEmail, subject, html);
}

// ─── Weekly Report Email ───────────────────────────────────────────

export async function sendWeeklyAttendanceReport(
  adminEmail: string,
  adminName: string,
  reportHtml: string,
  weekRange: string
) {
  const subject = `Weekly Attendance Report: ${weekRange}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Weekly Attendance Report</h2>
        <p style="margin: 4px 0 0; opacity: 0.9;">${weekRange}</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: 0; border-radius: 0 0 8px 8px;">
        <p>Hi ${adminName},</p>
        <p>Here is the weekly attendance summary for all employees.</p>
        ${reportHtml}
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">— AttendEase | National Group India</p>
      </div>
    </div>
  `;
  await sendEmail(adminEmail, subject, html);
}
