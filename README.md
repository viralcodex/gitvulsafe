# DepHound.AI
DepHound is a dependencies vulnerabilities visualizer with AI powered insights to help you resolve them and ship code more secure and faster.

# Features
 - Popular programming ecosystems supported (names from <a href='https://osv.dev/'>OSV.dev</a>)
   - JS/TS (Node (npm)) (Tested)
   - Python (PyPI) (Tested)
   - Java (Maven) (Partially Tested)
   - RubyGems (Gemfile) (Not tested)
   - Dart (Pubspec) (Not Tested)
 - **Graph visualizations** for vulnerable dependencies with detailed information.
 - Upload a **manifest file** or **Github repository URL** with specific branch selection.
 - AI summary to help understand detailed and jargon-filled information in vulnerability information.
 - **Inline prompt** box to help you ask questions on selected text (VS-Code inspired inline support).
 - Generate an **AI Fix Plan** for your vulnerabilities to solve them at once with information.
(Note: Currently, the Fix Plan describes individual steps for solving each dependency vulnerability, a detailed fix plan generation is currently in development)

# How to run locally
Clone the repository and open the repository in any text editor you like
## Frontend
   - Run the command inside the root folder to install dependencies.
     
     ```bash
     npm install
     ```
   - Create an **.env** file by doing:
      
     ```bash
     cp .env.example .env
     ```
   - Add your Github PAT to the **.env** file as it is important to increase the limit to 5000 req/hour.
   - Finally, execute the command below to start the frontend at **localhost:3000**.
     
     ```bash
     npm run dev
     ```
 ## Backend
  - Navigate to the **./backend** directory inside the repository
    
    ```bash
    cd ./backend
    ```
  - Install dependencies for backend
    
    ```bash
     npm install
    ```
  - Create **.env** file just like the frontend and add your Gemini AI API Key in **GEMINI_API_KEY** for the AI functionalities.
  - ### Database
    - To setup the Database, run the bash script that will start a docker container running a **postgresql** image in it.
    - When prompted to generate a random password, input yes. The Postgres database will start in a container at **localhost:5432**.
      
    - After the container is running, run the following command to generate the Tables from the schema.
      
      ```bash
         npm run db:generate
      ```
    - Then push the changes to the container by running:
      
      ```bash
         npm run db:push
      ```
    - OPTIONAL: to check if the DB is running as expected, run the following command to see if you can open the studio.

      ```bash
         npm run db:studio
      ```
- Finally, after setting up both Backend and DB, run the service with

  ```bash
  npm run dev
  ```
# Ideation and Motivation
I came across <a href='https://gitdiagram.com/'>GitDiagram</a> where I made some contributions to the repository, I also had some idea to before this to build something like a visualisation for vulnerable dependencies, which can help people find, see and resolve them easily.
So there began the development for **DepHound**. You will see the inspiration in my code.

# AI Information
  Currently I am using Gemini AI API for the generation features using different JSON schemas to provide a structured and uniform response throughout.

# How it works
  Let's ask **GitDiagram** itself...
  <img width="5572" height="2916" alt="image" src="https://github.com/user-attachments/assets/3d7439b4-f7d2-4f2d-83e3-c7a2965f7c32" />

# Future Plans 
I have a lot of things in mind, including:
  - Improve performance to generate the graph, currently it takes a lot of time for big graph which have 100s of dependencies and all of them have 100s of vulnerabilities in them.
  - Improve UI and UX for some parts that I feel need more polishing to keep the users informed.
  - Clustering in the graph to prevent cluttering and density of the graph.
  - Improve and provide filtering options for large graphs, as it does become cluttered (critical deps, low priority deps, etc)
  - Provide options to give users their own schemas for personalised AI responses so that suits them and their needs.
  - Provide an option to query the tree and find the information needed directly.
  - Support for different AI Platforms, not just Gemini (which is the most cost effective right now).

# Contributions and Bug Reporting
  - People are welcome to improve and support this project by contributing to the codebase.
  - Please create an issue for anything you want to be fixed or want to contribute for, so that it is easy for me and others to track and understand the request/contribution in detail.
  - It may take some time for the PR to be reviewed as I have a full time job apart from this so please be patient.
