{ pkgs, ... }: {
  # Let's install python3
  packages = [ pkgs.python3 ];
  idx = {
    extensions = [ "ms-python.python" ];
    previews = {
      enable = true;
      previews = {
        web = {
          # We'll use Python's built-in HTTP server for this
          command = ["python" "-m" "http.server" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
