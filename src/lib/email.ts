import { PLATFORM_URL } from '@/lib/config';

interface EmailOptions {
    to: string;
    subject: string;
    body: string;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function getFromAddress(): string {
    // Must be a verified sender on your Resend account in production.
    // Defaults to Resend's onboarding sender which works out of the box
    // for testing (and only delivers to the account owner's email).
    return process.env.EMAIL_FROM ?? 'Vessel Engine <onboarding@resend.dev>';
}

async function sendEmail(opts: EmailOptions): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        // Dev fallback: print the payload to the server log so local
        // password-reset flows stay testable without an API key.
        console.log('\n📧 [email] Would send (no RESEND_API_KEY set):');
        console.log(`   To:      ${opts.to}`);
        console.log(`   From:    ${getFromAddress()}`);
        console.log(`   Subject: ${opts.subject}`);
        console.log(
            `   Body:\n${opts.body
                .split('\n')
                .map((l) => `     ${l}`)
                .join('\n')}`,
        );
        console.log('');
        return;
    }

    let res: Response;
    try {
        res = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: getFromAddress(),
                to: opts.to,
                subject: opts.subject,
                text: opts.body,
            }),
        });
    } catch (err) {
        // Network failure — let the caller decide whether to swallow.
        throw new Error(
            `Resend request failed: ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        throw new Error(`Resend API error ${res.status}: ${bodyText}`);
    }
}

/* -------------------------------------------------------------------------- */
/*  Password reset                                                             */
/* -------------------------------------------------------------------------- */

export async function sendPasswordResetEmail(
    to: string,
    rawToken: string,
): Promise<void> {
    const resetUrl = `${PLATFORM_URL}/app/reset-password?token=${encodeURIComponent(
        rawToken,
    )}`;

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