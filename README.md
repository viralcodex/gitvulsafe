# DepHound.AI
DepHound is a dependencies vulnerabilities visualizer with AI powered insights to help you resolve them and ship code more secure and faster.

# Features
 - Popular programming ecosystems supported (names from <a href='https://osv.dev/'>OSV.dev</a>)
   - JS/TS (Node (npm))
   - Python (PyPI)
   - Java (Maven)
   - RubyGems (Gemfile)
   - Dart (Pubspec)
 - **Graph visualizations** for vulnerable dependencies with detailed information.
 - Upload a **manifest file** or **Github repository URL** with specific branch selection.
 - AI summary to help understand detailed and jargon-filled information in vulnerability information.
 - **Inline prompt** box to help you ask questions on selected text (VS-Code inspired inline support)
 - Generate an **AI Fix Plan** for your vulnerabilities to solve them at once with information.
(Note: Currently, the Fix Plan describes individual steps for solving each dependency vulnerability, a detailed fix plan generation is currently in development)

# How to run locally


# Ideation
I came across <a href='https://gitdiagram.com/'>GitDiagram</a> where I made some contributions to the repository, where an idea popped up for a fun and similar project, to visualise the dependency in the same way. So there began the development for **DepHound**.

# AI Information
  Currently I am using Gemini AI API for the generation part using different JSON schema to provide a structured and uniform response throughout.

# Future Plans
  <p>I have a lot of things in mind, including:</p>
  - Improve and provide filtering options for large graphs, as it does become cluttered (critical deps, low priority deps, etc)
  - Provide options to give users their own schemas for personalised AI responses so that suits them and their needs.
  - Support for different AI Platforms, not just Gemini (which is the most cost effective right now for my needs).

# Contributions
  - People are welcome to improve and support this project by contributing to the codebase.
  - Please create an issue for anything you want to be fixed or want to contribute for, so that it is easy for me and others to track and understand the request/contribution in detail.
  - It may take some time for the PR to be reviewed as I have a full time job apart from this so please be patient.
   

