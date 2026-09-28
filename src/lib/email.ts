import { PLATFORM_URL } from '@/lib/config';

interface EmailOptions {
    to: string;
    subject: string;
    body: string;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        // Console fallback for dev — the reset link is printed in the dev server terminal.
        console.log('\n📧 [email] Would send:');
        console.log(`   To:      ${opts.to}`);
        console.log(`   Subject: ${opts.subject}`);
        console.log(`   Body:\n${opts.body.split('\n').map((l) => `     ${l}`).join('\n')}`);
        console.log('');
        return;
    }

    // TODO: implement Resend send when the account is ready.
    // Shape:
    //   await fetch('https://api.resend.com/emails', {
    //       method: 'POST',
    //       headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ from, to, subject, text: body }),
    //   });
    console.warn('[email] RESEND_API_KEY set but Resend sending is not implemented yet.');
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
    const resetUrl = `${PLATFORM_URL}/app/reset-password?token=${encodeURIComponent(rawToken)}`;

    await sendEmail({
        to,
        subject: 'Reset your Vessel Engine password',
        body: [
            `We received a request to reset the password for your Vessel Engine account.`,
            ``,
            `Click this link to choose a new password (valid for 1 hour):`,
            ``,
            resetUrl,
            ``,
            `If you didn't request this, you can safely ignore this email — your password won't change.`,
        ].join('\n'),
    });
}