const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
dotenv.config();
console.trace(process.env.NODE_MAILER);

// Transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "massalymamadou@gmail.com",       // replace with your Gmail
    pass: process.env.NODE_MAILER           // paste the 16-char App Password
  }
});

console.trace(process.env.NODE_MAILER);

function sendNewAccountMailOptions(to,content,attachments)
{
    sendMailOptions(createNewAccountMailOptions(to,content,attachments));
}
function createNewAccountMailOptions(to,content,attachments)
{
    const title = "MSAGED-(Gestion des documents électroniques à MSA) Vous avez un nouveau compte";
    const html = generatenewAccountHTML(title,content);
   
    return createMailOptions(undefined,to,
        title
        ,undefined,html,attachments);
}

function createAccountChangeMailOptions(to,text,html,attachments,sujetdechangement)
{
    const title = `MSAGED-(Gestion des documents électroniques à MSA) Votre ${sujetdechangement} vient d'être modifié.`;
    generatenewAccountHTML(title,content);
    return createMailOptions(undefined,to,
        title
        ,text,html,attachments);
}

// --- Notification des changements ---
function notifyAccountChanges(to,obj) {

 const  {changedProps} = obj;
  if (changedProps.length === 0) return; // rien n'a changé

  let subject = "MSAGED - Votre compte a été modifié";
  let content = ["Les champs suivants ont été modifiés :"];

  // Inclure chaque champ avec ancienne et nouvelle valeur
  content.push(
    ...changedProps.map(
      p => (p.field != 'Mot de passe')?`${p.field} : Ancienne valeur = ${p.old} → Nouvelle valeur = ${p.new}`:
      `${p.field} : → Nouvelle valeur = ${p.new}`
    )
  );

  const html = generatenewAccountHTML(subject, content);
  const mailOptions = createMailOptions(undefined, to, subject, undefined, html, undefined);
  sendMailOptions(mailOptions);

}


function generatenewAccountHTML(title,content)
{
    return generateHtml({
        title: title,
        source: "https://www.msged.ms-associes-digital.com/msa.jpg",
        imgWidth: "60px",
        imgHeight: "60px",
        content: content
    });
}

function createMailOptions(from,to,subject,text,html,attachments)
{
    if(!from)
    {
        from = "massalymamadou@gmail.com";
    }
    return {from,to,subject,text,html,attachments};
}

function sendMailOptions(mailOptions)
{
    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.error("Error:", error);
    }
    console.log("Email sent:", info.response);
    });

} 

function generateHtml({ title, source, imgWidth, imgHeight, content }) {
  return `
        <html>
            <head lang="fr">
                <meta charset="UTF-8" />
                <title>${title}</title>
                <h1>
                <img src="${source}" style="width:${imgWidth};height:${imgHeight};border-radius:10%;" />
                ${title}
                </h1>
            </head>
            <body>
                ${content.map(row => `<p>${row}</p>`).join("\n")}
            </body>
            <footer></footer>
        </html>
        `;
}

// Example usage:
const htmlEmail = generateHtml({
  title: "Bienvenue",
  source: "https://www.msged.ms-associes-digital.com/msa.jpg",
  imgWidth: "60px",
  imgHeight: "60px",
  content: ["Bonjour!", "Voici votre rapport.", "Merci de votre confiance."]
});

console.log(htmlEmail);

//sendMailOptions(createMailOptions(undefined,"mamadumassaly@gmail.com","Bienvenue",undefined,htmlEmail,undefined));

module.exports = {notifyAccountChanges,sendNewAccountMailOptions};
