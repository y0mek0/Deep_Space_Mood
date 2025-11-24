# Deep Space Mood

Version: 0.2.1

This project generates dynamic, cosmic-themed visuals in real-time based on a user's mood. It uses a Three.js frontend for rendering and a Python (Flask) backend to securely communicate with the Nous Research API for style generation.

## Project Structure

- `index.html`: The main HTML file.
- `script.js`: The core frontend logic for Three.js, UI, and communication with the backend.
- `style.css`: Styles for the user interface.
- `app.py`: The Flask backend server. It provides an API endpoint (`/api/generate`) that securely queries the Nous API.
- `requirements.txt`: A list of Python dependencies required for the backend.
- `gunicorn_config.py`: Configuration for the Gunicorn web server used in production.
- `shaders/`: GLSL shader files that create the visuals.

## Running the Project Locally

### Prerequisites

- Python 3
- `pip` (Python package installer)

### 1. Set Up the Environment

First, install the required Python packages:

```bash
pip install -r requirements.txt
```

### 2. Set the API Key

This project requires an API key from Nous Research. The application is configured to read this key from an environment variable for security.

**Do NOT hardcode the key in the source code.**

Set the environment variable in your terminal:

- **macOS / Linux:**
  ```bash
  export NOUS_API_KEY='your-secret-api-key-here'
  ```
- **Windows (Command Prompt):**
  ```bash
  set NOUS_API_KEY=your-secret-api-key-here
  ```
- **Windows (PowerShell):**
  ```bash
  $env:NOUS_API_KEY='your-secret-api-key-here'
  ```

### 3. Run the Server

Start the Flask development server:

```bash
gunicorn --config gunicorn_config.py app:app
```

The application will be available at `http://127.0.0.1:8080`.

## Deployment (e.g., on Render.com)

This project is ready to be deployed as a **Web Service**.

### 1. Connect Your Git Repository

Connect your GitHub repository to Render.

### 2. Service Configuration

Use the following settings during creation:

- **Environment:** `Python`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `gunicorn --config gunicorn_config.py app:app`

### 3. Add Secret Environment Variable

In your service's dashboard, go to the **Environment** tab and add a new **Secret File** or **Environment Variable**:

- **Key:** `NOUS_API_KEY`
- **Value:** `your-secret-api-key-here`

Render will automatically deploy your application. The `gunicorn_config.py` file ensures it runs correctly in a production environment.
