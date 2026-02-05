# Spabot 🤖

**Spabot** is an intelligent, Splunk-themed Chrome Extension designed to boost your productivity when working with Splunk SPL (Search Processing Language). It provides a handy floating assistant that gives you quick access to saved searches, index references, macros, and REST API endpoints directly within the Splunk search interface.

![Spabot Icon](icons/icon.svg)

## ✨ Features

*   **🚀 Smart Saved Searches**: Store your frequently used SPL snippets. Organize them into groups (folders) for easy access.
*   **📂 Quick References**: Built-in and customizable cheat sheets for:
    *   **Indexes**: Keep track of your environment's indexes.
    *   **Macros**: Quick insertion of macro syntax.
    *   **REST API**: Handy reference for Splunk REST endpoints.
*   **➕ Inline Management**: Add new saved searches, indexes, or macros directly from the menu without leaving your search tab.
*   **🎨 Splunk Themed UI**: A beautiful, native-feeling interface with the classic Splunk Green color scheme and smooth animations.
*   **🔍 Search & Filter**: Instantly find what you need with the built-in search bar in the menu.
*   **💾 Import / Export**: Backup your configuration to JSON or share it with teammates via the Options page.
*   **UUID Generator**: Quickly insert a random UUID into your search bar.

## 📦 Installation

1.  Clone or download this repository to your local machine.
2.  Open Google Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode** in the top-right corner.
4.  Click **Load unpacked**.
5.  Select the `Spabot` folder from this repository.
6.  Spabot should now appear in your browser!

## 🛠 Usage

1.  **Open Spabot**: Navigate to any Splunk Search page. You will see the Spabot icon floating on the right side of the screen.
2.  **Menu**: Click the robot icon to open the main menu.
3.  **Insert Code**: Click on any Saved Search, Index, or Macro to instantly insert it into the Splunk search bar.
4.  **Add New Items**:
    *   Click the **+** button next to "Saved Search" to save the currently selected text (or write new SPL) as a template.
    *   Use the **+** buttons in the Tools section to add new Indexes, Macros, or REST endpoints.
5.  **Search**: Click the **🔍** icon in the Saved Search header to filter your templates.

## ⚙️ Configuration

Right-click the extension icon and select **Options**, or click "Settings" inside the extension to:
*   Manage (Edit/Delete) all your saved data.
*   **Import/Export** your data for backup or sharing.
*   Toggle "Quiet Mode" (Zen Mode) if you prefer fewer animations.

## 📝 License

[MIT](LICENSE)
