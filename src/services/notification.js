export function sendTelegramNotification(telegramId, message) {
  try {
    // write telegram notification logic
  } catch (error) {
    console.log("sendTelegramNotification failed ", error);
  }
}

export function sendEmailNotification(email, message) {
  try {
    // write send email logic using zkMail sdk
  } catch (error) {
    console.log("sendEmailNotification failed ", error);
  }
}
