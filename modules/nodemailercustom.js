const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
dotenv.config();

// Office logo path
const logoPath = path.resolve(__dirname, '../assets/msa.png');
const hasLocalLogo = fs.existsSync(logoPath);

// Transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "massalymamadou@gmail.com",
    pass: process.env.NODE_MAILER
  }
});

/**
 * Generates an ultra-clean, modern, responsive HTML email template
 * with MSA branding and office logo.
 */
function generateModernEmailTemplate({
  title,
  badgeText = "Notification Système",
  badgeColor = "#0284c7",
  greeting = "Bonjour,",
  leadText = "",
  highlightBox = null, // { title, value, subtitle, alertType: 'warning' | 'info' | 'success' }
  contentItems = [], // string[] or { label, value }[]
  actionButton = { text: "Accéder à MSAGED", url: "https://www.msged.msassocies-digital.com" },
  footerNote = ""
}) {
  const logoSrc = hasLocalLogo ? "cid:officeLogo" : "https://www.msged.msassocies-digital.com/msa.png";

  // Build items HTML
  let itemsHtml = "";
  if (contentItems && contentItems.length > 0) {
    itemsHtml = `
      <div style="margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <ul style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
          ${contentItems.map(item => {
            if (typeof item === 'string') {
              return `<li style="margin-bottom: 6px;">${item}</li>`;
            }
            return `<li style="margin-bottom: 6px;"><strong>${item.label} :</strong> <span style="color: #0f172a;">${item.value}</span></li>`;
          }).join("")}
        </ul>
      </div>
    `;
  }

  // Build highlight box HTML
  let highlightHtml = "";
  if (highlightBox) {
    const isWarning = highlightBox.alertType === 'warning';
    const bgColor = isWarning ? '#fffbeb' : '#f0fdf4';
    const borderColor = isWarning ? '#fde68a' : '#bbf7d0';
    const textColor = isWarning ? '#92400e' : '#166534';
    const badgeBg = isWarning ? '#fef3c7' : '#dcfce7';

    highlightHtml = `
      <div style="margin: 24px 0; background-color: ${bgColor}; border: 1.5px solid ${borderColor}; border-radius: 14px; padding: 20px; text-align: center;">
        ${highlightBox.title ? `<div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${textColor}; margin-bottom: 8px;">${highlightBox.title}</div>` : ''}
        ${highlightBox.value ? `
          <div style="display: inline-block; background-color: #ffffff; border: 2px dashed ${borderColor}; border-radius: 10px; padding: 10px 28px; margin: 6px 0 10px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 800; letter-spacing: 4px; color: #0f172a;">${highlightBox.value}</span>
          </div>
        ` : ''}
        ${highlightBox.subtitle ? `<div style="font-size: 13px; color: ${textColor}; line-height: 1.5; margin-top: 6px;">${highlightBox.subtitle}</div>` : ''}
      </div>
    `;
  }

  // Build button HTML
  let buttonHtml = "";
  if (actionButton && actionButton.url) {
    buttonHtml = `
      <div style="text-align: center; margin: 30px 0 20px 0;">
        <a href="${actionButton.url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 34px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4); letter-spacing: 0.02em;">
          ${actionButton.text} &rarr;
        </a>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Modern Branded Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #091b34 0%, #0f274a 60%, #0284c7 100%); padding: 32px 30px 28px 30px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background-color: #ffffff; padding: 6px; border-radius: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22); margin-bottom: 14px;">
                      <img src="${logoSrc}" alt="MSA & Associés Logo" style="display: block; width: 64px; height: auto; max-height: 64px; border-radius: 8px;" />
                    </div>
                    <div style="color: #ffffff; font-size: 21px; font-weight: 800; letter-spacing: 0.03em; margin-bottom: 4px;">
                      MSA &amp; ASSOCIÉS
                    </div>
                    <div style="color: #93c5fd; font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase;">
                      Gestion Électronique Documentaire &bull; MSAGED
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 34px 32px 24px 32px;">
              <!-- Badge -->
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; background-color: ${badgeColor}18; color: ${badgeColor}; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; border: 1px solid ${badgeColor}40;">
                  ${badgeText}
                </span>
              </div>

              <!-- Main Title -->
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.35;">
                ${title}
              </h2>

              <!-- Greeting & Text -->
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155; font-weight: 600;">
                ${greeting}
              </p>
              ${leadText ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">${leadText}</p>` : ''}

              <!-- Highlight box (e.g. password reset) -->
              ${highlightHtml}

              <!-- Item details (changes, account info) -->
              ${itemsHtml}

              <!-- Primary Call-to-Action Button -->
              ${buttonHtml}

              ${footerNote ? `
                <div style="margin-top: 24px; padding: 12px 16px; background-color: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 4px; font-size: 12.5px; color: #64748b; line-height: 1.5;">
                  ${footerNote}
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 0;" />
            </td>
          </tr>

          <!-- Security & Footer Notice -->
          <tr>
            <td style="padding: 24px 32px 30px 32px; background-color: #fafbfc; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                🔒 <strong>Avis de sécurité :</strong> Ne partagez jamais vos identifiants ou mots de passe avec qui que ce soit.
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11.5px; color: #94a3b8; line-height: 1.5;">
                Ce message a été généré automatiquement par le serveur MSAGED de MSA &amp; Associés.
              </p>
              <p style="margin: 0; font-size: 11px; color: #cbd5e1;">
                &copy; ${new Date().getFullYear()} MSA &amp; Associés. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Creates mail options with office logo attached as CID for best client compatibility
 */
function createMailOptions(from, to, subject, text, html, customAttachments = []) {
  if (!from) {
    from = `"MSA & Associés - MSAGED" <massalymamadou@gmail.com>`;
  }

  const attachments = Array.isArray(customAttachments) ? [...customAttachments] : [];
  
  if (hasLocalLogo) {
    // Check if officeLogo CID is already in attachments
    const hasOfficeLogo = attachments.some(a => a.cid === 'officeLogo');
    if (!hasOfficeLogo) {
      attachments.push({
        filename: 'msa.png',
        path: logoPath,
        cid: 'officeLogo'
      });
    }
  }

  return {
    from,
    to,
    subject,
    text: text || subject,
    html,
    attachments
  };
}

/**
 * Dispatches mail via transporter with clean error handling
 */
function sendMailOptions(mailOptions) {
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("[Nodemailer Error]:", error);
        return resolve({ success: false, error });
      }
      console.log("[Nodemailer Success] Email sent:", info.response);
      return resolve({ success: true, info });
    });
  });
}

/**
 * Notification for New Account Creation
 */
function sendNewAccountMailOptions(to, content, attachments) {
  const mailOptions = createNewAccountMailOptions(to, content, attachments);
  return sendMailOptions(mailOptions);
}

function createNewAccountMailOptions(to, content, attachments) {
  const title = "Votre compte MSAGED a été créé avec succès";
  
  // Format content lines
  const contentItems = Array.isArray(content) ? content.map(item => {
    const parts = item.split(':');
    if (parts.length >= 2) {
      return { label: parts[0].trim(), value: parts.slice(1).join(':').trim() };
    }
    return item;
  }) : [content];

  const html = generateModernEmailTemplate({
    title,
    badgeText: "Nouveau Compte",
    badgeColor: "#0284c7",
    greeting: `Bonjour,`,
    leadText: "Votre compte d'accès à la plateforme de Gestion Électronique Documentaire (MSAGED) vient d'être activé par un administrateur.",
    contentItems,
    actionButton: {
      text: "Accéder à mon espace MSAGED",
      url: "https://www.msged.msassocies-digital.com"
    },
    footerNote: "Veuillez vous connecter pour configurer votre profil et vérifier vos autorisations d'accès."
  });

  return createMailOptions(undefined, to, `MSAGED - Bienvenue sur votre nouvel espace documentaire`, undefined, html, attachments);
}

/**
 * Notification for Account Profile / Permission Updates
 */
function notifyAccountChanges(to, obj) {
  const { changedProps } = obj || {};
  if (!changedProps || changedProps.length === 0) return;

  const subject = "MSAGED - Mise à jour de vos informations de compte";
  
  const contentItems = changedProps.map(p => {
    if (p.field === 'Mot de passe') {
      return { label: "Mot de passe", value: "Modifié (valeur masquée pour des raisons de sécurité)" };
    }
    return {
      label: p.field,
      value: `${p.old || '(vide)'} → ${p.new || '(vide)'}`
    };
  });

  const html = generateModernEmailTemplate({
    title: "Mise à jour de votre compte",
    badgeText: "Modification de Profil",
    badgeColor: "#8b5cf6",
    greeting: "Bonjour,",
    leadText: "Les informations de votre compte sur la plateforme MSAGED ont été récemment modifiées :",
    contentItems,
    actionButton: {
      text: "Vérifier mon compte",
      url: "https://www.msged.msassocies-digital.com"
    },
    footerNote: "Si vous n'êtes pas à l'origine de ces modifications ou si vous constatez une anomalie, veuillez contacter immédiatement l'administrateur système."
  });

  const mailOptions = createMailOptions(undefined, to, subject, undefined, html, undefined);
  return sendMailOptions(mailOptions);
}

/**
 * Dedicated Notification for Admin Resetting User Password to 0000
 */
function sendPasswordResetMail(to, username, defaultPassword = "0000", adminUsername = "L'administrateur") {
  const subject = "MSAGED - Réinitialisation de votre mot de passe";

  const html = generateModernEmailTemplate({
    title: "Réinitialisation de votre mot de passe",
    badgeText: "Sécurité & Accès",
    badgeColor: "#ea580c",
    greeting: `Bonjour ${username || ''},`,
    leadText: `${adminUsername} a réinitialisé le mot de passe de votre compte MSAGED à la valeur par défaut du système.`,
    highlightBox: {
      title: "Votre nouveau mot de passe provisoire",
      value: defaultPassword,
      subtitle: "⚠️ Ce mot de passe est temporaire. Pour votre sécurité, veuillez impérativement le modifier dès votre première connexion.",
      alertType: 'warning'
    },
    contentItems: [
      { label: "Nom d'utilisateur", value: username },
      { label: "Statut", value: "Actif - Réinitialisé" },
      { label: "Date de modification", value: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }) }
    ],
    actionButton: {
      text: "Se connecter avec le mot de passe 0000",
      url: "https://www.msged.msassocies-digital.com"
    },
    footerNote: "Si vous n'avez pas sollicité cette réinitialisation auprès de votre administrateur, veuillez le contacter sans délai."
  });

  const mailOptions = createMailOptions(undefined, to, subject, undefined, html, undefined);
  return sendMailOptions(mailOptions);
}

// Backward compatibility helper
function generateHtml({ title, source, imgWidth, imgHeight, content }) {
  return generateModernEmailTemplate({
    title,
    badgeText: "Information MSAGED",
    greeting: "Bonjour,",
    contentItems: Array.isArray(content) ? content : [content]
  });
}

module.exports = {
  notifyAccountChanges,
  sendNewAccountMailOptions,
  createNewAccountMailOptions,
  sendPasswordResetMail,
  generateModernEmailTemplate,
  generateHtml
};
