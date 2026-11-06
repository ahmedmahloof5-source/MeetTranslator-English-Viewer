# Meet Japanese Translator

A Manifest V3 Chrome extension that adds a movable Japanese/English translation panel to Google Meet.

## Load locally
1. Extract this folder.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose this `MeetTranslator` folder.
5. Open or refresh a Google Meet page.

## Important privacy note
Text sent for translation is sent to Google's `translate.googleapis.com` service. The incoming translation option is off by default. If enabled, it scans Japanese text rendered on the Meet page (not just chat messages), so only enable it when you are comfortable sending matching text to Google. Review translations before sending them.

## Release status
This is a prepared draft, not a verified public release. Test all features in a real Google Meet session before submitting. See `STORE_LISTING_DRAFT.md` and `PRIVACY_POLICY.md` for publication preparation.

## Resize the translator panel
Drag the resize handle at the panel’s bottom-right corner to change its width and height. Drag the dark header to move the panel. The panel has minimum dimensions and is limited to the browser window.


## Hide and show the translator
Click the Meet Translator extension icon in Chrome's toolbar while on a Google Meet tab to hide the panel. Click it again to show the panel. Hiding the panel does not disable the content script, incoming translation, or keyboard shortcuts; it only hides the on-screen panel. Pin the extension in Chrome's Extensions menu if you want its icon to stay visible.


## Hide / show from the Chrome toolbar
Pin the blue speech-bubble Meet Translator icon to the Chrome toolbar. While a Google Meet tab is active, click that icon once to hide the translator panel; click it again to show the panel. Hiding the panel does not stop the extension's content script or its enabled translation features. If the click does nothing, reload the Meet tab after installing the extension.
