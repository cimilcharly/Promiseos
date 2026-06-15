export async function sendEmailWithResend(
  apiKey: string | null,
  recipient: string,
  subject: string,
  bodyText: string
): Promise<boolean> {
  // If API key is not configured, simulate success
  if (!apiKey || !apiKey.trim() || apiKey === 'mock-key') {
    console.log(`✉️ Simulated Email (no Resend Key):\nTo: ${recipient}\nSubj: ${subject}\nBody: ${bodyText}`);
    return true;
  }

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        to: recipient,
        subject,
        text: bodyText,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Unknown error');
    }

    console.log(`📨 Real email sent successfully via proxy to ${recipient}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email via proxy route:', error);
    return false;
  }
}
