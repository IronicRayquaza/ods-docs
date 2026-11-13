const RECIPES = [
  { title: 'Install ODS', query: 'install', files: ['ods/QUICKSTART.md'] },
  { title: 'Install on Windows', query: 'install windows', files: ['ods/docs/WINDOWS-QUICKSTART.md', 'ods/docs/WINDOWS-TROUBLESHOOTING-GUIDE.md'] },
  { title: 'Install on a Mac', query: 'install mac', files: ['ods/docs/MACOS-QUICKSTART.md'] },
  { title: 'Fix a failed install', query: 'install fails error', files: ['ods/docs/INSTALL-TROUBLESHOOTING.md', 'ods/docs/TROUBLESHOOTING.md', 'ods/FAQ.md'] },
  { title: 'Check my hardware', query: 'gpu memory tier', files: ['ods/docs/HARDWARE-GUIDE.md', 'ods/docs/SUPPORT-MATRIX.md'] },
  { title: 'Switch or add a model', query: 'switch model gguf', files: ['ods/docs/MODEL-MANAGEMENT.md', 'ods/FAQ.md'] },
  { title: 'Add a service', query: 'extension install', files: ['ods/docs/EXTENSIONS.md'] },
  { title: 'Run without a monitor', query: 'headless setup', files: ['ods/docs/HEADLESS-SETUP.md'] },
  { title: 'Use it offline', query: 'offline', files: ['ods/docs/OFFLINE_AND_MIRRORING.md', 'ods/docs/M1-OFFLINE-MODE.md'] },
  { title: 'Share it with others', query: 'users network device', files: ['ods/docs/MULTI-USER-SETUP.md', 'ods/docs/NETWORK.md'] },
  { title: 'Reach it from anywhere', query: 'tailscale remote', files: ['ods/docs/TAILSCALE.md'] },
  { title: 'Find what is wrong', query: 'doctor diagnose', files: ['ods/docs/ODS-DOCTOR.md', 'ods/docs/SUPPORT-BUNDLE.md'] },
  { title: 'Talk to it with voice', query: 'voice speech', files: ['ods/FAQ.md', 'ods/extensions/services/whisper/README.md', 'ods/extensions/services/tts/README.md'] },
  { title: 'Automate with workflows', query: 'workflow n8n', files: ['ods/FAQ.md', 'ods/extensions/services/n8n/README.md'] },
  { title: 'Generate images', query: 'image comfyui', files: ['ods/extensions/services/comfyui/README.md'] },
  { title: 'Update or uninstall', query: 'update uninstall', files: ['ods/FAQ.md', 'ods/docs/SOURCE-UPDATES.md'] }
];

if (typeof module !== 'undefined') module.exports = { RECIPES };