# TODO: Fix Push Notifications Issue

## Steps to Complete:
- [ ] Move FCM token request and notification initialization from DashboardPage.js to App.js for global availability
- [ ] Update public/manifest.json to include notification settings and ensure proper PWA installation
- [ ] Improve error handling and logging in src/firebase-messaging.js
- [ ] Enhance public/firebase-messaging-sw.js with better logging and notification display
- [ ] Remove FCM initialization code from src/pages/DashboardPage.js
- [ ] Test notifications on mobile after changes
- [ ] Check browser console for errors
- [ ] Verify PWA installation works correctly
