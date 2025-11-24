# Interactive Space Generator

This project is a web application that generates an interactive 3D space visualization based on a user's mood description. It uses the Nous API to create unique visual styles and the Three.js library for rendering.

## How to Run the Project

1.  **Reload the IDX Environment**: After all the files are created in your environment, a notification will appear asking you to reload to apply the changes from `.idx/dev.nix`. Click **"Reload"**. This will install `Node.js`, `Python`, and the `Caddy` web server.

2.  **Open the Preview**: After the environment reloads, a preview tab should automatically open on the right side of the IDE. Caddy will start the web server and display `index.html`.

3.  **Start Generating**:
    *   Enter a mood in the text field (e.g., `calm and peaceful` or `energetic and chaotic`).
    *   Click the **"Generate Universe"** button. The application will send a request to the Nous API and use the received JSON to create the visualization.

## Features

*   **Mood-Based Generation**: Use any text description to create a unique space scene.
*   **Interactive Controls**:
    *   **Camera Rotation**: The scene rotates slowly automatically.
    *   **Zoom**: Use the mouse wheel to zoom in and out.
*   **Save and Load Styles**:
    *   Click **"Save This Style"** to save the current generated configuration to your browser's local storage.
    *   Click **"Load Saved Styles"** to see a list of saved presets and load any of them.

## File Structure

*   `index.html`: The main HTML file.
*   `style.css`: Styles for the interface.
*   `script.js`: The main application logic, including interaction with Three.js and the Nous API.
*   `sentient_agent.py`: A Python script illustrating a potential multi-agent architecture (see note below).
*   `.idx/dev.nix`: The Nix configuration file for the development environment.
*   `*.frag`: GLSL fragment shader files used for different visual themes.

## Important Note on API Keys

In `script.js` and `sentient_agent.py`, your Nous API key is **embedded directly in the code**. This was done for simplicity of demonstration.

**Never expose API keys in client-side code in production applications!** For real projects, use a server-side proxy or cloud functions to manage keys securely.

## Note on Sentient AGI

The `sentient_agent.py` file is a theoretical example. It does not run in the current configuration but serves to illustrate the architecture of a multi-agent system, as requested. To make it work, you would need the actual `sentient-agent` library and its dependencies.
