import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type EmailAction = "signup" | "recovery" | "magiclink" | "invite" | "email_change";

type AuthEmailPayload = {
  user: { email?: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type: EmailAction;
  };
};

const mailerooApiUrl = "https://smtp.maileroo.com/api/v2/emails";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character] as string));
}

function verificationUrl(tokenHash: string, type: EmailAction, redirectTo: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");

  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function messageFor(action: EmailAction, url: string, token: string) {
  if (action === "recovery") {
    return {
      subject: "Réinitialisez votre mot de passe Kymia",
      text: `Une demande de réinitialisation de mot de passe a été reçue. Utilisez ce lien : ${url}\n\nSi vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.`,
      html: `<p>Une demande de réinitialisation de mot de passe a été reçue.</p><p><a href="${escapeHtml(url)}">Réinitialiser mon mot de passe</a></p><p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.</p>`,
    };
  }

  const subject = action === "invite" ? "Votre invitation Kymia" : "Confirmez votre adresse e-mail Kymia";
  return {
    subject,
    text: `Utilisez ce lien pour continuer : ${url}\n\nCode de vérification : ${token}`,
    html: `<p>Utilisez ce lien pour continuer :</p><p><a href="${escapeHtml(url)}">Continuer</a></p><p>Code de vérification : <strong>${escapeHtml(token)}</strong></p>`,
  };
}

async function sendMail(to: string, action: EmailAction, tokenHash: string, token: string, redirectTo: string) {
  const sendingKey = Deno.env.get("MAILEROO_SENDING_KEY");
  const senderAddress = Deno.env.get("MAILEROO_SENDER_EMAIL");
  const senderName = Deno.env.get("MAILEROO_SENDER_NAME") ?? "Kymia Clinical Sim";
  if (!sendingKey || !senderAddress) throw new Error("Maileroo secrets are not configured");

  const message = messageFor(action, verificationUrl(tokenHash, action, redirectTo), token);
  const response = await fetch(mailerooApiUrl, {
    method: "POST",
    headers: { "Authorization": `Bearer ${sendingKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: { address: senderAddress, display_name: senderName },
      to: [{ address: to }],
      subject: message.subject,
      html: message.html,
      plain: message.text,
      tracking: false,
      tags: { category: "auth", action },
    }),
  });
  if (!response.ok) throw new Error(`Maileroo rejected the message (${response.status})`);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const rawPayload = await request.text();
    const configuredSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
    if (!configuredSecret) throw new Error("SEND_EMAIL_HOOK_SECRET is not configured");

    const secret = configuredSecret.replace("v1,whsec_", "");
    const payload = new Webhook(secret).verify(rawPayload, Object.fromEntries(request.headers)) as AuthEmailPayload;
    const { user, email_data: email } = payload;

    if (email.email_action_type === "email_change") {
      if (user.new_email && email.token_new && email.token_hash_new && user.email) {
        await Promise.all([
          sendMail(user.email, "email_change", email.token_hash_new, email.token, email.redirect_to),
          sendMail(user.new_email, "email_change", email.token_hash, email.token_new, email.redirect_to),
        ]);
      } else if (user.new_email) {
        await sendMail(user.new_email, "email_change", email.token_hash, email.token_new || email.token, email.redirect_to);
      } else {
        throw new Error("No new email in Auth Hook payload");
      }
    } else if (user.email) {
      await sendMail(user.email, email.email_action_type, email.token_hash, email.token, email.redirect_to);
    } else {
      throw new Error("No recipient email in Auth Hook payload");
    }

    return Response.json({});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send auth email";
    console.error(message);
    return Response.json({ error: { message } }, { status: 401 });
  }
});
