# Chrome Web Store listing draft

## Name
Meet Japanese Translator

## Short description
Translate Japanese text in Google Meet and prepare English chat messages in Japanese or Romaji.

## Detailed description
Meet Japanese Translator adds a small, movable translation panel to Google Meet. When you explicitly enable incoming translation, it can translate Japanese text detected on the Meet page into English, and help you prepare an English chat message in Japanese, Romaji, or both. You can restore your original English draft before sending.

Translations are provided by Google's translation service. Text submitted for translation is sent to Google; do not submit confidential or sensitive information unless you are comfortable sharing it with that service. Always review a translation before sending it.

## Single purpose
Provide Japanese-English translation assistance within Google Meet.

## Permission justification
- `https://meet.google.com/*`: required to display the translator panel and interact with the Meet page's chat text.
- `https://translate.googleapis.com/*`: required to send text selected for translation to Google's translation endpoint and receive the result.

## Remote code
No remotely hosted executable code is loaded. The extension uses a remote translation API only.

## Before submission
- Replace the privacy-policy contact placeholder with a real support address.
- Host PRIVACY_POLICY.md at a public HTTPS URL and enter that URL in the dashboard.
- Capture genuine screenshots of the extension running in Google Meet.
- Complete the Chrome Web Store data-use disclosures accurately.
