# gunicorn_config.py
# This file configures Gunicorn, the web server that will run your Flask app.

bind = "0.0.0.0:8080"  # Bind to all network interfaces on the port provided by the host
workers = 3            # Number of worker processes
