const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'Karpom Kasadara <noreply@resend.dev>';

async function sendInviteEmail({ to, fullName, inviteUrl, invitedByName }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to Karpom Kasadara`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B5E20; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">கற்போம் கசடற</h1>
          <p style="color: #A5D6A7; margin: 4px 0 0;">Karpom Kasadara — Tamil Language Learning Portal</p>
        </div>
        <div style="padding: 32px; background: #f9f9f9;">
          <p style="font-size: 16px; color: #333;">Hello ${fullName},</p>
          <p style="font-size: 16px; color: #555;">${invitedByName} has invited you to join <strong>Karpom Kasadara</strong>, a Tamil language learning portal.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="background: #1B5E20; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">This link is for your use only. If you did not expect this invitation, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}

async function sendPasswordResetEmail({ to, fullName, resetUrl }) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Reset your Karpom Kasadara password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B5E20; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">கற்போம் கசடற</h1>
          <p style="color: #A5D6A7; margin: 4px 0 0;">Karpom Kasadara — Tamil Language Learning Portal</p>
        </div>
        <div style="padding: 32px; background: #f9f9f9;">
          <p style="font-size: 16px; color: #333;">Hello ${fullName},</p>
          <p style="font-size: 16px; color: #555;">We received a request to reset your password. Click the button below to create a new password. This link expires in <strong>1 hour</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #1B5E20; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">If you did not request a password reset, you can safely ignore this email. Your password will not be changed.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendInviteEmail, sendPasswordResetEmail };
