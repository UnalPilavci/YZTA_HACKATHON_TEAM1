# 🚀 SmartFlow AI - YZTA_HACKATHON_TEAM1

<p align="center">
  <img src="https://img.shields.io/badge/Status-Development-orange" alt="Status" />
  <img src="https://img.shields.io/badge/Framework-React-blue" alt="React" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203-green" alt="Groq AI" />
  <img src="https://img.shields.io/badge/Backend-Firebase-yellow" alt="Firebase" />
</p>

**SmartFlow AI** is an AI-powered assistant platform that transforms your chaotic inbox into a streamlined and automated workflow. Developed for the **YZTA Hackathon**, this project takes over the "heavy lifting"—summarizing emails, scheduling meetings, and extracting critical data from Slack—so you can focus only on what truly matters.

---

## 🌟 About the Project (Overview)

In today's business world, professionals are overwhelmed by hundreds of emails and dozens of Slack announcements every day. **SmartFlow AI** filters this "information noise" using artificial intelligence, presenting users only with the points that require action. By leveraging the ultra-fast inference power of Groq AI, you can manage all your communications in seconds.

---

## ✨ Key Features

### 📧 Intelligent Email Management
- **Automated Classification:** Incoming emails are instantly labeled as *Meeting, Task, Urgent Action,* or *Advertisement*.
- **AI-Powered Summaries:** Condenses long email threads into clear 2-3 sentence summaries that can be read in seconds.
- **Smart Reply Assistant:** Generates professional draft responses based on the tone and intent of the incoming emails.

### 📅 Calendar and Task Automation
- **Smart Meeting Detection:** If a meeting request with a date and time is detected within an email, the system identifies it and allows you to add it to Google Calendar with a single click.
- **Task Converter:** Automatically converts requests in emails into a structured To-Do list.

### 💬 Slack and Team Communication Analysis
- **Announcement Tracking:** Analyzes general announcements in Slack channels, extracts tasks relevant to you, and reports them.

### 🤖 Interactive AI Assistant
- **Data-Driven Chat:** A dedicated chatbot that knows your inbox and projects. It provides instant answers to questions like, *"What was discussed in last week's sales meeting?"*

### 📊 Professional Dashboard
- **Productivity Analysis:** Uses the Recharts library to visualize workload distribution, identify frequent contacts, and present efficiency statistics through interactive graphs.

---

## 🛠️ Technical Infrastructure (Tech Stack)

- **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) (Ultra-fast development and runtime performance)
- **Artificial Intelligence (AI):** [Groq AI](https://groq.com/) (Lightning-fast text analysis using Llama-3-70b/8b models)
- **Backend & Auth:** [Firebase](https://firebase.google.com/) (Real-time data synchronization and secure authentication)
- **Design & Animation:** [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) + [Framer Motion](https://www.framer.com/motion/) (Premium user experience)
- **Icon Set:** [Lucide React](https://lucide.dev/)
- **Data Visualization:** [Recharts](https://recharts.org/)

---

## ⚙️ Installation Guide

Follow these steps to run the project on your local machine:

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/UnalPilavci/YZTA_HACKATHON_TEAM1.git
   ```

2. **Install Required Packages:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables (.env):**
   Create a `.env` file in the root directory and fill in the following information with your own keys:
   ```env
   VITE_FIREBASE_API_KEY=Your_API_Key
   VITE_FIREBASE_AUTH_DOMAIN=Your_Auth_Domain
   VITE_GROQ_API_KEY=Your_Groq_API_Key
   ```

4. **Launch the Application:**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```text
src/
├── components/     # UI Components (Auth, Dashboard, etc.)
├── services/       # AI (Groq), Firebase, and Google Services
├── App.jsx         # Main Application Logic and Routing
├── App.css         # Modern Design and Glassmorphism Effects
└── main.jsx        # Entry Point
```

---

## 📈 Future Roadmap

- [ ] **Multi-Channel Integration:** Support for MS Teams and WhatsApp Business.
- [ ] **Voice Command System:** Voice-to-email and meeting querying via voice assistant.
- [ ] **Mobile Application:** Native experience for iOS and Android.
- [ ] **Customized AI Models:** Models that learn the user's specific writing style.

---

## 👥 The Team

**YZTA_HACKATHON_TEAM1**
- **Ünal Pilavcı** - [LinkedIn](www.linkedin.com/in/ünal-p-a7bb2a24a)
- **Samira Mamysheva** - [LinkedIn](https://www.linkedin.com/in/samira-mamysheva-1b1201336/)
- **Ezgisu Badak** - [LinkedIn](https://www.linkedin.com/in/ezgisu-badak-a2804820b/)
- **Yiğit Pakçe** - [LinkedIn](https://www.linkedin.com/in/yigit-pakce/)

---

## 📄 License

This project is licensed under the MIT License.

---
<p align="center">
  Developed with ❤️ for <b>YZTA Hackathon 2026</b>
</p>
