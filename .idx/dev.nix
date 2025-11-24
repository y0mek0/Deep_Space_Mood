{ pkgs, ... }: {
  # Add python and pip to the environment
  packages = [ pkgs.python3 pkgs.pip ];

  idx = {
    extensions = [ 
      # Add the official Python VS Code extension
      "ms-python.python" 
    ];

    workspace = {
      # This runs when the workspace is first created
      onCreate = {
        # Install the python packages from requirements.txt
        install-deps = "pip install -r requirements.txt";
      };

      # This runs every time the workspace is (re)started
      onStart = {
        # Start the Flask server using Gunicorn
        start-server = "gunicorn --config gunicorn_config.py app:app";
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          # The command to start the web preview
          command = ["gunicorn" "--config" "gunicorn_config.py" "app:app"];
          manager = "web";
        };
      };
    };
  };
}
