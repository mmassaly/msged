const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
class TOTP 
{
    static generateSecret(user) {
        const secret = speakeasy.generateSecret({ length: 20, name: `Msged (${user})` });
        return secret;
    }
    static verifyToken(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow a window of 1 time step before and after
        });
    }
    static generateQRCode(secret) {
        return new Promise((resolve, reject) => {
            qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if(err)
                {
                    const errorHTML = `<label>Erreur lors de la génération du code QR</label>`;
                    reject(errorHTML);
                }
                else
                {
                    const displayHTML = `<p>Téléchargez Google Authentificator
                    sur votre mobile puis scanner le code QR suivant</p>
                    <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&pcampaignid=web_share"
                    ><img width="60" height = "60" src='googleauth.png'/></a>
                    <img style = "" width="120" height = "120" src="${data_url}" alt="Code QR"/>`;
                    resolve(displayHTML);
                }
            })});
    }

}

module.exports = TOTP;